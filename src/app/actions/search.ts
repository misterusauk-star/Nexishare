"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { setSettings } from "@/lib/settings";
import { allPublicUrls, submitUrls } from "@/lib/indexnow";
import type { FormState } from "@/components/client";

/** Turns automatic IndexNow pings on or off. */
export async function saveIndexNowAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const on = fd.get("enabled") === "on";
  await setSettings({ indexnow_enabled: on ? "1" : "0" });
  await audit(me.id, "indexnow.toggle", on ? "on" : "off");
  revalidatePath("/admin/search");
  return { ok: true, message: on ? "Search engines will hear about new and changed pages." : "Automatic pings are off." };
}

/** Sends every public URL (site pages and all published bio pages) to IndexNow now. */
export async function submitAllAction(_: FormState, __: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const urls = await allPublicUrls();
  const results = await submitUrls(urls);
  await audit(me.id, "indexnow.submit", String(urls.length));
  revalidatePath("/admin/search");
  const okAll = results.length > 0 && results.every((r) => r.status === 200 || r.status === 202);
  const lines = results.map((r) => `${r.host}: ${r.count} address${r.count === 1 ? "" : "es"}, ${r.note}`).join(". ");
  return { ok: okAll, message: results.length ? lines : "Nothing to send yet." };
}
