import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { currentHost } from "@/lib/host-guard";
import { getDomainState } from "@/lib/domains";

export const dynamic = "force-dynamic";

/**
 * robots.txt differs per domain:
 * - main domain: public pages are crawlable, app pages and the API are not;
 * - bio domain: bio pages are crawlable, redirects and the API are not;
 * - link domains and the API domain: nothing to index (short links are redirects), so everything is disallowed.
 * AI crawlers are not singled out: the rules apply to every user agent. llms.txt is served on every domain.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const b = await getBrand();
  const st = await getDomainState();
  const host = (await currentHost()) || new URL(b.appUrl).host;
  const origin = `${b.appUrl.startsWith("http://") ? "http" : "https"}://${host}`;
  const onApp = host === st.appHost.toLowerCase();
  const onBio = host === st.bioHost.toLowerCase();

  if (!onApp && !onBio) return { rules: [{ userAgent: "*", disallow: "/" }] };
  if (onBio && !onApp) {
    return {
      rules: [{ userAgent: "*", allow: "/", disallow: ["/out/", "/api/", "/report"] }],
      sitemap: `${origin}/sitemap.xml`,
      host: origin,
    };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/install", "/out/", "/login", "/register", "/reset-password", "/verify", "/report"] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
