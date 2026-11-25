import test from "node:test";
import assert from "node:assert/strict";
import { blockDataFromBody, blockJson } from "../src/lib/block-api.ts";

test("blockDataFromBody sets, clears and keeps fields", () => {
  const r = blockDataFromBody({ description: " Hi ", button: "", featured: true }, { button: "Old", price: "$5" });
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.data, { price: "$5", description: "Hi", featured: "1" });
});
test("blockDataFromBody clears featured and rejects bad types", () => {
  const a = blockDataFromBody({ featured: false }, { featured: "1" });
  assert.ok(a.ok && a.data.featured === undefined);
  const b = blockDataFromBody({ description: 5, featured: "yes" });
  assert.ok(!b.ok);
  if (!b.ok) assert.deepEqual(Object.keys(b.errors).sort(), ["description", "featured"]);
});
test("blockJson shape", () => {
  const j = blockJson({ id: 1, type: "link", title: "IG", url: "https://instagram.com/x", data: { featured: "1" }, group_id: null, sort_order: 2, enabled: 1, starts_at: null, ends_at: null });
  assert.equal(j.featured, true);
  assert.equal(j.enabled, true);
  assert.equal(j.icon, "instagram");
  assert.equal(j.description, null);
});

import { busiestHour, hourLabel } from "../src/lib/hours.ts";
import { addTag, removeTag } from "../src/lib/tags.ts";

test("busiestHour and hourLabel", () => {
  assert.equal(busiestHour(Array(24).fill(0)), null);
  const h = Array(24).fill(0); h[9] = 4; h[20] = 4; h[3] = 1;
  assert.deepEqual(busiestHour(h), { hour: 9, n: 4 });
  assert.equal(hourLabel(23), "23:00-00:00 UTC");
  assert.equal(hourLabel(9), "09:00-10:00 UTC");
});
test("addTag / removeTag", () => {
  const a = addTag(["a"], "b");
  assert.ok(a.ok && a.tags.join() === "a,b");
  assert.ok(addTag(["a"], "a").ok);
  assert.equal(addTag(["a", "b", "c", "d", "e"], "f").ok, false);
  assert.deepEqual(removeTag(["a", "b"], "a"), ["b"]);
});
