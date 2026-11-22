// Pure Cloudflare Turnstile helpers (no network). https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_FIELD = "cf-turnstile-response";

export const isSiteKey = (k: string): boolean => /^[0-9A-Za-z_-]{8,80}$/.test(k.trim());
export const isSecretKey = (k: string): boolean => /^[0-9A-Za-z_-]{8,120}$/.test(k.trim());

/** Reads Cloudflare's JSON answer. Anything unexpected counts as a failure. */
export function parseVerifyResponse(json: unknown): { ok: boolean; codes: string[] } {
  if (!json || typeof json !== "object") return { ok: false, codes: ["invalid-response"] };
  const o = json as { success?: unknown; "error-codes"?: unknown };
  const codes = Array.isArray(o["error-codes"]) ? o["error-codes"].map(String) : [];
  return { ok: o.success === true, codes };
}
