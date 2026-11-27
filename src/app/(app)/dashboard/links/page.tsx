import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { geoUsage } from "@/lib/services/linkops";
import { query } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { getDomainState, linkUrl, linkHost } from "@/lib/domains";
import { listLinks, linkState } from "@/lib/services/links";
import { totalsFor, lastClicks } from "@/lib/analytics";
import { timeAgo } from "@/lib/time-ago";
import { ActionForm, DomainSelect, Field } from "@/components/client";
import { LinksTable } from "@/components/links-table";
import { createLinkAction } from "@/app/actions/app";
import { phase2Enabled } from "@/lib/features";

export const metadata = { title: "Links" };
const PER = 25;

import { SearchHotkey } from "@/components/search-hotkey";

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; tag?: string; page?: string }> }) {
  const user = await requireUser();
  const geoUse = await geoUsage(user.id).catch(() => null);
  const sp = await searchParams;
  const b = await getBrand();
  const st = await getDomainState();
  const page = Math.min(100_000, Math.max(1, Math.floor(Number(sp.page)) || 1));
  let teamIds: number[] = [];
  if (phase2Enabled()) {
    teamIds = await query<{ team_id: number }>("SELECT team_id FROM team_members WHERE user_id = ?", [user.id]).then((r) => r.map((x) => x.team_id)).catch(() => []);
  }
  const { rows, total } = await listLinks({ userId: user.id, q: sp.q?.slice(0, 100), status: sp.status, tag: sp.tag, limit: PER, offset: (page - 1) * PER, teamIds });
  const totals = await totalsFor("link", rows.map((r) => r.id));
  const last = await lastClicks("link", rows.map((r) => r.id)).catch(() => ({} as Record<number, Date>));
  const items = rows.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, target: r.target_url, short: linkUrl(st, r.domain_id, r.slug), state: linkState(r), health: r.health_status ?? undefined,
    tags: r.tags ? r.tags.split(",").filter(Boolean) : [], locked: !!r.password_hash, clicks: totals[r.id]?.total ?? 0, unique: totals[r.id]?.unique ?? 0,
    lastClick: last[r.id] ? timeAgo(last[r.id]) : "No clicks yet",
    created: new Date(r.created_at).toISOString(), expires: r.expires_at ? new Date(r.expires_at).toISOString() : null,
  }));
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.tag ? { tag: sp.tag } : {}), page: String(p) })}`;
  return (
    <>
      <div className="page-head">
        <div><h1>Links</h1><p>Short links that redirect, with a click count on each. {total.toLocaleString("en-US")} in total.</p></div>
        {phase2Enabled() && <div className="row"><a className="btn" href="/api/export/links">Export CSV</a><Link className="btn" href="/dashboard/links/import">Import CSV</Link></div>}
      </div>

      <details className="edit panel" open={total === 0}>
        <summary className="btn btn-primary" style={{ display: "inline-flex" }}>New short link</summary>
        <ActionForm action={createLinkAction} submit="Create link" pendingLabel="Creating..." resetOnSuccess>
          <Field label="Destination URL" name="target_url" type="url" placeholder="https://example.com/a/very/long/address" required />
          <DomainSelect domains={st.linkDomains} />
          <div className="grid2">
            <Field label="Short name" name="slug" prefix={`${st.defaultHost}/`} hint="Leave empty for a random one. Letters, numbers, hyphens." maxLength={64} />
            <Field label="Label" name="title" hint="Only you see this." maxLength={160} />
          </div>
          <div className="grid2">
            <Field label="Starts (UTC)" name="starts_at" type="datetime-local" hint="Leave empty to go live right away." />
            <Field label="Tags" name="tags" hint="Optional. Up to 5, comma separated, e.g. sale, summer." maxLength={200} />
            <Field label="Expires (UTC)" name="expires_at" type="datetime-local" hint="Leave empty for no expiry." />
          </div>
          <Field label="Click limit" name="max_clicks" type="number" min={1} max={1000000000} inputMode="numeric" placeholder="Unlimited" hint="Optional. After this many visits the link behaves as expired." />
            <details className="utm">
              <summary className="small link-like">Country routes (optional)</summary>
              <p className="small muted">Send visitors from a country to their own page. Everyone else goes to the destination above.{geoUse ? ` Up to ${geoUse.routes_per_link_limit} countries per link${geoUse.links_with_routes_limit != null ? `, on up to ${geoUse.links_with_routes_limit.toLocaleString("en-US")} links (${geoUse.links_with_routes.toLocaleString("en-US")} used)` : ""}.` : ""}</p>
              <Field label="Routes" name="geo_routes" textarea rows={3} placeholder={"PK https://example.com/pk\nUS https://example.com/us"} hint="One per line: a two-letter country code, a space, a web address." />
            </details>
            <Field label="After it expires, go to" name="expired_url" type="url" placeholder="https://example.com/offer-ended" hint="Optional. Shown instead of the expired notice." maxLength={2048} />
          <details className="utm">
            <summary className="small link-like">Campaign tags (optional)</summary>
            <p className="small muted">Added to the destination as utm_source, utm_medium and utm_campaign so your analytics can tell where visits came from.</p>
            <div className="grid2">
              <Field label="Source" name="utm_source" placeholder="newsletter" maxLength={100} />
              <Field label="Medium" name="utm_medium" placeholder="email" maxLength={100} />
            </div>
            <Field label="Campaign" name="utm_campaign" placeholder="spring-launch" maxLength={100} />
          </details>
          <Field label="Password" name="password" type="text" autoComplete="off" hint="Visitors must enter it before they are redirected." maxLength={100} />
        </ActionForm>
      </details>

      <SearchHotkey targetId="link-search" />
      <form className="toolbar" style={{ marginTop: 24 }} role="search">
        <input id="link-search" className="input" name="q" defaultValue={sp.q} placeholder="Search name, label or destination (press / to jump here)" aria-label="Search links" />
        <select className="input" name="status" defaultValue={sp.status ?? ""} aria-label="Filter by status">
          <option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
          <option value="expired">Expired</option><option value="protected">Password protected</option>
          <option value="scheduled">Scheduled (not live yet)</option><option value="expiring">Expiring within 7 days</option>
          <option value="limited">Has a click limit</option><option value="limit_near">Near its click limit</option>
          <option value="stale">No clicks in 30 days</option><option value="universal">Universal links</option><option value="review">Held for review</option><option value="broken">Destination not working</option>
        </select>
        {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <button className="btn">Filter</button>
      </form>

      {sp.tag && (
        <p className="small" style={{ marginTop: 12 }}>
          Tag: <span className="tag-pill">{sp.tag.slice(0, 24)}</span> <Link href={qs(1).replace(/[?&]tag=[^&]*/, "").replace(/^&/, "?")}>Clear tag</Link>
        </p>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <h3>{sp.q || sp.status || sp.tag ? "No links match that filter" : "No short links yet"}</h3>
          <p>{sp.q || sp.status || sp.tag ? "Try a different search, or clear the filters to see every link." : "Paste a long URL above and pick a short name. Every link gets click stats and a QR code."}</p>
          {(sp.q || sp.status || sp.tag) && <p><Link className="btn btn-sm" href="/dashboard/links">Clear filters</Link></p>}
        </div>
      ) : (
        <LinksTable rows={items} />
      )}

      {pages > 1 && (
        <nav className="row" style={{ marginTop: 16 }} aria-label="Pagination">
          {page > 1 && <Link className="btn btn-sm" href={qs(page - 1)}>Previous</Link>}
          <span className="small muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-sm" href={qs(page + 1)}>Next</Link>}
        </nav>
      )}
    </>
  );
}
