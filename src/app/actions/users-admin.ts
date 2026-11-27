"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exec, queryOne } from "@/lib/db";
import { audit, destroyAllSessions, hashPassword, requireAdmin } from "@/lib/auth";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { emailDomainError } from "@/lib/security";
import { getBrand } from "@/lib/brand";
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
