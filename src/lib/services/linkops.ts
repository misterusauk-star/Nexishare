// Country routes, destination health checks and the weekly report. Needs migration 017.
import dns from "node:dns/promises";
import { exec, query, queryOne } from "../db";
import { getBrand } from "../brand";
import { getTotals, getPreviousTotals, getTopItems, getHourly } from "../analytics";
import { sendEmail } from "../email/mailer";
import { checkTargetUrl } from "../url-check";
import { ownHostList } from "../domains";
import { assessDestination } from "./safety";
import { busiestHour } from "../hours.ts";
import { classify, isPrivateIp, nextHealth, type CheckResult, type Health } from "../link-health.ts";
import { parseGeoRoutes, type GeoRoute } from "../geo-routes.ts";
import { buildReport, isQuietWeek } from "../report.ts";
import type { Result } from "./links";

/* ---------- Country routes ---------- */

export async function getGeoRoutes(linkId: number): Promise<GeoRoute[]> {
  return query<GeoRoute>("SELECT country, url FROM link_geo_routes WHERE link_id = ? ORDER BY country", [linkId]);
}

/** Replaces all country routes of a link. Every address goes through the same checks as a destination. */
export async function setGeoRoutes(linkId: number, ownHost: string, input: unknown): Promise<Result<GeoRoute[]>> {
  const p = parseGeoRoutes(input);
  if (!p.ok) return { ok: false, errors: { routes: p.error } };
  const clean: GeoRoute[] = [];
  for (const r of p.routes) {
    const a = await assessDestination(r.url, ownHost);
    if (!a.ok) return { ok: false, errors: { routes: `${r.country}: ${a.error}` } };
    clean.push({ country: r.country, url: a.url });
  }
  await exec("DELETE FROM link_geo_routes WHERE link_id = ?", [linkId]);
  for (const r of clean) await exec("INSERT INTO link_geo_routes (link_id, country, url) VALUES (?, ?, ?)", [linkId, r.country, r.url]);
  await exec("UPDATE links SET has_geo = ? WHERE id = ?", [clean.length ? 1 : 0, linkId]);
  return { ok: true, data: clean };
}

/* ---------- Destination health ---------- */

const MAX_HOPS = 4;

async function publicHost(host: string): Promise<boolean> {
  try {
    const addrs = await dns.lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
  } catch { return false; }
}

/** Visits a destination the way a visitor would and reports the status. Never follows a redirect into a private network. */
export async function checkUrl(url: string, ownHosts: string[]): Promise<CheckResult> {
  let current = url;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const u = checkTargetUrl(current, ownHosts);
    if (!u.ok) return { status: null, error: "blocked" };
    const parsed = new URL(u.url);
    if (parsed.port && !["80", "443"].includes(parsed.port)) return { status: null, error: "blocked" };
    try { await dns.lookup(parsed.hostname); } catch (e) { return { status: null, error: (e as { code?: string }).code === "ENOTFOUND" ? "dns" : "other" }; }
    if (!(await publicHost(parsed.hostname))) return { status: null, error: "blocked" };
    let res: Response | null = null;
    for (const method of ["HEAD", "GET"] as const) {
      try {
        res = await fetch(u.url, { method, redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; LinkHealthCheck/1.0)", ...(method === "GET" ? { range: "bytes=0-0" } : {}) } });
      } catch (e) {
        const code = (e as { cause?: { code?: string } }).cause?.code;
        if (method === "HEAD") continue; // some servers refuse HEAD
        return { status: null, error: code === "ECONNREFUSED" ? "refused" : (e as Error).name === "TimeoutError" ? "timeout" : "other" };
      }
      if (method === "HEAD" && res.status >= 400) { void res.body?.cancel(); continue; } // confirm with GET before calling it broken
      break;
    }
    if (!res) return { status: null, error: "other" };
    void res.body?.cancel();
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, u.url).toString(); continue; }
    return { status: res.status };
  }
  return { status: null, error: "other" }; // too many redirects: not counted
}

interface HealthRow { id: number; user_id: number; slug: string; title: string | null; target_url: string; health_status: Health | null; health_fails: number }

/** Checks one link, saves the result and, when it has just turned broken, tells the owner once. */
export async function checkLinkHealth(row: HealthRow, own: string[]): Promise<{ status: Health | null; code: number | null }> {
  const r = await checkUrl(row.target_url, own);
  const n = nextHealth({ status: row.health_status, fails: Number(row.health_fails) || 0 }, r);
  await exec("UPDATE links SET health_status = ?, health_code = ?, health_fails = ?, health_checked_at = UTC_TIMESTAMP() WHERE id = ?", [n.status, r.status, n.fails, row.id]);
  if (n.alert) await alertBroken(row, r.status).catch(() => undefined);
  return { status: n.status, code: r.status };
}

async function alertBroken(row: HealthRow, code: number | null) {
  const u = await queryOne<{ email: string; health_alerts: number; status: string }>("SELECT email, health_alerts, status FROM users WHERE id = ?", [row.user_id]);
  if (!u || u.status !== "active" || !u.health_alerts) return;
  const b = await getBrand();
  await exec("UPDATE links SET health_alerted_at = UTC_TIMESTAMP() WHERE id = ?", [row.id]);
  await sendEmail("notification", u.email, {
    subject: `A link of yours points to a page that is not working`,
    heading: "A destination stopped working",
    paragraphs: [
      `${row.title || row.slug} (${b.host}/${row.slug}) now leads to ${row.target_url}${code ? `, which answers with error ${code}` : ", which cannot be reached"}. We checked twice.`,
      "Visitors who click it will not find what they expect. Update the destination, or switch the link off until it is fixed.",
    ],
    button: { label: "Open the link", url: `${b.appUrl}/dashboard/links/${row.id}` },
    footnote: `You can turn these alerts off in ${b.appUrl}/dashboard/account.`,
  });
}

/** Background pass: the links not checked for a day, oldest first. Small batches keep the server calm. */
export async function checkLinksHealth(batch = 20): Promise<number> {
  const lim = Math.min(100, Math.max(1, Math.floor(batch) || 20));
  const rows = await query<HealthRow>(
    `SELECT l.id, l.user_id, l.slug, l.title, l.target_url, l.health_status, l.health_fails FROM links l JOIN users u ON u.id = l.user_id
      WHERE l.enabled = 1 AND l.moderated = 0 AND l.universal = 0 AND u.status = 'active'
        AND (l.expires_at IS NULL OR l.expires_at > UTC_TIMESTAMP())
        AND (l.health_checked_at IS NULL OR l.health_checked_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY))
      ORDER BY l.health_checked_at IS NULL DESC, l.health_checked_at ASC LIMIT ${lim}`,
  );
  const own = await ownHostList();
  for (const r of rows) await checkLinkHealth(r, own).catch(() => undefined);
  return rows.length;
}

/** "Check now" on a link you own. */
export async function checkOneLink(linkId: number): Promise<{ status: Health | null; code: number | null } | null> {
  const row = await queryOne<HealthRow>("SELECT id, user_id, slug, title, target_url, health_status, health_fails FROM links WHERE id = ? AND universal = 0", [linkId]);
  return row ? checkLinkHealth(row, await ownHostList()) : null;
}

export { classify };

/* ---------- Weekly report ---------- */

export interface Prefs { weekly_report: boolean; health_alerts: boolean }

export async function getPrefs(userId: number): Promise<Prefs> {
  const r = await queryOne<{ weekly_report: number; health_alerts: number }>("SELECT * FROM users WHERE id = ?", [userId]);
  return { weekly_report: !!r?.weekly_report, health_alerts: r?.health_alerts == null ? true : !!r.health_alerts };
}

export async function setPrefs(userId: number, p: Partial<Prefs>): Promise<void> {
  const sets: string[] = []; const vals: unknown[] = [];
  if (p.weekly_report !== undefined) { sets.push("weekly_report = ?"); vals.push(p.weekly_report ? 1 : 0); }
  if (p.health_alerts !== undefined) { sets.push("health_alerts = ?"); vals.push(p.health_alerts ? 1 : 0); }
  if (sets.length) await exec(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...vals, userId]);
}

async function reportFor(userId: number) {
  const clicks = { userId, kind: "clicks" as const, days: 7 };
  const views = { userId, kind: "views" as const, days: 7 };
  const [c, pc, v, pv, top, hours] = await Promise.all([getTotals(clicks), getPreviousTotals(clicks), getTotals(views), getPreviousTotals(views), getTopItems(clicks, 3), getHourly(clicks)]);
  const subs = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM bio_subscribers WHERE user_id = ? AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)", [userId]).catch(() => null);
  const broken = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM links WHERE user_id = ? AND health_status = 'broken' AND enabled = 1", [userId]).catch(() => null);
  return { clicks: c.total, previousClicks: pc.total, unique: c.unique, views: v.total, previousViews: pv.total, top: top.map((t) => ({ label: t.label, n: t.n })), busiestHour: busiestHour(hours)?.hour ?? null, newSubscribers: Number(subs?.n ?? 0), brokenLinks: Number(broken?.n ?? 0) };
}

export async function sendReportTo(userId: number, email: string, force: boolean): Promise<boolean> {
  const data = await reportFor(userId);
  if (!force && isQuietWeek(data)) return false;
  const b = await getBrand();
  const r = buildReport(data, `${b.appUrl}/dashboard/analytics`, `${b.appUrl}/dashboard/account`);
  return (await sendEmail("notification", email, r)).queued;
}

/** Monday job: everyone who turned the report on and has not had one in the last 6 days. */
export async function sendWeeklyReports(batch = 50): Promise<number> {
  if (new Date().getUTCDay() !== 1) return 0;
  const lim = Math.min(200, Math.max(1, Math.floor(batch) || 50));
  const users = await query<{ id: number; email: string }>(
    `SELECT id, email FROM users WHERE weekly_report = 1 AND status = 'active' AND (weekly_report_sent_at IS NULL OR weekly_report_sent_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)) ORDER BY id LIMIT ${lim}`,
  );
  for (const u of users) {
    await exec("UPDATE users SET weekly_report_sent_at = UTC_TIMESTAMP() WHERE id = ?", [u.id]); // mark first: a crash must not mean a double send
    await sendReportTo(u.id, u.email, false).catch(() => undefined);
  }
  return users.length;
}
