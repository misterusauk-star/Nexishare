import { BrandIcon } from "./brand-icon";
import { brandForUrl } from "@/lib/brands.ts";
import type { Template } from "@/lib/templates.ts";

/** A small picture of a template: its colours, shape and the logos of its starter links. Decorative. */
export function TemplatePreview({ t }: { t: Template }) {
  const th = t.theme;
  const links = t.starter.filter((b) => b.type === "link").slice(0, 4);
  return (
    <div className="seo-preview" aria-hidden="true" style={{ background: th.bg, backgroundImage: th.bgImage, color: th.fg, fontFamily: th.font === "mono" ? "var(--font-mono)" : th.font === "serif" ? "var(--font-display)" : "var(--font-text)" }}>
      <span className="tp-avatar" style={{ borderColor: th.fg }} />
      <span className="tp-name">{t.name}</span>
      {links.map((b) => {
        const brand = brandForUrl(b.url);
        return (
          <span key={b.title} className="tp-btn" style={{ background: th.btnBg, color: th.btnFg, borderColor: th.btnBorder, borderRadius: th.shape === "pill" ? 99 : th.shape === "round" ? 6 : 0, boxShadow: th.style === "offset" ? `3px 3px 0 ${th.btnBorder}` : undefined }}>
            {brand && <BrandIcon brand={brand} size={14} />}
            <span>{b.title}</span>
          </span>
        );
      })}
    </div>
  );
}
