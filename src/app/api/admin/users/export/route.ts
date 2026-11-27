import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { guardApi } from "@/lib/host-guard";
import { usersCsv, type UserCsvRow } from "@/lib/users-csv.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const u = await currentUser();
  if (!u || u.role !== "super_admin") return new NextResponse("Not found", { status: 404 });
  const rows = await query<UserCsvRow>(
    `SELECT u.id, u.email, u.username, u.role, u.status, u.email_verified_at, u.created_at, u.last_login_at,
            (SELECT COUNT(*) FROM links l WHERE l.user_id = u.id) AS links
       FROM users u ORDER BY u.id LIMIT 100000`,
  );
  const brand = await getBrand();
  const name = brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "site";
  return new NextResponse(usersCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}-users.csv"`, "Cache-Control": "no-store" },
  });
}
