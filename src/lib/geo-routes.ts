// Country routes of a link: pure rules, no database.

/** Hard ceiling. The number an account may actually use is its "country routes per link" limit (10 by default). */
export const GEO_MAX = 50;
export interface GeoRoute { country: string; url: string }

/**
 * Reads a list of country routes from an array of {country, url} or from text with one route per line ("PK https://example.com/pk").
 * Country codes are two letters (ISO 3166-1 alpha-2) and are stored in capitals. A repeated country is an error.
 */
export function parseGeoRoutes(input: unknown, max = GEO_MAX): { ok: true; routes: GeoRoute[] } | { ok: false; error: string } {
  let items: { country: unknown; url: unknown }[];
  if (Array.isArray(input)) {
    items = input.map((x) => (x && typeof x === "object" ? (x as { country: unknown; url: unknown }) : { country: null, url: null }));
  } else if (typeof input === "string") {
    items = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^([A-Za-z]{2})[\s:=,]+(\S+)$/);
      return { country: m?.[1], url: m?.[2] };
    });
  } else return { ok: false, error: "Send a list of routes." };
  const routes: GeoRoute[] = [];
  for (const it of items) {
    const country = typeof it.country === "string" ? it.country.trim().toUpperCase() : "";
    const url = typeof it.url === "string" ? it.url.trim() : "";
    if (!/^[A-Z]{2}$/.test(country) || !url) return { ok: false, error: 'Write each route as a two-letter country code, a space and a web address, for example "PK https://example.com/pk".' };
    if (url.length > 2048) return { ok: false, error: "A web address is too long." };
    if (routes.some((r) => r.country === country)) return { ok: false, error: `${country} is listed twice.` };
    routes.push({ country, url });
  }
  if (routes.length > max) return { ok: false, error: `Your limit is ${max} countr${max === 1 ? "y" : "ies"} per link.` };
  return { ok: true, routes };
}

/** The route for this visitor's country, or null when there is none (or the country is unknown). */
export function pickGeo(routes: GeoRoute[], country: string | null | undefined): string | null {
  if (!country) return null;
  const c = country.toUpperCase();
  return routes.find((r) => r.country === c)?.url ?? null;
}

export const geoToText = (routes: GeoRoute[]): string => routes.map((r) => `${r.country} ${r.url}`).join("\n");
