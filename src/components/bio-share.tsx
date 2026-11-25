"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Share this page: the phone's share sheet when there is one, otherwise copies the address. */
export function BioShare({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  const go = async () => {
    const url = window.location.origin + window.location.pathname;
    try {
      if (typeof navigator.share === "function") { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch { /* closed the share sheet, or copying is blocked */ }
  };
  return (
    <button type="button" className="bio-share" onClick={go}>
      {done ? <Check size={16} strokeWidth={1.75} aria-hidden="true" /> : <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />}
      <span>{done ? "Link copied" : "Share"}</span>
      <span className="sr-only" role="status" aria-live="polite">{done ? "Link copied" : ""}</span>
    </button>
  );
}
