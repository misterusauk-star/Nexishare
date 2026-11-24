import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { ensurePage, getBlocks, getBlockForUser, saveBlock } from "@/lib/services/pages";
import { blockDataFromBody, blockJson } from "@/lib/block-api.ts";
import { allowedBlockTypes, refreshBio } from "./helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const page = await ensurePage(a.user.id);
  return NextResponse.json({ data: (await getBlocks(page.id)).map(blockJson) });
}

/** Add a block: `{ "type": "link", "title": "My shop", "url": "https://...", "featured": true }`. It goes to the end of the page. */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  if (!body) return apiError(400, "Send a JSON object.");
  const b = body as Record<string, unknown>;
  const d = blockDataFromBody(b);
  if (!d.ok) return apiError(422, "Validation failed.", { fields: d.errors });
  await ensurePage(a.user.id, a.user.username ?? undefined);
  const r = await saveBlock(a.user.id, null, {
    type: typeof b.type === "string" ? b.type : "link", title: b.title, url: b.url, data: d.data,
    group_id: b.group_id, enabled: b.enabled, starts_at: b.starts_at, ends_at: b.ends_at,
  }, allowedBlockTypes());
  if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
  refreshBio(a.user.username);
  const row = await getBlockForUser(a.user.id, r.data);
  return NextResponse.json({ data: row ? blockJson(row) : null }, { status: 201 });
}
