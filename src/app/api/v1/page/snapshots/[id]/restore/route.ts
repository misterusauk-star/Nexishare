import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { apiError, authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { restoreSnapshot } from "@/lib/services/engage";

export const dynamic = "force-dynamic";

/** Put the page back as it was in a saved copy. Blocks that still exist keep their click counts. Response: restored, skipped, removed. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError(404, "Copy not found.");
  const r = await restoreSnapshot(a.user.id, id).catch(() => null);
  if (!r) return apiError(503, "Saved copies need a database update. The administrator can press Run database updates in Admin > Domains.");
  if (!r.ok) return apiError(404, r.errors.form ?? "Copy not found.");
  if (a.user.username) revalidatePath(`/${a.user.username}`);
  return NextResponse.json({ data: r.data });
}
