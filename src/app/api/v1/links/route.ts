import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody, linkJson, num } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import { getDomainState } from "@/lib/domains";
import { createLink, listLinks } from "@/lib/services/links";
import { lastClicks } from "@/lib/analytics";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const st = await getDomainState();
  const u = new URL(req.url);
  const limit = Math.min(100, num(u.searchParams.get("limit"), 25));
  const page = num(u.searchParams.get("page"), 1);
  const { rows, total } = await listLinks({ userId: a.user.id, q: u.searchParams.get("q") ?? undefined, status: u.searchParams.get("status") ?? undefined, tag: u.searchParams.get("tag") ?? undefined, limit, offset: (page - 1) * limit });
  const last = await lastClicks("link", rows.map((l) => l.id));
  return NextResponse.json({ data: rows.map((l) => linkJson(l, st, last[l.id] ?? null)), meta: { total, page, limit } });
}

export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  if (!body) return apiError(400, "Send a JSON object.");
  const b = await getBrand();
  const r = await createLink(a.user.id, b.host, body);
  if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
  return NextResponse.json({ data: linkJson(r.data, await getDomainState()) }, { status: 201 });
}
