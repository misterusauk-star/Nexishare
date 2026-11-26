import { NextResponse } from "next/server";
import { authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { countActiveKeys, countLinks, limitsFor } from "@/lib/user-limits";
import { geoUsage } from "@/lib/services/linkops";

export const dynamic = "force-dynamic";

/** What your account may do and what it uses now. A limit of null means no limit (administrator accounts). */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  const cap = await limitsFor(a.user.id);
  const lim = (k: keyof typeof cap.values) => (cap.unlimited ? null : cap.values[k]);
  const [links, keys, geo] = await Promise.all([countLinks(a.user.id).catch(() => 0), countActiveKeys(a.user.id).catch(() => 0), geoUsage(a.user.id).catch(() => null)]);
  return NextResponse.json({
    data: {
      api_requests_per_minute_per_key: lim("api_per_minute"),
      api_requests_per_day: lim("api_per_day"),
      links: { used: links, limit: lim("max_links") },
      api_keys: { used: keys, limit: lim("max_api_keys") },
      country_routes_per_link: lim("geo_per_link"),
      links_with_country_routes: { used: geo?.links_with_routes ?? 0, limit: lim("geo_links") },
      manual_checks_per_hour: lim("health_checks_per_hour"),
      bulk_create_max: 50,
      bulk_action_max: 200,
    },
  });
}
