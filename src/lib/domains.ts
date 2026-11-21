import { dbConfigured, query } from "./db";
import { LRU } from "./lru.ts";
import { createDomainService, normalizeHostname, type DomainService } from "./domain-service.ts";
import { checkDomainHttps } from "./domain-check.ts";
import { mysqlDomainStore } from "./domain-store";
import { bioHostFor, linkHostFor, normalizeHost } from "./host-policy.ts";

export interface DomainState {
  /** Host of the current default domain, e.g. "go.example.com". */
  defaultHost: string;
  /** Origin (scheme + host) of the current default domain. Every public URL is built from this at render time. */
  defaultUrl: string;
  /** Hosts of all ACTIVE site domains (main, link and others). */
  activeHosts: string[];
  /** Active site domains a link may be placed on (id, host, whether it is the default). */
  linkDomains: { id: number; host: string; isDefault: boolean }[];
  /** Host bio pages answer on: the active bio domain, otherwise the default domain. */
  bioHost: string;
  /** Hosts of ACTIVE API domains. They serve /api/v1 only. */
  apiHosts: string[];
  /** Origin the REST API is documented on: the first active API domain, otherwise the main domain. */
  apiUrl: string;
  /** Host and origin of APP_URL. Always allowed so nobody is locked out. */
  appHost: string;
  appUrl: string;
}

const g = globalThis as unknown as { __domSvc?: DomainService; __domSeeded?: boolean; __domCache?: LRU<DomainState> };
const cache = (g.__domCache ??= new LRU<DomainState>(1, 10_000));

export function appOrigin(): { host: string; url: string } {
  let raw = (process.env.APP_URL || "http://localhost:3000").trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    return { host: normalizeHost(u.host), url: `${u.protocol}//${u.host}` };
  } catch {
    return { host: "localhost", url: "http://localhost:3000" };
  }
}

export function domainService(): DomainService {
  return (g.__domSvc ??= createDomainService({ store: mysqlDomainStore, check: (h) => checkDomainHttps(h) }));
}

export function invalidateDomains(): void { cache.clear(); }

/** The scheme for a host: APP_URL's own scheme for the APP_URL host (so http://localhost works in dev), https otherwise. */
const originFor = (host: string) => {
  const a = appOrigin();
  return host === a.host ? a.url : `https://${host}`;
};

/** Cached (10s) view of the domain table. Never throws: before install or migration it falls back to APP_URL. */
export async function getDomainState(): Promise<DomainState> {
  const hit = cache.get("s");
  if (hit) return hit;
  const a = appOrigin();
  let state: DomainState = { defaultHost: a.host, defaultUrl: a.url, activeHosts: [a.host], linkDomains: [], bioHost: a.host, apiHosts: [], apiUrl: a.url, appHost: a.host, appUrl: a.url };
  if (dbConfigured()) {
    try {
      if (!g.__domSeeded) { await domainService().ensureSeed(a.host); g.__domSeeded = true; }
      const rows = await query<{ id: number; hostname: string; status: string; purpose: string; is_default: number }>("SELECT id, hostname, status, purpose, is_default FROM site_domains");
      const def = rows.find((r) => r.is_default && r.status === "active") ?? rows.find((r) => r.is_default);
      if (def) state = { ...state, defaultHost: def.hostname, defaultUrl: originFor(def.hostname) };
      const active = rows.filter((r) => r.status === "active");
      state.activeHosts = active.filter((r) => r.purpose !== "api").map((r) => r.hostname);
      state.linkDomains = active.filter((r) => r.purpose !== "api" && r.purpose !== "bio").map((r) => ({ id: Number(r.id), host: r.hostname, isDefault: !!r.is_default }));
      state.bioHost = bioHostFor(active.find((r) => r.purpose === "bio")?.hostname, state.defaultHost);
      state.apiHosts = active.filter((r) => r.purpose === "api").map((r) => r.hostname);
      if (state.apiHosts[0]) state.apiUrl = originFor(state.apiHosts[0]);
    } catch {
      /* table missing (before install/migration): keep the APP_URL fallback */
    }
  }
  cache.set("s", state);
  return state;
}

/** Host a link answers on (its chosen active domain, else the default). */
export function linkHost(s: DomainState, domainId: number | null | undefined): string {
  const d = domainId ? s.linkDomains.find((x) => x.id === Number(domainId)) : undefined;
  return linkHostFor(d?.host, s.defaultHost);
}
/** Public URL of a link, built at render time from its domain. */
export function linkUrl(s: DomainState, domainId: number | null | undefined, slug: string): string {
  return `${originFor(linkHost(s, domainId))}/${slug}`;
}

/** Public URL of a bio page: on the bio domain when there is one, otherwise on the default domain. */
export function bioUrl(s: DomainState, username: string): string {
  return `${originFor(s.bioHost)}/${username}`;
}

/** Every host this install answers on. Short links must never point at one of these (redirect loops). */
export async function ownHostList(extra?: string): Promise<string[]> {
  const s = await getDomainState();
  return [...new Set([s.defaultHost, s.appHost, ...s.activeHosts, ...s.apiHosts, ...(extra ? [extra] : [])].map(normalizeHost))];
}

export { normalizeHostname };
