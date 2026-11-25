import { NextResponse } from "next/server";
import { guardApi } from "@/lib/host-guard";
import { getDomainState } from "@/lib/domains";
import { API_ENDPOINTS } from "@/lib/api-index.ts";

export const dynamic = "force-dynamic";

/** A map of the API: every endpoint with its method, path and a one-line summary. No key needed. */
export async function GET() {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const st = await getDomainState();
  return NextResponse.json({
    data: {
      version: "v1",
      base_url: `${st.apiUrl}/api/v1`,
      auth: "Authorization: Bearer <your key>",
      docs: `${st.apiUrl}/docs`,
      endpoints: API_ENDPOINTS.map((e) => ({ method: e.method, path: e.path, summary: e.summary })),
    },
  });
}
