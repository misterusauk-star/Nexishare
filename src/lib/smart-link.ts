/** Pure rules for choosing where a visitor goes. No database, no framework: unit-testable with plain node. */

export type Os = "ios" | "android" | "windows" | "macos" | "linux" | "other";

/**
 * The visitor's platform from the User-Agent. Order matters: iOS user agents also say "like Mac OS X", and Android
 * user agents also say "Linux", so those are checked first. ChromeOS and unknown agents are "other".
 */
export function detectOs(ua: string): Os {
  if (/iphone|ipod|ipad/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/windows/i.test(ua)) return "windows";
  if (/macintosh|mac os x/i.test(ua)) return "macos";
  if (/cros/i.test(ua)) return "other";
  if (/linux|x11|ubuntu|fedora/i.test(ua)) return "linux";
  return "other";
}

export interface Routes {
  target_url: string;
  ios_url?: string | null;
  android_url?: string | null;
  windows_url?: string | null;
  mac_url?: string | null;
  linux_url?: string | null;
}

/** The destination for this visitor: their platform's own URL when the link has one, otherwise the normal destination. */
export function pickDestination(link: Routes, ua: string): string {
  switch (detectOs(ua)) {
    case "ios": return link.ios_url || link.target_url;
    case "android": return link.android_url || link.target_url;
    case "windows": return link.windows_url || link.target_url;
    case "macos": return link.mac_url || link.target_url;
    case "linux": return link.linux_url || link.target_url;
    default: return link.target_url;
  }
}

export interface DeviceChoice { os: Exclude<Os, "other">; label: string; url: string }
const DEVICE_LABELS: [DeviceChoice["os"], string, keyof Routes][] = [
  ["ios", "iPhone and iPad", "ios_url"],
  ["android", "Android", "android_url"],
  ["windows", "Windows", "windows_url"],
  ["macos", "Mac", "mac_url"],
  ["linux", "Linux", "linux_url"],
];

/** Every device URL a link has, in a fixed order. Empty when the link has none. */
export function deviceChoices(link: Partial<Routes>): DeviceChoice[] {
  const out: DeviceChoice[] = [];
  for (const [os, label, key] of DEVICE_LABELS) { const url = link[key]; if (url) out.push({ os, label, url }); }
  return out;
}

/** The URL stored as the base destination of a universal link (it has no destination of its own): the first device URL. */
export function firstDeviceUrl(link: Partial<Routes>): string | null {
  return deviceChoices(link)[0]?.url ?? null;
}

export type Resolution = { kind: "redirect"; url: string } | { kind: "choose"; choices: DeviceChoice[] };

/**
 * A normal link: the visitor's device URL, else the destination. A universal link (no destination of its own):
 * the visitor's device URL, else a page that lists the device URLs it does have.
 */
export function resolveDestination(link: Routes & { universal?: number | boolean | null }, ua: string): Resolution {
  if (!link.universal) return { kind: "redirect", url: pickDestination(link, ua) };
  const os = detectOs(ua);
  const own = deviceChoices(link).find((c) => c.os === os);
  if (own) return { kind: "redirect", url: own.url };
  return { kind: "choose", choices: deviceChoices(link) };
}
