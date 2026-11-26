import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { bioUrl, getDomainState } from "@/lib/domains";
import { blockActive, ensurePage, getBlocks, BLOCK_TYPES_P1, BLOCK_TYPES_P2 } from "@/lib/services/pages";
import { totalsFor } from "@/lib/analytics";
import { SOCIALS, BASE_THEMES, themeById } from "@/lib/themes";
import { TEMPLATES } from "@/lib/templates.ts";
import { brandByKey } from "@/lib/brands.ts";
import { BrandIcon } from "@/components/brand-icon";
import { TemplateGallery } from "@/components/template-gallery";
import { phase2Enabled } from "@/lib/features";
import { listSnapshots, voteTotals } from "@/lib/services/engage";
import { MAX_SNAPSHOTS } from "@/lib/engage.ts";
import { SnapshotsPanel } from "@/components/snapshots-panel";
import { ActionForm, Field, CopyButton } from "@/components/client";
import { AvatarField, BlockList, NewBlock, ThemePicker, type BlockItem } from "@/components/bio-editor";
import { PublicPageView } from "@/components/public-page";
import { PreviewBox } from "@/components/preview-box";
import "../../../bio.css";
import { claimBioAction, saveProfileAction, saveSocialsAction, saveThemeAction } from "@/app/actions/app";

export const metadata = { title: "Bio page" };
const local = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 16) : "");

export default async function BioEditor({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const b = await getBrand();
  const st = await getDomainState();
  if (!user.username) {
    // No bio page yet: the person picks a name when they want one.
    return (
      <>
        <div className="page-head"><div><h1>Bio page</h1><p>One address for everything you share. Pick a name to create yours.</p></div></div>
        <section className="panel" style={{ maxWidth: 520 }}>
          <ActionForm action={claimBioAction} submit="Create bio page" pendingLabel="Creating...">
            <Field label="Page name" name="username" prefix={`${b.bioHost}/`} autoComplete="off" required maxLength={32} hint="3 to 32 characters: letters, numbers, hyphens and underscores. You can add links and change the look right after." />
          </ActionForm>
        </section>
      </>
    );
  }
  const page = await ensurePage(user.id, user.username);
  const blocks = await getBlocks(page.id);
  const totals = await totalsFor("block", blocks.map((x) => x.id));
  const p2 = phase2Enabled();
  const groups = p2 ? await query<{ id: number; name: string }>("SELECT id, name FROM link_groups WHERE user_id = ? ORDER BY name", [user.id]).catch(() => []) : [];
  const votes = await voteTotals(blocks.filter((x) => x.type === "poll").map((x) => x.id));
  const items: BlockItem[] = blocks.map((x) => ({
    id: x.id, type: x.type, title: x.title ?? "", url: x.url ?? "", enabled: !!x.enabled, data: x.data ?? {}, group_id: x.group_id,
    starts_at: local(x.starts_at), ends_at: local(x.ends_at), clicks: totals[x.id]?.total ?? 0,
    note: x.type === "poll" ? `${votes[x.id] ?? 0} vote${(votes[x.id] ?? 0) === 1 ? "" : "s"}` : undefined,
  }));
  const snaps = await listSnapshots(user.id).catch(() => []);
  const types = [...BLOCK_TYPES_P1, ...(p2 ? BLOCK_TYPES_P2 : [])] as string[];
  const address = bioUrl(st, user.username);
  // The preview is the real public page, drawn from what is saved right now (hidden and scheduled blocks left out, like for visitors).
  const preview = {
    page, user: { id: user.id, username: user.username }, blocks: blocks.filter((x) => blockActive(x)),
    groups: Object.fromEntries(groups.map((g) => [g.id, g.name])) as Record<number, string>,
  };
  const TABS = [
    { id: "content", label: "Content", hint: `${items.length} block${items.length === 1 ? "" : "s"}` },
    { id: "profile", label: "Profile and look" },
    { id: "social", label: "Social icons" },
    { id: "copies", label: "Saved copies" },
  ] as const;
  const tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as (typeof TABS)[number]["id"]) : "content";
  return (
    <>
      <div className="page-head">
        <div><h1>Bio page</h1><p>One address for everything you share.</p></div>
        <div className="row">
          <span className="slug">{b.bioHost}<b>/</b>{user.username}</span>
          <CopyButton value={address} label="Copy page address" />
          <a className="btn" href={bioUrl(st, user.username)} target="_blank" rel="noopener">View page</a>
        </div>
      </div>
      {page.moderated ? <div className="notice bad" role="alert">An administrator has taken this page offline. Contact {b.supportEmail} if you think this is a mistake.</div> : null}

      <div className="editor">
        <div className="editor-main">
          <nav className="subnav" aria-label="Bio page sections">
            {TABS.map((t) => (
              <Link key={t.id} href={t.id === "content" ? "?" : `?tab=${t.id}`} scroll={false} aria-current={t.id === tab ? "page" : undefined}>{t.label}{"hint" in t && t.hint ? <span className="muted small"> {t.hint}</span> : null}</Link>
            ))}
          </nav>

          {tab === "content" && (
            <section>
              {items.length === 0 && (
                <div className="empty" style={{ marginBottom: 24 }}>
                  <h3>Your page is empty</h3>
                  <p>Add your first link below, or start from a ready-made look in <Link href="?tab=profile">Profile and look</Link>.</p>
                </div>
              )}
              <BlockList key={items.map((i) => `${i.id}:${i.title}:${i.url}:${JSON.stringify(i.data)}`).join("|")} blocks={items} groups={groups} />
              <details className="edit panel" open={items.length === 0}>
                <summary className="btn btn-primary" style={{ display: "inline-flex" }}>Add to page</summary>
                <NewBlock types={types} groups={groups} />
              </details>
            </section>
          )}

          {tab === "profile" && (
            <div className="stack-lg">
              <section>
                <div className="section-title"><h2>Profile</h2></div>
                <ActionForm action={saveProfileAction} submit="Save profile" pendingLabel="Saving...">
                  <AvatarField name="avatar_url" defaultValue={page.avatar_url ?? ""} />
                  <Field label="Display name" name="display_name" defaultValue={page.display_name} maxLength={80} />
                  <Field label="Bio" name="bio" textarea rows={3} defaultValue={page.bio} maxLength={500} hint="Up to 500 characters." />
                  <label className="check"><input type="checkbox" name="published" defaultChecked={!!page.published} /> Page is public</label>
                </ActionForm>
              </section>
              <section>
                <div className="section-title"><h2>Appearance</h2></div>
                <details className="panel" style={{ marginBottom: 20 }}>
                  <summary className="btn" style={{ display: "inline-flex" }}>Templates: {TEMPLATES.length} ready-made looks</summary>
                  <p className="small muted" style={{ marginTop: 12 }}>Pick one for your kind of page. "Use this look" changes only the colours and style. "Look + starter links" also adds a few example links, saved switched off so nothing goes public until you edit and switch them on.</p>
                  <TemplateGallery templates={TEMPLATES} current={page.theme} />
                </details>
                <ActionForm action={saveThemeAction} submit="Save appearance" pendingLabel="Saving...">
                  <ThemePicker themes={BASE_THEMES.some((t) => t.id === page.theme) ? BASE_THEMES : [...BASE_THEMES, themeById(page.theme)]} current={page.theme} custom={(page.custom ?? {}) as Record<string, string>} />
                </ActionForm>
              </section>
            </div>
          )}

          {tab === "social" && (
            <section>
              <div className="section-title"><h2>Social icons</h2></div>
              <ActionForm action={saveSocialsAction} submit="Save social links" pendingLabel="Saving...">
                <p className="small muted">The icons show under your links. Paste the full address of each profile.</p>
                {(() => {
                  const row = (k: (typeof SOCIALS)[number]) => {
                    const brand = brandByKey(k);
                    const label = brand?.label ?? (k === "email" ? "Email" : "Website");
                    return (
                      <div className="social-row" key={k}>
                        {brand ? <BrandIcon brand={brand} size={20} /> : <span style={{ width: 20 }} />}
                        <Field label={label} name={`social_${k}`} type={k === "email" ? "email" : "text"} defaultValue={page.socials?.[k] ?? ""} placeholder={k === "email" ? "you@example.com" : "https://"} />
                      </div>
                    );
                  };
                  const main = SOCIALS.filter((k, i) => i < 11 || k === "email" || k === "website");
                  const more = SOCIALS.filter((k) => !main.includes(k));
                  return (
                    <>
                      <div className="stack">{main.map(row)}</div>
                      <details className="utm" style={{ marginTop: 12 }} open={more.some((k) => !!page.socials?.[k])}>
                        <summary>More platforms ({more.length})</summary>
                        <div className="stack" style={{ padding: "12px 14px" }}>{more.map(row)}</div>
                      </details>
                    </>
                  );
                })()}
              </ActionForm>
            </section>
          )}

          {tab === "copies" && (
            <section id="copies">
              <div className="section-title"><h2>Saved copies</h2></div>
              <SnapshotsPanel max={MAX_SNAPSHOTS} items={snaps.map((s) => ({ id: s.id, label: s.label, blocks: s.blocks, created: new Date(s.created_at).toISOString().slice(0, 16).replace("T", " ") }))} />
            </section>
          )}
        </div>

        <aside className="preview-col" aria-label="Preview of your page">
          <PreviewBox title="Preview" status={page.published ? "Public" : "Not public yet"}>
            <div className="phone" inert aria-hidden="true">
              <PublicPageView data={preview} brand={b} />
            </div>
            <p className="small muted">Shows what is saved. It updates every time you save.</p>
          </PreviewBox>
        </aside>
      </div>
    </>
  );
}
