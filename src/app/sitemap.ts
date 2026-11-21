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
  const out: MetadataRoute.Sitemap = onApp ? ["", "/terms", "/privacy", "/docs"].map((p) => ({ url: `${b.appUrl}${p}` })) : [];
  if (!onBio) return out;
  try {
    // Published bio pages only. Short links are never listed.
    const rows = await query<{ username: string; created_at: Date }>(
      `SELECT u.username, p.created_at FROM pages p JOIN users u ON u.id = p.user_id
        WHERE p.published = 1 AND p.moderated = 0 AND u.status = 'active' AND u.username IS NOT NULL ORDER BY p.created_at DESC LIMIT 5000`,
    );
    for (const r of rows) out.push({ url: bioUrl(st, r.username), lastModified: r.created_at });
  } catch {
    // Before install the tables do not exist; the static entries are enough.
  }
  return out;
}
