import { NextResponse } from "next/server";
import { authApi, num } from "@/lib/api";
import { getHourly, getPreviousTotals, getStats, getTopItems } from "@/lib/analytics";
import { percentChange } from "@/lib/change";
import { busiestHour } from "@/lib/hours";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/** Account-wide stats. Query: kind=clicks (default) or views, days=1..365. */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const u = new URL(req.url);
  const days = Math.min(365, num(u.searchParams.get("days"), 30));
  const kind = u.searchParams.get("kind") === "views" ? "views" : "clicks";
  const scope = { userId: a.user.id, kind, days } as const;
  const [stats, prev, top, hours] = await Promise.all([getStats(scope), getPreviousTotals(scope), kind === "clicks" ? getTopItems(scope, 5) : Promise.resolve([]), getHourly(scope)]);
  // previous: the same number of days just before this period, with the change in percent (null when it had none).
  // top: most clicked links and bio buttons (clicks only). hours_utc: 24 counts, index = hour of day in UTC.
  return NextResponse.json({ data: { ...stats, top, hours_utc: hours, busiest_hour_utc: busiestHour(hours)?.hour ?? null, previous: { ...prev, change_percent: { total: percentChange(stats.total, prev.total), unique: percentChange(stats.unique, prev.unique) } } } });
}
