"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Copy, CopyPlus, Lock, Trash2, Power } from "lucide-react";
import { bulkLinksAction, deleteLinkAction, duplicateLinkAction, toggleLinkAction } from "@/app/actions/app";

export interface LinkItem {
  id: number; slug: string; title: string | null; tags?: string[]; target: string; short: string; state: string; locked: boolean;
  clicks: number; unique: number; created: string; expires: string | null;
}

const BADGE: Record<string, string> = { active: "good", disabled: "", expired: "warn", scheduled: "warn", moderated: "bad" };

export function LinksTable({ rows }: { rows: LinkItem[] }) {
  const [sel, setSel] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<number | null>(null);
  const all = rows.length > 0 && sel.length === rows.length;
  const run = (op: "enable" | "disable" | "delete") => {
    if (op === "delete" && !window.confirm(`Delete ${sel.length} link${sel.length > 1 ? "s" : ""} and their click history?`)) return;
    start(async () => { await bulkLinksAction(op, sel); setSel([]); });
  };
  return (
    <>
      {sel.length > 0 && (
        <div className="toolbar bulk-bar" role="region" aria-label="Bulk actions">
          <span className="small">{sel.length} selected</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setSel([])}>Clear</button>
          <button className="btn btn-sm" disabled={pending} onClick={() => run("enable")}>Enable</button>
          <button className="btn btn-sm" disabled={pending} onClick={() => run("disable")}>Disable</button>
          <button className="btn btn-sm btn-danger" disabled={pending} onClick={() => run("delete")}>Delete</button>
        </div>
      )}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" aria-label="Select all" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} /></th>
              <th>Link</th><th>Destination</th><th>Status</th><th className="r">Clicks</th><th className="r">Unique</th><th style={{ width: 152 }}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="lrow">
                <td className="c-sel"><input type="checkbox" aria-label={`Select ${r.slug}`} checked={sel.includes(r.id)} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : [...sel, r.id])} /></td>
                <td className="c-main">
                  <Link href={`/dashboard/links/${r.id}`} className="title">{r.title || r.slug}</Link>
                  <div className="mono small muted">{r.short.replace(/^https?:\/\//, "")}{r.locked && <Lock className="icon" style={{ width: 12, height: 12, marginLeft: 6 }} aria-label="Password protected" />}</div>
                  {!!r.tags?.length && <div className="tag-row">{r.tags.map((t) => <Link key={t} className="tag-pill" href={`/dashboard/links?tag=${encodeURIComponent(t)}`}>{t}</Link>)}</div>}
                </td>
                <td className="dest c-dest" title={r.target}>{r.target}</td>
                <td className="c-state"><span className={`badge ${BADGE[r.state] ?? ""}`}>{r.state}</span></td>
                <td className="r num c-num" data-label="Clicks">{r.clicks.toLocaleString("en-US")}</td>
                <td className="r num c-num" data-label="Unique">{r.unique.toLocaleString("en-US")}</td>
                <td className="r c-act">
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Copy ${r.short}`} title="Copy short URL" onClick={async () => { try { await navigator.clipboard.writeText(r.short); setCopied(r.id); setTimeout(() => setCopied((c) => (c === r.id ? null : c)), 1500); } catch {} }}>{copied === r.id ? <Check className="icon" /> : <Copy className="icon" />}<span className="sr-only" aria-live="polite">{copied === r.id ? "Copied" : ""}</span></button>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Duplicate ${r.slug}`} title="Duplicate" disabled={pending} onClick={() => start(async () => { await duplicateLinkAction(r.id); })}><CopyPlus className="icon" /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={r.state === "disabled" ? "Enable" : "Disable"} title={r.state === "disabled" ? "Enable" : "Disable"} disabled={pending} onClick={() => start(async () => { await toggleLinkAction(r.id); })}><Power className="icon" /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" aria-label={`Delete ${r.slug}`} title="Delete" disabled={pending} onClick={() => { if (window.confirm(`Delete /${r.slug}? Its click history goes with it.`)) start(async () => { await deleteLinkAction(r.id); }); }}><Trash2 className="icon" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
