import Link from "next/link";
import { redirect } from "next/navigation";
import { getBrand } from "@/lib/brand";
import { currentUser } from "@/lib/auth";
import { isInstalled } from "@/lib/install";
import { flag } from "@/lib/settings";
import { JsonLd, faqLd } from "@/components/json-ld";
import { pageMeta } from "@/lib/seo";
import { TEMPLATES } from "@/lib/templates.ts";
import { NICHES } from "@/lib/seo-niches.ts";

const FAQ = [
  { q: "What is a link in bio page?", a: "One web page that holds all your important links. You put its address in the single link field of a social profile, and visitors pick from your links there." },
  { q: "Can I make short links and QR codes too?", a: "Yes. Every link can have a short address you choose, an expiry, a password and a QR code, and clicks are counted for each." },
  { q: "Does it track visitors?", a: "It counts clicks and unique visitors by country, device, browser and referrer. Visitor IP addresses are hashed with a daily salt and never stored." },
  { q: "Can I use my own domain?", a: "No. Custom domains are not supported: you use the domains we provide. You can put each short link on any of them." },
  { q: "Is there an API?", a: "Yes. Create an API key in the dashboard to create links, set up your page and read stats from your own code." },
];

export async function generateMetadata() {
  const b = await getBrand();
  return {
    ...(await pageMeta({
      title: `${b.name}: link in bio, URL shortener and QR codes`,
      description: `${b.name} makes a link in bio page, short links and QR codes, and shows which ones people open. ${TEMPLATES.length} templates, platform logos and an API.`,
      path: "",
    })),
    title: { absolute: `${b.name}: link in bio, URL shortener and QR codes` },
  };
}

export default async function Home() {
  if (!(await isInstalled())) redirect("/install");
  const b = await getBrand();
  const user = await currentUser();
  const open = await flag("registration_enabled", true);
  return (
    <div className="home">
      <JsonLd data={[
        { "@context": "https://schema.org", "@type": "Organization", name: b.name, url: b.appUrl, ...(b.logoUrl ? { logo: b.logoUrl } : {}) },
        { "@context": "https://schema.org", "@type": "WebSite", name: b.name, url: b.appUrl },
        { "@context": "https://schema.org", "@type": "SoftwareApplication", name: b.name, applicationCategory: "BusinessApplication", operatingSystem: "Web", description: `${b.name} makes a link in bio page, short links and QR codes, with click analytics and an API.` },
        faqLd(FAQ),
      ]} />
      <header className="home-head">
        <Link href="/" className="brand" style={{ padding: 0 }}>{b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : b.name}</Link>
        <span style={{ flex: 1 }} />
        {user ? (
          <Link className="btn btn-primary" href="/dashboard">Open dashboard</Link>
        ) : (
          <>
            <Link className="btn btn-ghost" href="/login">Sign in</Link>
            {open ? <Link className="btn btn-primary" href="/register">Create account</Link> : null}
          </>
        )}
      </header>

      <section className="home-hero">
        <div>
          <h1>{b.tagline}</h1>
          <p className="lead">
            Shorten links, put everything you share on one page, print a QR code for either, and see which ones people actually open. It all runs on this server, and the visitor data stays here too.
          </p>
          {!user && open ? <Link className="btn btn-primary" href="/register">Claim your address</Link> : null}
        </div>
        <div className="ticket" aria-label="What an address looks like">
          <div><span className="slug">{b.bioHost}<b>/</b>yourname</span></div>
          <div><span>Short link</span><span className="slug">{b.host}<b>/</b>spring-menu</span></div>
          <div><span>Points to</span><span className="slug">cafe.example/menus/spring.pdf</span></div>
          <div><span>QR code</span><span>PNG or SVG</span></div>
          <div><span>Opened</span><span>counted, never traced to a person</span></div>
        </div>
      </section>

      <div className="home-facts">
        <dl>
          <dt>Bio page</dt>
          <dd>Links, headings, socials and eight themes. Reorder by dragging. Schedule a link to appear on a date.</dd>
        </dl>
        <dl>
          <dt>Short links</dt>
          <dd>Pick your own slug, set an expiry, protect a link with a password, or switch it off without deleting it.</dd>
        </dl>
        <dl>
          <dt>Analytics</dt>
          <dd>Clicks, unique visitors, country, device, browser and referrer. IP addresses are hashed with a daily salt and never stored.</dd>
        </dl>
        <dl>
          <dt>API</dt>
          <dd>Create keys in the dashboard and manage links from your own scripts. <Link href="/docs">Read the reference</Link>.</dd>
        </dl>
      </div>

      <section className="home-more" aria-labelledby="who">
        <h2 id="who">A link in bio page for your kind of work</h2>
        <p>Pick a template made for what you do. One click applies the colours and style, and links to Instagram, YouTube, Spotify, WhatsApp and many more show their own logo.</p>
        <ul className="chips">
          {TEMPLATES.slice(0, 12).map((t) => <li key={t.id}><Link href={`/link-in-bio/${NICHES[t.id].slug}`}>{NICHES[t.id].who}</Link></li>)}
          <li><Link href="/link-in-bio">All {TEMPLATES.length} templates</Link></li>
        </ul>
        <h2>Free tools</h2>
        <p><Link href="/tools/qr-code-generator">QR code generator</Link> (PNG and SVG) and <Link href="/tools/utm-builder">UTM link builder</Link>. They run in your browser. New to this? Read <Link href="/learn/what-is-a-link-in-bio">what a link in bio is</Link>.</p>
        <h2>Questions</h2>
        {FAQ.map((f) => <details key={f.q} className="faq"><summary>{f.q}</summary><p>{f.a}</p></details>)}
      </section>

      <footer className="site-foot" style={{ marginTop: 64, padding: "24px 0" }}>
        <span>{b.footerText || b.name}</span>
        <nav aria-label="Explore">
          <Link href="/link-in-bio">Link in bio</Link>
          <Link href="/tools">Tools</Link>
          <Link href="/learn">Guides</Link>
          <Link href="/docs">API</Link>
        </nav>
        <nav aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/report">Report abuse</Link>
        </nav>
      </footer>
    </div>
  );
}
