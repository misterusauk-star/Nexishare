import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { phase2Enabled } from "@/lib/features";
import { deleteSubscriber } from "@/lib/services/engage";

export const dynamic = "force-dynamic";

/** Remove one address from your list. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  if (!phase2Enabled()) return apiError(404, "Not found.");
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError(404, "Subscriber not found.");
  const ok = await deleteSubscriber(a.user.id, id).catch(() => false);
  return ok ? NextResponse.json({ data: { deleted: true } }) : apiError(404, "Subscriber not found.");
}
