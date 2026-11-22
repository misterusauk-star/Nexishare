import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody, linkJson } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import { getDomainState } from "@/lib/domains";
import { createLink } from "@/lib/services/links";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";
const MAX = 50;

/**
 * Create up to 50 links in one request. Each item takes the same fields as POST /links and is checked on its own:
 * a bad item does not stop the others. The response lists one result per item, in order.
 */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  const items = body?.links;
  if (!Array.isArray(items) || items.length === 0) return apiError(400, 'Send {"links": [ ... ]} with at least one link.');
  if (items.length > MAX) return apiError(422, `Send at most ${MAX} links per request.`);
  const b = await getBrand();
  const st = await getDomainState();
  const results: Record<string, unknown>[] = [];
  let created = 0;
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) { results.push({ ok: false, fields: { form: "Each link must be an object." } }); continue; }
    const r = await createLink(a.user.id, b.host, item);
    if (r.ok) { created++; results.push({ ok: true, data: linkJson(r.data, st) }); }
    else results.push({ ok: false, fields: r.errors });
  }
  return NextResponse.json({ created, failed: items.length - created, results }, { status: created ? 201 : 422 });
}
