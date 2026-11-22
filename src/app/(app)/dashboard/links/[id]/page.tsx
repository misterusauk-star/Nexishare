import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDomainState, linkUrl, linkHost } from "@/lib/domains";
import { getLinkForUser, linkState } from "@/lib/services/links";
import { getStats, countryName } from "@/lib/analytics";
import { ActionForm, DomainSelect, Field, CopyButton } from "@/components/client";
import { BarList, StatRow, TimeSeries } from "@/components/charts";
import { QrPanel } from "@/components/qr-panel";
import { updateLinkAction } from "@/app/actions/app";

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
  return (
    <>
      <div className="page-head">
        <div>
          <p><Link href="/dashboard/links">Links</Link> /</p>
          <h1>{link.title || link.slug}</h1>
          <div className="row"><span className="slug">{host}<b>/</b>{link.slug}</span><CopyButton value={short} /><span className="badge">{linkState(link)}</span></div>
        </div>
        <div className="row small">
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
            <Field label="Destination URL" name="target_url" type="url" defaultValue={link.target_url} required />
            <DomainSelect domains={st.linkDomains} value={link.domain_id} />
            <Field label="Short name" name="slug" prefix={`${host}/`} defaultValue={link.slug} maxLength={64} required />
            <Field label="Label" name="title" defaultValue={link.title} maxLength={160} />
            <div className="grid2">
              <Field label="Starts (UTC)" name="starts_at" type="datetime-local" defaultValue={iso(link.starts_at)} />
              <Field label="Expires (UTC)" name="expires_at" type="datetime-local" defaultValue={iso(link.expires_at)} />
            </div>
            <details className="utm" open={!!(link.ios_url || link.android_url || link.expired_url)}>
              <summary className="small link-like">Different destinations (optional)</summary>
              <p className="small muted">Send iPhone and Android visitors to their own page, for example an app store listing, and choose where an expired link goes instead of the expired notice.</p>
              <Field label="iPhone and iPad destination" name="ios_url" type="url" placeholder="https://apps.apple.com/app/..." defaultValue={link.ios_url ?? ""} maxLength={2048} />
              <Field label="Android destination" name="android_url" type="url" placeholder="https://play.google.com/store/apps/..." defaultValue={link.android_url ?? ""} maxLength={2048} />
              <Field label="After it expires, go to" name="expired_url" type="url" placeholder="https://example.com/offer-ended" defaultValue={link.expired_url ?? ""} maxLength={2048} />
            </details>
            <Field label={link.password_hash ? "New password" : "Password"} name="password" autoComplete="off" hint={link.password_hash ? "Leave empty to keep the current password." : "Optional."} />
            {link.password_hash && <label className="check"><input type="checkbox" name="remove_password" /> Remove password protection</label>}
            <label className="check"><input type="checkbox" name="enabled" defaultChecked={!!link.enabled} /> Link is enabled</label>
          </ActionForm>
        </section>
        <section>
          <div className="section-title"><h2>QR code</h2></div>
          <QrPanel slug={link.slug} />
        </section>
      </div>
    </>
  );
}
