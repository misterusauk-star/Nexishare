import type { Brand } from "@/lib/brands.ts";

/** A platform's logo as an inline SVG in the current text colour. Decorative unless you pass `label`. */
export function BrandIcon({ brand, size = 18, label }: { brand: Brand; size?: number; label?: string }) {
  return (
    <svg className="brand-icon" width={size} height={size} viewBox={brand.viewBox} fill="currentColor" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <path d={brand.path} />
    </svg>
  );
}
