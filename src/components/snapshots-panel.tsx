"use client";

import { useState, useTransition } from "react";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { deleteSnapshotAction, restoreSnapshotAction, saveSnapshotAction } from "@/app/actions/app";

export interface SnapshotItem { id: number; label: string; created: string; blocks: number }

/** Saved copies of the bio page: save one, put one back, delete one. */
export function SnapshotsPanel({ items, max }: { items: SnapshotItem[]; max: number }) {
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const save = () => start(async () => { setMsg(await saveSnapshotAction(label)); setLabel(""); });
  const restore = (s: SnapshotItem) => {
    if (!window.confirm(`Put your page back to "${s.label}"? Changes since then are replaced. Save a copy first if you want to keep them.`)) return;
    start(async () => setMsg(await restoreSnapshotAction(s.id)));
  };
  const remove = (s: SnapshotItem) => {
    if (!window.confirm(`Delete the saved copy "${s.label}"?`)) return;
    start(async () => setMsg(await deleteSnapshotAction(s.id)));
  };
  return (
    <div className="stack">
      <p className="small muted">A saved copy holds your profile, look, social icons and every block. Restoring keeps the click counts of blocks that still exist. The newest {max} copies are kept.</p>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <label className="sr-only" htmlFor="snap-label">Name of the copy</label>
        <input id="snap-label" className="input" style={{ maxWidth: 260 }} value={label} maxLength={80} placeholder="Name (optional)" onChange={(e) => setLabel(e.target.value)} />
        <button type="button" className="btn btn-primary" disabled={pending} onClick={save}><History className="icon" />Save a copy now</button>
      </div>
      {msg && <div className="notice" role="status">{msg}</div>}
      {items.length === 0 ? (
        <div className="empty"><h3>No saved copies yet</h3><p>Save one before a big change, so you can go back.</p></div>
      ) : (
        <ul className="snap-list">
          {items.map((s) => (
            <li key={s.id}>
              <div><strong>{s.label}</strong><div className="small muted">{s.created} UTC · {s.blocks} block{s.blocks === 1 ? "" : "s"}</div></div>
              <div className="row">
                <button type="button" className="btn btn-sm" disabled={pending} onClick={() => restore(s)}><RotateCcw className="icon" />Restore</button>
                <button type="button" className="btn btn-sm btn-ghost btn-icon" aria-label={`Delete ${s.label}`} title="Delete" disabled={pending} onClick={() => remove(s)}><Trash2 className="icon" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
