"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exec, queryOne } from "@/lib/db";
import { audit, destroyAllSessions, hashPassword, requireAdmin } from "@/lib/auth";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { emailDomainError } from "@/lib/security";
import { getBrand } from "@/lib/brand";
import { clearSlugCache } from "@/lib/slug-cache";
import { overrideToDb } from "@/lib/api-access.ts";
import { createUser, issueToken, sendVerification } from "@/lib/services/users";
import { emailAvailable, sendEmail } from "@/lib/email/mailer";
import type { FormState } from "@/components/client";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const fail = (errors: Record<string, string>): FormState => ({ errors });
const ok = (message: string): FormState => ({ ok: true, message });

interface Target { id: number; email: string; role: string; status: string }

/** Loads the account an admin acts on. Your own account is managed from Account, not here. */
async function target(me: { id: number }, id: number): Promise<Target | null> {
  if (id === me.id) return null;
  return queryOne<Target>("SELECT id, email, role, status FROM users WHERE id = ?", [id]);
}
const refresh = () => revalidatePath("/admin/users");

/** Sets a new password and signs the person out everywhere. */
export async function setUserPasswordAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const u = await target(me, id);
  if (!u) return fail({ form: "Use Account to change your own password." });
  const p = passwordSchema.safeParse(s(fd, "password"));
  if (!p.success) return fail({ password: p.error.issues[0].message });
  await exec("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(p.data), id]);
  await destroyAllSessions(id);
  await audit(me.id, "user.set_password", String(id));
  if (fd.get("notify") && (await emailAvailable("security_alert"))) {
    const brand = await getBrand();
    void sendEmail("security_alert", u.email, {
      subject: `Your ${brand.name} password was changed`,
      heading: "Your password was changed",
      paragraphs: ["An administrator set a new password for your account and signed you out everywhere.", `If you did not expect this, contact ${brand.supportEmail || "the site owner"}.`],
    }).catch(() => {});
  }
  refresh();
  return ok("Password saved. They were signed out everywhere.");
}

/** Emails a password reset link (valid 1 hour) or, with mode=show, returns a link the admin can pass on (valid 24 hours). */
export async function sendResetLinkAction(id: number, mode: "email" | "show", _: FormState, __: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const u = await target(me, id);
  if (!u) return fail({ form: "Use Account to change your own password." });
  const brand = await getBrand();
  if (mode === "show") {
    const token = await issueToken(id, "password_reset", 1440);
    await audit(me.id, "user.reset_link_shown", String(id));
    return ok(`${brand.appUrl}/reset-password?token=${token}`);
  }
  if (!(await emailAvailable("password_reset"))) return fail({ form: "Email is not set up on this server. Use Get link instead." });
  const token = await issueToken(id, "password_reset", 60);
  await sendEmail("password_reset", u.email, {
    subject: `Reset your ${brand.name} password`,
    heading: "Choose a new password",
    paragraphs: ["An administrator sent you this link to choose a new password. It works for one hour.", "If you did not expect it, you can ignore this email."],
    button: { label: "Reset password", url: `${brand.appUrl}/reset-password?token=${token}` },
  });
  await audit(me.id, "user.reset_link_sent", String(id));
  return ok(`Reset link emailed to ${u.email}.`);
}

/** Suspends with an optional reason that the person sees at sign-in. Works before migration 019 too (without the reason). */
export async function suspendWithReasonAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (!(await target(me, id))) return fail({ form: "You cannot suspend your own account." });
  const reason = s(fd, "reason").slice(0, 190);
  try {
    await exec("UPDATE users SET status = 'suspended', suspend_reason = ? WHERE id = ?", [reason || null, id]);
  } catch {
    await exec("UPDATE users SET status = 'suspended' WHERE id = ?", [id]);
  }
  await destroyAllSessions(id);
  await audit(me.id, "user.suspend", String(id), { reason });
  refresh();
  return ok("Account suspended. They were signed out everywhere.");
}

export async function saveUserNoteAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const note = s(fd, "note").slice(0, 500);
  try {
    await exec("UPDATE users SET admin_note = ? WHERE id = ?", [note || null, id]);
  } catch {
    return fail({ note: "Run the database updates first (Admin > Domains)." });
  }
  await audit(me.id, "user.note", String(id));
  refresh();
  return ok("Note saved. Only admins can see it.");
}

/** Sets API access for one account: default (site policy), allowed or blocked. Needs migration 020. */
export async function setUserApiAccessAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const v = s(fd, "access");
  if (v !== "default" && v !== "allow" && v !== "block") return fail({ form: "Choose an option." });
  if (!(await target(me, id))) return fail({ form: "Not available for your own account." });
  try {
    await exec("UPDATE users SET api_access = ? WHERE id = ?", [overrideToDb(v), id]);
  } catch {
    return fail({ form: "Run the database updates first (Admin > Domains)." });
  }
  await audit(me.id, "user.api_access", String(id), { access: v });
  refresh();
  return ok(v === "block" ? "API blocked. Their keys stop working now." : v === "allow" ? "API allowed." : "API follows the site policy.");
}

/** Revokes every API key the account has. Their apps stop working until they create a new key. */
export async function revokeUserKeysAction(id: number, _: FormState, __: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (!(await target(me, id))) return fail({ form: "Use the API page for your own keys." });
  const r = await exec("UPDATE api_keys SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL", [id]);
  await audit(me.id, "user.revoke_keys", String(id), { count: r.affectedRows });
  refresh();
  return ok(r.affectedRows ? `${r.affectedRows} key${r.affectedRows === 1 ? "" : "s"} revoked.` : "They had no active keys.");
}

const BULK_OPS = ["suspend", "reinstate", "signout", "verify"] as const;

/** Runs one operation on the ticked accounts (up to 200). Your own account and, for suspend, other super admins are skipped. */
export async function bulkUsersAction(fd: FormData): Promise<void> {
  const me = await requireAdmin();
  const op = String(fd.get("op") ?? "");
  const ids = [...new Set(fd.getAll("ids").map(Number))].filter((n) => Number.isInteger(n) && n > 0 && n !== me.id).slice(0, 200);
  if (!(BULK_OPS as readonly string[]).includes(op) || !ids.length) redirect("/admin/users?bulk=none");
  const ph = ids.map(() => "?").join(",");
  let n = 0;
  if (op === "suspend") {
    n = (await exec(`UPDATE users SET status = 'suspended' WHERE id IN (${ph}) AND role <> 'super_admin' AND status = 'active'`, ids)).affectedRows;
    await exec(`DELETE FROM sessions WHERE user_id IN (${ph}) AND user_id IN (SELECT id FROM users WHERE status = 'suspended')`, ids);
  } else if (op === "reinstate") {
    n = (await exec(`UPDATE users SET status = 'active' WHERE id IN (${ph}) AND status = 'suspended'`, ids)).affectedRows;
  } else if (op === "signout") {
    n = (await exec(`DELETE FROM sessions WHERE user_id IN (${ph})`, ids)).affectedRows;
  } else {
    n = (await exec(`UPDATE users SET email_verified_at = UTC_TIMESTAMP() WHERE id IN (${ph}) AND email_verified_at IS NULL`, ids)).affectedRows;
  }
  await audit(me.id, `user.bulk_${op}`, `${ids.length} accounts`, { ids, changed: n });
  clearSlugCache();
  redirect(`/admin/users?bulk=${op}:${n}`);
}

export async function signOutUserAction(id: number, _: FormState, __: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (!(await target(me, id))) return fail({ form: "Use Account for your own sessions." });
  await destroyAllSessions(id);
  await audit(me.id, "user.sign_out_all", String(id));
  return ok("Signed out everywhere.");
}

export async function markVerifiedAction(id: number, _: FormState, __: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (!(await target(me, id))) return fail({ form: "Not available for your own account." });
  await exec("UPDATE users SET email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?", [id]);
  await audit(me.id, "user.verify_email", String(id));
  refresh();
  return ok("Email marked as verified.");
}

export async function resendVerificationAdminAction(id: number, _: FormState, __: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const u = await target(me, id);
  if (!u) return fail({ form: "Not available for your own account." });
  const sent = await sendVerification({ id: u.id, email: u.email });
  return sent ? ok(`Confirmation email sent to ${u.email}.`) : fail({ form: "Email is not set up on this server. Use Mark verified instead." });
}

export async function changeUserEmailAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const u = await target(me, id);
  if (!u) return fail({ form: "Use Account to change your own email." });
  const e = emailSchema.safeParse(s(fd, "email"));
  if (!e.success) return fail({ email: e.error.issues[0].message });
  if (e.data === u.email.toLowerCase()) return fail({ email: "This is already their email." });
  if (await queryOne("SELECT id FROM users WHERE email = ? AND id <> ?", [e.data, id])) return fail({ email: "This email already has another account." });
  const dom = await emailDomainError(e.data);
  if (dom) return fail({ email: dom });
  // A linked Google account belongs to the old address, so it is disconnected.
  await exec("UPDATE users SET email = ?, email_verified_at = IF(?, UTC_TIMESTAMP(), NULL), google_id = NULL WHERE id = ?", [e.data, fd.get("verified") ? 1 : 0, id]);
  await destroyAllSessions(id);
  await audit(me.id, "user.change_email", String(id), { from: u.email, to: e.data });
  refresh();
  return ok("Email changed. They were signed out everywhere.");
}

export async function createUserAdminAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const p = z.object({ email: emailSchema, password: passwordSchema, role: z.enum(["user", "super_admin"]) })
    .safeParse({ email: s(fd, "email"), password: s(fd, "password"), role: s(fd, "role") || "user" });
  if (!p.success) {
    const errors: Record<string, string> = {};
    for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
    return fail(errors);
  }
  if (await queryOne("SELECT id FROM users WHERE email = ?", [p.data.email])) return fail({ email: "An account with this email already exists." });
  const id = await createUser({ ...p.data, verified: Boolean(fd.get("verified")) });
  await audit(me.id, "user.create", String(id), { role: p.data.role });
  refresh();
  return ok(`Account created for ${p.data.email}.`);
}
