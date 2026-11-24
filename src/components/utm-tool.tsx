"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { buildUtmUrl } from "@/lib/utm.ts";

/** Builds a tagged link in the browser. Nothing is sent anywhere or stored. */
export function UtmTool() {
  const [f, setF] = useState({ url: "", source: "", medium: "", campaign: "", term: "", content: "" });
  const [tidy, setTidy] = useState(true);
  const [copied, setCopied] = useState(false);
  const touched = Object.values(f).some(Boolean);
  const res = useMemo(() => buildUtmUrl(f, tidy), [f, tidy]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setCopied(false); };
  const copy = async () => { if (res.ok) { try { await navigator.clipboard.writeText(res.url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ } } };
  const field = (k: keyof typeof f, label: string, hint: string, ph: string, req = false) => (
    <div className="field">
      <label htmlFor={`u-${k}`}>{label}{req ? "" : " (optional)"}</label>
      <input id={`u-${k}`} className="input" value={f[k]} onChange={set(k)} placeholder={ph} autoComplete="off" inputMode={k === "url" ? "url" : undefined} />
      <span className="hint">{hint}</span>
    </div>
  );
  return (
    <div className="tool">
      <div className="stack">
        {field("url", "Web address", "The page people will land on.", "https://example.com/sale", true)}
        <div className="grid2">
          {field("source", "Source", "Where the link is shared: newsletter, instagram, flyer.", "newsletter", true)}
          {field("medium", "Medium", "The kind of channel: email, social, qr, cpc.", "email", true)}
        </div>
        {field("campaign", "Campaign", "The name of the campaign: spring-sale.", "spring-sale", true)}
        <div className="grid2">
          {field("term", "Term", "A keyword, mostly for paid search.", "running-shoes")}
          {field("content", "Content", "Tells two links in one campaign apart.", "header-button")}
        </div>
        <label className="check"><input type="checkbox" checked={tidy} onChange={(e) => setTidy(e.target.checked)} /> Tidy the tags: lowercase, spaces become hyphens</label>
      </div>
      <div className="tool-out" role="status" aria-live="polite">
        <h2>Your tagged link</h2>
        {res.ok ? (
          <>
            <code className="out-url">{res.url}</code>
            <button type="button" className="btn btn-primary" onClick={copy}>{copied ? <><Check className="icon" /> Copied</> : <><Copy className="icon" /> Copy link</>}</button>
          </>
        ) : <p className="muted">{touched ? res.error : "Fill in the address, source, medium and campaign and the link appears here."}</p>}
      </div>
    </div>
  );
}
