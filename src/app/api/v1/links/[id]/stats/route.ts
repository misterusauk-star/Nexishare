import { NextResponse } from "next/server";
import { apiError, authApi, num } from "@/lib/api";
import { getPreviousTotals, getStats } from "@/lib/analytics";
import { percentChange } from "@/lib/change";
import { getLinkForUser } from "@/lib/services/links";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  const l = Number.isInteger(id) && id > 0 ? await getLinkForUser(a.user.id, id) : null;
  if (!l) return apiError(404, "Link not found.");
  const days = Math.min(365, num(new URL(req.url).searchParams.get("days"), 30));
  const scope = { userId: l.user_id, entityType: "link", entityId: l.id, kind: "clicks", days } as const;
  const [stats, prev] = await Promise.all([getStats(scope), getPreviousTotals(scope)]);
  return NextResponse.json({ data: { ...stats, previous: { ...prev, change_percent: { total: percentChange(stats.total, prev.total), unique: percentChange(stats.unique, prev.unique) } } } });
}
