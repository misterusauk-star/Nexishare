import test from "node:test";
import assert from "node:assert/strict";
import { BRANDS, SOCIAL_BRANDS, brandByKey, brandForUrl } from "../src/lib/brands.ts";
import { TEMPLATES, templateById } from "../src/lib/templates.ts";
import { THEMES, BASE_THEMES, SOCIALS } from "../src/lib/themes.ts";

test("every brand has a unique key, a path and at least one host", () => {
  const keys = new Set<string>();
  for (const b of BRANDS) {
    assert.ok(!keys.has(b.key), `duplicate ${b.key}`);
    keys.add(b.key);
    assert.ok(b.path.length > 20, b.key);
    assert.match(b.viewBox, /^0 0 \d+ \d+$/);
    assert.ok(b.hosts.length > 0, b.key);
  }
});

test("brandForUrl reads the host only", () => {
  assert.equal(brandForUrl("https://www.instagram.com/someone")?.key, "instagram");
  assert.equal(brandForUrl("https://m.facebook.com/x")?.key, "facebook");
  assert.equal(brandForUrl("https://youtu.be/abc")?.key, "youtube");
  assert.equal(brandForUrl("https://open.spotify.com/artist/1")?.key, "spotify");
  assert.equal(brandForUrl("https://x.com/me")?.key, "x");
  assert.equal(brandForUrl("wa.me/123456")?.key, "whatsapp");
  assert.equal(brandForUrl("https://example.com/instagram.com"), undefined);
  assert.equal(brandForUrl("https://notinstagram.com/"), undefined);
  assert.equal(brandForUrl("https://box.com/"), undefined);
  assert.equal(brandForUrl(null), undefined);
  assert.equal(brandForUrl("not a url at all"), undefined);
});

test("socials are the social brands plus email and website", () => {
  assert.deepEqual([...SOCIALS], [...SOCIAL_BRANDS.map((b) => b.key), "email", "website"]);
  assert.ok(SOCIALS.length >= 25);
  assert.ok(brandByKey("linkedin"));
});

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("there are at least 20 templates with unique ids and starter content", () => {
  assert.ok(TEMPLATES.length >= 20);
  const ids = new Set(TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, TEMPLATES.length);
  const niches = new Set(TEMPLATES.map((t) => t.niche));
  assert.equal(niches.size, TEMPLATES.length, "one niche each");
  for (const b of BASE_THEMES) assert.ok(!ids.has(b.id), `template id clashes with theme ${b.id}`);
  assert.equal(THEMES.length, BASE_THEMES.length + TEMPLATES.length);
  assert.equal(templateById("musician")?.name, "Musician");
});

test("template colours are readable", () => {
  for (const t of TEMPLATES) {
    const th = t.theme;
    for (const k of ["bg", "fg", "muted", "btnFg", "btnBorder"] as const) assert.match(th[k], /^#[0-9A-Fa-f]{6}$/, `${t.id} ${k}`);
    assert.ok(ratio(th.fg, th.bg) >= 4.5, `${t.id}: text on page ${ratio(th.fg, th.bg).toFixed(2)}`);
    assert.ok(ratio(th.muted, th.bg) >= 3.5, `${t.id}: muted on page ${ratio(th.muted, th.bg).toFixed(2)}`);
    const btnBg = th.btnBg === "transparent" ? th.bg : th.btnBg;
    assert.ok(ratio(th.btnFg, btnBg) >= 4.5, `${t.id}: button text ${ratio(th.btnFg, btnBg).toFixed(2)}`);
    if (th.bgImage) assert.match(th.bgImage, /^linear-gradient\([#a-zA-Z0-9%(), .-]+\)$/);
  }
});

test("starter links are https addresses and mostly show a platform logo", () => {
  for (const t of TEMPLATES) {
    assert.ok(t.bio.length <= 500);
    assert.ok(t.starter.length >= 3 && t.starter.length <= 6, t.id);
    for (const b of t.starter) {
      assert.ok(b.title.length > 0 && b.title.length <= 160);
      if (b.type === "link") assert.match(b.url ?? "", /^https:\/\//, `${t.id} ${b.title}`);
      else assert.equal(b.url, undefined);
    }
    assert.ok(t.starter.some((b) => b.type === "link" && brandForUrl(b.url)), `${t.id} has a link with a logo`);
  }
});
