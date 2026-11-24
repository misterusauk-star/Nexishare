import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { flag } from "@/lib/settings";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd } from "@/components/json-ld";
import { TemplatePreview } from "@/components/template-preview";
import { NICHES } from "@/lib/seo-niches.ts";
import { TEMPLATES } from "@/lib/templates.ts";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  return pageMeta({
    title: `Link in bio templates: ${TEMPLATES.length} designs for every kind of page`,
    description: `Pick a link in bio template for creators, musicians, cafes, coaches, shops and more. One click applies the look, with platform logos, a QR code and click stats.`,
    path: "/link-in-bio",
  });
}

export default async function Hub() {
  const b = await getBrand();
  const open = await flag("registration_enabled", true);
  return (
    <SiteShell wide>
      <JsonLd data={[
        breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Link in bio", path: "/link-in-bio" }]),
        { "@context": "https://schema.org", "@type": "ItemList", name: "Link in bio templates", itemListElement: TEMPLATES.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: `Link in bio for ${NICHES[t.id].who}`, url: `${b.appUrl}/link-in-bio/${NICHES[t.id].slug}` })) },
      ]} />
      <article className="seo">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Link in bio" }]} />
        <h1>Link in bio templates for every kind of page</h1>
        <p className="lead">A link in bio page puts everything you share behind one address. Choose the template closest to your work, apply it in one click, and change anything you like. {TEMPLATES.length} designs, each with the platform logos that fit.</p>
        <p className="row">{open ? <Link className="btn btn-primary" href="/register">Make your page</Link> : <Link className="btn btn-primary" href="/login">Sign in</Link>}<Link className="btn" href="/learn/what-is-a-link-in-bio">What is a link in bio?</Link></p>
        <ul className="niche-grid">
          {TEMPLATES.map((t) => (
            <li key={t.id}>
              <Link href={`/link-in-bio/${NICHES[t.id].slug}`}>
                <TemplatePreview t={t} />
                <strong>{t.niche}</strong>
                <span className="small muted">{t.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </SiteShell>
  );
}
