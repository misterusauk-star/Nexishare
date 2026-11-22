import { query, queryOne } from "./db";
import { getBrand } from "./brand";
import { getSetting, setSettings } from "./settings";
import { getDomainState, bioUrl } from "./domains";
import { rateLimit } from "./ratelimit";
import { INDEXNOW_ENDPOINT, buildPayloads, describeStatus, isValidKey, newIndexNowKey } from "./indexnow-rules";

/** IndexNow tells Bing, Yandex, Seznam, Naver and others about new and changed URLs the moment they change (Google uses the sitemap). */

export const indexNowEnabled = async (): Promise<boolean> => (await getSetting("indexnow_enabled")) !== "0";

/** The site key: created once, then reused. It is served at https://host/<key>.txt on every public host. */
export async function indexNowKey(): Promise<string> {
  const have = await getSetting("indexnow_key");
  if (have && isValidKey(have)) return have;
  const key = newIndexNowKey();
  await setSettings({ indexnow_key: key });
  return key;
}

/** Hosts that serve the key file: the main domain and the bio domain. */
export async function indexNowHosts(): Promise<string[]> {
  const st = await getDomainState();
  return [...new Set([st.appHost, st.bioHost].map((h) => h.toLowerCase()))];
}

export interface SubmitResult { host: string; count: number; status: number; note: string }

/** Sends URLs to IndexNow, one request per host. Never throws: a failed ping must not break saving a page. */
export async function submitUrls(urls: string[]): Promise<SubmitResult[]> {
  const key = await indexNowKey();
  const results: SubmitResult[] = [];
  for (const body of buildPayloads(urls, key)) {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      results.push({ host: body.host, count: body.urlList.length, status: res.status, note: describeStatus(res.status) });
    } catch {
      results.push({ host: body.host, count: body.urlList.length, status: 0, note: "Could not reach IndexNow" });
    }
  }
  return results;
}

/** A bio page was published or changed: tell search engines. At most once per 10 minutes per page, fire and forget. */
export async function notifyBioPage(userId: number): Promise<void> {
  try {
    if (!(await indexNowEnabled())) return;
    const row = await queryOne<{ username: string | null; published: number; moderated: number; status: string }>(
      "SELECT u.username, p.published, p.moderated, u.status FROM pages p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?",
      [userId],
    );
    if (!row?.username || !row.published || row.moderated || row.status !== "active") return;
    if (!(await rateLimit(`indexnow:${row.username}`, 1, 600))) return;
    const st = await getDomainState();
    await submitUrls([bioUrl(st, row.username)]);
  } catch { /* best effort */ }
}

/** Every public URL: the site pages plus all published bio pages. Used by the "Submit all" button in Admin. */
export async function allPublicUrls(): Promise<string[]> {
  const b = await getBrand();
  const st = await getDomainState();
  const urls = ["", "/docs", "/terms", "/privacy"].map((p) => `${b.appUrl}${p}`);
  try {
    const rows = await query<{ username: string }>(
      `SELECT u.username FROM pages p JOIN users u ON u.id = p.user_id
        WHERE p.published = 1 AND p.moderated = 0 AND u.status = 'active' AND u.username IS NOT NULL ORDER BY p.created_at DESC LIMIT 40000`,
    );
    for (const r of rows) urls.push(bioUrl(st, r.username));
  } catch { /* tables not there yet */ }
  return urls;
}
