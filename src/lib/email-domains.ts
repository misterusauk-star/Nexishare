// Pure email-domain allow list (no DB). Used at sign-up to keep disposable and throw-away mailboxes out.
export const DEFAULT_ALLOWED_DOMAINS = ["gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com"];

export const emailDomain = (email: string): string => {
  const at = String(email).lastIndexOf("@");
  return at < 0 ? "" : String(email).slice(at + 1).trim().toLowerCase();
};

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export const isDomain = (d: string): boolean => DOMAIN_RE.test(d);

/** "gmail.com, @outlook.com\nexample.org" -> ["gmail.com", "outlook.com", "example.org"], valid and unique only. */
export function parseDomainList(text: string): { domains: string[]; invalid: string[] } {
  const domains: string[] = [];
  const invalid: string[] = [];
  for (const part of String(text ?? "").split(/[\s,;]+/)) {
    const d = part.trim().toLowerCase().replace(/^@/, "");
    if (!d) continue;
    if (!isDomain(d)) { invalid.push(part.trim()); continue; }
    if (!domains.includes(d)) domains.push(d);
  }
  return { domains, invalid };
}

/** Exact domain match. A subdomain (user@mail.gmail.com) is not the provider, so it does not pass. */
export const isEmailAllowed = (email: string, allowed: string[]): boolean => {
  const d = emailDomain(email);
  return d !== "" && allowed.includes(d);
};

/** Settings value to list: an unset value means the defaults. */
export const allowedFromSetting = (value: string | undefined | null): string[] => {
  if (value === undefined || value === null || value.trim() === "") return DEFAULT_ALLOWED_DOMAINS;
  const { domains } = parseDomainList(value);
  return domains.length ? domains : DEFAULT_ALLOWED_DOMAINS;
};
