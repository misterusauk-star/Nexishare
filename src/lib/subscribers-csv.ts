import { toCsv } from "./csv.ts";

/** CSV of a person's subscribers: email, signup time (UTC), and the block they signed up through. */
export function subscribersCsv(rows: { email: string; block_id: number; created_at: Date | string }[]): string {
  return toCsv([
    ["email", "signed_up_at_utc", "block_id"],
    ...rows.map((r) => [r.email, new Date(r.created_at).toISOString().slice(0, 19).replace("T", " "), r.block_id]),
  ]);
}
