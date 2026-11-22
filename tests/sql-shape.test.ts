import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Guards against "Column count doesn't match value count": every one-line INSERT in the source
// must list as many values as columns (a "?" counts as one value, so does UTC_TIMESTAMP()).
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

function splitTop(s: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

test("INSERT statements have as many values as columns", () => {
  const re = /INSERT(?: IGNORE)? INTO \w+ \(([^)]*)\) VALUES \(((?:[^()]|\([^()]*\))*)\)/g;
  let checked = 0;
  for (const file of walk(path.join(import.meta.dirname, "..", "src"))) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      if (m[2].includes("${")) continue; // dynamic placeholder lists are built in code
      checked++;
      assert.equal(splitTop(m[2]).length, splitTop(m[1]).length, `${path.relative(process.cwd(), file)}: ${m[0].slice(0, 90)}...`);
    }
  }
  assert.ok(checked > 5, "expected to find INSERT statements");
});
