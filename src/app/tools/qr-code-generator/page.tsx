import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/json-ld";
import { QrTool } from "@/components/qr-tool";
import { GUIDES, TOOLS } from "@/lib/seo-pages.ts";
import { pageMeta } from "@/lib/seo";

const tool = TOOLS.find((t) => t.slug === "qr-code-generator")!;
const guide = GUIDES.find((g) => g.slug === "qr-code-for-menu-or-flyer")!;
export async function generateMetadata() { return pageMeta({ title: tool.title, description: tool.description, path: "/tools/qr-code-generator" }); }

export default async function Page() {
  const b = await getBrand();
  return (
    <SiteShell wide>
      <JsonLd data={[
        breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Tools", path: "/tools" }, { name: tool.name, path: "/tools/qr-code-generator" }]),
        faqLd(guide.faq),
        { "@context": "https://schema.org", "@type": "WebApplication", name: tool.name, url: `${b.appUrl}/tools/qr-code-generator`, applicationCategory: "UtilitiesApplication", operatingSystem: "Any", description: tool.description, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
      ]} />
      <article className="seo">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Tools", href: "/tools" }, { name: tool.name }]} />
        <h1>QR code generator</h1>
        <p className="lead">Make a QR code for a web address or any text, choose the colours, and download it as PNG or SVG. It runs in your browser: what you type is not sent or saved.</p>
        <QrTool />
        <section>
          <h2>{guide.title}</h2>
          <p>{guide.answer}</p>
          <p>A QR code that holds a short link can be repointed later without reprinting. With an account, every short link has a QR code that counts scans: <Link href="/link-in-bio">see how it works for your kind of page</Link>.</p>
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
