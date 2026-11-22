import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { getDomainState, linkUrl, linkHost } from "@/lib/domains";
import { listLinks, linkState } from "@/lib/services/links";
import { totalsFor } from "@/lib/analytics";
import { ActionForm, DomainSelect, Field } from "@/components/client";
import { LinksTable } from "@/components/links-table";
import { createLinkAction } from "@/app/actions/app";
import { phase2Enabled } from "@/lib/features";

export const metadata = { title: "Links" };
const PER = 25;

export default async function LinksPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const b = await getBrand();
  const st = await getDomainState();
  const page = Math.max(1, Number(sp.page) || 1);
  let teamIds: number[] = [];
  if (phase2Enabled()) {
    teamIds = await query<{ team_id: number }>("SELECT team_id FROM team_members WHERE user_id = ?", [user.id]).then((r) => r.map((x) => x.team_id)).catch(() => []);
  }
  const { rows, total } = await listLinks({ userId: user.id, q: sp.q?.slice(0, 100), status: sp.status, limit: PER, offset: (page - 1) * PER, teamIds });
  const totals = await totalsFor("link", rows.map((r) => r.id));
  const items = rows.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, target: r.target_url, short: linkUrl(st, r.domain_id, r.slug), state: linkState(r),
    locked: !!r.password_hash, clicks: totals[r.id]?.total ?? 0, unique: totals[r.id]?.unique ?? 0,
    created: new Date(r.created_at).toISOString(), expires: r.expires_at ? new Date(r.expires_at).toISOString() : null,
  }));
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`;
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
            <Field label="Starts (UTC)" name="starts_at" type="datetime-local" />
            <Field label="Expires (UTC)" name="expires_at" type="datetime-local" />
          </div>
            <details className="utm">
              <summary className="small link-like">Different destinations by device (optional)</summary>
              <p className="small muted">Send visitors on iPhone, Android, Windows, Mac or Linux to their own page, for example an app store listing or a download page, and choose where an expired link goes instead of the expired notice.</p>
              <Field label="iPhone and iPad destination" name="ios_url" type="url" placeholder="https://apps.apple.com/app/..." maxLength={2048} />
              <Field label="Android destination" name="android_url" type="url" placeholder="https://play.google.com/store/apps/..." maxLength={2048} />
              <Field label="Windows destination" name="windows_url" type="url" placeholder="https://example.com/download/windows" maxLength={2048} />
              <Field label="Mac destination" name="mac_url" type="url" placeholder="https://example.com/download/mac" maxLength={2048} />
              <Field label="Linux destination" name="linux_url" type="url" placeholder="https://example.com/download/linux" maxLength={2048} />
              <Field label="After it expires, go to" name="expired_url" type="url" placeholder="https://example.com/offer-ended" maxLength={2048} />
            </details>
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

      <form className="toolbar" style={{ marginTop: 24 }} role="search">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Search name, label or destination" aria-label="Search links" />
        <select className="input" name="status" defaultValue={sp.status ?? ""} aria-label="Filter by status">
          <option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option>
          <option value="expired">Expired</option><option value="protected">Password protected</option>
        </select>
        <button className="btn">Filter</button>
      </form>

      {items.length === 0 ? (
        <div className="empty">
          <h3>{sp.q || sp.status ? "No links match that filter" : "No short links yet"}</h3>
          <p>{sp.q || sp.status ? "Try a different search or clear the status filter." : "Paste a long URL above and pick a short name. Every link gets click stats and a QR code."}</p>
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
