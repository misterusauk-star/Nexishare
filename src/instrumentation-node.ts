import { processQueue } from "./lib/email/mailer";
import { purgeExpired } from "./lib/auth";
import { flushClicks } from "./lib/analytics";
import { recheckLinks } from "./lib/services/safety";
import { checkLinksHealth, sendWeeklyReports } from "./lib/services/linkops";

/** Node-only background timers: email queue every minute, expired sessions/tokens every 6 hours, link safety re-check every 6 hours, destination health every 30 minutes, weekly report hourly (sends on Monday). */
export function startWorkers() {
  if (!process.env.DB_NAME) return;
  setInterval(() => void processQueue().catch(() => {}), 60_000).unref();
  setInterval(() => void purgeExpired().catch(() => {}), 6 * 3600_000).unref();
  setTimeout(() => void recheckLinks().catch(() => {}), 2 * 60_000).unref();
  setInterval(() => void recheckLinks().catch(() => {}), 6 * 3600_000).unref();
  // Destination health: a small batch every 30 minutes. The weekly report is sent on Monday (UTC), checked hourly.
  setTimeout(() => void checkLinksHealth().catch(() => {}), 5 * 60_000).unref();
  setInterval(() => void checkLinksHealth().catch(() => {}), 30 * 60_000).unref();
  setTimeout(() => void sendWeeklyReports().catch(() => {}), 10 * 60_000).unref();
  setInterval(() => void sendWeeklyReports().catch(() => {}), 3600_000).unref();
  // Queued analytics are written out before the process exits (deploys and restarts send SIGTERM).
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.once(sig, () => {
      const t = setTimeout(() => process.exit(0), 3000);
      void flushClicks().catch(() => {}).finally(() => { clearTimeout(t); process.exit(0); });
    });
  }
}
