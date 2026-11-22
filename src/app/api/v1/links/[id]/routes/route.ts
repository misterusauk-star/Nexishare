import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { getLinkForUser } from "@/lib/services/links";
import { deviceRoutes } from "@/lib/smart-link";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/** Where a visitor on each kind of device ends up. url is null when a universal link shows its chooser page. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  const l = Number.isInteger(id) && id > 0 ? await getLinkForUser(a.user.id, id) : null;
  if (!l) return apiError(404, "Link not found.");
  return NextResponse.json({ data: { universal: !!l.universal, expired_url: l.expired_url ?? null, routes: deviceRoutes(l) } });
}
