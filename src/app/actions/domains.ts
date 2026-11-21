"use server";

import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { domainService, invalidateDomains } from "@/lib/domains";
import { runMigrations } from "@/lib/migrate";
import { exec } from "@/lib/db";
import { clearSlugCache } from "@/lib/slug-cache";
import type { FormState } from "@/components/client";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const refresh = () => { invalidateDomains(); revalidatePath("/admin/domains"); };

/** Every action re-checks the role against the database. Only a super admin ever reaches the service. */
const purposeOf = (v: string) => (v === "api" ? "api" : v === "bio" ? "bio" : "site") as "site" | "api" | "bio";

export async function addDomainAction(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  let r;
  try {
    r = await domainService().add(me.id, s(fd, "hostname"), s(fd, "label"), purposeOf(s(fd, "purpose")));
  } catch {
    // Most likely migration 008 (the bio type) has not been applied to this database yet.
    return { errors: { hostname: "Could not save the domain. Press Run database updates at the top of this page, then try again." } };
  }
  refresh();
  if (!r.ok) return { errors: { hostname: r.error } };
  return { ok: true, message: `Added ${r.data.hostname} as pending. Create the subdomain and install SSL in hPanel, then press Check & activate.` };
}

export async function editDomainAction(id: number, _: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  let r;
  try {
    r = await domainService().edit(me.id, id, { hostname: s(fd, "hostname"), label: s(fd, "label"), purpose: purposeOf(s(fd, "purpose")) });
  } catch {
    return { errors: { hostname: "Could not save the domain. Press Run database updates at the top of this page, then try again." } };
  }
  refresh();
  if (!r.ok) return { errors: { hostname: r.error } };
  return { ok: true, message: r.data.status === "pending" ? "Saved. The domain is pending again, so run Check & activate." : "Saved." };
}

export async function checkDomainAction(id: number): Promise<void> {
  const me = await requireAdmin();
  await domainService().checkAndActivate(me.id, id);
  refresh();
}

/** Explicit admin override: activates even though the HTTPS check failed. Recorded in the audit log. */
export async function overrideActivateAction(id: number): Promise<void> {
  const me = await requireAdmin();
  await domainService().checkAndActivate(me.id, id, { override: true });
  refresh();
}

export async function disableDomainAction(id: number): Promise<void> {
  const me = await requireAdmin();
  await domainService().disable(me.id, id);
  refresh();
}

export async function deleteDomainAction(id: number): Promise<void> {
  const me = await requireAdmin();
  const row = (await domainService().list()).find((d) => d.id === id);
  await domainService().remove(me.id, id);
  // Links that were placed on this domain go back to following the default, so no link points at a deleted domain.
  if (row && !row.is_default) {
    await exec("UPDATE links SET domain_id = NULL WHERE domain_id = ?", [id]);
    clearSlugCache();
  }
  refresh();
}

export async function makeDefaultAction(id: number): Promise<FormState> {
  const me = await requireAdmin();
  const r = await domainService().makeDefault(me.id, id);
  refresh();
  revalidatePath("/", "layout"); // every cached URL is rebuilt from the new default
  if (!r.ok) return { errors: { form: r.error } };
  return { ok: true, message: `${r.data.next} is now the default domain.` };
}

/** For hosts without SSH: applies pending database migrations (the same as `npm run migrate`). Super admin only. */
export async function runMigrationsAction(): Promise<FormState> {
  const me = await requireAdmin();
  try {
    const applied = await runMigrations({ includePhase2: process.env.FEATURE_PHASE2 !== "0" && process.env.FEATURE_PHASE2 !== "false" });
    invalidateDomains();
    revalidatePath("/admin", "layout");
    await audit(me.id, "db.migrate", undefined, { applied }).catch(() => {});
    return { ok: true, message: applied.length ? `Applied: ${applied.join(", ")}` : "Database is already up to date." };
  } catch (e) {
    return { errors: { form: `Migration failed: ${(e as Error).message}` } };
  }
}
