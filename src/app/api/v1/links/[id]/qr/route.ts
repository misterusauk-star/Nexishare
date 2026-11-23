import { NextResponse } from "next/server";
import { apiError, authApi } from "@/lib/api";
import { getDomainState, linkUrl } from "@/lib/domains";
import { getLinkForUser } from "@/lib/services/links";
import { qrPng, qrSvg } from "@/lib/qr";
import { safeImageUrl } from "@/lib/validation";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

/**
 * The QR code of one of your links, as SVG (default) or PNG.
 * Options: format=svg|png, size (64-2048, PNG), fg and bg as #rrggbb, margin 0-8, logo (https image, SVG only),
 * track=1 to add utm_source=qr so scans show up as a campaign in the stats.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const id = Number((await ctx.params).id);
  const l = Number.isInteger(id) && id > 0 ? await getLinkForUser(a.user.id, id) : null;
  if (!l) return apiError(404, "Link not found.");
  const q = new URL(req.url).searchParams;
  const url = linkUrl(await getDomainState(), l.domain_id, l.slug) + (q.get("track") === "1" ? "?utm_source=qr" : "");
  const logo = q.get("logo") ?? "";
  const opts = {
    fg: q.get("fg") ?? undefined,
    bg: q.get("bg") ?? undefined,
    size: Number(q.get("size") ?? 512) || 512,
    margin: q.get("margin") === null ? undefined : Number(q.get("margin")),
    logo: logo && safeImageUrl(logo) ? logo : undefined,
  };
  const headers = { "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" };
  if (q.get("format") === "png") {
    const png = await qrPng(url, opts);
    return new NextResponse(new Uint8Array(png), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  return new NextResponse(qrSvg(url, opts), { headers: { ...headers, "Content-Type": "image/svg+xml; charset=utf-8", "Content-Security-Policy": "default-src 'none'; img-src https: data: 'self'; style-src 'unsafe-inline'" } });
}
