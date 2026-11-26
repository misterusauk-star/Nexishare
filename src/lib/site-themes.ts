/** Site themes the super admin can pick. DB-free. The matching CSS lives in globals.css under [data-site="<id>"]. */
export interface SiteTheme {
  id: string;
  name: string;
  note: string;
  /** Default accent. An accent set under Branding overrides it. */
  accent: string;
  font: "grotesk" | "serif";
  /** Swatches for the picker: page, panel, text, accent. */
  swatch: { bg: string; surface: string; ink: string };
}

export const SITE_THEMES: SiteTheme[] = [
  { id: "ledger", name: "Ledger", note: "Green accent, soft grey page. The default.", accent: "#0e7c66", font: "grotesk", swatch: { bg: "#f2f3f0", surface: "#ffffff", ink: "#15191c" } },
  { id: "ocean", name: "Ocean", note: "Blue accent, cool page, slightly rounder corners.", accent: "#1f5fa6", font: "grotesk", swatch: { bg: "#eef2f7", surface: "#ffffff", ink: "#131a24" } },
  { id: "sand", name: "Sand", note: "Warm paper, terracotta accent, serif headings.", accent: "#a8431f", font: "serif", swatch: { bg: "#f5f0e8", surface: "#fffdf8", ink: "#231c15" } },
  { id: "graphite", name: "Graphite", note: "Neutral greys, sharp corners, high contrast.", accent: "#475569", font: "grotesk", swatch: { bg: "#f4f4f5", surface: "#ffffff", ink: "#111113" } },
];

export const DEFAULT_SITE_THEME = "ledger";

export function siteThemeById(id: string | undefined | null): SiteTheme {
  return SITE_THEMES.find((t) => t.id === id) ?? SITE_THEMES[0];
}
