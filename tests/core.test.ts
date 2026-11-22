import { test } from "node:test";
import assert from "node:assert/strict";
import { LRU } from "../src/lib/lru.ts";
import { ClickBuffer } from "../src/lib/click-buffer.ts";
import { classifyPath, decideHost, effectiveHost, effectiveProto, isPublicContentPath, bioHostFor, linkHostFor, normalizeHost } from "../src/lib/host-policy.ts";
import { applyUtm, checkTargetUrl } from "../src/lib/url-check.ts";

test("LRU evicts least recently used and honours TTL", () => {
  let t = 0;
  const c = new LRU<number>(2, 100, () => t);
  c.set("a", 1); c.set("b", 2); c.get("a"); c.set("c", 3);
  assert.equal(c.get("b"), undefined);
  assert.equal(c.get("a"), 1);
  t = 101;
  assert.equal(c.get("a"), undefined);
  c.set("x", 9); c.delete("x");
  assert.equal(c.get("x"), undefined);
});

test("ClickBuffer batches, flushes at size, on stop, and retries a failed batch", async () => {
  const batches: number[][] = [];
  let fail = true;
  const b = new ClickBuffer<number>(async (x) => { if (fail) { fail = false; throw new Error("db down"); } batches.push(x); }, { maxEvents: 3, intervalMs: 10_000 });
  b.push(1); b.push(2);
  assert.equal(batches.length, 0);
  b.push(3);
  await b.flush();
  assert.equal(b.pending, 3); // first write failed, batch kept
  await b.stop();
  assert.deepEqual(batches, [[1, 2, 3]]);
  const small = new ClickBuffer<number>(async () => {}, { maxQueue: 2, maxEvents: 99 });
  small.push(1); small.push(2); small.push(3);
  assert.equal(small.pending, 2);
});

const base = { defaultHost: "link.example.com", activeHosts: ["link.example.com", "old.example.com"], apiHosts: ["api.example.com"], appHost: "example.com" };
const d = (host: string, pathname: string) => decideHost({ ...base, host, pathname });
const allow = { kind: "allow" }, nf = { kind: "notfound" }, toMain = { kind: "redirect", host: "example.com" };

test("host policy: public content is served on active site domains only (links pick their domain, bio pages use the default)", () => {
  for (const h of ["link.example.com", "old.example.com"]) for (const p of ["/promo", "/out/5", "/api/vcard/5"]) assert.deepEqual(d(h, p), allow, `${h}${p}`);
  for (const h of ["example.com", "api.example.com", "evil.example.net"]) for (const p of ["/promo", "/out/5", "/api/vcard/5"]) assert.deepEqual(d(h, p), nf, `${h}${p}`);
});

test("linkHostFor: a link answers on its own domain, otherwise on the default", () => {
  assert.equal(linkHostFor(null, "Link.Example.com"), "link.example.com");
  assert.equal(linkHostFor(undefined, "link.example.com"), "link.example.com");
  assert.equal(linkHostFor("OLD.example.com", "link.example.com"), "old.example.com");
});

test("host policy: the main domain serves the app, dashboard, admin, login and API", () => {
  for (const p of ["/", "/dashboard", "/admin/domains", "/login", "/install", "/api/qr", "/api/upload", "/api/export/links"]) assert.deepEqual(d("example.com", p), allow, p);
});

test("host policy: a link domain redirects every app page to the same path on the main domain", () => {
  for (const h of ["link.example.com", "old.example.com"]) {
    for (const p of ["/", "/dashboard", "/login", "/admin", "/register", "/report", "/terms"]) assert.deepEqual(d(h, p), toMain, `${h}${p}`);
  }
  assert.deepEqual(d("link.example.com", "/api/qr"), nf);
  assert.deepEqual(d("old.example.com", "/api/qr"), nf);
});

test("host policy: the API domain serves /api only; its pages redirect to the main domain", () => {
  assert.deepEqual(d("api.example.com", "/api/v1/links"), allow);
  assert.deepEqual(d("api.example.com", "/api/health"), allow);
  for (const p of ["/api/qr", "/api/export/links", "/api/upload", "/api/auth/google", "/api/report"]) assert.deepEqual(d("api.example.com", p), nf, p); // session endpoints stay on the main domain
  assert.deepEqual(d("api.example.com", "/api/vcard/3"), nf);
  assert.deepEqual(d("api.example.com", "/"), toMain);
  assert.deepEqual(d("api.example.com", "/login"), toMain);
});

test("host policy: /api/v1 is accepted only on the API domain once one is active", () => {
  assert.deepEqual(d("api.example.com", "/api/v1/links"), allow);
  for (const h of ["example.com", "link.example.com", "old.example.com"]) assert.deepEqual(d(h, "/api/v1/links"), nf, h);
  assert.deepEqual(d("evil.example.net", "/api/v1/links"), nf);
});

test("host policy: before an API domain exists, /api/v1 stays on the main domain only", () => {
  const e = (host: string) => decideHost({ ...base, apiHosts: [], host, pathname: "/api/v1/links" });
  assert.deepEqual(e("example.com"), allow);
  for (const h of ["link.example.com", "old.example.com", "api.example.com"]) assert.deepEqual(e(h), nf, h);
});

test("host policy: static assets work on every known host", () => {
  for (const h of ["example.com", "link.example.com", "api.example.com", "old.example.com"]) for (const p of ["/_next/static/a.js", "/uploads/a.png", "/icon.svg", "/robots.txt"]) assert.deepEqual(d(h, p), allow, `${h}${p}`);
});

test("host policy: unknown hosts get 404 everywhere except /api/health", () => {
  for (const p of ["/", "/dashboard", "/promo", "/api/v1/links", "/install", "/_next/x.js"]) assert.deepEqual(d("evil.example.net", p), nf, p);
  assert.deepEqual(d("evil.example.net", "/api/health"), allow);
  assert.deepEqual(d("", "/"), nf);
  assert.deepEqual(d("LINK.example.com:443", "/promo"), allow);
});

test("host policy: when the main domain is the default, it serves everything (lockout prevention)", () => {
  const e = (host: string, pathname: string) => decideHost({ host, pathname, defaultHost: "example.com", activeHosts: [], appHost: "example.com" });
  for (const p of ["/promo", "/dashboard", "/api/v1/links", "/api/qr", "/"]) assert.deepEqual(e("example.com", p), allow, p);
  // APP_URL host stays reachable even when the default domain row is gone
  assert.deepEqual(decideHost({ host: "example.com", pathname: "/admin/domains", defaultHost: "gone.example.com", activeHosts: [], appHost: "example.com" }), allow);
});

test("classifyPath / isPublicContentPath", () => {
  for (const p of ["/promo", "/jane-doe", "/out/3", "/api/vcard/9"]) assert.equal(isPublicContentPath(p), true, p);
  for (const p of ["/", "/dashboard/links", "/admin", "/api/qr", "/login", "/terms", "/report", "/uploads/a.png", "/_next/x.js", "/robots.txt"]) assert.equal(isPublicContentPath(p), false, p);
  assert.equal(classifyPath("/api/v1/x"), "api-v1");
  assert.equal(classifyPath("/api/qr"), "api");
  assert.equal(classifyPath("/_next/x"), "static");
});

test("forwarded headers are trusted only when TRUST_PROXY=true", () => {
  const h: Record<string, string> = { host: "internal:3000", "x-forwarded-host": "go.example.com", "x-forwarded-proto": "https" };
  const get = (n: string) => h[n];
  assert.equal(effectiveHost(get, false), "internal");
  assert.equal(effectiveHost(get, true), "go.example.com");
  assert.equal(effectiveProto(get, false, "http"), "http");
  assert.equal(effectiveProto(get, true, "http"), "https");
  assert.equal(normalizeHost("Example.COM.:8080"), "example.com");
});

test("destination safety: schemes, credentials, IPs, loops, shorteners", () => {
  const own = ["go.example.com", "app.example.com"];
  for (const u of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "https://u:p@example.com", "http://8.8.8.8/", "http://[2001:db8::1]/", "http://localhost/", "http://10.1.1.1/", "http://0177.0.0.1/", "http://intranet/",
    "https://go.example.com/x", "https://app.example.com", "https://bit.ly/abc", "https://sub.tinyurl.com/x", "https://t.co/x"]) {
    assert.equal(checkTargetUrl(u, own).ok, false, u);
  }
  assert.equal(checkTargetUrl("https://example.org/a?b=1", own).ok, true);
});

test("applyUtm: adds given tags, replaces existing ones, skips empty, leaves junk alone", () => {
  assert.equal(applyUtm("https://example.com/a", {}), "https://example.com/a");
  assert.equal(applyUtm("https://example.com/a", { utm_source: "news", utm_medium: "", utm_campaign: " spring " }), "https://example.com/a?utm_source=news&utm_campaign=spring");
  assert.equal(applyUtm("https://example.com/a?x=1&utm_source=old", { utm_source: "new" }), "https://example.com/a?x=1&utm_source=new");
  assert.equal(applyUtm("not a url", { utm_source: "x" }), "not a url");
});

test("bioHostFor: the bio domain when there is one, otherwise the default", () => {
  assert.equal(bioHostFor("Bio.Example.com", "go.example.com"), "bio.example.com");
  assert.equal(bioHostFor(null, "go.example.com"), "go.example.com");
});

test("crawler files are static on every host: robots.txt, sitemap.xml, llms.txt", () => {
  for (const p of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) {
    assert.equal(classifyPath(p), "static", p);
    assert.deepEqual(d("api.example.com", p), allow, p);
  }
});

test("smart links: platform destinations and fallback to the normal target", async () => {
  const { detectOs, pickDestination } = await import("../src/lib/smart-link.ts");
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
  const pixel = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  const desktop = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36";
  assert.deepEqual([detectOs(iphone), detectOs(pixel), detectOs(desktop), detectOs("")], ["ios", "android", "windows", "other"]);
  const link = { target_url: "https://example.com/", ios_url: "https://apps.apple.com/app/x", android_url: null };
  assert.equal(pickDestination(link, iphone), "https://apps.apple.com/app/x");
  assert.equal(pickDestination(link, pixel), "https://example.com/"); // no Android URL set
  assert.equal(pickDestination(link, desktop), "https://example.com/");
  assert.equal(pickDestination({ target_url: "https://example.com/" }, iphone), "https://example.com/");
});

test("smart links: desktop platforms and look-alike user agents", async () => {
  const { detectOs, pickDestination } = await import("../src/lib/smart-link.ts");
  const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari/605.1.15";
  const linux = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
  const chromeos = "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/120 Safari/537.36";
  assert.deepEqual([win, mac, linux, iphone, android, chromeos].map(detectOs), ["windows", "macos", "linux", "ios", "android", "other"]);
  const link = { target_url: "https://x.com/", windows_url: "https://x.com/win", linux_url: "https://x.com/lin" };
  assert.equal(pickDestination(link, win), "https://x.com/win");
  assert.equal(pickDestination(link, linux), "https://x.com/lin");
  assert.equal(pickDestination(link, mac), "https://x.com/"); // no Mac URL: normal destination
  assert.equal(pickDestination(link, android), "https://x.com/"); // Android is not Linux
});

import { parseDuration, resolveSchedule } from "../src/lib/duration.ts";

test("parseDuration accepts m/h/d/w and rejects junk", () => {
  assert.equal(parseDuration("30m"), 30 * 60_000);
  assert.equal(parseDuration("12h"), 12 * 3_600_000);
  assert.equal(parseDuration("7d"), 7 * 86_400_000);
  assert.equal(parseDuration("2w"), 14 * 86_400_000);
  for (const bad of ["", "0d", "-1d", "7", "d", "1.5h", "5y", "99999d"]) assert.equal(parseDuration(bad), null, bad);
});

test("resolveSchedule defaults: no start = now, no expiry = never", () => {
  const r = resolveSchedule({});
  assert.deepEqual(r, { ok: true, starts_at: null, expires_at: null });
});

test("resolveSchedule relative values", () => {
  const now = Date.UTC(2026, 0, 1);
  const r = resolveSchedule({ starts_in: "1d", expires_in: "7d" }, now);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.starts_at?.getTime(), now + 86_400_000);
    assert.equal(r.expires_at?.getTime(), now + 8 * 86_400_000);
  }
  const e = resolveSchedule({ expires_in: "2h" }, now);
  assert.ok(e.ok && e.expires_at?.getTime() === now + 7_200_000 && e.starts_at === null);
});

test("resolveSchedule rejects conflicts and bad order", () => {
  const d = new Date();
  assert.equal(resolveSchedule({ starts_at: d, starts_in: "1d" }).ok, false);
  assert.equal(resolveSchedule({ expires_at: d, expires_in: "1d" }).ok, false);
  assert.equal(resolveSchedule({ expires_in: "xx" }).ok, false);
  assert.equal(resolveSchedule({ starts_at: new Date(2000), expires_at: new Date(1000) }).ok, false);
});

import { clicksExhausted, clicksLeft } from "../src/lib/click-limit.ts";

test("click limit helpers", () => {
  assert.equal(clicksExhausted(null, 999), false);
  assert.equal(clicksExhausted(undefined, 0), false);
  assert.equal(clicksExhausted(5, 4), false);
  assert.equal(clicksExhausted(5, 5), true);
  assert.equal(clicksExhausted(5, 9), true);
  assert.equal(clicksLeft(null, 3), null);
  assert.equal(clicksLeft(5, 2), 3);
  assert.equal(clicksLeft(5, 9), 0);
});

import { deviceChoices, firstDeviceUrl, resolveDestination } from "../src/lib/smart-link.ts";

test("universal links: device URL, else a chooser", () => {
  const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";
  const WIN = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
  const link = { target_url: "https://a.example/ios", ios_url: "https://a.example/ios", android_url: "https://a.example/and", universal: 1 };
  assert.deepEqual(deviceChoices(link).map((c) => c.os), ["ios", "android"]);
  assert.equal(firstDeviceUrl({ mac_url: "https://m.example" }), "https://m.example");
  assert.equal(firstDeviceUrl({}), null);
  assert.deepEqual(resolveDestination(link, IPHONE), { kind: "redirect", url: "https://a.example/ios" });
  const r = resolveDestination(link, WIN);
  assert.equal(r.kind, "choose");
  if (r.kind === "choose") assert.equal(r.choices.length, 2);
  // a normal link still falls back to its destination
  assert.deepEqual(resolveDestination({ target_url: "https://x.example", ios_url: "https://i.example" }, WIN), { kind: "redirect", url: "https://x.example" });
});
