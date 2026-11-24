import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd } from "@/components/json-ld";
import { TOOLS } from "@/lib/seo-pages.ts";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  return pageMeta({ title: "Free link tools: QR code generator and UTM link builder", description: "Small tools for people who share links: make a QR code and download it as PNG or SVG, or add campaign tags to a web address. They run in your browser.", path: "/tools" });
}

export default async function Tools() {
  const b = await getBrand();
  return (
    <SiteShell wide>
      <JsonLd data={breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Tools", path: "/tools" }])} />
      <article className="seo">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Tools" }]} />
        <h1>Link tools</h1>
        <p className="lead">Small tools for people who share links. They run in your browser: what you type is not sent to a server or saved.</p>
        <ul className="niche-grid">
          {TOOLS.map((t) => <li key={t.slug}><Link href={`/tools/${t.slug}`}><strong>{t.name}</strong><span className="muted">{t.short}</span></Link></li>)}
        </ul>
      </article>
    </SiteShell>
  );
}
