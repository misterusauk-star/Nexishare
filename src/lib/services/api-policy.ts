import { queryOne } from "../db";
import { getSetting } from "../settings";
import { overrideFromDb, parseMode, type CreateMode, type Override } from "../api-access.ts";

export async function apiPolicy(): Promise<{ mode: CreateMode; paused: boolean }> {
  return { mode: parseMode(await getSetting("api_create_mode")), paused: (await getSetting("api_paused")) === "1" };
}

/** The account's override. Quietly null before migration 020 has been run. */
export async function apiOverride(userId: number): Promise<Override> {
  try {
    const r = await queryOne<{ api_access: number | null }>("SELECT api_access FROM users WHERE id = ?", [userId]);
    return overrideFromDb(r?.api_access);
  } catch {
    return null;
  }
}
