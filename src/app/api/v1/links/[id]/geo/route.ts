import { NextResponse } from "next/server";
import { apiError, authApi, jsonBody } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import { guardApi } from "@/lib/host-guard";
import { getLinkForUser } from "@/lib/services/links";
import { getGeoRoutes, setGeoRoutes } from "@/lib/services/linkops";
import { invalidateSlug } from "@/lib/slug-cache";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const NEEDS_UPDATE = "Country routes need a database update. The administrator can press Run database updates in Admin > Domains.";

async function load(req: Request, ctx: Ctx) {
  const blocked = await guardApi();
  if (blocked) return { res: blocked };
  const a = await authApi(req);
  if ("res" in a) return { res: a.res };
  const id = Number((await ctx.params).id);
  const link = Number.isInteger(id) && id > 0 ? await getLinkForUser(a.user.id, id) : null;
  return link ? { link } : { res: apiError(404, "Link not found.") };
}

/** The country routes of a link: `[{ "country": "PK", "url": "https://..." }]`. */
export async function GET(req: Request, ctx: Ctx) {
  const l = await load(req, ctx);
  if ("res" in l) return l.res;
  try { return NextResponse.json({ data: await getGeoRoutes(l.link.id) }); } catch { return apiError(503, NEEDS_UPDATE); }
}

/** Replace all country routes: `{ "routes": [{ "country": "PK", "url": "https://..." }] }`. An empty list removes them. Up to 10 countries. */
export async function PUT(req: Request, ctx: Ctx) {
  const l = await load(req, ctx);
  if ("res" in l) return l.res;
  const body = await jsonBody(req);
  if (!body || !("routes" in body)) return apiError(400, 'Send {"routes": [{"country": "PK", "url": "https://..."}]}.');
  try {
    const r = await setGeoRoutes(l.link.id, (await getBrand()).host, body.routes);
    if (!r.ok) return apiError(422, "Validation failed.", { fields: r.errors });
    invalidateSlug(l.link.slug);
    return NextResponse.json({ data: r.data });
  } catch { return apiError(503, NEEDS_UPDATE); }
}
