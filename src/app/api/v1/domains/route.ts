import { NextResponse } from "next/server";
import { authApi } from "@/lib/api";
import { getDomainState } from "@/lib/domains";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/** Domains a link can be placed on. Use `id` or `domain` as domain_id / domain when creating or updating a link. */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const st = await getDomainState();
  return NextResponse.json({ data: st.linkDomains.map((d) => ({ id: d.id, domain: d.host, is_default: d.isDefault })) });
}
