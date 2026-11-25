import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { deleteSnapshot } from "@/lib/services/engage";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  const ok = Number.isInteger(id) && id > 0 ? await deleteSnapshot(a.user.id, id).catch(() => false) : false;
  return ok ? NextResponse.json({ data: { deleted: true } }) : apiError(404, "Copy not found.");
}
