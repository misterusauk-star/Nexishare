// UTM link builder: pure, so the page and the tests share it.
export interface UtmInput { url: string; source: string; medium: string; campaign: string; term?: string; content?: string }
export type UtmResult = { ok: true; url: string } | { ok: false; error: string };

/** Lowercase, spaces to hyphens, drop characters that are awkward in a URL. */
export const cleanUtm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._~-]/g, "").replace(/-{2,}/g, "-");

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export function buildUtmUrl(i: UtmInput, tidy = true): UtmResult {
  const raw = i.url.trim();
  if (!raw) return { ok: false, error: "Enter the web address you want to tag." };
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return { ok: false, error: "That is not a valid web address." }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, error: "Use an address that starts with http or https." };
  if (!u.hostname.includes(".")) return { ok: false, error: "That is not a valid web address." };
  const val = (v?: string) => { const s = (v ?? "").trim(); return tidy ? cleanUtm(s) : s; };
  const vals: [string, string][] = [["utm_source", val(i.source)], ["utm_medium", val(i.medium)], ["utm_campaign", val(i.campaign)], ["utm_term", val(i.term)], ["utm_content", val(i.content)]];
  if (!vals[0][1] || !vals[1][1] || !vals[2][1]) return { ok: false, error: "Source, medium and campaign are needed." };
  for (const k of KEYS) u.searchParams.delete(k); // replace tags that are already on the address
  for (const [k, v] of vals) if (v) u.searchParams.append(k, v);
  return { ok: true, url: u.toString() };
}
