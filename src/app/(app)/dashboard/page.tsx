import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getStats } from "@/lib/analytics";
import { getBrand, shortUrl } from "@/lib/brand";
import { bioUrl, getDomainState } from "@/lib/domains";
import { TimeSeries, StatRow } from "@/components/charts";
import { CopyButton } from "@/components/client";

export const metadata = { title: "Overview" };

export default async function Overview() {
  const user = await requireUser();
  const b = await getBrand();
  const st = await getDomainState();
  const [clicks, views] = await Promise.all([
    getStats({ userId: user.id, kind: "clicks", days: 30 }),
    getStats({ userId: user.id, kind: "views", days: 30 }),
  ]);
  const counts = await queryOne<{ links: number; blocks: number }>(
    "SELECT (SELECT COUNT(*) FROM links WHERE user_id = ?) AS links, (SELECT COUNT(*) FROM blocks b JOIN pages p ON p.id = b.page_id WHERE p.user_id = ?) AS blocks",
    [user.id, user.id],
  );
  const top = await query<{ id: number; slug: string; title: string | null; n: number }>(
    `SELECT l.id, l.slug, l.title, COUNT(c.id) AS n FROM links l JOIN clicks c ON c.entity_type = 'link' AND c.entity_id = l.id AND c.created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
      WHERE l.user_id = ? GROUP BY l.id, l.slug, l.title ORDER BY n DESC LIMIT 5`,
    [user.id],
  );
  // Counts for the "Needs attention" panel. Each is optional: a missing column (database update
  // not run yet) just hides that row instead of breaking the page.
  const count = async (where: string) =>
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM links WHERE user_id = ? AND ${where}`, [user.id]).then((r) => Number(r?.n ?? 0)).catch(() => 0);
  const [expiring, nearLimit, review] = await Promise.all([
    count("expires_at IS NOT NULL AND expires_at > UTC_TIMESTAMP() AND expires_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY)"),
    count("max_clicks IS NOT NULL AND click_count < max_clicks AND click_count >= max_clicks * 0.8"),
    count("review_status = 'pending'"),
  ]);
  const attention = [
    { n: expiring, text: "expire within 7 days", href: "/dashboard/links?status=expiring" },
    { n: nearLimit, text: "near their click limit", href: "/dashboard/links?status=limit_near" },
    { n: review, text: "held for review", href: "/dashboard/links?status=review" },
  ].filter((x) => x.n > 0);
  const page = user.username ? bioUrl(st, user.username) : null;
  const fresh = !Number(counts?.links) && !Number(counts?.blocks);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>Last 30 days.</p>
        </div>
        {user.username && page ? (
          <div className="row">
            <span className="slug">{b.bioHost}<b>/</b>{user.username}</span>
            <CopyButton value={page} label="Copy page address" />
            <a className="btn" href={page} target="_blank" rel="noopener">View page</a>
          </div>
        ) : (
          <Link className="btn" href="/dashboard/page">Create bio page</Link>
        )}
      </div>

      {fresh && (
        <div className="notice" style={{ marginBottom: 24 }}>
          <strong>Start here.</strong> Add a link to your page in <Link href="/dashboard/page">Bio page</Link>, or shorten a URL in <Link href="/dashboard/links">Links</Link>. Numbers appear as soon as someone visits.
        </div>
      )}

      <StatRow items={[
        { label: "Link clicks", value: clicks.total },
        { label: "Unique visitors", value: clicks.unique },
        { label: "Page views", value: views.total },
        { label: "Short links", value: Number(counts?.links ?? 0) },
      ]} />

      {attention.length > 0 && (
        <section className="panel" style={{ marginBottom: 32 }} aria-labelledby="attn">
          <h2 id="attn" style={{ fontSize: 16 }}>Needs attention</h2>
          <ul className="attention">
            {attention.map((x) => (
              <li key={x.href}><span><strong className="num">{x.n.toLocaleString("en-US")}</strong> {x.n === 1 ? "link" : "links"} {x.text}</span><Link href={x.href} className="small">Show</Link></li>
            ))}
          </ul>
        </section>
      )}

      <div className="section-title"><h2>Clicks per day</h2></div>
      <TimeSeries series={clicks.series} label="Clicks per day over the last 30 days" />

      <div className="section-title" style={{ marginTop: 40 }}><h2>Top short links</h2><Link href="/dashboard/links" className="small">All links</Link></div>
      {top.length === 0 ? (
        <p className="muted">No clicks on short links yet.</p>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Link</th><th className="r">Clicks</th></tr></thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/dashboard/links/${t.id}`} className="title">{t.title || t.slug}</Link> <span className="muted mono small">/{t.slug}</span></td>
                  <td className="r num">{Number(t.n).toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
