import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBrand } from "@/lib/brand";
import { currentHost, enforceHost } from "@/lib/host-guard";
import { bioUrl, getDomainState, linkHost } from "@/lib/domains";
import { reqInfo } from "@/lib/request";
import { recordClick } from "@/lib/analytics";
import { resolveDestination, type DeviceChoice } from "@/lib/smart-link.ts";
import { isBlocked } from "@/lib/validation";
import { getLinkBySlug, getPublicPage } from "@/lib/services/public";
import { linkState, takeClick } from "@/lib/services/links";
import { PublicPageView } from "@/components/public-page";
import { JsonLd } from "@/components/json-ld";
import { profileLd } from "@/lib/seo-profile.ts";
import { ActionForm, Field } from "@/components/client";
import { unlockLinkAction } from "@/app/actions/public";
import { countryFor } from "@/lib/geoip";
import { pickGeo } from "@/lib/geo-routes.ts";
import { getGeoRoutes } from "@/lib/services/linkops";
import "../bio.css";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await enforceHost();
  const { slug } = await params;
  const b = await getBrand();
  const st0 = await getDomainState();
  if (await getLinkBySlug(slug)) return { title: "Link", robots: { index: false, follow: false } }; // cached; no page query for redirects
  const data = await getPublicPage(slug);
  if (!data) return { title: "Link", robots: { index: false, follow: false } };
  const name = data.page.display_name || data.user.username;
  const desc = data.page.bio || b.tagline;
  return {
    title: name,
    description: desc,
    alternates: { canonical: bioUrl(st0, data.user.username) },
    openGraph: { title: name, description: desc, url: bioUrl(st0, data.user.username), siteName: b.name, type: "profile", images: data.page.avatar_url ? [data.page.avatar_url] : undefined },
    twitter: { card: "summary", title: name, description: desc },
  };
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function SlugPage({ params, searchParams }: Props) {
  await enforceHost(); // before any lookup or click logging
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  const sp = await searchParams;
  const b = await getBrand();

  const link = await getLinkBySlug(slug); // cached, so most redirects never reach MySQL
  const data = link ? null : await getPublicPage(slug);
  const host = await currentHost();
  const st = await getDomainState();
  if (data) {
    if (host !== st.bioHost.toLowerCase()) notFound(); // bio pages live on the bio domain (or the default when there is none)
    const info = await reqInfo();
    await recordClick({
      type: "page", id: data.page.id, userId: data.user.id, info, ownHost: b.host,
      utm: { source: first(sp.utm_source), medium: first(sp.utm_medium), campaign: first(sp.utm_campaign) },
    });
    return (
      <>
        <JsonLd data={profileLd({ url: bioUrl(st, data.user.username), name: data.page.display_name || data.user.username, bio: data.page.bio, image: data.page.avatar_url, socials: data.page.socials })} />
        <PublicPageView data={data} brand={b} />
      </>
    );
  }

  if (!link) notFound();
  if (host !== linkHost(st, link.domain_id)) notFound(); // a link answers only on its own domain

  const state = !link.owner_active ? "moderated" : linkState(link);
  // An expired link can send visitors to a fallback page instead of the "expired" notice.
  if (state === "expired" && link.expired_url && link.owner_active && !(await isBlocked(link.expired_url))) redirect(link.expired_url);
  if (state !== "active") return <Gone state={state} slug={slug} />;
  if (await isBlocked(link.target_url)) return <Gone state="moderated" slug={slug} />;
  // A link with an open abuse report is not followed automatically: the visitor sees where it goes and decides.
  if ((link.open_reports ?? 0) > 0 && sp.continue !== "1") return <Reported slug={slug} target={link.target_url} />;

  if (link.password_hash) {
    return (
      <main className="gone">
        <div className="gone-box">
          <p className="slug">{linkHost(st, link.domain_id)}<b>/</b>{slug}</p>
          <h1>This link is protected</h1>
          <p>Enter the password the sender gave you to continue.</p>
          <ActionForm action={unlockLinkAction.bind(null, slug)} submit="Continue" pendingLabel="Checking...">
            <Field label="Password" name="password" type="password" autoComplete="off" required />
          </ActionForm>
        </div>
      </main>
    );
  }

  const info0 = await reqInfo();
  // Links with country routes need the visitor's country; it is also saved with the click.
  const hasGeo = !!(link as { has_geo?: number }).has_geo;
  const info = hasGeo ? { ...info0, country: await countryFor(info0) } : info0;
  // A link with a click limit takes one of its visits first; when none are left it behaves like an expired link.
  if (link.max_clicks != null && !(await takeClick(link.id))) {
    if (link.expired_url && link.owner_active && !(await isBlocked(link.expired_url))) redirect(link.expired_url);
    return <Gone state="expired" slug={slug} />;
  }
  await recordClick({
    type: "link", id: link.id, userId: link.user_id, info, ownHost: b.host,
    utm: { source: first(sp.utm_source), medium: first(sp.utm_medium), campaign: first(sp.utm_campaign) },
  });
  // Visitors on a platform with its own URL go there. A universal link has no destination of its own, so other devices get a chooser.
  // A country route comes first: it applies only to links that have one (has_geo), so other links pay nothing for it.
  if (hasGeo) {
    const geo = pickGeo(await getGeoRoutes(link.id).catch(() => []), info.country);
    if (geo && !(await isBlocked(geo))) redirect(geo);
  }
  const res = resolveDestination(link, info.ua);
  if (res.kind === "choose") {
    const open: DeviceChoice[] = [];
    for (const c of res.choices) if (!(await isBlocked(c.url))) open.push(c);
    return <Chooser slug={slug} host={linkHost(st, link.domain_id)} choices={open} />;
  }
  const dest = res.url;
  if (dest !== link.target_url && (await isBlocked(dest))) return <Gone state="moderated" slug={slug} />;
  redirect(dest);
}

function Chooser({ slug, host, choices }: { slug: string; host: string; choices: DeviceChoice[] }) {
  return (
    <main id="main" className="gone">
      <div className="gone-box">
        <p className="slug">{host}<b>/</b>{slug}</p>
        <h1>Choose your device</h1>
        <p>This link has no page for your device. It is available for:</p>
        <ul className="choose">
          {choices.map((c) => (
            <li key={c.os}><a className="btn" href={c.url} rel="nofollow noreferrer">{c.label}</a></li>
          ))}
        </ul>
        {choices.length === 0 && <p className="muted">Nothing is available right now.</p>}
        <p className="small"><Link href={`/report?target=${encodeURIComponent(slug)}`}>Report this link</Link></p>
      </div>
    </main>
  );
}

const COPY: Record<string, { title: string; body: string }> = {
  disabled: { title: "This link is switched off", body: "Its owner has paused it. Try again later or ask them directly." },
  expired: { title: "This link has expired", body: "It was set to stop working after a certain date. Ask the sender for a fresh one." },
  scheduled: { title: "This link is not live yet", body: "It has a start date that has not arrived. Check back soon." },
  moderated: { title: "This link was switched off", body: "An administrator disabled it, usually after a report. Do not follow it from another source either." },
  review: { title: "This link is waiting for review", body: "Its name needs a quick check by an administrator before it goes live." },
};

function Reported({ slug, target }: { slug: string; target: string }) {
  let shown = target;
  try { const u = new URL(target); shown = u.host + (u.pathname === "/" ? "" : u.pathname); } catch { /* keep raw */ }
  return (
    <main id="main" className="gone warn-page">
      <div className="gone-box">
        <p className="slug">/<b>{slug}</b></p>
        <h1>This link has been reported</h1>
        <p>Someone told us it may be spam, a scam or unsafe, and we have not checked it yet. It would take you to:</p>
        <p className="slug dest-url">{shown}</p>
        <p className="row wrap">
          <Link className="btn btn-primary" href="/">Take me back</Link>
          <a className="btn" href={`?continue=1`} rel="nofollow noreferrer">Continue anyway</a>
        </p>
        <p className="small"><Link href={`/report?target=${encodeURIComponent(slug)}`}>Report this link</Link></p>
      </div>
    </main>
  );
}

function Gone({ state, slug }: { state: string; slug: string }) {
  const c = COPY[state] ?? COPY.moderated;
  return (
    <main className="gone">
      <div className="gone-box">
        <p className="slug">/<b>{slug}</b></p>
        <h1>{c.title}</h1>
        <p>{c.body}</p>
        <p><Link href="/">Go to the home page</Link></p>
        <p className="small"><Link href={`/report?target=${encodeURIComponent(slug)}`}>Report this link</Link></p>
      </div>
    </main>
  );
}
