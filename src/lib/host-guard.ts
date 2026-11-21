import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { dbConfigured } from "./db";
import { getDomainState } from "./domains";
import { decideHost, effectiveHost, trustProxyEnabled, type HostDecision } from "./host-policy.ts";

async function decide(host: string, pathname: string): Promise<{ d: HostDecision; appUrl: string }> {
  if (!dbConfigured()) return { d: { kind: "allow" }, appUrl: "" }; // nothing to compare against before the first setup
  const s = await getDomainState();
  return {
    d: decideHost({ host, pathname, defaultHost: s.defaultHost, activeHosts: s.activeHosts, apiHosts: s.apiHosts, appHost: s.appHost }),
    appUrl: s.appUrl,
  };
}

/**
 * Server components and actions. Unknown hosts and public content on the wrong host are a plain 404.
 * App pages opened on a link or API domain redirect to the same path on the main domain (APP_URL).
 */
export async function enforceHost(): Promise<void> {
  const h = await headers();
  const path = h.get("x-ob-path") || "/";
  const { d, appUrl } = await decide(effectiveHost((n) => h.get(n), trustProxyEnabled()), path);
  if (d.kind === "notfound") notFound();
  if (d.kind === "redirect") redirect(`${appUrl}${path}${h.get("x-ob-search") || ""}`);
}

const plain404 = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

async function guardPath(host: string, pathname: string, search: string): Promise<Response | null> {
  const { d, appUrl } = await decide(host, pathname);
  if (d.kind === "notfound") return plain404();
  if (d.kind === "redirect") return Response.redirect(`${appUrl}${pathname}${search}`, 308);
  return null;
}

/** Route handlers that know their Request: a bare 404 (or redirect), or null when the request may proceed. */
export async function guardRequest(req: Request): Promise<Response | null> {
  const u = new URL(req.url);
  return guardPath(effectiveHost((n) => req.headers.get(n), trustProxyEnabled()), u.pathname, u.search);
}

/** Same check for API route handlers, without needing the Request: reads host and path from the request headers. */
export async function guardApi(): Promise<Response | null> {
  const h = await headers();
  return guardPath(effectiveHost((n) => h.get(n), trustProxyEnabled()), h.get("x-ob-path") || "/api", h.get("x-ob-search") || "");
}

/** True when the current request arrived on the default domain. */
export async function onDefaultHost(): Promise<boolean> {
  const h = await headers();
  const s = await getDomainState();
  return effectiveHost((n) => h.get(n), trustProxyEnabled()) === s.defaultHost.toLowerCase();
}

/** True when the request arrived on the host bio pages live on (the bio domain, else the default domain). */
export async function onBioHost(): Promise<boolean> {
  const h = await headers();
  const s = await getDomainState();
  return effectiveHost((n) => h.get(n), trustProxyEnabled()) === s.bioHost.toLowerCase();
}

/** Host of the current request (forwarded headers honoured only with TRUST_PROXY=true). */
export async function currentHost(): Promise<string> {
  const h = await headers();
  return effectiveHost((n) => h.get(n), trustProxyEnabled());
}

/** 404 unless this request arrived on the bio host. Bio pages, block redirects and vCards live there only. */
export async function requireBioHost(): Promise<void> {
  if (!(await onBioHost())) notFound();
}
