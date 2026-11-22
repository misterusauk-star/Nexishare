"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { setSettings } from "@/lib/settings";
import { LIMIT_KEYS, parseLimit, type LimitKey } from "@/lib/limits";
import { parseDomainList } from "@/lib/email-domains";
import { isSecretKey, isSiteKey } from "@/lib/turnstile-rules";
import { saveEmailPolicy } from "@/lib/security";
import { forgetLimits, saveSiteLimits, saveUserOverrides } from "@/lib/user-limits";
import type { FormState } from "@/components/client";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function readLimits(fd: FormData): { values: Record<LimitKey, number | null> } | { errors: Record<string, string> } {
  const values = {} as Record<LimitKey, number | null>;
  const errors: Record<string, string> = {};
  for (const k of LIMIT_KEYS) {
    const r = parseLimit(k, s(fd, k));
    if (r.ok) values[k] = r.value; else errors[k] = r.error;
  }
  return Object.keys(errors).length ? { errors } : { values };
}

/** Site-wide defaults for every account. Only an administrator can change them. */
export async function saveSiteLimitsAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const r = readLimits(fd);
  if ("errors" in r) return { errors: r.errors };
  await saveSiteLimits(r.values);
  forgetLimits();
  await audit(me.id, "limits.site", undefined, r.values);
  revalidatePath("/admin/security");
  return { ok: true, message: "Limits saved. They apply to every account without its own limit." };
}

/** Limits for one account. An empty box means "use the site-wide value". */
export async function saveUserLimitsAction(userId: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const r = readLimits(fd);
  if ("errors" in r) return { errors: r.errors };
  try {
    await saveUserOverrides(userId, r.values);
  } catch {
    return { errors: { form: "Could not save. Press Run database updates in Admin > Domains first." } };
  }
  await audit(me.id, "limits.user", String(userId), r.values);
  revalidatePath("/admin/users");
  return { ok: true, message: "Limits saved." };
}

export async function saveEmailPolicyAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const enabled = fd.get("enabled") === "on";
  const { domains, invalid } = parseDomainList(s(fd, "domains"));
  if (invalid.length) return { errors: { domains: `These are not valid domains: ${invalid.slice(0, 5).join(", ")}` } };
  // An empty list means the built-in Gmail and Outlook set.
  await saveEmailPolicy(enabled, domains);
  await audit(me.id, "email-policy.save", enabled ? "on" : "off", { domains });
  revalidatePath("/admin/security");
  return { ok: true, message: enabled ? "Sign-up is limited to the listed email domains." : "Any email domain can sign up." };
}

export async function saveTurnstileAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  if (fd.get("clear") === "on") {
    await setSettings({ turnstile_site_key: "", turnstile_secret_key: "" });
    await audit(me.id, "turnstile.clear");
    revalidatePath("/admin/security");
    return { ok: true, message: "Turnstile is off." };
  }
  const site = s(fd, "site_key");
  const secret = s(fd, "secret_key");
  if (site && !isSiteKey(site)) return { errors: { site_key: "That does not look like a Turnstile site key." } };
  if (secret && !isSecretKey(secret)) return { errors: { secret_key: "That does not look like a Turnstile secret key." } };
  const vals: Record<string, string> = { turnstile_site_key: site };
  if (secret) vals.turnstile_secret_key = encrypt(secret); // replaced only when typed; encrypted at rest, never shown back
  await setSettings(vals);
  await audit(me.id, "turnstile.save");
  revalidatePath("/admin/security");
  return { ok: true, message: "Saved. The check now appears on the sign-in, sign-up and password reset forms." };
}
