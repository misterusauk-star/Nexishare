"use client";

import { useEffect, useRef } from "react";

/** The phone preview. Open on a wide screen (it sits beside the editor), closed on a narrow one so the editor comes first. */
export function PreviewBox({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1101px)").matches;
    if (ref.current) ref.current.open = wide;
  }, []);
  return (
    <details className="preview-box" ref={ref} open>
      <summary>{title} <span className="muted small">{status}</span></summary>
      {children}
    </details>
  );
}
