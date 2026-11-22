import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getDomainState, linkUrl } from "@/lib/domains";
import { linkState, type LinkRow } from "@/lib/services/links";
import { deviceChoices } from "@/lib/smart-link";
import { ActionForm, DomainSelect, Field, CopyButton } from "@/components/client";
import { createUniversalAction } from "@/app/actions/app";

export const metadata = { title: "Universal links" };

const BADGE: Record<string, string> = { active: "good", scheduled: "warn", expired: "bad", disabled: "", review: "warn", moderated: "bad" };

export default async function UniversalPage() {
  const user = await requireUser();
  const st = await getDomainState();
  const rows = await query<LinkRow>("SELECT * FROM links WHERE user_id = ? AND universal = 1 ORDER BY id DESC LIMIT 100", [user.id]).catch(() => [] as LinkRow[]);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Universal links</h1>
          <p>One short link for every device. Give each platform its own address, for example an app store page, and visitors go to the one that fits their device.</p>
        </div>
      </div>

      <details className="edit panel" open={rows.length === 0}>
        <summary className="btn btn-primary" style={{ display: "inline-flex" }}>New universal link</summary>
        <ActionForm action={createUniversalAction} submit="Create universal link" pendingLabel="Creating..." resetOnSuccess>
          <p className="small muted">Fill in at least one device. A visitor on a device you leave empty sees a page listing the ones you filled in.</p>
          <Field label="iPhone and iPad" name="ios_url" type="url" placeholder="https://apps.apple.com/app/..." maxLength={2048} />
          <Field label="Android" name="android_url" type="url" placeholder="https://play.google.com/store/apps/..." maxLength={2048} />
          <Field label="Windows" name="windows_url" type="url" placeholder="https://example.com/download/windows" maxLength={2048} />
          <Field label="Mac" name="mac_url" type="url" placeholder="https://example.com/download/mac" maxLength={2048} />
          <Field label="Linux" name="linux_url" type="url" placeholder="https://example.com/download/linux" maxLength={2048} />
          <DomainSelect domains={st.linkDomains} />
          <div className="grid2">
            <Field label="Short name" name="slug" hint="Leave empty for a random one. Letters, numbers, hyphens." maxLength={64} />
            <Field label="Label" name="title" hint="Only you see this." maxLength={160} />
          </div>
        </ActionForm>
      </details>

      <div style={{ marginTop: 24 }}>
        {rows.length === 0 ? (
          <div className="empty">
            <h3>No universal links yet</h3>
            <p>Create one above, then share the short link. It sends iPhone, Android, Windows, Mac and Linux visitors to their own address.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Short link</th><th>Devices</th><th>Status</th><th className="r"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const short = linkUrl(st, r.domain_id, r.slug);
                  const state = linkState(r);
                  return (
                    <tr key={r.id}>
                      <td><span className="slug">{short.replace(/^https?:\/\//, "")}</span></td>
                      <td className="small">{deviceChoices(r).map((c) => c.label).join(", ")}</td>
                      <td><span className={`badge ${BADGE[state] ?? ""}`}>{state}</span></td>
                      <td className="r"><div className="row" style={{ justifyContent: "flex-end" }}><CopyButton value={short} /><Link className="btn btn-sm" href={`/dashboard/links/${r.id}`}>Edit</Link></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
