import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LIMITS, effectiveLimit, parseLimit } from "../src/lib/limits.ts";
import { DEFAULT_ALLOWED_DOMAINS, allowedFromSetting, emailDomain, isEmailAllowed, parseDomainList } from "../src/lib/email-domains.ts";
import { looksLikeProbe } from "../src/lib/waf.ts";
import { isSiteKey, parseVerifyResponse } from "../src/lib/turnstile-rules.ts";

test("limits: low defaults, per-user beats site beats default", () => {
  assert.equal(DEFAULT_LIMITS.api_per_minute, 20);
  assert.equal(DEFAULT_LIMITS.max_links, 100);
  assert.equal(effectiveLimit("max_links", null, null), 100);
  assert.equal(effectiveLimit("max_links", null, 500), 500);
  assert.equal(effectiveLimit("max_links", 1000, 500), 1000);
  assert.equal(effectiveLimit("max_links", 0, undefined), 100);
});

test("limits: admin input is validated", () => {
  assert.deepEqual(parseLimit("max_links", ""), { ok: true, value: null });
  assert.deepEqual(parseLimit("max_links", " 250 "), { ok: true, value: 250 });
  for (const bad of ["0", "-5", "1.5", "abc", "99999999999", "10000001"]) assert.equal(parseLimit("max_links", bad).ok, false, bad);
  assert.equal(parseLimit("max_api_keys", "101").ok, false);
});

test("email domains: only the allowed providers pass", () => {
  assert.ok(isEmailAllowed("a@gmail.com", DEFAULT_ALLOWED_DOMAINS));
  assert.ok(isEmailAllowed("A@Outlook.COM", DEFAULT_ALLOWED_DOMAINS));
  assert.ok(isEmailAllowed("a@hotmail.com", DEFAULT_ALLOWED_DOMAINS));
  for (const bad of ["a@mailinator.com", "a@10minutemail.com", "a@yopmail.com", "a@mail.gmail.com", "a@gmail.com.evil.io", "nope", "a@"]) assert.equal(isEmailAllowed(bad, DEFAULT_ALLOWED_DOMAINS), false, bad);
  assert.equal(emailDomain("x@y@Example.org"), "example.org");
});

test("email domains: list parsing and settings fallback", () => {
  const r = parseDomainList("example.org, @Company.com;gmail.com\n gmail.com not a domain, x");
  assert.deepEqual(r.domains, ["example.org", "company.com", "gmail.com"]);
  assert.deepEqual(r.invalid, ["not", "a", "domain", "x"]);
  assert.deepEqual(allowedFromSetting(undefined), DEFAULT_ALLOWED_DOMAINS);
  assert.deepEqual(allowedFromSetting("  "), DEFAULT_ALLOWED_DOMAINS);
  assert.deepEqual(allowedFromSetting("gmail.com, example.org"), ["gmail.com", "example.org"]);
});

test("probe filter catches scanner payloads but not normal URLs", () => {
  const bad = [
    ["/dashboard/links", "?q=1' OR '1'='1"],
    ["/x", "?id=1 UNION SELECT username,password FROM users"],
    ["/x", "?id=1%20union%20all%20select%201,2"],
    ["/x", "?a=1;DROP TABLE users"],
    ["/x", "?a=sleep(5)"],
    ["/x", "?q=<script>alert(1)</script>"],
    ["/x", "?f=../../../etc/passwd"],
    ["/.env", ""],
    ["/wp-login.php", ""],
    ["/x", "?q=information_schema.tables"],
  ];
  for (const [p, s] of bad) assert.equal(looksLikeProbe(p, s), true, p + s);
  const good = [
    ["/", ""], ["/docs", ""], ["/dashboard/links", "?q=summer+sale&status=active&page=2"], ["/my-slug", ""],
    ["/admin/users", "?q=anna%40example.com"], ["/login", "?next=%2Fdashboard%2Flinks"], ["/union-station", ""], ["/select-a-plan", "?ref=or-1"],
  ];
  for (const [p, s] of good) assert.equal(looksLikeProbe(p, s), false, p + s);
});

test("turnstile helpers", () => {
  assert.ok(isSiteKey("0x4AAAAAAABkMYinukE8nzYS"));
  assert.ok(!isSiteKey("short"));
  assert.deepEqual(parseVerifyResponse({ success: true }), { ok: true, codes: [] });
  assert.deepEqual(parseVerifyResponse({ success: false, "error-codes": ["invalid-input-response"] }), { ok: false, codes: ["invalid-input-response"] });
  assert.equal(parseVerifyResponse(null).ok, false);
  assert.equal(parseVerifyResponse({ success: "true" }).ok, false);
});

// SQL safety net: values are always bound (db.ts uses prepared statements). The only text allowed inside SQL template
// strings is the short list below: placeholder lists, fixed column lists, integers coerced in code, and conditions built from "?".
// Anything new fails this test so that a person looks at it before it ships.
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const SAFE = [
  /^ph$/, /^w$/, /^w\.sql$/, /^col$/, /^table$/, /^COLS$/, /^PER$/, /^days$/, /^lim$/, /^cols$/,
  /^sets\.join\(", "\)$/, /^limit \| 0$/, /^offset \| 0$/, /^\(page - 1\) \* PER$/, /^part\.map\(\(\) => "\(\?,\?,\?\)"\)\.join\(","\)$/,
  /^batch\.map\(\(\) => "\([?,]+\)"\)\.join\(","\)$/, /^Math\.max\(1, Math\.min\(50, limit \| 0\)\)$/,
  /^status === "open" \? "WHERE r\.status = \'open\'" : ""$/, /^\w+\.map\(\(\) => "\?"\)\.join\(","\)$/,
  /^MAX_ROWS$/, // a module constant integer
  /^where$/, /^clauses\.join\(" AND "\)$/, /^marks$/, /^q$/,
];
test("SQL template strings only interpolate reviewed expressions", () => {
  const re = /`((?:SELECT|UPDATE|INSERT|DELETE|ALTER|CREATE|REPLACE)\b[^`]*)`/g;
  const problems: string[] = [];
  for (const file of walk(path.join(import.meta.dirname, "..", "src"))) {
    if (/migrate\.ts$/.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      for (const x of m[1].matchAll(/\$\{([^}]*)\}/g)) {
        const expr = x[1].trim();
        if (!SAFE.some((s) => s.test(expr))) problems.push(`${path.relative(process.cwd(), file)}: \${${expr}}`);
      }
    }
  }
  assert.deepEqual(problems, [], "Review these interpolations in SQL strings, then add them to the SAFE list only if they are fixed text or coerced integers");
});

import { methodAllowed } from "../src/lib/key-access.ts";
test("read-only keys can only read", () => {
  for (const m of ["GET", "get", "HEAD", "OPTIONS"]) assert.equal(methodAllowed(true, m), true, m);
  for (const m of ["POST", "PATCH", "PUT", "DELETE"]) assert.equal(methodAllowed(true, m), false, m);
  for (const m of ["GET", "POST", "PATCH", "DELETE"]) assert.equal(methodAllowed(false, m), true, m);
});
