import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { bioUrl, getDomainState } from "@/lib/domains";
import { ActionButton, ActionForm, ConfirmButton, Field } from "@/components/client";
import { DEFAULT_LIMITS, LIMIT_KEYS, LIMIT_LABELS, type LimitKey } from "@/lib/limits";
import { overridesFromRow, siteLimits } from "@/lib/user-limits";
import { deleteUserAction, setUserRoleAction, setUserStatusAction } from "@/app/actions/admin";
import { saveUserLimitsAction } from "@/app/actions/security-admin";
import {
  changeUserEmailAction, createUserAdminAction, markVerifiedAction, resendVerificationAdminAction,
  sendResetLinkAction, setUserPasswordAction, signOutUserAction,
} from "@/app/actions/users-admin";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";
const PER = 30;

interface U { id: number; email: string; username: string | null; role: string; status: string; email_verified_at: Date | null; created_at: Date; last_login_at: Date | null; links: number }
const day = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "Never");

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; filter?: string }> }) {
  const st = await getDomainState();
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = Math.min(100_000, Math.max(1, Math.floor(Number(sp.page)) || 1));
  const like = `%${(sp.q ?? "").replace(/[%_]/g, "").slice(0, 80)}%`;
  const FILTERS: Record<string, string> = {
    active: "u.status = 'active'", suspended: "u.status = 'suspended'", unverified: "u.email_verified_at IS NULL",
    admins: "u.role = 'super_admin'", google: "u.google_id IS NOT NULL", nologin: "u.last_login_at IS NULL",
  };
  const filter = sp.filter && FILTERS[sp.filter] ? sp.filter : "";
  const conds = [sp.q ? "(u.email LIKE ? OR u.username LIKE ?)" : "", filter ? FILTERS[filter] : ""].filter(Boolean);
  const w = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
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
  const q = encodeURIComponent(sp.q ?? "") + (filter ? `&filter=${filter}` : "");
  return (
    <>
      <div className="page-head"><div><h1>Users</h1><p>{total} account{total === 1 ? "" : "s"}.</p></div></div>
      <form className="row" style={{ marginBottom: 16 }} role="search">
        <input className="input" name="q" defaultValue={sp.q} placeholder="Search email or username" aria-label="Search users" style={{ maxWidth: 320 }} />
        <select className="input" name="filter" defaultValue={filter} aria-label="Filter users" style={{ maxWidth: 220 }}>
          <option value="">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option>
          <option value="unverified">Email not verified</option><option value="admins">Super admins</option>
          <option value="google">Signed in with Google</option><option value="nologin">Never signed in</option>
        </select>
        <button className="btn">Search</button>
      </form>
      <details className="panel" style={{ marginBottom: 16 }}>
        <summary className="small link-like">Create an account</summary>
        <p className="small muted">Adds the account right away, without the sign-up limits. Tell the person their password, or send them a reset link afterwards.</p>
        <ActionForm action={createUserAdminAction} submit="Create account" pendingLabel="Creating..." resetOnSuccess>
          <div className="cols">
            <Field label="Email" name="email" type="email" autoComplete="off" required />
            <Field label="Password" name="password" type="text" autoComplete="off" hint="At least 10 characters with a letter and a number." required />
          </div>
          <div className="field">
            <label htmlFor="f-new-role">Role</label>
            <select id="f-new-role" name="role" className="input" defaultValue="user"><option value="user">User</option><option value="super_admin">Super admin</option></select>
          </div>
          <label className="row small"><input type="checkbox" name="verified" defaultChecked /> Mark the email as verified</label>
        </ActionForm>
      </details>
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
                  {u.id !== me.id && (
                    <details className="utm" style={{ marginTop: 8, maxWidth: 420 }}>
                      <summary>Manage account</summary>
                      <div className="stack-sm">
                        <ActionForm action={setUserPasswordAction.bind(null, u.id)} submit="Set password" pendingLabel="Saving..." submitClass="btn btn-sm btn-primary">
                          <Field label="New password" name="password" type="text" autoComplete="off" hint="Signs them out everywhere." />
                          <label className="row small"><input type="checkbox" name="notify" defaultChecked /> Email them that it changed</label>
                        </ActionForm>
                        <ActionForm action={sendResetLinkAction.bind(null, u.id, "email")} submit="Email reset link" pendingLabel="Sending..." submitClass="btn btn-sm">
                          <p className="small muted">Sends a link that works for one hour.</p>
                        </ActionForm>
                        <ActionForm action={sendResetLinkAction.bind(null, u.id, "show")} submit="Get reset link" pendingLabel="Creating..." submitClass="btn btn-sm">
                          <p className="small muted">Shows a link (valid 24 hours) that you can send yourself.</p>
                        </ActionForm>
                        <ActionForm action={changeUserEmailAction.bind(null, u.id)} submit="Change email" pendingLabel="Saving..." submitClass="btn btn-sm">
                          <Field label="New email" name="email" type="email" autoComplete="off" defaultValue={u.email} />
                          <label className="row small"><input type="checkbox" name="verified" /> Mark as verified</label>
                        </ActionForm>
                        {!u.email_verified_at && (
                          <div className="row">
                            <ActionForm action={markVerifiedAction.bind(null, u.id)} submit="Mark email verified" submitClass="btn btn-sm"><span /></ActionForm>
                            <ActionForm action={resendVerificationAdminAction.bind(null, u.id)} submit="Resend confirmation" submitClass="btn btn-sm"><span /></ActionForm>
                          </div>
                        )}
                        <ActionForm action={signOutUserAction.bind(null, u.id)} submit="Sign out everywhere" pendingLabel="Working..." submitClass="btn btn-sm"><span /></ActionForm>
                      </div>
                    </details>
                  )}
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
