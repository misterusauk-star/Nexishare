import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { phase2Enabled } from "@/lib/features";
import { ConfirmButton } from "@/components/client";
import { listSubscribers } from "@/lib/services/engage";
import { deleteSubscriberAction } from "@/app/actions/phase2";

export const metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";
const PER = 50;

export default async function Subscribers({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!phase2Enabled()) notFound();
  const u = await requireUser();
  const page = Math.min(100_000, Math.max(1, Math.floor(Number((await searchParams).page)) || 1));
  let data: Awaited<ReturnType<typeof listSubscribers>> | null = null;
  try { data = await listSubscribers(u.id, PER, (page - 1) * PER); } catch { data = null; }
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PER));
  return (
    <>
      <div className="page-head">
        <div><h1>Subscribers</h1><p>Email addresses collected by the email signup block on your bio page. Only you can see them.</p></div>
        {data && data.total > 0 && <a className="btn" href="/api/export/subscribers">Export CSV</a>}
      </div>
      {!data ? (
        <div className="notice warn" role="alert">Subscribers need a database update. The administrator can press Run database updates in Admin &gt; Domains.</div>
      ) : data.rows.length === 0 ? (
        <div className="empty">
          <h3>No subscribers yet</h3>
          <p>Add an Email signup block in the <Link href="/dashboard/page">page editor</Link>. New addresses appear here.</p>
        </div>
      ) : (
        <>
          <p className="small muted">{data.total.toLocaleString("en-US")} in total.</p>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Email</th><th>Signed up (UTC)</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {data.rows.map((s) => (
                  <tr key={s.id}>
                    <td className="mono" style={{ overflowWrap: "anywhere" }}><a href={`mailto:${s.email}`}>{s.email}</a></td>
                    <td className="small num">{new Date(s.created_at).toISOString().slice(0, 16).replace("T", " ")}</td>
                    <td style={{ textAlign: "right" }}><ConfirmButton action={deleteSubscriberAction.bind(null, s.id)} label="Delete" confirm={`Remove ${s.email} from your list?`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {pages > 1 && (
        <div className="row small" style={{ marginTop: 16 }}>
          {page > 1 && <Link className="btn btn-sm" href={`?page=${page - 1}`}>Newer</Link>}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-sm" href={`?page=${page + 1}`}>Older</Link>}
        </div>
      )}
    </>
  );
}
