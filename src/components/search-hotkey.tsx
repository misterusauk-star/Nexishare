"use client";

import { useEffect } from "react";

/** Press "/" anywhere on the page (outside a text field) to jump to the search box. */
export function SearchHotkey({ targetId }: { targetId: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const el = document.getElementById(targetId);
      if (el) { e.preventDefault(); el.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [targetId]);
  return null;
}
