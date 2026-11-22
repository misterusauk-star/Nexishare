import { z } from "zod";
import crypto from "node:crypto";
import { exec, query, queryOne } from "../db";
import { hashPassword } from "../auth";
import { fieldErrors } from "../validation";
import { assessDestination } from "./safety";
import { validateNewSlug, slugInUse, slugRateOk, SLUG_RATE_MESSAGE } from "../slug-service";
import { invalidateSlug } from "../slug-cache";
import { fromHeaders } from "../request";
import { getBrand } from "../brand";
import { getDomainState } from "../domains";
import { applyUtm } from "../url-check";
import { rateLimit } from "../ratelimit";

export type Result<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export interface LinkRow {
  id: number;
  user_id: number;
  team_id: number | null;
  group_id: number | null;
  slug: string;
  title: string | null;
  target_url: string;
  password_hash: string | null;
  domain_id?: number | null;
  ios_url?: string | null;
  android_url?: string | null;
  expired_url?: string | null;
  expires_at: Date | null;
  starts_at: Date | null;
  enabled: number;
  moderated: number;
  review_status?: "none" | "pending" | "approved" | "rejected";
  review_reason?: string | null;
  safety_status?: "ok" | "flagged";
  created_at: Date;
}

// Truly optional: key may be missing, null or "" (all mean "no date").
const optionalDate = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

export const linkInput = z.object({
  target_url: z.string().trim().min(1, "Enter the destination URL."),
  slug: z.string().trim().optional().transform((s) => (s ? s : undefined)),
  title: z.string().trim().max(160).optional().transform((s) => s || null),
  password: z.string().max(100).optional().transform((s) => s || undefined),
  expires_at: optionalDate,
  starts_at: optionalDate,
  enabled: z.boolean().optional(),
  group_id: z.coerce.number().int().positive().nullish(),
  team_id: z.coerce.number().int().positive().nullish(),
  // Where the short link lives: an active site domain by id or by host name. Missing or null = follow the default domain.
  domain_id: z.coerce.number().int().positive().nullish(),
  domain: z.string().trim().toLowerCase().max(190).nullish(),
  // Campaign tags, added to the destination URL as utm_* parameters.
  // Optional extra destinations: platform-specific URLs and a fallback shown after the link expires.
  ios_url: z.string().trim().max(2048).nullish(),
  android_url: z.string().trim().max(2048).nullish(),
  expired_url: z.string().trim().max(2048).nullish(),
  utm_source: z.string().trim().max(100).nullish(),
  utm_medium: z.string().trim().max(100).nullish(),
  utm_campaign: z.string().trim().max(100).nullish(),
  utm_term: z.string().trim().max(100).nullish(),
  utm_content: z.string().trim().max(100).nullish(),
});
export type LinkInput = z.infer<typeof linkInput>;

export const slugTaken = slugInUse;

/** Turns domain_id / domain from a request into a domain id (null = default). Only active site domains qualify. */
async function resolveDomain(v: { domain_id?: number | null; domain?: string | null }): Promise<{ ok: true; id: number | null } | { ok: false; error: string }> {
  const st = await getDomainState();
  if (v.domain) {
    const h = v.domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const d = st.linkDomains.find((x) => x.host.toLowerCase() === h);
    return d ? { ok: true, id: d.id } : { ok: false, error: "That domain is not available for links. See GET /domains." };
  }
  if (v.domain_id) {
    const d = st.linkDomains.find((x) => x.id === v.domain_id);
    return d ? { ok: true, id: d.id } : { ok: false, error: "That domain is not available for links. See GET /domains." };
  }
  return { ok: true, id: null };
}

const EXTRA_URLS = ["ios_url", "android_url", "expired_url"] as const;

/** Checks the optional extra destinations with the same rules as the main one. Empty means "none". */
async function checkExtras(v: Partial<Record<(typeof EXTRA_URLS)[number], string | null | undefined>>, ownHost: string): Promise<{ ok: true; urls: Record<string, string | null> } | { ok: false; errors: Record<string, string> }> {
  const urls: Record<string, string | null> = {};
  for (const k of EXTRA_URLS) {
    const raw = v[k];
    if (raw === undefined) continue;
    if (!raw) { urls[k] = null; continue; }
    const r = await assessDestination(raw, ownHost);
    if (!r.ok) return { ok: false, errors: { [k]: r.error } };
    urls[k] = r.url;
  }
  return { ok: true, urls };
}

/** Links one account may create per day (any route: dashboard, API, import). Unverified accounts get a smaller cap. */
const DAILY_LINKS = 500;
const DAILY_LINKS_UNVERIFIED = 50;

function randomSlug(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const b = crypto.randomBytes(6);
  return Array.from(b, (x) => alphabet[x % alphabet.length]).join("");
}

async function requestIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    return fromHeaders(await headers()).ip;
  } catch {
    return "0.0.0.0"; // outside a request (scripts, tests)
  }
}
const isAdminUser = async (id: number) => (await queryOne<{ role: string }>("SELECT role FROM users WHERE id = ?", [id]))?.role === "super_admin";

export async function createLink(userId: number, ownHost: string, raw: unknown): Promise<Result<LinkRow>> {
  const p = linkInput.safeParse(raw);
  if (!p.success) return { ok: false, errors: fieldErrors(p.error) };
  const v = p.data;
  const verified = await queryOne<{ ok: number }>("SELECT (email_verified_at IS NOT NULL) AS ok FROM users WHERE id = ?", [userId]);
  if (!(await rateLimit(`link:day:${userId}`, verified?.ok ? DAILY_LINKS : DAILY_LINKS_UNVERIFIED, 86400))) {
    return { ok: false, errors: { form: "Daily limit for new links reached. Try again tomorrow." } };
  }
  const dom = await resolveDomain(v);
  if (!dom.ok) return { ok: false, errors: { domain_id: dom.error } };
  const u = await assessDestination(applyUtm(v.target_url, v), ownHost);
  if (!u.ok) return { ok: false, errors: { target_url: u.error } };
  const extras = await checkExtras(v, ownHost);
  if (!extras.ok) return { ok: false, errors: extras.errors };
  const appName = (await getBrand()).name;
  let slug = v.slug;
  let review: string | null = null;
  if (slug) {
    // Only chosen names count against the rate limit; random ones cannot be used to squat a look-alike.
    if (!(await slugRateOk(userId, await requestIp()))) return { ok: false, errors: { slug: SLUG_RATE_MESSAGE } };
    const s = await validateNewSlug(slug, { appName });
    if (!s.ok) return { ok: false, errors: { slug: s.error } };
    slug = s.slug; review = s.review;
  } else {
    for (let i = 0; i < 8 && !slug; i++) {
      const c = randomSlug();
      const s = await validateNewSlug(c, { appName });
      if (s.ok && !s.review) slug = s.slug;
    }
    if (!slug) return { ok: false, errors: { slug: "Could not generate a free short name. Try again." } };
  }
  if (v.starts_at && v.expires_at && v.expires_at <= v.starts_at) return { ok: false, errors: { expires_at: "Expiry must be after the start date." } };
  const pw = v.password ? await hashPassword(v.password) : null;
  // Suspicious names wait in the admin review queue and stay inactive until approved. Admins skip the queue.
  const queued = review !== null && !(await isAdminUser(userId));
  const res = await exec(
    "INSERT INTO links (user_id, team_id, group_id, domain_id, slug, title, target_url, ios_url, android_url, expired_url, password_hash, expires_at, starts_at, enabled, review_status, review_reason, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())",
    [userId, v.team_id ?? null, v.group_id ?? null, dom.id, slug, v.title, u.url, extras.urls.ios_url ?? null, extras.urls.android_url ?? null, extras.urls.expired_url ?? null, pw, v.expires_at, v.starts_at, v.enabled === false ? 0 : 1, queued ? "pending" : "none", queued ? review : null],
  );
  invalidateSlug(slug);
  const row = await queryOne<LinkRow>("SELECT * FROM links WHERE id = ?", [res.insertId]);
  return { ok: true, data: row! };
}

export async function updateLink(userId: number, id: number, ownHost: string, raw: unknown, isAdmin = false): Promise<Result<LinkRow>> {
  const cur = await getLinkForUser(userId, id, isAdmin);
  if (!cur) return { ok: false, errors: { form: "Link not found." } };
  const p = linkInput.partial().safeParse(raw);
  if (!p.success) return { ok: false, errors: fieldErrors(p.error) };
  const v = p.data;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (v.target_url !== undefined) {
    const u = await assessDestination(applyUtm(v.target_url, v), ownHost);
    if (!u.ok) return { ok: false, errors: { target_url: u.error } };
    sets.push("target_url = ?"); vals.push(u.url); sets.push("checked_at = UTC_TIMESTAMP()");
  }
  if (v.slug !== undefined) {
    const wanted = String(v.slug).normalize("NFKC").trim().toLowerCase();
    if (wanted !== cur.slug) {
      if (!(await slugRateOk(userId, await requestIp()))) return { ok: false, errors: { slug: SLUG_RATE_MESSAGE } };
      const s = await validateNewSlug(wanted, { appName: (await getBrand()).name, exceptLinkId: id });
      if (!s.ok) return { ok: false, errors: { slug: s.error } };
      sets.push("slug = ?"); vals.push(s.slug);
      if (s.review && !isAdmin) { sets.push("review_status = 'pending'", "review_reason = ?"); vals.push(s.review); }
    }
  }
  if (raw && typeof raw === "object" && EXTRA_URLS.some((k) => k in raw)) {
    const extras = await checkExtras(Object.fromEntries(EXTRA_URLS.filter((k) => k in (raw as object)).map((k) => [k, v[k] ?? ""])), ownHost);
    if (!extras.ok) return { ok: false, errors: extras.errors };
    for (const [k, val] of Object.entries(extras.urls)) { sets.push(`${k} = ?`); vals.push(val); }
  }
  if (v.title !== undefined) { sets.push("title = ?"); vals.push(v.title); }
  if (raw && typeof raw === "object" && "password" in raw) {
    const pw = (raw as { password?: string }).password;
    if (pw === "") { sets.push("password_hash = NULL"); }
    else if (pw) { sets.push("password_hash = ?"); vals.push(await hashPassword(pw)); }
  }
  if (raw && typeof raw === "object" && "expires_at" in raw) { sets.push("expires_at = ?"); vals.push(v.expires_at ?? null); }
  if (raw && typeof raw === "object" && "starts_at" in raw) { sets.push("starts_at = ?"); vals.push(v.starts_at ?? null); }
  if (v.enabled !== undefined) { sets.push("enabled = ?"); vals.push(v.enabled ? 1 : 0); }
  if (raw && typeof raw === "object" && ("domain_id" in raw || "domain" in raw)) {
    const dom = await resolveDomain(v);
    if (!dom.ok) return { ok: false, errors: { domain_id: dom.error } };
    sets.push("domain_id = ?"); vals.push(dom.id);
  }
  if (raw && typeof raw === "object" && "group_id" in raw) { sets.push("group_id = ?"); vals.push(v.group_id ?? null); }
  if (sets.length) await exec(`UPDATE links SET ${sets.join(", ")} WHERE id = ?`, [...vals, id]);
  invalidateSlug(cur.slug, v.slug);
  return { ok: true, data: (await queryOne<LinkRow>("SELECT * FROM links WHERE id = ?", [id]))! };
}

/** Owner, a team member (Phase 2), or an admin may access a link. */
export async function getLinkForUser(userId: number, id: number, isAdmin = false): Promise<LinkRow | null> {
  const l = await queryOne<LinkRow>("SELECT * FROM links WHERE id = ?", [id]);
  if (!l) return null;
  if (isAdmin || l.user_id === userId) return l;
  if (l.team_id) {
    try {
      const m = await queryOne("SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role <> 'viewer'", [l.team_id, userId]);
      if (m) return l;
    } catch {
      /* Phase 2 tables absent */
    }
  }
  return null;
}

export async function deleteLink(userId: number, id: number, isAdmin = false): Promise<boolean> {
  const l = await getLinkForUser(userId, id, isAdmin);
  if (!l) return false;
  await exec("DELETE FROM links WHERE id = ?", [id]);
  invalidateSlug(l.slug);
  await exec("DELETE FROM clicks WHERE entity_type = 'link' AND entity_id = ?", [id]);
  return true;
}

export interface ListOpts { userId: number; q?: string; status?: string; limit?: number; offset?: number; teamIds?: number[] }

export async function listLinks(o: ListOpts): Promise<{ rows: LinkRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const owners = ["user_id = ?"];
  params.push(o.userId);
  if (o.teamIds?.length) { owners.push(`team_id IN (${o.teamIds.map(() => "?").join(",")})`); params.push(...o.teamIds); }
  where.push(`(${owners.join(" OR ")})`);
  if (o.q) { where.push("(slug LIKE ? OR title LIKE ? OR target_url LIKE ?)"); const like = `%${o.q.replace(/[%_]/g, "")}%`; params.push(like, like, like); }
  if (o.status === "active") where.push("enabled = 1 AND moderated = 0 AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP())");
  if (o.status === "disabled") where.push("(enabled = 0 OR moderated = 1)");
  if (o.status === "expired") where.push("expires_at IS NOT NULL AND expires_at <= UTC_TIMESTAMP()");
  if (o.status === "protected") where.push("password_hash IS NOT NULL");
  const w = where.join(" AND ");
  const total = Number((await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM links WHERE ${w}`, params))?.n ?? 0);
  const limit = Math.max(1, Math.min(100, o.limit ?? 25));
  const offset = Math.max(0, o.offset ?? 0);
  const rows = await query<LinkRow>(`SELECT * FROM links WHERE ${w} ORDER BY id DESC LIMIT ${limit | 0} OFFSET ${offset | 0}`, params);
  return { rows, total };
}

export type LinkState = "active" | "disabled" | "expired" | "scheduled" | "moderated" | "review";
export function linkState(l: Pick<LinkRow, "enabled" | "moderated" | "expires_at" | "starts_at"> & { review_status?: string }): LinkState {
  if (l.moderated || l.review_status === "rejected") return "moderated";
  if (l.review_status === "pending") return "review";
  if (!l.enabled) return "disabled";
  const now = Date.now();
  if (l.expires_at && new Date(l.expires_at).getTime() <= now) return "expired";
  if (l.starts_at && new Date(l.starts_at).getTime() > now) return "scheduled";
  return "active";
}
