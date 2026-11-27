import { toCsv } from "./csv.ts";

export interface UserCsvRow {
  id: number; email: string; username: string | null; role: string; status: string;
  email_verified_at: Date | string | null; created_at: Date | string; last_login_at: Date | string | null; links: number;
}

const ts = (d: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 19).replace("T", " ") : "");

/** CSV of accounts for the super admin: no password data, times in UTC. */
export function usersCsv(rows: UserCsvRow[]): string {
  return toCsv([
    ["id", "email", "username", "role", "status", "email_verified", "joined_utc", "last_login_utc", "links"],
    ...rows.map((r) => [r.id, r.email, r.username ?? "", r.role, r.status, r.email_verified_at ? "yes" : "no", ts(r.created_at), ts(r.last_login_at), r.links]),
  ]);
}
