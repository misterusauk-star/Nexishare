import { test } from "node:test";
import assert from "node:assert/strict";
import { LRU } from "../src/lib/lru.ts";
import { ClickBuffer } from "../src/lib/click-buffer.ts";
import { classifyPath, decideHost, effectiveHost, effectiveProto, isPublicContentPath, normalizeHost } from "../src/lib/host-policy.ts";
import { checkTargetUrl } from "../src/lib/url-check.ts";

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

test("host policy: public content only on the default domain", () => {
  assert.deepEqual(d("link.example.com", "/promo"), allow);
  assert.deepEqual(d("link.example.com", "/out/5"), allow);
  for (const h of ["old.example.com", "example.com", "api.example.com"]) {
    for (const p of ["/promo", "/out/5", "/api/vcard/5"]) assert.deepEqual(d(h, p), nf, `${h}${p}`);
  }
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
