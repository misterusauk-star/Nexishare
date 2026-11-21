import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { query } from "@/lib/db";
import { currentHost } from "@/lib/host-guard";
import { bioUrl, getDomainState } from "@/lib/domains";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const b = await getBrand();
  const st = await getDomainState();
  const host = await currentHost();
  // A sitemap may only list URLs of its own host: site pages on the main domain, bio pages on the bio host.
  const onApp = host === st.appHost.toLowerCase();
  const onBio = host === st.bioHost.toLowerCase();
  if (!onApp && !onBio) return [];
  const out: MetadataRoute.Sitemap = onApp ? [["", 1], ["/docs", 0.8], ["/terms", 0.3], ["/privacy", 0.3]].map(([p, priority]) => ({ url: `${b.appUrl}${p}`, changeFrequency: "monthly" as const, priority: priority as number })) : [];
  if (!onBio) return out;
  try {
    // Published bio pages only. Short links are never listed.
    const rows = await query<{ username: string; created_at: Date }>(
      `SELECT u.username, p.created_at FROM pages p JOIN users u ON u.id = p.user_id
        WHERE p.published = 1 AND p.moderated = 0 AND u.status = 'active' AND u.username IS NOT NULL ORDER BY p.created_at DESC LIMIT 5000`,
    );
    for (const r of rows) out.push({ url: bioUrl(st, r.username), lastModified: r.created_at, changeFrequency: "weekly", priority: 0.6 });
  } catch {
    // Before install the tables do not exist; the static entries are enough.
  }
  return out;
}
