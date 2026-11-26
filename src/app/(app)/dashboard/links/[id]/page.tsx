import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDomainState, linkUrl, linkHost } from "@/lib/domains";
import { getLinkForUser, linkState } from "@/lib/services/links";
import { getStats, countryName } from "@/lib/analytics";
import { ActionForm, ActionButton, DomainSelect, Field, CopyButton } from "@/components/client";
import { deviceRoutes } from "@/lib/smart-link";
import { BarList, StatRow, TimeSeries } from "@/components/charts";
import { QrPanel } from "@/components/qr-panel";
import { checkHealthAction, duplicateLinkAction, saveGeoAction, updateLinkAction } from "@/app/actions/app";
import { getGeoRoutes } from "@/lib/services/linkops";
import { geoToText } from "@/lib/geo-routes.ts";
import { timeAgo } from "@/lib/time-ago";
import { geoipToken } from "@/lib/geoip";

export const metadata = { title: "Link" };
const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");

export default async function LinkDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const link = await getLinkForUser(user.id, Number(id), user.role === "super_admin");
  if (!link) notFound();
  const dq = Number((await searchParams).days);
  const days = [7, 30, 90].includes(dq) ? dq : 30;
  const st = await getDomainState();
  const host = linkHost(st, link.domain_id);
  const stats = await getStats({ entityType: "link", entityId: link.id, days });
  const short = linkUrl(st, link.domain_id, link.slug);
  const geo = link.has_geo ? await getGeoRoutes(link.id).catch(() => []) : [];
  const geoOn = !!(await geoipToken());
  const geoSource = geoOn ? "the visitor's address (looked up at ipinfo.io, or taken from a CDN header when there is one)" : "a CDN header such as Cloudflare's";
  return (
    <>
      <div className="page-head">
        <div>
          <p><Link href="/dashboard/links">Links</Link> /</p>
          <h1>{link.title || link.slug}</h1>
          <div className="row"><span className="slug">{host}<b>/</b>{link.slug}</span><CopyButton value={short} /><span className="badge">{linkState(link)}</span>{link.health_status === "broken" && <span className="badge bad">Destination not working</span>}{!!link.universal && <span className="badge">universal</span>}</div>
        </div>
        <div className="row small">
          <ActionButton action={duplicateLinkAction.bind(null, link.id)} label="Duplicate this link">Duplicate</ActionButton>
          {[7, 30, 90].map((d) => <Link key={d} className={`btn btn-sm ${d === days ? "btn-primary" : ""}`} href={`?days=${d}`}>{d} days</Link>)}
        </div>
      </div>
      <StatRow items={[{ label: "Clicks", value: stats.total }, { label: "Unique visitors", value: stats.unique }, { label: "Countries", value: stats.countries.filter((c) => c.label !== "Unknown").length }, { label: "Top referrer", value: stats.referrers[0]?.label ?? "None yet" }]} />
      <TimeSeries series={stats.series} label={`Clicks per day, last ${days} days`} />
      <div className="cols" style={{ marginTop: 40 }}>
        <BarList title="Countries" rows={stats.countries.map((c) => ({ ...c, label: countryName(c.label) }))} />
        <BarList title="Referrers" rows={stats.referrers} />
        <BarList title="Devices" rows={stats.devices} />
        <BarList title="Browsers" rows={stats.browsers} />
        {stats.campaigns.some((c) => c.label !== "No campaign") && <BarList title="Campaigns (utm_campaign)" rows={stats.campaigns} />}
      </div>

      <div className="cols" style={{ marginTop: 48, alignItems: "start" }}>
        <section>
          <div className="section-title"><h2>Settings</h2></div>
          <ActionForm action={updateLinkAction.bind(null, link.id)} submit="Save changes" pendingLabel="Saving...">
            {link.universal ? (
              <Field label="Destination URL" name="target_url" type="url" placeholder="Optional" hint="This is a universal link: it only has device URLs below. Fill this in to give it a normal destination for every other device." />
            ) : (
              <Field label="Destination URL" name="target_url" type="url" defaultValue={link.target_url} required />
            )}
            <DomainSelect domains={st.linkDomains} value={link.domain_id} />
            <Field label="Short name" name="slug" prefix={`${host}/`} defaultValue={link.slug} maxLength={64} required />
            <Field label="Label" name="title" defaultValue={link.title} maxLength={160} />
            {"tags" in link && <Field label="Tags" name="tags" defaultValue={link.tags ?? ""} hint="Up to 5, comma separated." maxLength={200} />}
            <div className="grid2">
              <Field label="Starts (UTC)" name="starts_at" type="datetime-local" defaultValue={iso(link.starts_at)} />
              <Field label="Expires (UTC)" name="expires_at" type="datetime-local" defaultValue={iso(link.expires_at)} />
            </div>
            <Field label="Click limit" name="max_clicks" type="number" min={1} max={1000000000} inputMode="numeric" placeholder="Unlimited" defaultValue={link.max_clicks ?? ""} hint={link.max_clicks != null ? `${Number(link.click_count ?? 0)} of ${link.max_clicks} used. Empty = unlimited.` : "Optional. After this many visits the link behaves as expired."} />
            <details className="utm" open={!!(link.universal || link.ios_url || link.android_url || link.windows_url || link.mac_url || link.linux_url || link.expired_url)}>
              <summary className="small link-like">Different destinations by device (optional)</summary>
              <p className="small muted">Send visitors on iPhone, Android, Windows, Mac or Linux to their own page, for example an app store listing or a download page, and choose where an expired link goes instead of the expired notice.</p>
              <Field label="iPhone and iPad destination" name="ios_url" type="url" placeholder="https://apps.apple.com/app/..." defaultValue={link.ios_url ?? ""} maxLength={2048} />
              <Field label="Android destination" name="android_url" type="url" placeholder="https://play.google.com/store/apps/..." defaultValue={link.android_url ?? ""} maxLength={2048} />
              <Field label="Windows destination" name="windows_url" type="url" placeholder="https://example.com/download/windows" defaultValue={link.windows_url ?? ""} maxLength={2048} />
              <Field label="Mac destination" name="mac_url" type="url" placeholder="https://example.com/download/mac" defaultValue={link.mac_url ?? ""} maxLength={2048} />
              <Field label="Linux destination" name="linux_url" type="url" placeholder="https://example.com/download/linux" defaultValue={link.linux_url ?? ""} maxLength={2048} />
              <Field label="After it expires, go to" name="expired_url" type="url" placeholder="https://example.com/offer-ended" defaultValue={link.expired_url ?? ""} maxLength={2048} />
            </details>
            <Field label={link.password_hash ? "New password" : "Password"} name="password" autoComplete="off" hint={link.password_hash ? "Leave empty to keep the current password." : "Optional."} />
            {link.password_hash && <label className="check"><input type="checkbox" name="remove_password" /> Remove password protection</label>}
            <label className="check"><input type="checkbox" name="enabled" defaultChecked={!!link.enabled} /> Link is enabled</label>
          </ActionForm>
        </section>
        <section>
          <div className="section-title"><h2>Where each device goes</h2></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Device</th><th>Goes to</th></tr></thead>
              <tbody>
                {deviceRoutes(link).map((r) => (
                  <tr key={r.device}>
                    <td>{r.label}</td>
                    <td className="dest" title={r.url ?? undefined}>
                      {r.url ?? <span className="muted">A page that lists the devices this link supports</span>}
                      {r.source === "default" && <span className="small muted"> (default)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {link.expired_url && <p className="small muted">After it expires: <span className="mono">{link.expired_url}</span></p>}
          <div className="section-title" style={{ marginTop: 32 }}><h2>Destination health</h2></div>
          {link.universal ? <p className="small muted">Universal links have no destination of their own, so there is nothing to check.</p> : (
            <>
              <p className="small">
                {link.health_status === "broken" ? <><span className="badge bad">Not working</span> {link.health_code ? `The page answers with error ${link.health_code}.` : "The page cannot be reached."}</> : link.health_status === "ok" ? <><span className="badge good">Working</span> The page answers normally.</> : <span className="muted">Not checked yet. Links are checked about once a day.</span>}
                {link.health_checked_at ? <span className="muted"> Last checked {timeAgo(new Date(link.health_checked_at))}.</span> : null}
              </p>
              <ActionButton action={checkHealthAction.bind(null, link.id)} label="Check now">Check now</ActionButton>
            </>
          )}
          <div className="section-title" style={{ marginTop: 32 }}><h2>Country routes</h2></div>
          <p className="small muted">Send visitors from a country to their own page, for example a local shop. Everyone else goes to the normal destination. A country route wins over a device destination. The country comes from {geoSource}. When it cannot be found, visitors get the normal destination.{!geoOn && " Country detection is not set up on this server yet: the administrator can add a token in Admin > Security."}</p>
          <ActionForm action={saveGeoAction.bind(null, link.id)} submit="Save country routes" pendingLabel="Saving...">
            <Field label="Routes" name="routes" textarea rows={4} defaultValue={geoToText(geo)} placeholder={"PK https://example.com/pk\nUS https://example.com/us"} hint="One per line: a two-letter country code, a space, a web address. Up to 10. Leave empty to remove all." />
          </ActionForm>
          <div className="section-title" style={{ marginTop: 32 }}><h2>QR code</h2></div>
          <QrPanel slug={link.slug} />
        </section>
      </div>
    </>
  );
}
