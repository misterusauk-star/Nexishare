import { turnstileKeys, emailPolicy } from "@/lib/security";
import { geoipToken } from "@/lib/geoip";
import { siteLimits } from "@/lib/user-limits";
import { DEFAULT_LIMITS, LIMIT_KEYS, LIMIT_LABELS } from "@/lib/limits";
import { DEFAULT_ALLOWED_DOMAINS } from "@/lib/email-domains";
import { ActionForm, Field } from "@/components/client";
import { apiPolicy } from "@/lib/services/api-policy";
import { CREATE_MODES } from "@/lib/api-access.ts";
import { saveApiPolicyAction, saveEmailPolicyAction, saveGeoipAction, saveSiteLimitsAction, saveTurnstileAction } from "@/app/actions/security-admin";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const [site, policy, ts] = await Promise.all([siteLimits(), emailPolicy(), turnstileKeys()]);
  const geoOn = !!(await geoipToken());
  const api = await apiPolicy();
  const tsOn = !!(ts.siteKey && ts.secret);
  return (
    <>
      <div className="page-head"><div><h1>Security</h1><p>Usage limits, who can sign up, the bot check on sign-in forms, and the protections that are always on.</p></div></div>

      <div className="cols" style={{ alignItems: "start" }}>
        <div className="stack">
          <section className="panel">
            <h2 className="section-title">Usage limits</h2>
            <p className="small muted">These apply to every account that has no limit of its own. Leave a box empty to use the built-in default. Super admins are never limited. To change one account, open it under Users.</p>
            <ActionForm action={saveSiteLimitsAction} submit="Save limits" pendingLabel="Saving...">
              {LIMIT_KEYS.map((k) => (
                <Field key={k} label={LIMIT_LABELS[k]} name={k} inputMode="numeric" defaultValue={site[k] ?? ""} placeholder={`Default ${DEFAULT_LIMITS[k]}`} hint={`Default: ${DEFAULT_LIMITS[k].toLocaleString("en-US")}`} />
              ))}
            </ActionForm>
          </section>

          <section className="panel">
            <h2 className="section-title">Who can sign up</h2>
            <p className="small muted">Only addresses from these email domains can create an account (by email or with Google). This keeps throw-away mailboxes out. Existing accounts are not affected. An empty list means {DEFAULT_ALLOWED_DOMAINS.slice(0, 2).join(" and ")} and their usual domains.</p>
            <ActionForm action={saveEmailPolicyAction} submit="Save" pendingLabel="Saving...">
              <label className="check"><input type="checkbox" name="enabled" defaultChecked={policy.enabled} /> Limit sign-up to the domains below</label>
              <div className="field">
                <label htmlFor="f-domains">Allowed email domains</label>
                <textarea id="f-domains" name="domains" className="input" rows={5} defaultValue={policy.custom ? policy.domains.join("\n") : ""} placeholder={DEFAULT_ALLOWED_DOMAINS.join("\n")} spellCheck={false} />
                <p className="hint">One per line or separated by commas. Add your own company domain here.</p>
              </div>
            </ActionForm>
            <p className="small muted">Now allowed: <span className="mono">{policy.enabled ? policy.domains.join(", ") : "every domain"}</span></p>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2 className="section-title">API access</h2>
            <p className="small muted">Decide who can create API keys, and pause every key at any time. Super admins are never affected. You can also allow or block one account in Admin &gt; Users. Status: <strong>{api.paused ? "Paused" : "Running"}</strong>.</p>
            <ActionForm action={saveApiPolicyAction} submit="Save API access" pendingLabel="Saving...">
              <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="small">Who can create new keys</legend>
                {CREATE_MODES.map((m) => (
                  <label key={m.id} className="check" style={{ alignItems: "flex-start" }}>
                    <input type="radio" name="mode" value={m.id} defaultChecked={api.mode === m.id} />
                    <span><strong>{m.label}</strong><br /><span className="small muted">{m.note}</span></span>
                  </label>
                ))}
              </fieldset>
              <label className="check" style={{ alignItems: "flex-start" }}>
                <input type="checkbox" name="paused" defaultChecked={api.paused} />
                <span><strong>Pause the API for everyone</strong><br /><span className="small muted">Every key returns 403 with code api_paused until you untick this. Nothing is deleted.</span></span>
              </label>
            </ActionForm>
          </section>
          <section className="panel">
            <h2 className="section-title">Cloudflare Turnstile</h2>
            <p className="small muted">A bot check shown on sign-in, sign-up and password reset. Create a widget in the Cloudflare dashboard under Turnstile, add your domain, then paste both keys here. Status: <strong>{tsOn ? "On" : "Off"}</strong>.</p>
            <ActionForm action={saveTurnstileAction} submit="Save Turnstile" pendingLabel="Saving...">
              <Field label="Site key" name="site_key" defaultValue={ts.siteKey} placeholder="0x4AAAAAAA..." maxLength={80} />
              <Field label="Secret key" name="secret_key" type="password" autoComplete="off" placeholder={ts.secret ? "Saved. Type a new one to replace it." : "0x4AAAAAAA..."} maxLength={120} hint="Stored encrypted and never shown again. You can also set TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY in the environment." />
              <label className="check"><input type="checkbox" name="clear" /> Turn Turnstile off and remove the keys</label>
            </ActionForm>
          </section>

          <section className="panel">
            <h2 className="section-title">Visitor country (country routes)</h2>
            <p className="small muted">Country routes send visitors from a country to their own page. A host without a CDN does not know the country, so paste a free token from ipinfo.io here. The visitor's address is then sent to ipinfo.io only on links that have country routes, and the answer is remembered for a day. Status: <strong>{geoOn ? "On" : "Off"}</strong>. With a CDN such as Cloudflare you do not need this.</p>
            <ActionForm action={saveGeoipAction} submit="Save token" pendingLabel="Checking...">
              <Field label="ipinfo.io token" name="token" type="password" autoComplete="off" placeholder={geoOn ? "Saved. Type a new one to replace it." : "Paste your token"} maxLength={64} hint="Stored encrypted and never shown again. The GEOIP_TOKEN environment variable also works." />
              <label className="check"><input type="checkbox" name="clear" /> Remove the token</label>
            </ActionForm>
          </section>

          <section className="panel">
            <h2 className="section-title">Always on</h2>
            <table className="table">
              <tbody>
                <tr><th scope="row">Brute force</th><td>Only failed sign-ins count. 5 failures for one email or 20 from one connection lock sign-in for 15 minutes, and 100 from one connection lock it for a day. A locked account refuses even the right password.</td></tr>
                <tr><th scope="row">SQL injection</th><td>Every database call uses prepared statements, so input is never part of the query text. A test fails the build if new text is placed inside SQL. Scanner payloads in a URL are turned away with a 400.</td></tr>
                <tr><th scope="row">API keys</th><td>Keys are stored as hashes. Wrong keys lock out guessing (30 misses in 10 minutes per connection). Requests are limited per minute and per day.</td></tr>
                <tr><th scope="row">Passwords</th><td>Hashed with bcrypt, with a fixed-time check for unknown emails so the response does not show which accounts exist.</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </>
  );
}
