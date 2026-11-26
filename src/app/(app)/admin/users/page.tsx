import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { bioUrl, getDomainState } from "@/lib/domains";
import { ActionButton, ActionForm, ConfirmButton, Field } from "@/components/client";
import { DEFAULT_LIMITS, LIMIT_KEYS, LIMIT_LABELS, type LimitKey } from "@/lib/limits";
import { overridesFromRow, siteLimits } from "@/lib/user-limits";
import { deleteUserAction, setUserRoleAction, setUserStatusAction } from "@/app/actions/admin";
import { saveUserLimitsAction } from "@/app/actions/security-admin";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";
const PER = 30;

interface U { id: number; email: string; username: string | null; role: string; status: string; email_verified_at: Date | null; created_at: Date; last_login_at: Date | null; links: number }
const day = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "Never");

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const st = await getDomainState();
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = Math.min(100_000, Math.max(1, Math.floor(Number(sp.page)) || 1));
  const like = `%${(sp.q ?? "").replace(/[%_]/g, "").slice(0, 80)}%`;
  const w = sp.q ? "WHERE u.email LIKE ? OR u.username LIKE ?" : "";
  const p = sp.q ? [like, like] : [];
  const total = Number((await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM users u ${w}`, p))?.n ?? 0);
  const rows = await query<U>(
    `SELECT u.id, u.email, u.username, u.role, u.status, u.email_verified_at, u.created_at, u.last_login_at,
            (SELECT COUNT(*) FROM links l WHERE l.user_id = u.id) AS links
       FROM users u ${w} ORDER BY u.id DESC LIMIT ${PER} OFFSET ${(page - 1) * PER}`,
    p,
  );
  const pages = Math.max(1, Math.ceil(total / PER));
  // Per-account limit overrides. Skipped quietly when the database update that adds them has not been run yet.
  const own = new Map<number, Record<LimitKey, number | null>>();
  const site = await siteLimits();
  if (rows.length) {
    try {
      const ids = rows.map((r) => r.id);
      const got = await query<Record<string, unknown> & { id: number }>(`SELECT * FROM users WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
      for (const g of got) own.set(g.id, overridesFromRow(g));
    } catch { /* migration 013 not applied */ }
  }
  const q = encodeURIComponent(sp.q ?? "");
  return (
    <>
      <div className="page-head"><div><h1>Users</h1><p>{total} account{total === 1 ? "" : "s"}.</p></div></div>
      <form className="row" style={{ marginBottom: 16 }} role="search">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Search email or username" aria-label="Search users" style={{ maxWidth: 320 }} />
        <button className="btn">Search</button>
      </form>
      {rows.length === 0 ? (
        <div className="empty"><h3>No users match</h3><p>Try a shorter search.</p></div>
      ) : (
        <table className="table">
          <thead><tr><th>User</th><th>Role</th><th>Links</th><th>Joined</th><th>Last login</th><th /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.username ? <a href={bioUrl(st, u.username)} target="_blank" rel="noopener">{u.username}</a> : <span className="muted">No bio page</span>}
                  {u.status === "suspended" && <> <span className="badge bad">Suspended</span></>}
                  {!u.email_verified_at && <> <span className="badge">Unverified</span></>}
                  <div className="small muted">{u.email}</div>
                  {own.has(u.id) && u.role !== "super_admin" && (
                    <details className="utm" style={{ marginTop: 8, maxWidth: 360 }}>
                      <summary>Limits{Object.values(own.get(u.id)!).some((v) => v !== null) ? " (custom)" : ""}</summary>
                      <ActionForm action={saveUserLimitsAction.bind(null, u.id)} submit="Save limits" pendingLabel="Saving..." submitClass="btn btn-sm btn-primary">
                        {LIMIT_KEYS.map((k) => (
                          <Field key={k} label={LIMIT_LABELS[k]} name={k} inputMode="numeric" defaultValue={own.get(u.id)![k] ?? ""} placeholder={`Site value ${site[k] ?? DEFAULT_LIMITS[k]}`} />
                        ))}
                      </ActionForm>
                    </details>
                  )}
                </td>
                <td>{u.role === "super_admin" ? <span className="badge good">Super Admin</span> : "User"}</td>
                <td className="num">{Number(u.links)}</td>
                <td className="small num">{day(u.created_at)}</td>
                <td className="small num">{day(u.last_login_at)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {u.id !== me.id && (
                    <span className="row" style={{ justifyContent: "flex-end" }}>
                      <ActionButton action={setUserRoleAction.bind(null, u.id, u.role === "super_admin" ? "user" : "super_admin")}>{u.role === "super_admin" ? "Make user" : "Make admin"}</ActionButton>
                      <ActionButton action={setUserStatusAction.bind(null, u.id, u.status === "active" ? "suspended" : "active")}>{u.status === "active" ? "Suspend" : "Reinstate"}</ActionButton>
                      <ConfirmButton action={deleteUserAction.bind(null, u.id)} label="Delete" confirm={`Delete ${u.username ?? u.email} and everything they own? This cannot be undone.`} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {pages > 1 && (
        <div className="row small" style={{ marginTop: 16 }}>
          {page > 1 && <Link className="btn btn-sm" href={`?q=${q}&page=${page - 1}`}>Previous</Link>}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-sm" href={`?q=${q}&page=${page + 1}`}>Next</Link>}
        </div>
      )}
    </>
  );
}
