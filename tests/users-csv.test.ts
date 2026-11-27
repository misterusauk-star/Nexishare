import test from "node:test";
import assert from "node:assert/strict";
import { usersCsv } from "../src/lib/users-csv.ts";

test("users CSV has a header, UTC times and neutralises formulas", () => {
  const out = usersCsv([
    { id: 1, email: "a@b.com", username: null, role: "user", status: "active", email_verified_at: "2026-01-02T03:04:05Z", created_at: "2026-01-01T00:00:00Z", last_login_at: null, links: 3 },
    { id: 2, email: "=cmd@x.com", username: "bob", role: "super_admin", status: "suspended", email_verified_at: null, created_at: "2026-02-01T00:00:00Z", last_login_at: "2026-02-02T10:00:00Z", links: 0 },
  ]);
  const lines = out.trim().split(/\r?\n/);
  assert.equal(lines[0], "id,email,username,role,status,email_verified,joined_utc,last_login_utc,links");
  assert.match(lines[1], /^1,a@b.com,,user,active,yes,2026-01-01 00:00:00,,3$/);
  assert.ok(!lines[2].split(",")[1].startsWith("="));
});
