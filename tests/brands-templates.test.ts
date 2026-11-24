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

import { percentChange, describeChange } from "../src/lib/change.ts";
import { timeAgo } from "../src/lib/time-ago.ts";

test("percentChange compares with the previous period", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(100, 100), 0);
  assert.equal(percentChange(10, 0), null);
  assert.equal(describeChange(112, 100, 30), "12% more than the previous 30 days");
  assert.equal(describeChange(90, 100, 7), "10% less than the previous 7 days");
  assert.equal(describeChange(100, 100, 365), "Same as the previous year");
  assert.equal(describeChange(5, 0, 30), "New: nothing in the previous 30 days");
  assert.equal(describeChange(0, 0, 30), "Nothing in the previous 30 days either");
});

test("timeAgo reads naturally", () => {
  const now = Date.UTC(2026, 10, 23, 12, 0, 0);
  const ago = (sec: number) => timeAgo(now - sec * 1000, now);
  assert.equal(ago(5), "just now");
  assert.equal(ago(60), "1 minute ago");
  assert.equal(ago(3 * 3600), "3 hours ago");
  assert.equal(ago(2 * 86400), "2 days ago");
  assert.equal(ago(21 * 86400), "3 weeks ago");
  assert.equal(ago(90 * 86400), "3 months ago");
  assert.equal(ago(400 * 86400), "over a year ago");
  assert.equal(timeAgo(null), "");
  assert.equal(timeAgo("nonsense"), "");
});

import { buildUtmUrl, cleanUtm } from "../src/lib/utm.ts";
import { contrastRatio, qrColorWarning } from "../src/lib/color.ts";
import { GUIDES, TOOLS, marketingPaths, clip } from "../src/lib/seo-pages.ts";
import { NICHES, nicheBySlug } from "../src/lib/seo-niches.ts";

test("utm builder tags a link and replaces old tags", () => {
  const r = buildUtmUrl({ url: "example.com/sale?a=1&utm_source=old#top", source: "Newsletter", medium: "Email", campaign: "Spring Sale" });
  assert.ok(r.ok);
  if (r.ok) {
    const u = new URL(r.url);
    assert.equal(u.searchParams.get("utm_source"), "newsletter");
    assert.equal(u.searchParams.get("utm_campaign"), "spring-sale");
    assert.equal(u.searchParams.get("a"), "1");
    assert.equal(u.searchParams.getAll("utm_source").length, 1);
    assert.equal(u.hash, "#top");
  }
  assert.equal(buildUtmUrl({ url: "", source: "a", medium: "b", campaign: "c" }).ok, false);
  assert.equal(buildUtmUrl({ url: "javascript:alert(1)", source: "a", medium: "b", campaign: "c" }).ok, false);
  assert.equal(buildUtmUrl({ url: "https://example.com", source: "a", medium: "", campaign: "c" }).ok, false);
  assert.equal(cleanUtm("  Hello  World! "), "hello-world");
});

test("qr colour advice", () => {
  assert.ok(contrastRatio("#000000", "#ffffff") > 20);
  assert.equal(qrColorWarning("#000000", "#ffffff"), "");
  assert.match(qrColorWarning("#777777", "#888888"), /too close/);
  assert.match(qrColorWarning("#ffffff", "#000000"), /light code/);
});

test("every template has niche copy, unique slugs and useful text", () => {
  const slugs = new Set<string>();
  for (const t of TEMPLATES) {
    const n = NICHES[t.id];
    assert.ok(n, `no copy for ${t.id}`);
    assert.ok(!slugs.has(n.slug)); slugs.add(n.slug);
    assert.match(n.slug, /^[a-z0-9-]+$/);
    assert.ok(n.intro.length >= 80 && n.intro.length <= 400, `${t.id} intro`);
    for (const tip of n.tips) assert.ok(tip.length >= 30 && tip.length <= 220, `${t.id} tip`);
    for (const f of n.faq) { assert.ok(f.q.endsWith("?")); assert.ok(f.a.length >= 30); }
    assert.equal(nicheBySlug(n.slug)?.id, t.id);
  }
  assert.equal(Object.keys(NICHES).length, TEMPLATES.length);
  const intros = new Set(Object.values(NICHES).map((n) => n.intro));
  assert.equal(intros.size, TEMPLATES.length, "no duplicated intros");
});

test("guides and tools are complete and the path list has no duplicates", () => {
  for (const g of GUIDES) {
    assert.ok(g.description.length >= 100 && g.description.length <= 165, `${g.slug} description ${g.description.length}`);
    assert.ok(g.title.length <= 70, g.slug);
    assert.ok(g.answer.length >= 80);
    assert.ok(g.sections.length >= 4);
    assert.ok(g.faq.length >= 3);
  }
  for (const t of TOOLS) { assert.ok(t.description.length >= 80 && t.description.length <= 165, t.slug); assert.ok(t.title.length <= 70); }
  const paths = marketingPaths().map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.length >= TEMPLATES.length + GUIDES.length + TOOLS.length);
  assert.ok(paths.every((p) => p === "" || p.startsWith("/")));
  assert.ok(clip("word ".repeat(80)).length <= 156);
});

import { profileLd } from "../src/lib/seo-profile.ts";
test("profile structured data lists only real web addresses as sameAs", () => {
  const ld = profileLd({ url: "https://bio.example/mia", name: "Mia", bio: "Hi", socials: { instagram: "https://instagram.com/mia", email: "mia@example.com", x: "javascript:alert(1)", spotify: "https://open.spotify.com/artist/1" } }) as { mainEntity: { sameAs: string[]; name: string } };
  assert.deepEqual(ld.mainEntity.sameAs, ["https://instagram.com/mia", "https://open.spotify.com/artist/1"]);
  assert.equal(ld.mainEntity.name, "Mia");
  const none = profileLd({ url: "https://bio.example/x", name: "X" }) as { mainEntity: Record<string, unknown> };
  assert.equal("sameAs" in none.mainEntity, false);
});
