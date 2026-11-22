import crypto from "node:crypto";

/** Pure IndexNow rules (https://www.indexnow.org/documentation). No DB, no network. */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_URLS_PER_REQUEST = 10_000;

export const newIndexNowKey = (): string => crypto.randomBytes(16).toString("hex");
export const isValidKey = (k: string): boolean => /^[A-Za-z0-9-]{8,128}$/.test(k);
export const keyFileUrl = (host: string, key: string): string => `https://${host}/${key}.txt`;

/** Groups absolute https URLs by host; invalid and non-https URLs are dropped, duplicates removed. */
export function groupByHost(urls: string[]): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  for (const raw of urls) {
    let u: URL;
    try { u = new URL(raw); } catch { continue; }
    if (u.protocol !== "https:") continue;
    const set = out.get(u.host.toLowerCase()) ?? new Set<string>();
    set.add(u.toString());
    out.set(u.host.toLowerCase(), set);
  }
  return new Map([...out].map(([h, s]) => [h, [...s]]));
}

export interface IndexNowPayload { host: string; key: string; keyLocation: string; urlList: string[] }

/** One request body per host, at most MAX_URLS_PER_REQUEST URLs each (more become more bodies). */
export function buildPayloads(urls: string[], key: string): IndexNowPayload[] {
  const out: IndexNowPayload[] = [];
  for (const [host, list] of groupByHost(urls)) {
    for (let i = 0; i < list.length; i += MAX_URLS_PER_REQUEST) {
      out.push({ host, key, keyLocation: keyFileUrl(host, key), urlList: list.slice(i, i + MAX_URLS_PER_REQUEST) });
    }
  }
  return out;
}

/** IndexNow answers 200 or 202 when the URLs were accepted. */
export const describeStatus = (status: number): string =>
  status === 200 || status === 202 ? "Accepted"
    : status === 400 ? "Bad request"
    : status === 403 ? "Key not found on the site: open the key file address and check it shows the key"
    : status === 422 ? "URLs do not match the host"
    : status === 429 ? "Too many requests: try again later"
    : `Error ${status}`;
