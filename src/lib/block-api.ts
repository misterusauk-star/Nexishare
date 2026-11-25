// Bio page blocks through the API: turns a JSON body into the data a block stores, and a stored block into JSON.
// Pure (no database), so it is unit tested.
import { brandForUrl } from "./brands.ts";

/** Text fields a block can hold besides title and url. Stored in the block's `data`. */
export const BLOCK_TEXT_KEYS = ["description", "price", "button", "email", "phone", "org", "note"] as const;

export type BlockDataResult = { ok: true; data: Record<string, string> } | { ok: false; errors: Record<string, string> };

/**
 * Applies the fields present in `body` on top of `base` (the block's current data, empty for a new block).
 * A text field set to "" is removed. `featured` is a boolean. Fields that are not in the body stay as they were.
 */
export function blockDataFromBody(body: Record<string, unknown>, base: Record<string, string> = {}): BlockDataResult {
  const data: Record<string, string> = { ...base };
  const errors: Record<string, string> = {};
  for (const k of BLOCK_TEXT_KEYS) {
    if (!(k in body)) continue;
    const v = body[k];
    if (v === null || v === undefined) { delete data[k]; continue; }
    if (typeof v !== "string") { errors[k] = "Send text."; continue; }
    const t = v.trim();
    if (t) data[k] = t; else delete data[k];
  }
  if ("options" in body) {
    const o = body.options;
    const lines = Array.isArray(o) ? o : typeof o === "string" ? o.split(/\r?\n/) : o === null ? [] : null;
    if (!lines || !lines.every((x) => typeof x === "string")) errors.options = "Send a list of options.";
    else { const t = (lines as string[]).map((x) => x.trim()).filter(Boolean); if (t.length) data.options = t.join("\n"); else delete data.options; }
  }
  if ("featured" in body) {
    const f = body.featured;
    if (f === true) data.featured = "1";
    else if (f === false || f === null) delete data.featured;
    else errors.featured = "Send true or false.";
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);

export interface BlockLike {
  id: number; type: string; title: string | null; url: string | null; data: Record<string, string> | null;
  group_id: number | null; sort_order: number; enabled: number | boolean; starts_at: Date | string | null; ends_at: Date | string | null;
}

export function blockJson(b: BlockLike) {
  const d = b.data ?? {};
  return {
    id: b.id,
    type: b.type,
    title: b.title,
    url: b.url,
    description: d.description ?? null,
    price: d.price ?? null,
    button: d.button ?? null,
    options: d.options ? d.options.split("\n") : null,
    featured: d.featured === "1",
    enabled: !!b.enabled,
    group_id: b.group_id,
    position: b.sort_order,
    starts_at: iso(b.starts_at),
    ends_at: iso(b.ends_at),
    // The platform a link points to (instagram, youtube...), or null. The page draws that logo on the button.
    icon: b.type === "link" ? brandForUrl(b.url)?.key ?? null : null,
  };
}
