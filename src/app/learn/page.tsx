import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd } from "@/components/json-ld";
import { GUIDES } from "@/lib/seo-pages.ts";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  return pageMeta({ title: "Guides: link in bio, UTM tags and QR codes", description: "Short, practical guides on link in bio pages, UTM parameters and QR codes: what they are, what to do, and the mistakes to avoid.", path: "/learn" });
}

export default async function Learn() {
  const b = await getBrand();
  return (
    <SiteShell wide>
      <JsonLd data={breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Guides", path: "/learn" }])} />
      <article className="seo">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Guides" }]} />
        <h1>Guides</h1>
        <p className="lead">Short, practical answers for people who share links.</p>
        <ul className="plain guide-list">
          {GUIDES.map((g) => <li key={g.slug}><Link href={`/learn/${g.slug}`}><strong>{g.title}</strong></Link><p>{g.description}</p></li>)}
        </ul>
      </article>
    </SiteShell>
  );
}
