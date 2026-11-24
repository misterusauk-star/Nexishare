import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { query } from "@/lib/db";
import { currentHost } from "@/lib/host-guard";
import { bioUrl, getDomainState } from "@/lib/domains";
import { marketingPaths } from "@/lib/seo-pages.ts";

export const dynamic = "force-dynamic";

/** When this version was deployed (the build id file is written at build time). Search engines use lastmod to decide what to recrawl. */
function deployedAt(): Date | undefined {
  try { return fs.statSync(path.join(process.cwd(), ".next", "BUILD_ID")).mtime; } catch { return undefined; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const b = await getBrand();
  const st = await getDomainState();
  const host = await currentHost();
  // A sitemap may only list URLs of its own host: site pages on the main domain, bio pages on the bio host.
  const onApp = host === st.appHost.toLowerCase();
  const onBio = host === st.bioHost.toLowerCase();
  if (!onApp && !onBio) return [];
  const out: MetadataRoute.Sitemap = onApp ? marketingPaths().map(({ path: p, priority }) => ({ url: `${b.appUrl}${p}`, lastModified: deployedAt(), changeFrequency: "monthly" as const, priority })) : [];
  if (!onBio) return out;
  try {
    // Published bio pages only. Short links are never listed.
    const rows = await query<{ username: string; created_at: Date; blocks_at: Date | null }>(
      `SELECT u.username, p.created_at, MAX(b.created_at) AS blocks_at
         FROM pages p JOIN users u ON u.id = p.user_id LEFT JOIN blocks b ON b.page_id = p.id
        WHERE p.published = 1 AND p.moderated = 0 AND u.status = 'active' AND u.username IS NOT NULL
        GROUP BY p.id, u.username, p.created_at ORDER BY p.created_at DESC LIMIT 40000`,
    );
    for (const r of rows) {
      // Last change we can see: the newest block, or the page itself.
      const last = r.blocks_at && new Date(r.blocks_at) > new Date(r.created_at) ? r.blocks_at : r.created_at;
      out.push({ url: bioUrl(st, r.username), lastModified: last, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch {
    // Before install the tables do not exist; the static entries are enough.
  }
  return out;
}
