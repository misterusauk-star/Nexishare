import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { applyTemplate, BLOCK_TYPES_P1, BLOCK_TYPES_P2, ensurePage } from "@/lib/services/pages";
import { phase2Enabled } from "@/lib/features";

export const dynamic = "force-dynamic";

/** Apply a template to your page: `{ "id": "musician", "starter_content": true }`. */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  if (!body || typeof (body as Record<string, unknown>).id !== "string") return apiError(422, "Validation failed.", { fields: { id: "Send a template id." } });
  const types = phase2Enabled() ? [...BLOCK_TYPES_P1, ...BLOCK_TYPES_P2] : [...BLOCK_TYPES_P1];
  await ensurePage(a.user.id, a.user.username ?? undefined);
  const r = await applyTemplate(a.user.id, (body as { id: string }).id, (body as { starter_content?: unknown }).starter_content === true, types);
  if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
  return NextResponse.json({ data: { page: await ensurePage(a.user.id), starter_blocks_added: r.data.added } });
}
