import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { getPrefs, setPrefs } from "@/lib/services/linkops";

export const dynamic = "force-dynamic";

/** Your email settings: `weekly_report` (a summary every Monday) and `health_alerts` (an email when a destination stops working). */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  return NextResponse.json({ data: await getPrefs(a.user.id).catch(() => ({ weekly_report: false, health_alerts: true })) });
}

/** Change either setting with true or false. Send only what changes. */
export async function PATCH(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const body = await jsonBody(req);
  if (!body) return apiError(400, "Send a JSON object.");
  const fields: Record<string, string> = {};
  const p: { weekly_report?: boolean; health_alerts?: boolean } = {};
  for (const k of ["weekly_report", "health_alerts"] as const) {
    if (!(k in body)) continue;
    if (typeof body[k] !== "boolean") fields[k] = "Send true or false."; else p[k] = body[k] as boolean;
  }
  if (Object.keys(fields).length) return apiError(422, "Validation failed.", { fields });
  try { await setPrefs(a.user.id, p); } catch { return apiError(503, "These settings need a database update. The administrator can press Run database updates in Admin > Domains."); }
  return NextResponse.json({ data: await getPrefs(a.user.id) });
}
