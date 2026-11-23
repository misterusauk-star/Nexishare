import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDomainState } from "@/lib/domains";
import { ApiKeyForm } from "@/components/api-key-form";
import { ConfirmButton } from "@/components/client";
import { revokeApiKeyAction } from "@/app/actions/app";
import { countLinks, limitsFor } from "@/lib/user-limits";

export const metadata = { title: "API keys" };

interface Key { id: number; name: string; prefix: string; read_only?: number; last_used_at: Date | null; revoked_at: Date | null; created_at: Date }
const fmt = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") + " UTC" : "Never");

export default async function ApiPage() {
  const user = await requireUser();
  const st = await getDomainState();
  const keys = await query<Key>("SELECT * FROM api_keys WHERE user_id = ? ORDER BY id DESC", [user.id]);
  const lim = await limitsFor(user.id);
  const used = await countLinks(user.id).catch(() => 0);
  const nf = (n: number) => n.toLocaleString("en-US");
  return (
    <>
      <div className="page-head">
        <div>
          <h1>API keys</h1>
          <p>Create short links and read stats from your own scripts. Requests go to <code>{st.apiUrl}/api/v1</code>. See the <Link href="/docs">API reference</Link>.</p>
        </div>
      </div>
      <p className="small muted" style={{ marginBottom: 24 }}>
        {lim.unlimited ? "Your account has no usage limits." : <>Your limits: <span className="num">{nf(lim.values.api_per_minute)}</span> requests per minute per key, <span className="num">{nf(lim.values.api_per_day)}</span> per day, <span className="num">{nf(lim.values.max_api_keys)}</span> active keys, and <span className="num">{nf(used)}</span> of <span className="num">{nf(lim.values.max_links)}</span> links used. Ask the administrator if you need more.</>}
      </p>
      <div className="cols" style={{ gridTemplateColumns: "minmax(0, 6fr) minmax(0, 4fr)", alignItems: "start" }}>
        <section>
          {keys.length === 0 ? (
            <div className="empty">
              <h3>No keys yet</h3>
              <p>Make one on the right, then send it as <code>Authorization: Bearer ob_...</code> to {st.apiUrl}/api/v1.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Key</th><th>Last used</th><th /></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}{k.read_only ? <> <span className="badge">Read-only</span></> : null}{k.revoked_at ? <> <span className="badge bad">Revoked</span></> : null}</td>
                    <td className="num">{k.prefix}...</td>
                    <td className="small muted">{fmt(k.last_used_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      {k.revoked_at ? null : (
                        <ConfirmButton action={revokeApiKeyAction.bind(null, k.id)} label="Revoke" confirm={`Revoke "${k.name}"? Anything using it stops working immediately.`} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="panel">
          <h2 className="section-title">New key</h2>
          <ApiKeyForm />
        </section>
      </div>
    </>
  );
}
