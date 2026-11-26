// The weekly email report: when it is due and what it says. Pure, so it is unit tested.
import { describeChange } from "./change.ts";
import { hourLabel } from "./hours.ts";

/** Reports go out on Monday (UTC), once per week. `lastSent` is when the previous one was sent, or null. */
export function isReportDue(now: Date, lastSent: Date | null): boolean {
  if (now.getUTCDay() !== 1) return false;
  return !lastSent || now.getTime() - lastSent.getTime() >= 6 * 24 * 3600_000;
}

export interface ReportData {
  clicks: number; previousClicks: number; unique: number;
  views: number; previousViews: number;
  top: { label: string; n: number }[];
  busiestHour: number | null;
  newSubscribers: number;
  brokenLinks: number;
}

/** Nothing to report: no visits this week or the week before, so an email would only be noise. */
export const isQuietWeek = (d: ReportData): boolean => d.clicks === 0 && d.previousClicks === 0 && d.views === 0 && d.previousViews === 0;

export function buildReport(d: ReportData, dashboardUrl: string, settingsUrl: string) {
  const paragraphs: string[] = [];
  paragraphs.push(`Short links: ${d.clicks.toLocaleString("en-US")} click${d.clicks === 1 ? "" : "s"} (${d.unique.toLocaleString("en-US")} unique visitor${d.unique === 1 ? "" : "s"}), ${describeChange(d.clicks, d.previousClicks, 7)}.`);
  if (d.views || d.previousViews) paragraphs.push(`Bio page: ${d.views.toLocaleString("en-US")} view${d.views === 1 ? "" : "s"}, ${describeChange(d.views, d.previousViews, 7)}.`);
  if (d.top.length) paragraphs.push("Most clicked: " + d.top.map((t, i) => `${i + 1}. ${t.label} (${t.n.toLocaleString("en-US")})`).join("  "));
  if (d.busiestHour != null) paragraphs.push(`Busiest hour: ${hourLabel(d.busiestHour)}.`);
  if (d.newSubscribers > 0) paragraphs.push(`${d.newSubscribers.toLocaleString("en-US")} new email signup${d.newSubscribers === 1 ? "" : "s"} on your bio page.`);
  if (d.brokenLinks > 0) paragraphs.push(`Needs attention: ${d.brokenLinks} link${d.brokenLinks === 1 ? "" : "s"} point${d.brokenLinks === 1 ? "s" : ""} to a page that no longer works.`);
  return {
    subject: `Your week: ${d.clicks.toLocaleString("en-US")} click${d.clicks === 1 ? "" : "s"}`,
    heading: "Your week in numbers",
    paragraphs,
    button: { label: "Open analytics", url: dashboardUrl },
    footnote: `You get this email every Monday because you turned it on. Turn it off any time in ${settingsUrl}.`,
  };
}
