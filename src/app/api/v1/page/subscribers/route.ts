import { NextResponse } from "next/server";
import { apiError, authApi, num } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { phase2Enabled } from "@/lib/features";
import { allSubscribers, listSubscribers } from "@/lib/services/engage";
import { subscribersCsv } from "@/lib/subscribers-csv.ts";

export const dynamic = "force-dynamic";
const NEEDS_UPDATE = "Subscribers need a database update. The administrator can press Run database updates in Admin > Domains.";

/** Emails collected by your signup blocks. Query: limit (1-100), page. With format=csv you get every address as a CSV file. */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  if (!phase2Enabled()) return apiError(404, "Not found.");
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const u = new URL(req.url);
  try {
    if (u.searchParams.get("format") === "csv") {
      return new NextResponse(subscribersCsv(await allSubscribers(a.user.id)), { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" } });
    }
    const limit = Math.min(100, num(u.searchParams.get("limit"), 50));
    const page = num(u.searchParams.get("page"), 1);
    const { rows, total } = await listSubscribers(a.user.id, limit, (page - 1) * limit);
    return NextResponse.json({ data: rows.map((r) => ({ id: r.id, email: r.email, block_id: r.block_id, created_at: new Date(r.created_at).toISOString() })), meta: { total, page, limit } });
  } catch {
    return apiError(503, NEEDS_UPDATE);
  }
}
