import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITE_THEMES, siteThemeById, DEFAULT_SITE_THEME } from "../src/lib/site-themes.ts";

const css = fs.readFileSync(path.join(import.meta.dirname, "..", "src", "app", "globals.css"), "utf8");

test("unknown theme ids fall back to the default", () => {
  assert.equal(siteThemeById("nope").id, DEFAULT_SITE_THEME);
  assert.equal(siteThemeById(undefined).id, DEFAULT_SITE_THEME);
  assert.equal(siteThemeById("ocean").id, "ocean");
});

test("every theme has a valid accent and, apart from the default, light and dark CSS", () => {
  assert.equal(new Set(SITE_THEMES.map((t) => t.id)).size, SITE_THEMES.length);
  for (const t of SITE_THEMES) {
    assert.match(t.accent, /^#[0-9a-f]{6}$/i);
    if (t.id === DEFAULT_SITE_THEME) continue;
    assert.ok(css.includes(`[data-site="${t.id}"] {`), `${t.id} light`);
    assert.ok(css.includes(`[data-site="${t.id}"][data-theme="dark"]`), `${t.id} dark`);
    assert.ok(css.includes(`[data-site="${t.id}"]:not([data-theme="light"])`), `${t.id} dark (system)`);
  }
});
