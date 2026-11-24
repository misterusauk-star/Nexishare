# SEO plan

What is built into the site for search, which page targets which search, and what to do outside the code.

**Keyword difficulty (KD) is not measured here.** The targets below are chosen by intent and length: specific searches
("link in bio for makeup artists") face far fewer strong pages than head terms ("link in bio"). Check the real KD and
volume in Ahrefs, Semrush or Google Search Console before investing more in a page, and let the Performance report in
Search Console show which pages already get impressions.

## Pages that target searches (main domain)

| Page | Targets (search intent) |
|---|---|
| `/link-in-bio` | link in bio templates, link in bio page ideas |
| `/link-in-bio/<who>` (27) | link in bio for musicians / creators / podcasters / photographers / fitness coaches / chefs / developers / designers / gamers / small business / real estate agents / yoga teachers / makeup artists / fashion boutiques / travel bloggers / teachers / authors / nonprofits / wedding planners / cafes / startups / consultants / athletes / pet businesses / clinics / car enthusiasts / comedians |
| `/tools/qr-code-generator` | qr code generator png svg, qr code generator no sign up, qr code generator download svg |
| `/tools/utm-builder` | utm link builder, utm generator, add utm to link |
| `/learn/what-is-a-link-in-bio` | what is a link in bio, what to put in link in bio |
| `/learn/utm-parameters-explained` | what are utm parameters, utm_source utm_medium utm_campaign |
| `/learn/qr-code-for-menu-or-flyer` | qr code for restaurant menu, qr code size for print, qr code for flyer |
| `/` | the brand, link in bio + url shortener + qr codes |
| `/docs` | url shortener api, link shortener api example |

Bio pages themselves (`bio domain/<name>`) are the largest set of indexable pages: each has a title, description,
canonical, Open Graph tags and, now, `ProfilePage` structured data with the person's social profiles as `sameAs`.

## What is in the code

- One list of pages (`src/lib/seo-pages.ts`) feeds `sitemap.xml`, IndexNow "Submit all" and `llms.txt`, so a new page is announced everywhere at once.
- Canonical address, Open Graph and Twitter text on every marketing page (`src/lib/seo.ts`).
- Structured data: Organization, WebSite, SoftwareApplication and FAQPage on the home page; BreadcrumbList on every inner page; FAQPage on niche pages, tools and guides; WebApplication on the tools; Article on guides; ProfilePage on bio pages.
- Visible breadcrumbs, a short "answer first" box on guides, and internal links between niches, tools and guides.
- The tools run in the browser, so they work without an account and send nothing to the server.
- Short links, bio pages on other domains and the API domain stay out of the index as before (see `robots.ts`).

## To do outside the code

1. Add the main domain and the bio domain in Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml` on each.
2. After each deploy press **Submit all** in Admin > Search so Bing, Yandex, Seznam and Naver are told about the new pages.
3. Write the brand tagline in Admin > Branding with the main phrase in it (for example "Link in bio, short links and QR codes").
4. Upload a brand logo. Search results and social previews use it.
5. Get a few real links to the tools and niche pages: directories for open-source and self-hosted tools, your own social profiles, and guest posts.
6. Add one guide a month on a question people really ask. Aim for answers that are better than the first page of results, not longer ones.
7. In Search Console, look at queries with impressions but no clicks and rewrite that page's title and first paragraph.

## Ideas for later

- An Open Graph image per page (needs an image generator or uploaded artwork).
- Comparison and "alternative to" pages: only with facts you have checked yourself.
- More niche pages for local searches, for example "link in bio for barbers".
- Translations of the niche pages, with `hreflang`.
