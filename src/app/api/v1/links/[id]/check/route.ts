import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { rateLimit } from "@/lib/ratelimit";
import { getLinkForUser } from "@/lib/services/links";
import { checkOneLink } from "@/lib/services/linkops";

export const dynamic = "force-dynamic";

/** Check the destination of a link now. Answer: `status` ("ok", "broken" or null while a first failure is being confirmed) and `code` (the HTTP status, or null). 20 per hour. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  const link = Number.isInteger(id) && id > 0 ? await getLinkForUser(a.user.id, id) : null;
  if (!link) return apiError(404, "Link not found.");
  if (link.universal) return apiError(422, "Universal links have no destination to check.");
  if (!(await rateLimit(`health:${a.user.id}`, 20, 3600))) return apiError(429, "Too many checks. Try again later.");
  try {
    const r = await checkOneLink(link.id);
    return NextResponse.json({ data: { status: r?.status ?? null, code: r?.code ?? null } });
  } catch { return apiError(503, "Health checks need a database update. The administrator can press Run database updates in Admin > Domains."); }
}
