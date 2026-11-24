import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/json-ld";
import { GUIDES, guideBySlug } from "@/lib/seo-pages.ts";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return { title: "Not found", robots: { index: false } };
  return pageMeta({ title: g.title, description: g.description, path: `/learn/${g.slug}`, type: "article" });
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default async function Guide({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const b = await getBrand();
  const path = `/learn/${g.slug}`;
  const more = GUIDES.filter((x) => x.slug !== g.slug);
  return (
    <SiteShell>
      <JsonLd data={[
        breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Guides", path: "/learn" }, { name: g.title, path }]),
        faqLd(g.faq),
        { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, dateModified: g.updated, datePublished: g.updated, mainEntityOfPage: `${b.appUrl}${path}`, author: { "@type": "Organization", name: b.name }, publisher: { "@type": "Organization", name: b.name } },
      ]} />
      <article className="seo prose">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Guides", href: "/learn" }, { name: g.title }]} />
        <h1>{g.title}</h1>
        <p className="answer">{g.answer}</p>
        <p className="small muted">Updated <time dateTime={g.updated}>{g.updated}</time></p>
        <nav className="toc" aria-label="On this page"><ul>{g.sections.map((s) => <li key={s.h}><a href={`#${slugify(s.h)}`}>{s.h}</a></li>)}<li><a href="#faq">Questions</a></li></ul></nav>
        {g.sections.map((s) => (
          <section key={s.h} id={slugify(s.h)}>
            <h2>{s.h}</h2>
            {s.p.map((p) => <p key={p}>{p}</p>)}
            {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
          </section>
        ))}
        <section id="faq">
          <h2>Questions</h2>
          {g.faq.map((f) => <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </section>
        <section>
          <h2>Keep going</h2>
          <ul>
            <li><Link href="/tools/qr-code-generator">QR code generator</Link></li>
            <li><Link href="/tools/utm-builder">UTM link builder</Link></li>
            <li><Link href="/link-in-bio">Link in bio templates</Link></li>
            {more.map((m) => <li key={m.slug}><Link href={`/learn/${m.slug}`}>{m.title}</Link></li>)}
          </ul>
        </section>
      </article>
    </SiteShell>
  );
}
