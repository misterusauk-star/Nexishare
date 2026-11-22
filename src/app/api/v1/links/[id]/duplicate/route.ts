import { NextResponse } from "next/server";
import { apiError, authApi, linkJson } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import { getDomainState } from "@/lib/domains";
import { duplicateLink } from "@/lib/services/links";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/** Copies a link with a new random short name. Everything is copied except the password. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return apiError(404, "Link not found.");
  const r = await duplicateLink(a.user.id, id, (await getBrand()).host);
  if (!r.ok) return r.errors.form ? apiError(404, r.errors.form) : apiError(422, "Validation failed.", { fields: r.errors });
  return NextResponse.json({ data: linkJson(r.data, await getDomainState()) }, { status: 201 });
}
