"use server";

import { revalidatePath } from "next/cache";
import { exec, queryOne } from "@/lib/db";
import { audit, createSession, destroyAllSessions, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LANGUAGES } from "@/lib/i18n";
import { getBrand } from "@/lib/brand";
import { getDomainState, linkHost } from "@/lib/domains";
import { randomToken, sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/ratelimit";
import { phase2Enabled } from "@/lib/features";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { createLink, deleteLink, updateLink } from "@/lib/services/links";
import { sendVerification, verificationRequired } from "@/lib/services/users";
import { validateNewSlug, slugRateOk, SLUG_RATE_MESSAGE } from "@/lib/slug-service";
import { reqInfo } from "@/lib/request";
import { slugSchema } from "@/lib/validation";
import { notifyBioPage } from "@/lib/indexnow";
import {
  BLOCK_TYPES_P1, BLOCK_TYPES_P2, deleteBlock, ensurePage, reorderBlocks, saveBlock, toggleBlock, updateCustom, updateProfile, updateSocials,
} from "@/lib/services/pages";
import { SOCIALS } from "@/lib/themes";
import type { FormState } from "@/components/client";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

function fail(errors: Record<string, string>): FormState {
  return { errors };
}

/* ---------- Bio page ---------- */

/** Creates the person's bio page by claiming a name. Registration no longer does this. */
export async function claimBioAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (u.username) return { ok: true, message: "You already have a bio page." };
  const p = slugSchema.safeParse(s(fd, "username"));
  if (!p.success) return fail({ username: p.error.issues[0].message });
  const info = await reqInfo();
  if (!(await slugRateOk(u.id, info.ip))) return fail({ username: SLUG_RATE_MESSAGE });
  const named = await validateNewSlug(p.data, { appName: (await getBrand()).name });
  if (!named.ok) return fail({ username: named.error });
  // The WHERE guard keeps two tabs from claiming twice; a unique-key clash means someone took the name a moment ago.
  try {
    const r = await exec("UPDATE users SET username = ? WHERE id = ? AND username IS NULL", [named.slug, u.id]);
    if (!r.affectedRows) return { ok: true, message: "You already have a bio page." };
  } catch {
    return fail({ username: "This name is not available." });
  }
  await ensurePage(u.id, named.slug);
  if (named.review) await exec("UPDATE pages SET review_status = 'pending', review_reason = ? WHERE user_id = ?", [named.review.slice(0, 190), u.id]);
  await audit(u.id, "bio.create", named.slug);
  void notifyBioPage(u.id);
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/page");
}

/* ---------- Links ---------- */

export async function createLinkAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!(await rateLimit(`link:create:${u.id}`, 120, 3600))) return fail({ form: "You are creating links too fast. Wait a few minutes." });
  const b = await getBrand();
  const r = await createLink(u.id, b.host, {
    target_url: s(fd, "target_url"), slug: s(fd, "slug"), title: s(fd, "title"), password: s(fd, "password"),
    expires_at: s(fd, "expires_at"), starts_at: s(fd, "starts_at"), group_id: s(fd, "group_id") || null,
    domain_id: s(fd, "domain_id") || null,
    max_clicks: s(fd, "max_clicks") || null,
    ios_url: s(fd, "ios_url"), android_url: s(fd, "android_url"), windows_url: s(fd, "windows_url"), mac_url: s(fd, "mac_url"), linux_url: s(fd, "linux_url"), expired_url: s(fd, "expired_url"),
    utm_source: s(fd, "utm_source"), utm_medium: s(fd, "utm_medium"), utm_campaign: s(fd, "utm_campaign"),
  });
  if (!r.ok) return fail(r.errors);
  revalidatePath("/dashboard/links");
  const st = await getDomainState();
  return { ok: true, message: `Created ${linkHost(st, r.data.domain_id)}/${r.data.slug}` };
}

/** Universal link: no destination of its own, only device URLs (at least one). Other devices see a chooser page. */
export async function createUniversalAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!(await rateLimit(`link:create:${u.id}`, 120, 3600))) return fail({ form: "You are creating links too fast. Wait a few minutes." });
  const b = await getBrand();
  const st = await getDomainState();
  const r = await createLink(u.id, b.host, {
    slug: s(fd, "slug"), title: s(fd, "title"), domain_id: s(fd, "domain_id") || null,
    ios_url: s(fd, "ios_url"), android_url: s(fd, "android_url"), windows_url: s(fd, "windows_url"), mac_url: s(fd, "mac_url"), linux_url: s(fd, "linux_url"), expired_url: s(fd, "expired_url"),
  });
  if (!r.ok) {
    const e = { ...r.errors };
    if (e.target_url) { e.ios_url = e.target_url; delete e.target_url; } // "enter at least one device URL" belongs on the first device field
    return fail(e);
  }
  revalidatePath("/dashboard/universal");
  return { ok: true, message: `Created ${linkHost(st, r.data.domain_id)}/${r.data.slug}` };
}

export async function updateLinkAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const b = await getBrand();
  const raw: Record<string, unknown> = {
    slug: s(fd, "slug"), title: s(fd, "title"),
    expires_at: s(fd, "expires_at"), starts_at: s(fd, "starts_at"), enabled: fd.get("enabled") === "on",
  };
  if (s(fd, "target_url")) raw.target_url = s(fd, "target_url"); // empty on a universal link = keep it universal
  if (fd.has("group_id")) raw.group_id = s(fd, "group_id") || null;
  if (fd.has("domain_id")) raw.domain_id = s(fd, "domain_id") || null;
  if (fd.has("max_clicks")) raw.max_clicks = s(fd, "max_clicks") || null;
  for (const k of ["ios_url", "android_url", "windows_url", "mac_url", "linux_url", "expired_url"]) if (fd.has(k)) raw[k] = s(fd, k);
  if (fd.get("remove_password") === "on") raw.password = "";
  else if (s(fd, "password")) raw.password = s(fd, "password");
  const r = await updateLink(u.id, id, b.host, raw, u.role === "super_admin");
  if (!r.ok) return fail(r.errors);
  revalidatePath("/dashboard/links");
  return { ok: true, message: "Saved." };
}

export async function toggleLinkAction(id: number): Promise<void> {
  const u = await requireUser();
  const b = await getBrand();
  const row = await queryOne<{ enabled: number }>("SELECT enabled FROM links WHERE id = ?", [id]);
  if (!row) return;
  await updateLink(u.id, id, b.host, { enabled: !row.enabled }, u.role === "super_admin");
  revalidatePath("/dashboard/links");
}

export async function deleteLinkAction(id: number): Promise<void> {
  const u = await requireUser();
  await deleteLink(u.id, id, u.role === "super_admin");
  revalidatePath("/dashboard/links");
}

export async function bulkLinksAction(op: "enable" | "disable" | "delete", ids: number[]): Promise<void> {
  const u = await requireUser();
  const b = await getBrand();
  for (const id of ids.slice(0, 200)) {
    if (!Number.isInteger(id)) continue;
    if (op === "delete") await deleteLink(u.id, id);
    else await updateLink(u.id, id, b.host, { enabled: op === "enable" });
  }
  revalidatePath("/dashboard/links");
}

/* ---------- Bio page ---------- */

export async function saveProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const r = await updateProfile(u.id, {
    display_name: s(fd, "display_name"), bio: s(fd, "bio"), avatar_url: s(fd, "avatar_url"), published: fd.get("published") === "on",
  });
  if (!r.ok) return fail(r.errors);
  revalidatePath("/dashboard/page");
  if (u.username) revalidatePath(`/${u.username}`);
  return { ok: true, message: "Profile saved." };
}

export async function saveThemeAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const a = await updateProfile(u.id, { theme: s(fd, "theme") });
  if (!a.ok) return fail(a.errors);
  const custom: Record<string, string> = {};
  for (const k of ["bg", "fg", "btnBg", "btnFg", "shape", "style", "font"]) if (s(fd, k) && s(fd, k) !== "default") custom[k] = s(fd, k);
  if (fd.get("use_custom") !== "on") for (const k of ["bg", "fg", "btnBg", "btnFg"]) delete custom[k];
  const c = await updateCustom(u.id, custom);
  if (!c.ok) return fail(c.errors);
  revalidatePath("/dashboard/page");
  if (u.username) revalidatePath(`/${u.username}`);
  return { ok: true, message: "Appearance saved." };
}

export async function saveSocialsAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const raw: Record<string, string> = {};
  for (const k of SOCIALS) raw[k] = s(fd, `social_${k}`);
  const r = await updateSocials(u.id, raw);
  if (!r.ok) return fail(Object.fromEntries(Object.entries(r.errors).map(([k, v]) => [`social_${k}`, v])));
  revalidatePath("/dashboard/page");
  if (u.username) revalidatePath(`/${u.username}`);
  return { ok: true, message: "Social links saved." };
}

const allowedBlocks = () => (phase2Enabled() ? [...BLOCK_TYPES_P1, ...BLOCK_TYPES_P2] : [...BLOCK_TYPES_P1]);

export async function saveBlockAction(blockId: number | null, _: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const type = s(fd, "type") || "link";
  const data: Record<string, string> = {};
  for (const k of ["description", "price", "button", "email", "phone", "org", "note"]) if (s(fd, k)) data[k] = s(fd, k);
  const r = await saveBlock(u.id, blockId, {
    type, title: s(fd, "title"), url: s(fd, "url"), data, enabled: true,
    starts_at: s(fd, "starts_at") || null, ends_at: s(fd, "ends_at") || null, group_id: s(fd, "group_id") || null,
  }, allowedBlocks());
  if (!r.ok) return fail(r.errors);
  revalidatePath("/dashboard/page");
  if (u.username) revalidatePath(`/${u.username}`);
  return { ok: true, message: blockId ? "Saved." : "Added to your page." };
}

export async function deleteBlockAction(id: number): Promise<void> {
  const u = await requireUser();
  await deleteBlock(u.id, id);
  revalidatePath("/dashboard/page");
  if (u.username) revalidatePath(`/${u.username}`);
}

export async function toggleBlockAction(id: number): Promise<void> {
  const u = await requireUser();
  await toggleBlock(u.id, id);
  revalidatePath("/dashboard/page");
  if (u.username) revalidatePath(`/${u.username}`);
}

export async function reorderBlocksAction(ids: number[]): Promise<void> {
  const u = await requireUser();
  await reorderBlocks(u.id, ids.filter((n) => Number.isInteger(n)));
  if (u.username) revalidatePath(`/${u.username}`);
}

/* ---------- API keys ---------- */

export async function createApiKeyAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = s(fd, "name").trim().slice(0, 80);
  if (!name) return fail({ name: "Give the key a name so you can recognise it later." });
  if (!(await rateLimit(`apikey:create:${u.id}`, 5, 3600))) return fail({ form: "You are creating keys too fast. Try again in an hour." });
  if (await verificationRequired() && !u.email_verified_at) return fail({ form: "Confirm your email before creating an API key." });
  const n = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM api_keys WHERE user_id = ? AND revoked_at IS NULL", [u.id]);
  if (Number(n?.n) >= 10) return fail({ form: "You can have 10 active keys. Revoke one first." });
  const secret = `ob_${randomToken(24)}`;
  await exec("INSERT INTO api_keys (user_id, name, prefix, key_hash) VALUES (?, ?, ?, ?)", [u.id, name, secret.slice(0, 10), sha256(secret)]);
  await audit(u.id, "api_key.create", name);
  revalidatePath("/dashboard/api");
  return { ok: true, message: `KEY:${secret}` };
}

export async function revokeApiKeyAction(id: number): Promise<void> {
  const u = await requireUser();
  await exec("UPDATE api_keys SET revoked_at = UTC_TIMESTAMP() WHERE id = ? AND user_id = ?", [id, u.id]);
  revalidatePath("/dashboard/api");
}

/* ---------- Account ---------- */

export async function changeEmailAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const e = emailSchema.safeParse(s(fd, "email"));
  if (!e.success) return fail({ email: e.error.issues[0].message });
  const row = await queryOne<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = ?", [u.id]);
  if (row?.password_hash && !(await verifyPassword(s(fd, "password"), row.password_hash))) return fail({ password: "That password is not right." });
  if (await queryOne("SELECT id FROM users WHERE email = ? AND id <> ?", [e.data, u.id])) return fail({ email: "That email is already in use." });
  await exec("UPDATE users SET email = ?, email_verified_at = NULL WHERE id = ?", [e.data, u.id]);
  await sendVerification({ id: u.id, email: e.data });
  revalidatePath("/dashboard/account");
  return { ok: true, message: "Email updated. Check your inbox if verification is enabled." };
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (!(await rateLimit(`pw:${u.id}`, 10, 3600))) return fail({ form: "Too many attempts. Try again in an hour." });
  const row = await queryOne<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = ?", [u.id]);
  if (row?.password_hash && !(await verifyPassword(s(fd, "current"), row.password_hash))) return fail({ current: "That password is not right." });
  const p = passwordSchema.safeParse(s(fd, "password"));
  if (!p.success) return fail({ password: p.error.issues[0].message });
  await exec("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(p.data), u.id]);
  await destroyAllSessions(u.id);
  await createSession(u.id);
  await audit(u.id, "user.password_change");
  return { ok: true, message: "Password changed. Other devices were signed out." };
}

export async function saveLanguageAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const lang = s(fd, "language");
  if (!LANGUAGES[lang]) return fail({ language: "Pick one of the listed languages." });
  await exec("UPDATE users SET language = ? WHERE id = ?", [lang, u.id]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Language saved." };
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (u.role === "super_admin") {
    const n = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin'");
    if (Number(n?.n) <= 1) return fail({ form: "You are the only Super Admin. Promote someone else before deleting this account." });
  }
  const confirmWord = u.username ?? u.email;
  if (s(fd, "confirm").trim().toLowerCase() !== confirmWord.toLowerCase()) return fail({ confirm: `Type ${confirmWord} to confirm.` });
  const row = await queryOne<{ password_hash: string | null }>("SELECT password_hash FROM users WHERE id = ?", [u.id]);
  if (row?.password_hash && !(await verifyPassword(s(fd, "password"), row.password_hash))) return fail({ password: "That password is not right." });
  await audit(u.id, "user.delete_self", u.username ?? u.email);
  await destroySession();
  await exec("DELETE FROM users WHERE id = ?", [u.id]);
  redirect("/");
}
