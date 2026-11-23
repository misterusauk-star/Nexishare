import Link from "next/link";
import { MousePointerClick, Eye } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getStats, countryName } from "@/lib/analytics";
import { phase2Enabled } from "@/lib/features";
import { BarList, StatRow, TimeSeries } from "@/components/charts";

export const metadata = { title: "Analytics" };

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string; view?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const kind = sp.view === "views" ? "views" : "clicks";
  const stats = await getStats({ userId: user.id, kind, days });
  const href = (o: { days?: number; view?: string }) => `?days=${o.days ?? days}&view=${o.view ?? kind}`;
  const empty = stats.total === 0;
  const best = stats.series.reduce((m, s) => (s.total > m.total ? s : m), { day: "", total: 0, unique: 0 });
  const avg = stats.series.length ? stats.total / stats.series.length : 0;
  const noun = kind === "clicks" ? "clicks" : "views";
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analytics</h1>
          <p>{kind === "clicks" ? "Clicks on your short links and bio page buttons." : "Visits to your bio page."}</p>
        </div>
        <div className="row small">
          {phase2Enabled() ? <a className="btn btn-sm" href={`/api/export/stats?days=${days}&view=${kind}`}>Export CSV</a> : null}
        </div>
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap" }}>
        <nav className="seg" aria-label="What to show">
          <Link href={href({ view: "clicks" })} aria-current={kind === "clicks" ? "true" : undefined}><MousePointerClick className="icon" />Clicks</Link>
          <Link href={href({ view: "views" })} aria-current={kind === "views" ? "true" : undefined}><Eye className="icon" />Page views</Link>
        </nav>
        <nav className="seg" aria-label="Time range">
          {[7, 30, 90, 365].map((d) => (
            <Link key={d} href={href({ days: d })} aria-current={d === days ? "true" : undefined}>{d === 365 ? "1 year" : `${d} days`}</Link>
          ))}
        </nav>
      </div>
      <StatRow items={[
        { label: kind === "clicks" ? "Clicks" : "Views", value: stats.total },
        { label: "Unique visitors", value: stats.unique },
        { label: "Countries", value: stats.countries.filter((c) => c.label !== "Unknown").length },
        { label: "Top referrer", value: stats.referrers[0]?.label ?? "None yet" },
      ]} />
      {empty ? (
        <div className="empty" style={{ marginTop: 32 }}>
          <h3>No {kind === "clicks" ? "clicks" : "views"} in this period</h3>
          <p>Share a short link or your bio page. Numbers appear here within a few seconds of the first visit. Bots are filtered out.</p>
        </div>
      ) : (
        <>
          <TimeSeries series={stats.series} label={`${kind === "clicks" ? "Clicks" : "Views"} per day`} />
          <p className="insight">
            <strong>Best day:</strong> {best.day ? `${best.day} with ${best.total.toLocaleString("en-US")} ${noun}` : "none yet"}. <strong>Average:</strong> {avg >= 10 ? Math.round(avg) : avg.toFixed(1)} {noun} per day.
          </p>
          <div className="cols" style={{ marginTop: 40 }}>
            <BarList total={stats.total} title="Countries" rows={stats.countries.map((c) => ({ ...c, label: countryName(c.label) }))} />
            <BarList total={stats.total} title="Referrers" rows={stats.referrers} />
            <BarList total={stats.total} title="Devices" rows={stats.devices} />
            <BarList total={stats.total} title="Browsers" rows={stats.browsers} />
            {stats.campaigns.some((c) => c.label !== "No campaign") ? <BarList total={stats.total} title="Campaigns (utm_campaign)" rows={stats.campaigns} /> : null}
          </div>
        </>
      )}
      <p className="small muted" style={{ marginTop: 32 }}>Visitors are counted with a hash that changes daily. IP addresses are never stored.</p>
    </>
  );
}
