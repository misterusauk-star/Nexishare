import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { API_ENDPOINTS, API_GROUPS, routeFileFor } from "../src/lib/api-index.ts";

const root = path.join(import.meta.dirname, "..", "src", "app", "api", "v1");
const docs = fs.readFileSync(path.join(import.meta.dirname, "..", "src", "app", "docs", "page.tsx"), "utf8");

test("every listed endpoint has a route file that handles its method", () => {
  for (const e of API_ENDPOINTS) {
    const file = path.join(root, routeFileFor(e.path));
    assert.ok(fs.existsSync(file), `${e.method} ${e.path}: missing ${routeFileFor(e.path)}`);
    assert.match(fs.readFileSync(file, "utf8"), new RegExp(`export async function ${e.method}\\b`), `${e.method} ${e.path}`);
  }
});

test("every route handler in the API is listed", () => {
  const listed = new Set(API_ENDPOINTS.map((e) => `${e.method} ${routeFileFor(e.path)}`));
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]));
  for (const f of walk(root).filter((x) => x.endsWith("route.ts"))) {
    const rel = path.relative(root, f).split(path.sep).join("/");
    if (rel === "route.ts") continue; // the index itself
    for (const m of fs.readFileSync(f, "utf8").matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)) assert.ok(listed.has(`${m[1]} ${rel}`), `not in API_ENDPOINTS: ${m[1]} ${rel}`);
  }
});

test("each endpoint has a group, a summary and an anchor that exists in the docs", () => {
  for (const e of API_ENDPOINTS) {
    assert.ok((API_GROUPS as readonly string[]).includes(e.group), e.path);
    assert.ok(e.summary.length > 5 && e.summary.length < 80, e.path);
    assert.ok(docs.includes(`id="${e.doc}"`), `${e.method} ${e.path}: docs has no id="${e.doc}"`);
  }
});
