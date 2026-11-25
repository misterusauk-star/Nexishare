// Email signups, poll votes and page snapshots (needs migration 016).
import { exec, query, queryOne } from "../db";
import { hmac } from "../crypto";
import { MAX_SNAPSHOTS, parseSnapshot, planRestore, pollOptionsFromData, tallyPoll, type PollResult, type SnapshotData } from "../engage.ts";
import { BLOCK_TYPES_P1, BLOCK_TYPES_P2, ensurePage, getBlocks, saveBlock, deleteBlock, reorderBlocks, updateProfile, updateSocials } from "./pages";
import { phase2Enabled } from "../features";
import type { Result } from "./links";

/* ---------- Email signups ---------- */

export interface Subscriber { id: number; block_id: number; email: string; created_at: Date }

export async function listSubscribers(userId: number, limit: number, offset: number): Promise<{ rows: Subscriber[]; total: number }> {
  const total = Number((await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM bio_subscribers WHERE user_id = ?", [userId]))?.n ?? 0);
  const rows = await query<Subscriber>("SELECT id, block_id, email, created_at FROM bio_subscribers WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?", [userId, limit, offset]);
  return { rows, total };
}

export async function allSubscribers(userId: number): Promise<Subscriber[]> {
  return query<Subscriber>("SELECT id, block_id, email, created_at FROM bio_subscribers WHERE user_id = ? ORDER BY id LIMIT 50000", [userId]);
}

export async function deleteSubscriber(userId: number, id: number): Promise<boolean> {
  return (await exec("DELETE FROM bio_subscribers WHERE id = ? AND user_id = ?", [id, userId])).affectedRows > 0;
}

/* ---------- Polls ---------- */

/** One vote per visitor per poll (a hash of address and browser, never the address itself). Returns false when this visitor already voted. */
export async function castVote(blockId: number, optionIdx: number, visitor: string): Promise<boolean> {
  const hash = hmac(visitor, `poll:${blockId}`).slice(0, 32);
  return (await exec("INSERT IGNORE INTO poll_votes (block_id, option_idx, voter_hash) VALUES (?, ?, ?)", [blockId, optionIdx, hash])).affectedRows > 0;
}

export async function pollResults(blockId: number, data: Record<string, string> | null): Promise<PollResult> {
  const rows = await query<{ option_idx: number; n: number }>("SELECT option_idx, COUNT(*) AS n FROM poll_votes WHERE block_id = ? GROUP BY option_idx", [blockId]).catch(() => []);
  return tallyPoll(pollOptionsFromData(data), rows);
}

/** Total votes per poll block for the editor list, in one query. */
export async function voteTotals(blockIds: number[]): Promise<Record<number, number>> {
  if (!blockIds.length) return {};
  const ph = blockIds.map(() => "?").join(",");
  const rows = await query<{ block_id: number; n: number }>(`SELECT block_id, COUNT(*) AS n FROM poll_votes WHERE block_id IN (${ph}) GROUP BY block_id`, blockIds).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.block_id, Number(r.n)]));
}

/* ---------- Snapshots ---------- */

export interface SnapshotRow { id: number; label: string; created_at: Date; blocks: number }

const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

export async function listSnapshots(userId: number): Promise<SnapshotRow[]> {
  const rows = await query<{ id: number; label: string; created_at: Date; data: string }>("SELECT id, label, created_at, data FROM page_snapshots WHERE user_id = ? ORDER BY id DESC LIMIT ?", [userId, MAX_SNAPSHOTS]);
  return rows.map((r) => ({ id: r.id, label: r.label, created_at: r.created_at, blocks: parseSnapshot(r.data)?.blocks.length ?? 0 }));
}

/** Saves the page (profile, look, social icons and every block) as a copy you can restore later. Keeps the newest MAX_SNAPSHOTS. */
export async function createSnapshot(userId: number, label: string): Promise<Result<{ id: number }>> {
  const text = label.trim().slice(0, 80);
  const page = await ensurePage(userId);
  const blocks = await getBlocks(page.id);
  const data: SnapshotData = {
    v: 1,
    page: { display_name: page.display_name, bio: page.bio, avatar_url: page.avatar_url, theme: page.theme, custom: page.custom as Record<string, string> | null, socials: page.socials as Record<string, string> | null },
    blocks: blocks.map((b) => ({ id: b.id, type: b.type, title: b.title, url: b.url, data: b.data, group_id: b.group_id, sort_order: b.sort_order, enabled: !!b.enabled, starts_at: iso(b.starts_at), ends_at: iso(b.ends_at) })),
  };
  const json = JSON.stringify(data);
  if (json.length > 900_000) return { ok: false, errors: { form: "This page is too large to save as a copy." } };
  const name = text || `Saved ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
  const res = await exec("INSERT INTO page_snapshots (user_id, label, data) VALUES (?, ?, ?)", [userId, name, json]);
  await exec("DELETE FROM page_snapshots WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM page_snapshots WHERE user_id = ? ORDER BY id DESC LIMIT ?) keep)", [userId, userId, MAX_SNAPSHOTS]);
  return { ok: true, data: { id: res.insertId } };
}

export async function deleteSnapshot(userId: number, id: number): Promise<boolean> {
  return (await exec("DELETE FROM page_snapshots WHERE id = ? AND user_id = ?", [id, userId])).affectedRows > 0;
}

/**
 * Puts the page back as it was in a saved copy. Blocks that still exist are updated in place (their click counts stay),
 * deleted ones come back as new blocks, blocks added since are removed. Every block is checked again against today's rules
 * (blocked addresses, available block types), and the ones that fail are skipped and counted.
 */
export async function restoreSnapshot(userId: number, id: number): Promise<Result<{ restored: number; skipped: number; removed: number }>> {
  const row = await queryOne<{ data: string }>("SELECT data FROM page_snapshots WHERE id = ? AND user_id = ?", [id, userId]);
  if (!row) return { ok: false, errors: { form: "Copy not found." } };
  const snap = parseSnapshot(row.data);
  if (!snap) return { ok: false, errors: { form: "This copy is damaged and cannot be restored." } };
  const page = await ensurePage(userId);
  const types: string[] = phase2Enabled() ? [...BLOCK_TYPES_P1, ...BLOCK_TYPES_P2] : [...BLOCK_TYPES_P1];
  const groups = new Set((await query<{ id: number }>("SELECT id FROM link_groups WHERE user_id = ?", [userId]).catch(() => [])).map((g) => g.id));
  const current = (await getBlocks(page.id)).map((b) => b.id);
  const plan = planRestore(current, snap.blocks);
  await updateProfile(userId, { display_name: snap.page.display_name ?? "", bio: snap.page.bio ?? "", avatar_url: snap.page.avatar_url ?? "", theme: snap.page.theme });
  await exec("UPDATE pages SET custom = ? WHERE user_id = ?", [snap.page.custom ? JSON.stringify(snap.page.custom) : null, userId]);
  await updateSocials(userId, snap.page.socials ?? {});
  for (const id2 of plan.remove) await deleteBlock(userId, id2);
  const order: number[] = [];
  let skipped = 0;
  for (const b of [...plan.update, ...plan.insert].sort((a, c) => a.sort_order - c.sort_order)) {
    const r = await saveBlock(userId, plan.update.includes(b) ? b.id : null, {
      type: b.type, title: b.title ?? undefined, url: b.url ?? undefined, data: b.data ?? undefined,
      group_id: b.group_id && groups.has(b.group_id) ? b.group_id : null, enabled: b.enabled, starts_at: b.starts_at, ends_at: b.ends_at,
    }, types);
    if (r.ok) order.push(r.data); else skipped++;
  }
  await reorderBlocks(userId, order);
  return { ok: true, data: { restored: order.length, skipped, removed: plan.remove.length } };
}
