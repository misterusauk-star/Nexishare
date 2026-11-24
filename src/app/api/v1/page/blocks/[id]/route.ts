import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { deleteBlock, getBlockForUser, saveBlock } from "@/lib/services/pages";
import { blockDataFromBody, blockJson } from "@/lib/block-api.ts";
import { allowedBlockTypes, refreshBio } from "../helpers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function load(req: Request, ctx: Ctx) {
  const blocked = await guardApi();
  if (blocked) return { res: blocked };
  const a = await authApi(req);
  if ("res" in a) return { res: a.res };
  const id = Number((await ctx.params).id);
  const row = Number.isInteger(id) && id > 0 ? await getBlockForUser(a.user.id, id) : null;
  if (!row) return { res: apiError(404, "Block not found.") };
  return { a, row };
}

export async function GET(req: Request, ctx: Ctx) {
  const l = await load(req, ctx);
  if ("res" in l) return l.res;
  return NextResponse.json({ data: blockJson(l.row) });
}

/** Change a block. Send only the fields to change; the rest stay as they are. The type cannot change. */
export async function PATCH(req: Request, ctx: Ctx) {
  const l = await load(req, ctx);
  if ("res" in l) return l.res;
  const body = await jsonBody(req);
  if (!body) return apiError(400, "Send a JSON object.");
  const b = body as Record<string, unknown>;
  const { a, row } = l;
  const d = blockDataFromBody(b, row.data ?? {});
  if (!d.ok) return apiError(422, "Validation failed.", { fields: d.errors });
  const has = (k: string) => k in b;
  const iso = (v: Date | null) => (v ? v.toISOString() : null);
  const r = await saveBlock(a.user.id, row.id, {
    type: row.type,
    title: has("title") ? b.title : row.title ?? undefined,
    url: has("url") ? b.url : row.url ?? undefined,
    data: d.data,
    group_id: has("group_id") ? b.group_id : row.group_id,
    enabled: has("enabled") ? b.enabled : !!row.enabled,
    starts_at: has("starts_at") ? b.starts_at : iso(row.starts_at),
    ends_at: has("ends_at") ? b.ends_at : iso(row.ends_at),
  }, allowedBlockTypes());
  if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
  refreshBio(a.user.username);
  const fresh = await getBlockForUser(a.user.id, row.id);
  return NextResponse.json({ data: fresh ? blockJson(fresh) : null });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const l = await load(req, ctx);
  if ("res" in l) return l.res;
  await deleteBlock(l.a.user.id, l.row.id);
  refreshBio(l.a.user.username);
  return NextResponse.json({ data: { deleted: true } });
}
