import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import { BULK_MAX, bulkTagLinks } from "@/lib/services/links";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/** Add or remove one tag on up to 200 links: {"action": "add_tag", "tag": "summer", "ids": [1, 2, 3]}. One result per id. */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  const op = body?.action;
  const ids = body?.ids;
  if (op !== "add_tag" && op !== "remove_tag") return apiError(422, 'action must be "add_tag" or "remove_tag".', { fields: { action: "Choose add_tag or remove_tag." } });
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x) => typeof x === "number")) return apiError(400, 'Send {"ids": [1, 2, 3]} with at least one numeric id.');
  if (ids.length > BULK_MAX) return apiError(422, `Send at most ${BULK_MAX} ids per request.`);
  const r = await bulkTagLinks(a.user.id, (await getBrand()).host, op, body?.tag, ids as number[]);
  if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
  const done = r.data.filter((x) => x.ok).length;
  return NextResponse.json({ action: op, tag: String(body?.tag).trim().toLowerCase(), done, failed: r.data.length - done, results: r.data });
}
