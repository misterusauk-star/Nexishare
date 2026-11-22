/** Pure rules for choosing where a visitor goes. No database, no framework: unit-testable with plain node. */

export type Os = "ios" | "android" | "other";

/** iPhone, iPod and iPad (older iPadOS) report iOS; everything Android is Android. Anything else, desktop included, is "other". */
export function detectOs(ua: string): Os {
  if (/iphone|ipod|ipad/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

export interface Routes { target_url: string; ios_url?: string | null; android_url?: string | null }

/** The destination for this visitor: their platform's own URL when the link has one, otherwise the normal destination. */
export function pickDestination(link: Routes, ua: string): string {
  const os = detectOs(ua);
  if (os === "ios" && link.ios_url) return link.ios_url;
  if (os === "android" && link.android_url) return link.android_url;
  return link.target_url;
}
