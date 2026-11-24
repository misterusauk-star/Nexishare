import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { flag } from "@/lib/settings";
import { SiteShell } from "@/components/site-shell";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbLd, faqLd } from "@/components/json-ld";
import { TemplatePreview } from "@/components/template-preview";
import { BrandIcon } from "@/components/brand-icon";
import { NICHES, nicheBySlug } from "@/lib/seo-niches.ts";
import { TEMPLATES, templateById } from "@/lib/templates.ts";
import { brandForUrl } from "@/lib/brands.ts";
import { pageMeta } from "@/lib/seo";

type Props = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hit = nicheBySlug((await params).niche);
  if (!hit) return { title: "Not found", robots: { index: false } };
  const t = templateById(hit.id)!;
  return pageMeta({
    title: `Link in bio for ${hit.copy.who}: one page for all your links`,
    description: `${hit.copy.intro} Start from the ${t.name} template, with logos for the platforms you use, a QR code and click stats.`,
    path: `/link-in-bio/${hit.copy.slug}`,
  });
}

export default async function NichePage({ params }: Props) {
  const hit = nicheBySlug((await params).niche);
  if (!hit) notFound();
  const { id, copy } = hit;
  const t = templateById(id)!;
  const b = await getBrand();
  const open = await flag("registration_enabled", true);
  const path = `/link-in-bio/${copy.slug}`;
  const platforms = [...new Map(t.starter.flatMap((s) => { const br = s.type === "link" ? brandForUrl(s.url) : undefined; return br ? [[br.key, br] as const] : []; })).values()];
  const others = TEMPLATES.filter((x) => x.id !== id).slice(0, 8);
  return (
    <SiteShell wide>
      <JsonLd data={[breadcrumbLd(b.appUrl, [{ name: "Home", path: "" }, { name: "Link in bio", path: "/link-in-bio" }, { name: copy.who, path }]), faqLd(copy.faq)]} />
      <article className="seo">
        <Breadcrumbs trail={[{ name: "Home", href: "/" }, { name: "Link in bio", href: "/link-in-bio" }, { name: copy.who }]} />
        <div className="seo-hero">
          <div>
            <h1>Link in bio for {copy.who}</h1>
            <p className="lead">{copy.intro}</p>
            <p className="row">
              {open ? <Link className="btn btn-primary" href="/register">Make your page</Link> : <Link className="btn btn-primary" href="/login">Sign in</Link>}
              <Link className="btn" href="/docs">See the API</Link>
            </p>
          </div>
          <TemplatePreview t={t} />
        </div>

        <section>
          <h2>What to put on your page</h2>
          <ol className="steps">{copy.tips.map((tip) => <li key={tip}>{tip}</li>)}</ol>
        </section>

        <section>
          <h2>The {t.name} template</h2>
          <p>{t.note} One click applies it to your page: the colours, button shape and font. You can then change any of them.</p>
          {platforms.length > 0 && (
            <>
              <p>Links to these platforms show their own logo on the button, so visitors recognise them at a glance:</p>
              <ul className="chips">{platforms.map((p) => <li key={p.key}><BrandIcon brand={p} size={16} /> {p.label}</li>)}</ul>
            </>
          )}
          <p>Your social profiles go in a separate row of round icons under the links, so the buttons stay for what you want clicked.</p>
        </section>

        <section>
          <h2>What you get</h2>
          <ul className="plain">
            <li><strong>Short links and QR codes.</strong> Every page and every link has a short address and a QR code to print.</li>
            <li><strong>Click stats.</strong> See clicks and unique visitors by day, country, device and referrer. Visitor addresses are hashed and never stored.</li>
            <li><strong>Scheduling.</strong> Show a link from one date and hide it on another, or stop it after a number of clicks.</li>
            <li><strong>An API.</strong> Set up your page and links from code with an API key.</li>
          </ul>
        </section>

        <section>
          <h2>Questions from {copy.who}</h2>
          {copy.faq.map((f) => (
            <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </section>

        <section>
          <h2>More link in bio pages</h2>
          <ul className="chips">
            {others.map((o) => <li key={o.id}><Link href={`/link-in-bio/${NICHES[o.id].slug}`}>{NICHES[o.id].who}</Link></li>)}
            <li><Link href="/link-in-bio">All templates</Link></li>
          </ul>
          <p className="small muted">Related: <Link href="/learn/what-is-a-link-in-bio">What is a link in bio</Link>, <Link href="/tools/qr-code-generator">QR code generator</Link> and <Link href="/tools/utm-builder">UTM link builder</Link>.</p>
        </section>
      </article>
    </SiteShell>
  );
}
