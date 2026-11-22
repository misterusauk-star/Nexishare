import { getSetting, setSettings } from "./settings";
import { decrypt } from "./crypto";
import { allowedFromSetting, isEmailAllowed } from "./email-domains";
import { TURNSTILE_FIELD, TURNSTILE_VERIFY_URL, parseVerifyResponse } from "./turnstile-rules";

/* ---------- Allowed email providers (sign-up) ---------- */

export async function emailPolicy(): Promise<{ enabled: boolean; domains: string[]; custom: boolean }> {
  const raw = await getSetting("email_domains_allowed");
  return { enabled: (await getSetting("email_domains_enabled")) !== "0", domains: allowedFromSetting(raw), custom: !!raw };
}

export async function saveEmailPolicy(enabled: boolean, domains: string[]): Promise<void> {
  await setSettings({ email_domains_enabled: enabled ? "1" : "0", email_domains_allowed: domains.join(", ") });
}

/** Null when the address may sign up, otherwise a message for the form. Existing accounts are never affected. */
export async function emailDomainError(email: string): Promise<string | null> {
  const p = await emailPolicy();
  if (!p.enabled || isEmailAllowed(email, p.domains)) return null;
  const shown = p.domains.slice(0, 6).join(", ") + (p.domains.length > 6 ? " and more" : "");
  return `Sign-up is open to these email providers: ${shown}.`;
}

/* ---------- Cloudflare Turnstile ---------- */

async function storedSecret(): Promise<string> {
  const enc = await getSetting("turnstile_secret_key"); // stored encrypted, like the other secrets
  if (enc) { try { return decrypt(enc).trim(); } catch { return ""; } }
  return (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
}

/** Settings win over environment variables, so an administrator can change keys without a redeploy. */
export async function turnstileKeys(): Promise<{ siteKey: string; secret: string }> {
  return {
    siteKey: ((await getSetting("turnstile_site_key")) ?? process.env.TURNSTILE_SITE_KEY ?? "").trim(),
    secret: await storedSecret(),
  };
}

/** The public site key when Turnstile is fully configured, otherwise null (forms then show no widget and skip the check). */
export async function turnstileSiteKey(): Promise<string | null> {
  const k = await turnstileKeys();
  return k.siteKey && k.secret ? k.siteKey : null;
}

/** Null when the visitor passed (or Turnstile is off). Otherwise a message for the form. Fails closed when Cloudflare cannot be reached. */
export async function verifyTurnstile(fd: FormData, ip: string): Promise<string | null> {
  const k = await turnstileKeys();
  if (!k.siteKey || !k.secret) return null;
  const token = String(fd.get(TURNSTILE_FIELD) ?? "");
  if (!token || token.length > 4096) return "Please complete the check below the form.";
  try {
    const body = new URLSearchParams({ secret: k.secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) });
    const out = parseVerifyResponse(await res.json());
    return out.ok ? null : "The check failed. Try again.";
  } catch {
    return "Could not run the check. Try again in a moment.";
  }
}
