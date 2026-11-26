import test from "node:test";
import assert from "node:assert/strict";
import { parseGeoRoutes, pickGeo, geoToText, GEO_MAX } from "../src/lib/geo-routes.ts";
import { classify, nextHealth, isPrivateIp } from "../src/lib/link-health.ts";
import { isReportDue, isQuietWeek, buildReport } from "../src/lib/report.ts";

test("parseGeoRoutes reads text and arrays", () => {
  const a = parseGeoRoutes("pk https://example.com/pk\nUS: https://example.com/us\n");
  assert.ok(a.ok && a.routes.length === 2 && a.routes[0].country === "PK");
  assert.ok(parseGeoRoutes([{ country: "de", url: "https://example.com/de" }]).ok);
  assert.equal(parseGeoRoutes("PKX https://a.com").ok, false);
  assert.equal(parseGeoRoutes("PK https://a.com\nPK https://b.com").ok, false);
  assert.equal(parseGeoRoutes("PK").ok, false);
  assert.equal(parseGeoRoutes(5).ok, false);
  const many = Array.from({ length: GEO_MAX + 1 }, (_, i) => ({ country: String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)), url: "https://a.com" }));
  assert.equal(parseGeoRoutes(many).ok, false);
  assert.ok(parseGeoRoutes(many.slice(0, GEO_MAX)).ok);
  const three = parseGeoRoutes(many.slice(0, 3), 2);
  assert.ok(!three.ok && three.error.includes("limit is 2 countries"));
  assert.ok(parseGeoRoutes("").ok);
});
test("pickGeo and geoToText", () => {
  const r = [{ country: "PK", url: "https://a.com/pk" }];
  assert.equal(pickGeo(r, "pk"), "https://a.com/pk");
  assert.equal(pickGeo(r, "US"), null);
  assert.equal(pickGeo(r, null), null);
  assert.equal(geoToText(r), "PK https://a.com/pk");
});

test("classify", () => {
  assert.equal(classify({ status: 200 }), "ok");
  assert.equal(classify({ status: 301 }), "ok");
  assert.equal(classify({ status: 403 }), "ok");
  assert.equal(classify({ status: 404 }), "broken");
  assert.equal(classify({ status: 503 }), "broken");
  assert.equal(classify({ status: null, error: "dns" }), "broken");
  assert.equal(classify({ status: null, error: "timeout" }), null);
  assert.equal(classify({ status: null, error: "blocked" }), null);
});
test("nextHealth needs two failures in a row and alerts once", () => {
  let s = nextHealth({ status: "ok", fails: 0 }, { status: 404 });
  assert.deepEqual(s, { status: "ok", fails: 1, alert: false });
  s = nextHealth(s, { status: 404 });
  assert.deepEqual(s, { status: "broken", fails: 2, alert: true });
  s = nextHealth(s, { status: 404 });
  assert.equal(s.alert, false);
  s = nextHealth(s, { status: null, error: "timeout" });
  assert.equal(s.status, "broken");
  s = nextHealth(s, { status: 200 });
  assert.deepEqual(s, { status: "ok", fails: 0, alert: false });
});
test("isPrivateIp", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "999.1.1.1"]) assert.ok(isPrivateIp(ip), ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) assert.equal(isPrivateIp(ip), false, ip);
});

test("isReportDue is Monday only and once a week", () => {
  const mon = new Date("2026-11-30T05:00:00Z"), tue = new Date("2026-12-01T05:00:00Z");
  assert.equal(isReportDue(tue, null), false);
  assert.equal(isReportDue(mon, null), true);
  assert.equal(isReportDue(mon, new Date("2026-11-30T04:00:00Z")), false);
  assert.equal(isReportDue(mon, new Date("2026-11-23T04:00:00Z")), true);
});
test("report text", () => {
  const d = { clicks: 120, previousClicks: 100, unique: 80, views: 0, previousViews: 0, top: [{ label: "spring", n: 50 }], busiestHour: 14, newSubscribers: 3, brokenLinks: 1 };
  const r = buildReport(d, "https://x.test/dashboard/analytics", "https://x.test/dashboard/account");
  assert.match(r.subject, /120 clicks/);
  assert.ok(r.paragraphs.some((p) => p.includes("20%")));
  assert.ok(r.paragraphs.some((p) => p.includes("14:00-15:00 UTC")));
  assert.ok(r.paragraphs.some((p) => p.includes("3 new email signups")));
  assert.ok(r.paragraphs.some((p) => p.includes("1 link points to a page")));
  assert.equal(isQuietWeek({ ...d, clicks: 0, previousClicks: 0 }), true);
  assert.equal(isQuietWeek(d), false);
});

import { DEFAULT_LIMITS, LIMIT_KEYS, LIMIT_BOUNDS, LIMIT_LABELS, effectiveLimit, parseLimit } from "../src/lib/limits.ts";
test("new limits have defaults, bounds, labels and parse like the others", () => {
  for (const k of ["geo_per_link", "geo_links", "health_checks_per_hour"] as const) {
    assert.ok(LIMIT_KEYS.includes(k));
    assert.ok(LIMIT_LABELS[k].length > 5);
    assert.ok(DEFAULT_LIMITS[k] >= LIMIT_BOUNDS[k][0] && DEFAULT_LIMITS[k] <= LIMIT_BOUNDS[k][1]);
    assert.equal(parseLimit(k, "").ok, true);
    assert.equal(parseLimit(k, String(LIMIT_BOUNDS[k][1] + 1)).ok, false);
  }
  assert.equal(effectiveLimit("geo_per_link", null, null), 10);
  assert.equal(effectiveLimit("geo_per_link", 3, 5), 3);
  assert.equal(effectiveLimit("geo_links", null, 7), 7);
});
