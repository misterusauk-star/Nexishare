import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { currentHost } from "@/lib/host-guard";
import { getDomainState } from "@/lib/domains";
import { robotsGroups } from "@/lib/crawlers";

export const dynamic = "force-dynamic";

const BIO_DISALLOW = ["/out/", "/api/", "/report"];
const APP_DISALLOW = ["/dashboard", "/admin", "/api/", "/install", "/out/", "/login", "/register", "/reset-password", "/verify", "/report"];

/**
 * robots.txt differs per domain:
 * - main domain: public pages are crawlable, app pages and the API are not;
 * - bio domain: bio pages are crawlable, redirects and the API are not;
 * - link domains and the API domain: nothing to index (short links are redirects), so everything is disallowed.
 * Search engines, social preview bots and AI assistants (see lib/crawlers.ts) get their own explicit "Allow: /" groups with the
 * same disallow list as everyone else, so none of them is left guessing. llms.txt is served on every domain.
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
      rules: [...robotsGroups(BIO_DISALLOW), { userAgent: "*", allow: "/", disallow: BIO_DISALLOW }],
      sitemap: `${origin}/sitemap.xml`,
      host: origin,
    };
  }
  return {
    rules: [...robotsGroups(APP_DISALLOW), { userAgent: "*", allow: "/", disallow: APP_DISALLOW }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
