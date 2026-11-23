import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { ensurePage, getBlocks, updateProfile, updateSocials } from "@/lib/services/pages";
import { brandForUrl } from "@/lib/brands.ts";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const page = await ensurePage(a.user.id);
  const blocks = await getBlocks(page.id);
  // `icon` is the platform a link points to (instagram, youtube...), or null: the bio page draws that logo on the button.
  return NextResponse.json({ data: { username: a.user.username, page, blocks: blocks.map((b) => ({ ...b, icon: b.type === "link" ? brandForUrl(b.url)?.key ?? null : null })) } });
}

export async function PATCH(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  if (!body) return apiError(400, "Send a JSON object.");
  // Social icons: { "socials": { "instagram": "https://instagram.com/you", "email": "you@example.com" } }. Send "" to remove one.
  const sb = (body as Record<string, unknown>).socials;
  if (sb !== undefined) {
    if (!sb || typeof sb !== "object" || Array.isArray(sb)) return apiError(422, "Validation failed.", { fields: { socials: "Send an object of platform: address." } });
    const cur = ((await ensurePage(a.user.id)).socials ?? {}) as Record<string, string>;
    const merged: Record<string, string> = { ...cur };
    for (const [k, v] of Object.entries(sb as Record<string, unknown>)) merged[k] = typeof v === "string" ? v : "";
    const sr = await updateSocials(a.user.id, merged);
    if (!sr.ok) return apiError(422, "Validation failed.", { fields: Object.fromEntries(Object.entries(sr.errors).map(([k, v]) => [`socials.${k}`, v])) });
  }
  const { socials: _drop, ...profile } = body as Record<string, unknown>;
  void _drop;
  const r = Object.keys(profile).length ? await updateProfile(a.user.id, profile) : ({ ok: true, data: true } as const);
  if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
  return NextResponse.json({ data: await ensurePage(a.user.id) });
}
