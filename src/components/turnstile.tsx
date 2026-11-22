"use client";

import { useEffect, useRef } from "react";

type Api = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void; remove: (id?: string) => void };
declare global { interface Window { turnstile?: Api; __tsLoading?: Promise<void> } }

function load(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!window.__tsLoading) {
    window.__tsLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { window.__tsLoading = undefined; reject(new Error("turnstile")); };
      document.head.appendChild(s);
    });
  }
  return window.__tsLoading;
}

/**
 * Cloudflare Turnstile. Renders the widget and puts its token in a hidden field named cf-turnstile-response, which the
 * server action checks. The token works once, so the widget is reset whenever `resetKey` changes (after each submit).
 */
export function TurnstileField({ siteKey, resetKey }: { siteKey: string; resetKey?: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    let gone = false;
    load().then(() => {
      if (gone || !box.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(box.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (t: string) => { if (input.current) input.current.value = t; },
        "expired-callback": () => { if (input.current) input.current.value = ""; },
        "error-callback": () => { if (input.current) input.current.value = ""; },
      });
    }).catch(() => {});
    return () => { gone = true; if (widget.current && window.turnstile) { window.turnstile.remove(widget.current); widget.current = null; } };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey === undefined || !widget.current || !window.turnstile) return;
    if (input.current) input.current.value = "";
    window.turnstile.reset(widget.current);
  }, [resetKey]);

  return (
    <div className="field">
      <div ref={box} aria-label="Security check" />
      <input ref={input} type="hidden" name="cf-turnstile-response" defaultValue="" />
    </div>
  );
}
