import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { ensurePage, getBlocks, reorderBlocks } from "@/lib/services/pages";
import { blockJson } from "@/lib/block-api.ts";
import { refreshBio } from "../helpers";

export const dynamic = "force-dynamic";

/** Set the order of the blocks: `{ "ids": [12, 9, 15] }`. Blocks you leave out go after these, in their old order. */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || !ids.every((n) => Number.isInteger(n) && n > 0)) {
    return apiError(422, "Validation failed.", { fields: { ids: "Send a list of block ids." } });
  }
  const page = await ensurePage(a.user.id);
  const current = await getBlocks(page.id);
  const known = new Set(current.map((b) => b.id));
  const first = [...new Set(ids as number[])].filter((id) => known.has(id));
  const rest = current.map((b) => b.id).filter((id) => !first.includes(id));
  await reorderBlocks(a.user.id, [...first, ...rest]);
  refreshBio(a.user.username);
  return NextResponse.json({ data: (await getBlocks(page.id)).map(blockJson) });
}
