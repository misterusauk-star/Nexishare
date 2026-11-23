// Pure tag rules (no DB). Tags are short lowercase labels you put on links to group and filter them.
export const MAX_TAGS = 5;
export const MAX_TAG_LENGTH = 24;
const TAG_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;

/** Accepts "Sale, summer-2026" or ["Sale", "summer-2026"]. Lowercases, trims, drops duplicates. */
export function parseTags(input: unknown): { ok: true; tags: string[] } | { ok: false; error: string } {
  if (input === null || input === undefined || input === "") return { ok: true, tags: [] };
  const parts = Array.isArray(input) ? input.map(String) : String(input).split(/[,\n]+/);
  const tags: string[] = [];
  for (const raw of parts) {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) continue;
    if (!TAG_RE.test(t)) return { ok: false, error: `"${raw.trim().slice(0, 30)}" is not a valid tag. Use letters, numbers and hyphens, up to ${MAX_TAG_LENGTH} characters.` };
    if (!tags.includes(t)) tags.push(t);
  }
  if (tags.length > MAX_TAGS) return { ok: false, error: `Use at most ${MAX_TAGS} tags.` };
  return { ok: true, tags };
}

/** Stored as a comma separated string so it can be searched with FIND_IN_SET. */
export const tagsToColumn = (tags: string[]): string | null => (tags.length ? tags.join(",") : null);
export const tagsFromColumn = (v: string | null | undefined): string[] => (v ? v.split(",").filter(Boolean) : []);

/** A single tag from a URL filter: valid or null. */
export const cleanTagFilter = (v: string | null | undefined): string | null => {
  const t = String(v ?? "").trim().toLowerCase();
  return TAG_RE.test(t) ? t : null;
};
