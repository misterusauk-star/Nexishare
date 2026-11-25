import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { phase2Enabled } from "@/lib/features";
import { getBrand } from "@/lib/brand";
import { guardApi } from "@/lib/host-guard";
import { allSubscribers } from "@/lib/services/engage";
import { subscribersCsv } from "@/lib/subscribers-csv.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  if (!phase2Enabled()) return new NextResponse("Not found", { status: 404 });
  const u = await currentUser();
  if (!u) return new NextResponse("Sign in first", { status: 401 });
  const brand = await getBrand();
  const name = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bio";
  return new NextResponse(subscribersCsv(await allSubscribers(u.id)), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-subscribers.csv"`, "Cache-Control": "no-store" },
  });
}
