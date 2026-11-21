import { isReservedRoute } from "./slug-rules.ts";

/** Lowercase, no port, no trailing dot. */
export function normalizeHost(h: string): string {
  return String(h ?? "").trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

const STATIC_SEGMENTS = new Set(["_next", "uploads", "favicon.ico", "robots.txt", "sitemap.xml", "llms.txt", "icon.svg", "manifest.json", "manifest.webmanifest", ".well-known", "static", "assets"]);

export type PathClass = "public" | "static" | "api" | "api-v1" | "page";

/**
 * - public: short links and bio pages (`/<slug>`, `/out/*`, the vCard download)
 * - static: assets every host may serve
 * - api-v1: the key-authenticated REST API (`/api/v1/*`)
 * - api: the app's own session endpoints (`/api/qr`, export, upload, sign-in) that the dashboard calls
 * - page: everything else (home, login, dashboard, admin, install, legal pages, report form)
 */
export function classifyPath(pathname: string): PathClass {
  const p = pathname.split("?")[0];
  const seg = p.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  if (!seg) return "page";
  if (seg === "api") {
    const l = p.toLowerCase();
    if (l.startsWith("/api/vcard/")) return "public";
    return /^\/api\/v1(\/|$)/.test(l) ? "api-v1" : "api";
  }
  if (seg === "out") return "public";
  if (STATIC_SEGMENTS.has(seg)) return "static";
  return isReservedRoute(seg) ? "page" : "public";
}
export const isPublicContentPath = (pathname: string) => classifyPath(pathname) === "public";

export interface HostCtx {
  host: string;
  pathname: string;
  /** Host of the current default domain: the only host that serves public content. */
  defaultHost: string;
  /** Hosts of ACTIVE domains with purpose "site". */
  activeHosts: Iterable<string>;
  /** Hosts of ACTIVE domains with purpose "api". */
  apiHosts?: Iterable<string>;
  /** Host of APP_URL: the main domain. Always allowed, so nobody is locked out. */
  appHost: string;
}
export type HostDecision = { kind: "allow" } | { kind: "notfound" } | { kind: "redirect"; host: string };
const ALLOW: HostDecision = { kind: "allow" };
const NOT_FOUND: HostDecision = { kind: "notfound" };

/**
 * One rule set for every host:
 * - /api/health answers everywhere (it is how a new domain proves it reaches this app).
 * - Unknown hosts: 404 for everything.
 * - Public content (short links, bio pages): only on active site domains, and then only on the right one: a link
 *   answers on its own domain (the default when none is chosen), bio pages on the default domain. No aliases.
 * - The main domain (APP_URL host): dashboard, admin, login, API, installer.
 * - The REST API (/api/v1/*) is accepted only on the API domain (on the main domain until one is active). Main, link and
 *   other domains return 404 for it. The API domain serves nothing else: its pages redirect to the main domain.
 * - Any other active domain (for example link.example.com): pages such as /, /login and /dashboard redirect to the
 *   same path on the main domain, so the app's functions only ever run on the main domain. Its /api/* is 404.
 * - Static assets are served by every known host (bio pages need them).
 */
export function decideHost(c: HostCtx): HostDecision {
  if (c.pathname === "/api/health") return ALLOW;
  const h = normalizeHost(c.host);
  if (!h) return NOT_FOUND;
  const main = normalizeHost(c.appHost);
  const def = normalizeHost(c.defaultHost);
  const api = new Set([...(c.apiHosts ?? [])].map(normalizeHost));
  const site = new Set([...c.activeHosts].map(normalizeHost));
  if (!(h === main || h === def || api.has(h) || site.has(h))) return NOT_FOUND;
  switch (classifyPath(c.pathname)) {
    case "static": return ALLOW;
    // Any active site domain may serve public content; the page then checks the exact host (see linkHostFor):
    // a link only answers on its own domain, bio pages only on the default domain.
    case "public": return (h === def || site.has(h)) && !api.has(h) ? ALLOW : NOT_FOUND;
    // The REST API (/api/v1) is accepted ONLY on the API domain. Until an API domain is active it stays on the main
    // domain, so existing API keys keep working and nobody is locked out.
    case "api-v1": return api.size ? (api.has(h) ? ALLOW : NOT_FOUND) : h === main ? ALLOW : NOT_FOUND;
    // The dashboard's own endpoints (QR, export, upload, sign-in) belong to the main domain alone.
    case "api": return h === main ? ALLOW : NOT_FOUND;
    case "page": return h === main ? ALLOW : { kind: "redirect", host: main };
  }
}

/**
 * Forwarded headers are only honoured when TRUST_PROXY=true, otherwise a client could spoof the host.
 */
export function effectiveHost(get: (name: string) => string | null | undefined, trustProxy: boolean): string {
  const fwd = trustProxy ? (get("x-forwarded-host") || "").split(",")[0].trim() : "";
  return normalizeHost(fwd || get("host") || "");
}
export function effectiveProto(get: (name: string) => string | null | undefined, trustProxy: boolean, fallback = "https"): string {
  const p = trustProxy ? (get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase() : "";
  return p === "http" || p === "https" ? p : fallback;
}
export const trustProxyEnabled = () => (process.env.TRUST_PROXY || "").toLowerCase() === "true";

/** The host bio pages answer on: the bio domain when one is active, otherwise the default domain. */
export function bioHostFor(bioDomainHost: string | null | undefined, defaultHost: string): string {
  return normalizeHost(bioDomainHost || defaultHost);
}

/** The host a link answers on: its chosen active domain, otherwise the default domain. */
export function linkHostFor(linkDomainHost: string | null | undefined, defaultHost: string): string {
  return normalizeHost(linkDomainHost || defaultHost);
}
