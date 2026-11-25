// Pure rules for polls and page snapshots (no database), so they are unit tested.

export const POLL_MIN = 2;
export const POLL_MAX = 6;
export const POLL_OPTION_MAX = 60;
export const MAX_SNAPSHOTS = 10;

/** Accepts an array or a text with one option per line. Trims, drops empty lines and repeats. */
export function parsePollOptions(input: unknown): { ok: true; options: string[] } | { ok: false; error: string } {
  const parts = Array.isArray(input) ? input.map((x) => (typeof x === "string" ? x : "")) : typeof input === "string" ? input.split(/\r?\n/) : [];
  const options: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    if (t.length > POLL_OPTION_MAX) return { ok: false, error: `Keep each option under ${POLL_OPTION_MAX} characters.` };
    if (!options.some((o) => o.toLowerCase() === t.toLowerCase())) options.push(t);
  }
  if (options.length < POLL_MIN) return { ok: false, error: `Add at least ${POLL_MIN} options, one per line.` };
  if (options.length > POLL_MAX) return { ok: false, error: `Use at most ${POLL_MAX} options.` };
  return { ok: true, options };
}

export const pollOptionsFromData = (data: Record<string, string> | null | undefined): string[] =>
  (data?.options ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

export interface PollResult { options: { label: string; votes: number; percent: number }[]; total: number }

/** Votes per option with whole-number percentages. Votes for an option that no longer exists are ignored. */
export function tallyPoll(options: string[], rows: { option_idx: number; n: number }[]): PollResult {
  const votes = options.map((_, i) => Number(rows.find((r) => Number(r.option_idx) === i)?.n ?? 0));
  const total = votes.reduce((a, b) => a + b, 0);
  return { total, options: options.map((label, i) => ({ label, votes: votes[i], percent: total ? Math.round((votes[i] / total) * 100) : 0 })) };
}

export interface SnapshotBlock {
  id: number; type: string; title: string | null; url: string | null; data: Record<string, string> | null;
  group_id: number | null; sort_order: number; enabled: boolean; starts_at: string | null; ends_at: string | null;
}
export interface SnapshotData {
  v: 1;
  page: { display_name: string | null; bio: string | null; avatar_url: string | null; theme: string; custom: Record<string, string> | null; socials: Record<string, string> | null };
  blocks: SnapshotBlock[];
}

const isStrMap = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every((x) => typeof x === "string");
const strOrNull = (v: unknown) => (typeof v === "string" ? v : null);

/** Reads a stored snapshot back, checking its shape. Returns null for anything that is not a valid snapshot. */
export function parseSnapshot(json: string): SnapshotData | null {
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return null; }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.v !== 1 || !r.page || typeof r.page !== "object" || !Array.isArray(r.blocks) || r.blocks.length > 500) return null;
  const p = r.page as Record<string, unknown>;
  if (typeof p.theme !== "string") return null;
  const blocks: SnapshotBlock[] = [];
  for (const b of r.blocks as Record<string, unknown>[]) {
    if (!b || typeof b !== "object" || !Number.isInteger(b.id) || typeof b.type !== "string") return null;
    blocks.push({
      id: b.id as number, type: b.type, title: strOrNull(b.title), url: strOrNull(b.url), data: isStrMap(b.data) ? b.data : null,
      group_id: Number.isInteger(b.group_id) ? (b.group_id as number) : null, sort_order: Number.isInteger(b.sort_order) ? (b.sort_order as number) : 0,
      enabled: b.enabled !== false, starts_at: strOrNull(b.starts_at), ends_at: strOrNull(b.ends_at),
    });
  }
  return {
    v: 1,
    page: { display_name: strOrNull(p.display_name), bio: strOrNull(p.bio), avatar_url: strOrNull(p.avatar_url), theme: p.theme, custom: isStrMap(p.custom) ? p.custom : null, socials: isStrMap(p.socials) ? p.socials : null },
    blocks: blocks.sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** What a restore does: blocks that still exist are updated in place (so their click counts stay), missing ones are re-added, extra ones are removed. */
export function planRestore(currentIds: number[], snapshot: SnapshotBlock[]): { update: SnapshotBlock[]; insert: SnapshotBlock[]; remove: number[] } {
  const have = new Set(currentIds);
  const keep = new Set(snapshot.map((b) => b.id));
  return {
    update: snapshot.filter((b) => have.has(b.id)),
    insert: snapshot.filter((b) => !have.has(b.id)),
    remove: currentIds.filter((id) => !keep.has(id)),
  };
}
