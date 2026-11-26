import { getSettings } from "./settings";
import { getDomainState } from "./domains";
import { siteThemeById } from "./site-themes";

export interface Brand {
  name: string;
  tagline: string;
  url: string;
  /** Main domain (APP_URL): sign-in, e-mail links and Google OAuth belong here, whatever the default domain is. */
  appUrl: string;
  /** Host bio pages live on: the bio domain, or the default domain when there is none. */
  bioHost: string;
  host: string;
  supportEmail: string;
  primary: string;
  logoUrl: string;
  faviconUrl: string;
  fontPair: "grotesk" | "serif";
  /** Id of the site theme picked by the super admin (see site-themes.ts). */
  siteTheme: string;
  /** True when an accent colour was set by hand, so it wins over the theme accent. */
  primaryCustom: boolean;
  footerText: string;
  showCredit: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Priority: admin DB setting > env var > default. No product name lives anywhere else in the codebase. */
export async function getBrand(): Promise<Brand> {
  const s = await getSettings();
  // Every public URL comes from the CURRENT default domain at render time. Nothing about a domain is stored on links or pages.
  const d = await getDomainState();
  const url = d.defaultUrl;
  const host = d.defaultHost;
  const theme = siteThemeById(s.site_theme);
  const custom = s.brand_primary || process.env.APP_PRIMARY_COLOR || "";
  const primary = HEX.test(custom) ? custom : theme.accent;
  const name = s.brand_name || process.env.APP_NAME || "Open Bio";
  return {
    name,
    tagline: s.brand_tagline || process.env.APP_TAGLINE || "Your links, one page, your server.",
    url,
    appUrl: d.appUrl,
    bioHost: d.bioHost,
    host,
    supportEmail: s.brand_support_email || process.env.APP_SUPPORT_EMAIL || "",
    primary,
    primaryCustom: HEX.test(custom),
    siteTheme: theme.id,
    logoUrl: s.brand_logo_url || "",
    faviconUrl: s.brand_favicon_url || "",
    fontPair: s.brand_font === "serif" ? "serif" : s.brand_font === "grotesk" ? "grotesk" : theme.font,
    footerText: s.brand_footer_text || "",
    showCredit: s.brand_powered_by === "1",
  };
}

/** Short link base, e.g. https://example.com/ */
export function shortUrl(brand: Pick<Brand, "url">, slug: string): string {
  return `${brand.url}/${slug}`;
}
