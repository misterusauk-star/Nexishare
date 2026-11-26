import { requireUser } from "@/lib/auth";
import { ActionForm, Field } from "@/components/client";
import { LANGUAGES } from "@/lib/i18n";
import { getPrefs } from "@/lib/services/linkops";
import { saveEmailPrefsAction, sendSampleReportAction, changeEmailAction, changePasswordAction, deleteAccountAction, saveLanguageAction } from "@/app/actions/app";

export const metadata = { title: "Account" };

export default async function Account() {
  const user = await requireUser();
  const prefs = await getPrefs(user.id).catch(() => ({ weekly_report: false, health_alerts: true }));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Account</h1>
          <p>Signed in as <strong>{user.username ?? user.email}</strong>.</p>
        </div>
      </div>
      <div style={{ maxWidth: 520, display: "grid", gap: 40 }}>
        <section>
          <h2 className="section-title">Email</h2>
          <ActionForm action={changeEmailAction} submit="Update email" pendingLabel="Saving...">
            <Field label="Email address" name="email" type="email" defaultValue={user.email} autoComplete="email" required />
            <Field label="Current password" name="password" type="password" autoComplete="current-password" required />
          </ActionForm>
        </section>
        <section>
          <h2 className="section-title">Emails from us</h2>
          <ActionForm action={saveEmailPrefsAction} submit="Save" pendingLabel="Saving...">
            <label className="check"><input type="checkbox" name="weekly_report" defaultChecked={prefs.weekly_report} /> Send me a weekly report every Monday: clicks, top links and what changed</label>
            <label className="check"><input type="checkbox" name="health_alerts" defaultChecked={prefs.health_alerts} /> Tell me when a link points to a page that stopped working</label>
          </ActionForm>
          <ActionForm action={sendSampleReportAction} submit="Email me this week's report now" submitClass="btn btn-sm" pendingLabel="Sending..."><p className="small muted">The sample covers the last 7 days.</p></ActionForm>
        </section>
        <section>
          <h2 className="section-title">Password</h2>
          <ActionForm action={changePasswordAction} submit="Change password" pendingLabel="Saving..." resetOnSuccess>
            <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
            <Field label="New password" name="password" type="password" autoComplete="new-password" hint="10+ characters with a letter and a number." required />
          </ActionForm>
        </section>
        <section>
          <h2 className="section-title">Language</h2>
          <ActionForm action={saveLanguageAction} submit="Save language">
            <div className="field">
              <label htmlFor="f-language">Interface language</label>
              <select id="f-language" name="language" className="input" defaultValue={user.language}>
                {Object.entries(LANGUAGES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </div>
          </ActionForm>
        </section>
        <section>
          <h2 className="section-title">Delete account</h2>
          <p className="small muted">This removes your bio page, short links, QR codes and analytics for good. Short links will stop redirecting.</p>
          <ActionForm action={deleteAccountAction} submit="Delete my account" pendingLabel="Deleting..." submitClass="btn btn-danger">
            <Field label={`Type "${user.username ?? user.email}" to confirm`} name="confirm" autoComplete="off" required />
            <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          </ActionForm>
        </section>
      </div>
    </>
  );
}
