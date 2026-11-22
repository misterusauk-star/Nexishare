import { getBrand } from "@/lib/brand";
import { query } from "@/lib/db";
import { currentHost } from "@/lib/host-guard";
import { bioUrl, getDomainState } from "@/lib/domains";

export const dynamic = "force-dynamic";

const text = (body: string) =>
  new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });

/**
 * llms.txt: a short, plain-text map of the site for language models (https://llmstxt.org).
 * Every domain describes only what it serves: the main domain the product and its docs, the bio domain the public
 * pages, link and API domains just say what they are.
 */
export async function GET() {
  const b = await getBrand();
  const st = await getDomainState();
  const host = await currentHost();
  const onApp = host === st.appHost.toLowerCase();
  const onBio = host === st.bioHost.toLowerCase();
  const apiBase = `${st.apiUrl}/api/v1`;

  if (onApp) {
    return text(`# ${b.name}

> ${b.tagline} A self-hosted link-in-bio page builder, URL shortener, QR code generator and click analytics.

## Product
- [Home](${b.appUrl}/): what ${b.name} does and how to sign up
- [API reference](${b.appUrl}/docs): create and manage short links with an API key: device destinations, universal links, scheduling, click limits, custom domains and bulk create, with curl, JavaScript, Python, PHP, Go and Ruby examples
- [Terms of service](${b.appUrl}/terms)
- [Privacy policy](${b.appUrl}/privacy)

## Good to know
- Short links live on link domains, for example ${st.linkDomains.map((d) => d.host).slice(0, 3).join(", ") || st.defaultHost}. They redirect to their destination and are not indexed.
- Public bio pages live on ${st.bioHost}, one page per person.
- The REST API base URL is ${apiBase}. It needs an API key (Authorization: Bearer ob_...), is rate limited, and has no public endpoints.
- Sitemap: ${b.appUrl}/sitemap.xml
`);
  }

  if (onBio) {
    let pages = "";
    try {
      const rows = await query<{ username: string; display_name: string | null }>(
        `SELECT u.username, p.display_name FROM pages p JOIN users u ON u.id = p.user_id
          WHERE p.published = 1 AND p.moderated = 0 AND u.status = 'active' AND u.username IS NOT NULL
          ORDER BY p.created_at DESC LIMIT 200`,
      );
      pages = rows.map((r) => `- [${(r.display_name || r.username).replace(/[\[\]\r\n]/g, " ")}](${bioUrl(st, r.username)})`).join("\n");
    } catch { /* tables not there yet */ }
    return text(`# ${b.name} bio pages

> Public link-in-bio pages made with ${b.name}. Each page is one person's profile with their links.

## Pages
${pages || "- No public pages yet."}

## More
- [About ${b.name}](${b.appUrl}/)
- Sitemap: ${new URL(b.appUrl).protocol}//${host}/sitemap.xml
`);
  }

  if (st.apiHosts.includes(host)) {
    return text(`# ${b.name} API

> REST API for ${b.name}. Requires an API key. Not intended for crawling.

- [API reference](${b.appUrl}/docs)
- Base URL: ${apiBase}
`);
  }

  return text(`# ${b.name} short links

> Short links on this domain redirect to their destination. There is no page content to index.

- [About ${b.name}](${b.appUrl}/)
`);
}
