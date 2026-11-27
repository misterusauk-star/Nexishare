/** Who may create API keys and whose keys work. DB-free so the rules can be unit-tested. */
export type CreateMode = "everyone" | "selected" | "none";
/** Per-account override: null follows the site policy, true = allowed, false = blocked. */
export type Override = boolean | null;

export const CREATE_MODES: { id: CreateMode; label: string; note: string }[] = [
  { id: "everyone", label: "Everyone", note: "Any account can create keys." },
  { id: "selected", label: "Selected accounts only", note: "Only accounts you set to Allowed in Admin > Users can create keys." },
  { id: "none", label: "Nobody", note: "No one can create new keys. Existing keys keep working unless paused." },
];

export function parseMode(v: string | null | undefined): CreateMode {
  return v === "selected" || v === "none" ? v : "everyone";
}

export function overrideFromDb(v: unknown): Override {
  if (v === null || v === undefined) return null;
  return Number(v) === 1 ? true : Number(v) === 0 ? false : null;
}

export function overrideToDb(v: "default" | "allow" | "block"): number | null {
  return v === "allow" ? 1 : v === "block" ? 0 : null;
}

export type Verdict = { ok: true } | { ok: false; code: "api_paused" | "api_blocked" | "api_creation_closed"; message: string };

/** Can this account create a new key? Super admins always can. */
export function canCreateKey(role: string, override: Override, mode: CreateMode): Verdict {
  if (role === "super_admin") return { ok: true };
  if (override === false) return { ok: false, code: "api_blocked", message: "API access is turned off for your account. Contact the administrator." };
  if (mode === "none") return { ok: false, code: "api_creation_closed", message: "New API keys are not available right now." };
  if (mode === "selected" && override !== true) return { ok: false, code: "api_creation_closed", message: "API keys are only available to selected accounts. Ask the administrator for access." };
  return { ok: true };
}

/** Does a request with this account's key go through? Super admins always do. */
export function canUseApi(role: string, override: Override, paused: boolean): Verdict {
  if (role === "super_admin") return { ok: true };
  if (override === false) return { ok: false, code: "api_blocked", message: "API access is turned off for this account." };
  if (paused) return { ok: false, code: "api_paused", message: "The API is paused by the administrator. Try again later." };
  return { ok: true };
}
