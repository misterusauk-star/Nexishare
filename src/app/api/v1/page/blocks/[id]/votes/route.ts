import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { getBlockForUser } from "@/lib/services/pages";
import { pollResults } from "@/lib/services/engage";

export const dynamic = "force-dynamic";

/** Results of a poll block: `total` and, per option, `label`, `votes`, `percent`. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  const block = Number.isInteger(id) && id > 0 ? await getBlockForUser(a.user.id, id) : null;
  if (!block) return apiError(404, "Block not found.");
  if (block.type !== "poll") return apiError(422, "This block is not a poll.");
  return NextResponse.json({ data: await pollResults(block.id, block.data) });
}
