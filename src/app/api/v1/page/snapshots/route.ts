import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { createSnapshot, listSnapshots } from "@/lib/services/engage";

export const dynamic = "force-dynamic";
const NEEDS_UPDATE = "Saved copies need a database update. The administrator can press Run database updates in Admin > Domains.";
const json = (r: { id: number; label: string; created_at: Date; blocks: number }) => ({ id: r.id, label: r.label, blocks: r.blocks, created_at: new Date(r.created_at).toISOString() });

/** Your saved copies of the bio page, newest first (the newest 10 are kept). */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  try { return NextResponse.json({ data: (await listSnapshots(a.user.id)).map(json) }); } catch { return apiError(503, NEEDS_UPDATE); }
}

/** Save the page as it is now: `{ "label": "Before the launch" }` (label is optional). */
export async function POST(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  const label = typeof body?.label === "string" ? body.label : "";
  try {
    const r = await createSnapshot(a.user.id, label);
    if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
    const row = (await listSnapshots(a.user.id)).find((x) => x.id === r.data.id);
    return NextResponse.json({ data: row ? json(row) : { id: r.data.id } }, { status: 201 });
  } catch { return apiError(503, NEEDS_UPDATE); }
}
