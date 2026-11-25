import test from "node:test";
import assert from "node:assert/strict";
import { parsePollOptions, tallyPoll, parseSnapshot, planRestore, pollOptionsFromData } from "../src/lib/engage.ts";

test("parsePollOptions", () => {
  const a = parsePollOptions(" Yes \n\nno\nYES\n");
  assert.ok(a.ok && a.options.join() === "Yes,no");
  assert.equal(parsePollOptions("one").ok, false);
  assert.equal(parsePollOptions(["a", "b", "c", "d", "e", "f", "g"]).ok, false);
  assert.equal(parsePollOptions(["a", "x".repeat(61)]).ok, false);
  assert.ok(parsePollOptions(["a", "b"]).ok);
  assert.deepEqual(pollOptionsFromData({ options: "a\nb\n" }), ["a", "b"]);
  assert.deepEqual(pollOptionsFromData(null), []);
});

test("tallyPoll", () => {
  const t = tallyPoll(["a", "b", "c"], [{ option_idx: 0, n: 3 }, { option_idx: 1, n: 1 }, { option_idx: 9, n: 50 }]);
  assert.equal(t.total, 4);
  assert.deepEqual(t.options.map((o) => o.percent), [75, 25, 0]);
  assert.equal(tallyPoll(["a"], []).options[0].percent, 0);
});

const snap = JSON.stringify({
  v: 1, page: { display_name: "Me", bio: null, avatar_url: null, theme: "plain", custom: null, socials: { instagram: "https://instagram.com/me" } },
  blocks: [
    { id: 5, type: "link", title: "B", url: "https://example.com/b", data: { featured: "1" }, group_id: null, sort_order: 2, enabled: true, starts_at: null, ends_at: null },
    { id: 3, type: "header", title: "A", url: null, data: null, group_id: null, sort_order: 1, enabled: false, starts_at: null, ends_at: null },
  ],
});

test("parseSnapshot checks the shape and orders blocks", () => {
  const s = parseSnapshot(snap);
  assert.ok(s);
  assert.deepEqual(s!.blocks.map((b) => b.id), [3, 5]);
  assert.equal(s!.blocks[0].enabled, false);
  assert.equal(parseSnapshot("nope"), null);
  assert.equal(parseSnapshot(JSON.stringify({ v: 2 })), null);
  assert.equal(parseSnapshot(JSON.stringify({ v: 1, page: { theme: "x" }, blocks: [{ id: "x", type: "link" }] })), null);
});

test("planRestore keeps existing ids", () => {
  const s = parseSnapshot(snap)!;
  const p = planRestore([5, 7, 8], s.blocks);
  assert.deepEqual(p.update.map((b) => b.id), [5]);
  assert.deepEqual(p.insert.map((b) => b.id), [3]);
  assert.deepEqual(p.remove, [7, 8]);
});
