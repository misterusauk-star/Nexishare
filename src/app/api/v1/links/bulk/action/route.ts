import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import { BULK_MAX, bulkLinkAction, type BulkOp } from "@/lib/services/links";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/** Enable, disable or delete up to 200 links in one request (tags: POST /links/bulk/tag): {"action": "disable", "ids": [1, 2, 3]}. One result per id. */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  const op = body?.action;
  const ids = body?.ids;
  if (op !== "enable" && op !== "disable" && op !== "delete") return apiError(422, 'action must be "enable", "disable" or "delete".', { fields: { action: "Choose enable, disable or delete." } });
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x) => typeof x === "number")) return apiError(400, 'Send {"ids": [1, 2, 3]} with at least one numeric id.');
  if (ids.length > BULK_MAX) return apiError(422, `Send at most ${BULK_MAX} ids per request.`);
  const results = await bulkLinkAction(a.user.id, (await getBrand()).host, op as BulkOp, ids as number[]);
  const done = results.filter((r) => r.ok).length;
  return NextResponse.json({ action: op, done, failed: results.length - done, results });
}
