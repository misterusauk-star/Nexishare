import { domainService, appOrigin } from "@/lib/domains";
import { query } from "@/lib/db";
import { ActionForm, ActionButton, ConfirmDialog, ConfirmButton, Field } from "@/components/client";
import {
  addDomainAction, editDomainAction, checkDomainAction, overrideActivateAction,
  disableDomainAction, deleteDomainAction, makeDefaultAction,
} from "@/app/actions/domains";
import type { DomainRow } from "@/lib/domain-service";

import { runMigrationsAction } from "@/app/actions/domains";

export const metadata = { title: "Domains" };
export const dynamic = "force-dynamic";

const STATUS: Record<DomainRow["status"], { label: string; cls: string }> = {
  active: { label: "Active", cls: "good" },
  pending: { label: "Pending", cls: "warn" },
  disabled: { label: "Disabled", cls: "" },
};

const when = (d: Date | null) => (d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "never");

export default async function Domains() {
  let rows: DomainRow[] = [];
  try {
    rows = await domainService().list();
  } catch (e) {
    // Most likely migration 004 has not been run yet. Say so instead of a blank error page (admin-only page).
    return (
      <div className="page-head"><div>
        <h1>Domains</h1>
        <div className="notice bad" role="alert">
          Could not read the domains table: {(e as Error).message}. Press the button to apply the pending database updates (the same as <span className="mono">npm run migrate</span>), then reload. Back up the database first.
        </div>
        <p><ConfirmDialog trigger="Run database updates" triggerClass="btn btn-primary" title="Apply pending database updates?" confirmLabel="Run updates" action={runMigrationsAction}><p>Creates the domain and name-rule tables and drops the old user-domains table. Take a database backup first.</p></ConfirmDialog></p>
      </div></div>
    );
  }
  const current = rows.find((d) => d.is_default);
  const appHost = appOrigin().host;
  const bioDomain = rows.find((d) => d.purpose === "bio" && d.status !== "disabled");
  const apiDomain = rows.find((d) => d.purpose === "api" && d.status !== "disabled");
  const waiting = (d: DomainRow) => (d.status === "active" ? "Active" : "Not active yet: press Check & activate below");
  const roleRows = [
    { job: "Dashboard, admin, sign-in", host: appHost, status: "Active" },
    { job: "Short links with no domain chosen", host: current?.hostname ?? appHost, status: current?.status === "active" ? "Active (default)" : "Default" },
    {
      job: "Bio pages",
      host: bioDomain && bioDomain.status === "active" ? bioDomain.hostname : (current?.hostname ?? appHost),
      status: !bioDomain ? "No bio domain added, so bio pages use the default domain" : bioDomain.status === "active" ? "Active: bio pages open only here" : `${bioDomain.hostname}: ${waiting(bioDomain)}. Until then bio pages stay on the default domain`,
    },
    { job: "REST API", host: apiDomain && apiDomain.status === "active" ? apiDomain.hostname : appHost, status: !apiDomain ? "No API domain added, so the API stays on the main domain" : apiDomain.status === "active" ? "Active: /api/v1 works only here" : `${apiDomain.hostname}: ${waiting(apiDomain)}. Until then the API stays on the main domain` },
  ];
  // How many links are placed on each domain; links with no domain chosen follow the default. Tolerates a missing column before migration 007.
  const used: Record<number, number> = {};
  let following = 0;
  try {
    for (const r of await query<{ domain_id: number | null; n: number }>("SELECT domain_id, COUNT(*) AS n FROM links GROUP BY domain_id")) {
      if (r.domain_id) used[Number(r.domain_id)] = Number(r.n); else following = Number(r.n);
    }
  } catch { /* migration 007 not run yet */ }
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Domains</h1>
          <p>The main domain (APP_URL) runs the dashboard, admin and sign-in. Short links are served on the default domain and on any other link domain you add. Bio pages are served on the bio domain, or on the default domain when there is none. The REST API is accepted only on the API domain. Any other address redirects app pages to the main domain.</p>
        </div>
      </div>

      <section aria-labelledby="roles-h" style={{ marginBottom: 24 }}>
        <h2 id="roles-h" className="section-h">What each address does right now</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Job</th><th>Address</th><th>Status</th></tr></thead>
            <tbody>
              {roleRows.map((r) => (
                <tr key={r.job}>
                  <td>{r.job}</td>
                  <td className="mono">{r.host}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="cols">
        <section aria-labelledby="add-h">
          <h2 id="add-h" className="section-h">Add a domain</h2>
          <ActionForm action={addDomainAction} submit="Add domain" pendingLabel="Adding..." resetOnSuccess>
            <Field label="Domain" name="hostname" placeholder="go.example.com" hint="The exact subdomain you created, without https://." required />
            <Field label="Label (optional)" name="label" placeholder="Short links" maxLength={80} />
            <div className="field">
              <label htmlFor="f-purpose">Used for</label>
              <select id="f-purpose" name="purpose" className="input" defaultValue="site">
                <option value="site">Short links (link domain)</option>
                <option value="bio">Bio pages only (for example bio.example.com)</option>
                <option value="api">REST API only (for example api.example.com)</option>
              </select>
              <p className="hint">A link domain serves short links. A bio domain serves bio pages only; without one, bio pages use the default domain. An API domain answers /api/v1 only. All of them redirect app pages such as /login to the main domain.</p>
            </div>
          </ActionForm>
          <ol className="steps small">
            <li>In Hostinger hPanel, create the subdomain and point it at this Node.js app.</li>
            <li>Install SSL for that subdomain in hPanel. This app never issues certificates.</li>
            <li>Add it here. It stays <b>pending</b> until Check &amp; activate reaches <span className="mono">https://domain/api/health</span> with a valid certificate.</li>
            <li>When you are ready to switch, make it the default.</li>
          </ol>
        </section>

        <section aria-labelledby="ideas-h">
          <h2 id="ideas-h" className="section-h">Name ideas for link domains</h2>
          <p className="small muted">Short, easy to say and type. Create the subdomain in hPanel first, then add it above as &ldquo;Short links and bio pages&rdquo;.</p>
          <p className="chips">
            {["go", "to", "s", "u", "bio", "me", "qr", "hi"].map((n) => <span key={n} className="chip mono" style={{ paddingRight: 8, minHeight: 32 }}>{n}.{appHost.replace(/^www\./, "")}</span>)}
          </p>
          <p className="small muted">Each name you add also becomes a reserved name, so nobody can claim it as a short link or bio page. Names such as link, links, api, dashboard and admin are already reserved.</p>
        </section>

        <section aria-labelledby="list-h">
          <h2 id="list-h" className="section-h">Your domains</h2>
          {rows.length === 0 ? (
            <div className="empty"><h3>No domains yet</h3><p>Open any page of the app and the address from APP_URL is added as the default automatically.</p></div>
          ) : (
            <ul className="dom-list">
              {rows.map((d) => {
                const st = STATUS[d.status];
                return (
                  <li key={d.id} className="dom">
                    <div className="dom-head">
                      <strong className="mono dom-host">{d.hostname}</strong>
                      <span className="row wrap" style={{ gap: 6 }}>
                        {d.is_default && <span className="badge good">Default</span>}
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                        {d.hostname === appHost && <span className="badge">Main (APP_URL)</span>}
                        {d.purpose === "api" && <span className="badge">API</span>}
                        {d.purpose === "bio" && <span className="badge">Bio pages</span>}
                      </span>
                    </div>
                    {d.label && <p className="small muted dom-line">{d.label}</p>}
                    {d.purpose === "site" && (
                      <p className="small muted dom-line">
                        {(used[d.id] ?? 0).toLocaleString("en-US")} {(used[d.id] ?? 0) === 1 ? "link is" : "links are"} placed on this domain
                        {d.is_default ? `, and ${following.toLocaleString("en-US")} follow the default.` : ". If you disable or delete it, they move to the default domain."}
                      </p>
                    )}
                    <p className="small muted dom-line">
                      {d.last_check_at ? `Last check ${when(d.last_check_at)}: ${d.last_check_ok ? "passed" : "failed"}.` : "Not checked yet."}
                      {d.override_by ? " Activated by admin override." : ""}
                    </p>
                    {d.last_check_ok === false && d.last_check_error && <div className="notice bad dom-line" role="status">{d.last_check_error}</div>}

                    <div className="dom-actions">
                      {d.status !== "active" && <ActionButton action={checkDomainAction.bind(null, d.id)} className="btn btn-sm btn-primary">Check &amp; activate</ActionButton>}
                      {d.status === "pending" && d.last_check_ok === false && (
                        <ConfirmDialog trigger="Activate anyway" title={`Activate ${d.hostname} without a passing check?`} confirmLabel="Activate anyway" action={overrideActivateAction.bind(null, d.id)}>
                          <p>The HTTPS check failed: {d.last_check_error}</p>
                          <p>If you activate it anyway, visitors may see certificate warnings or errors on this domain. The override is recorded in the audit log.</p>
                        </ConfirmDialog>
                      )}
                      {d.status === "active" && !d.is_default && d.purpose === "site" && (
                        <ConfirmDialog
                          trigger="Make default" title={`Make ${d.hostname} the default domain?`} confirmLabel="Make default"
                          action={makeDefaultAction.bind(null, d.id)} triggerClass="btn btn-sm btn-primary"
                        >
                          <p>Bio pages, and every link that has no domain chosen, will be served on <b className="mono">{d.hostname}</b> from now on. Links that were placed on a specific domain stay there.</p>
                          <p><b>Old URLs and printed QR codes of bio pages and of links without a chosen domain on {current ? <span className="mono">{current.hostname}</span> : "the previous domain"} will stop working</b> and show a 404. Nothing is redirected and no links are changed or deleted.</p>
                          <p>Dashboard, admin and API stay reachable on every active domain.</p>
                        </ConfirmDialog>
                      )}
                      {d.status === "active" && !d.is_default && <ActionButton action={disableDomainAction.bind(null, d.id)}>Disable</ActionButton>}
                      {d.status === "active" && <ActionButton action={checkDomainAction.bind(null, d.id)}>Re-check</ActionButton>}
                      {!d.is_default && (
                        <ConfirmButton action={deleteDomainAction.bind(null, d.id)} label={`Delete ${d.hostname}`} confirm={`Delete ${d.hostname}? Links placed on it move to the default domain. Nothing is deleted.`}>Delete</ConfirmButton>
                      )}
                    </div>
                    {d.is_default && <p className="small muted dom-line">The default domain cannot be disabled or deleted. Make another active domain the default first.</p>}

                    <details className="edit dom-line">
                      <summary className="small link-like">Edit</summary>
                      <ActionForm action={editDomainAction.bind(null, d.id)} submit="Save" pendingLabel="Saving...">
                        <Field label="Domain" name="hostname" defaultValue={d.hostname} required hint={d.is_default ? "The default domain's address is locked." : "Changing the address makes the domain pending again."} />
                        <Field label="Label" name="label" defaultValue={d.label ?? ""} maxLength={80} />
                        <div className="field">
                          <label htmlFor={`p-${d.id}`}>Used for</label>
                          <select id={`p-${d.id}`} name="purpose" className="input" defaultValue={d.purpose} disabled={d.is_default}>
                            <option value="site">Short links</option>
                            <option value="bio">Bio pages only</option>
                            <option value="api">REST API only</option>
                          </select>
                        </div>
                      </ActionForm>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
