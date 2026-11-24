import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/json-ld";
import { UtmTool } from "@/components/utm-tool";
import { GUIDES, TOOLS } from "@/lib/seo-pages.ts";
import { pageMeta } from "@/lib/seo";

const tool = TOOLS.find((t) => t.slug === "utm-builder")!;
const guide = GUIDES.find((g) => g.slug === "utm-parameters-explained")!;
export async function generateMetadata() { return pageMeta({ title: tool.title, description: tool.description, path: "/tools/utm-builder" }); }

export default async function Page() {
  const b = await getBrand();
  return (
    <SiteShell wide>
      <JsonLd data={[
        breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Tools", path: "/tools" }, { name: tool.name, path: "/tools/utm-builder" }]),
        faqLd(guide.faq),
        { "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url: `${b.appUrl}/tools/utm-builder`, applicationCategory: "BusinessApplication", operatingSystem: "Any", description: tool.description, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
      ]} />
      <article className="seo">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Tools", href: "/tools" }, { name: tool.name }]} />
        <h1>UTM link builder</h1>
        <p className="lead">Add campaign tags to a web address, so your analytics show which newsletter, post or QR code sent each visit. It runs in your browser: nothing is sent or saved.</p>
        <UtmTool />
        <section>
          <h2>How to use it</h2>
          <ol className="steps">
            <li>Paste the page you want people to land on.</li>
            <li>Fill in the source (where you share it), the medium (the kind of channel) and a campaign name.</li>
            <li>Copy the tagged link. For a shorter address to share, make it a short link in your dashboard, and compare clicks per campaign.</li>
          </ol>
        </section>
        <section>
          <h2>{guide.title}</h2>
          <p>{guide.answer}</p>
          <p><Link href={`/learn/${guide.slug}`}>Read the full guide</Link></p>
        </section>
        <section>
          <h2>Common questions</h2>
          {guide.faq.map((f) => <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </section>
      </article>
    </SiteShell>
  );
}
