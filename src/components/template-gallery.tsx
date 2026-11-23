"use client";

import { useState, useTransition } from "react";
import { Check, Search } from "lucide-react";
import { applyTemplateAction } from "@/app/actions/app";
import { BrandIcon } from "./brand-icon";
import { brandForUrl } from "@/lib/brands.ts";
import type { Template } from "@/lib/templates.ts";

/** One-click templates: a ready look, plus optional starter links (saved switched off). */
export function TemplateGallery({ templates, current }: { templates: Template[]; current: string }) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = templates.filter((t) => `${t.name} ${t.niche} ${t.note}`.toLowerCase().includes(q.trim().toLowerCase()));
  const apply = (t: Template, withContent: boolean) => {
    if (!window.confirm(`Use the ${t.name} template? Your own colours are replaced${withContent ? "; starter links are added only if your page is empty" : ""}. Your existing links stay.`)) return;
    setBusy(`${t.id}:${withContent}`);
    start(async () => {
      const r = await applyTemplateAction(t.id, withContent);
      setMsg({ ok: !!r.ok, text: r.message ?? "Done." });
      setBusy(null);
    });
  };
  return (
    <div>
      <div className="field" style={{ maxWidth: 360 }}>
        <label htmlFor="tpl-q">Find a template</label>
        <div className="input-prefix"><span aria-hidden="true"><Search className="icon" /></span><input id="tpl-q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Musician, cafe, coach..." /></div>
      </div>
      {msg && <div className={`notice ${msg.ok ? "good" : "bad"}`} role="status">{msg.text}</div>}
      {shown.length === 0 && <p className="muted">No template matches that. Try a different word.</p>}
      <ul className="tpl-grid">
        {shown.map((t) => {
          const th = t.theme;
          const links = t.starter.filter((b) => b.type === "link").slice(0, 3);
          return (
            <li key={t.id} className={`tpl ${current === t.id ? "on" : ""}`}>
              <div className="tpl-view" aria-hidden="true" style={{ background: th.bg, backgroundImage: th.bgImage, color: th.fg, fontFamily: th.font === "mono" ? "var(--font-mono)" : th.font === "serif" ? "var(--font-display)" : "var(--font-text)" }}>
                <span className="tpl-avatar" style={{ borderColor: th.fg }} />
                <span className="tpl-name">{t.name}</span>
                {links.map((b) => {
                  const brand = brandForUrl(b.url);
                  return (
                    <span key={b.title} className="tpl-btn" style={{ background: th.btnBg, color: th.btnFg, borderColor: th.btnBorder, borderRadius: th.shape === "pill" ? 99 : th.shape === "round" ? 6 : 0, boxShadow: th.style === "offset" ? `2px 2px 0 ${th.btnBorder}` : undefined }}>
                      {brand && <BrandIcon brand={brand} size={10} />}
                      <i style={{ background: "currentColor" }} />
                    </span>
                  );
                })}
              </div>
              <div className="tpl-info">
                <strong>{t.name}{current === t.id && <span className="badge good" style={{ marginLeft: 8 }}><Check className="icon" style={{ width: 12, height: 12 }} /> In use</span>}</strong>
                <span className="small muted">{t.niche}</span>
              </div>
              <div className="tpl-actions">
                <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => apply(t, false)}>{busy === `${t.id}:false` ? "Applying..." : "Use this look"}</button>
                <button type="button" className="btn btn-sm" disabled={pending} onClick={() => apply(t, true)}>{busy === `${t.id}:true` ? "Applying..." : "Look + starter links"}</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
