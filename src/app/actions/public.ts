"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { exec, queryOne } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { getBrand } from "@/lib/brand";
import { enforceHost } from "@/lib/host-guard";
import { rateLimit } from "@/lib/ratelimit";
import { ipHash } from "@/lib/crypto";
import { reqInfo } from "@/lib/request";
import { recordClick } from "@/lib/analytics";
import { emailSchema, fieldErrors, isBlocked } from "@/lib/validation";
import { getLinkBySlug } from "@/lib/services/public";
import { linkState, takeClick } from "@/lib/services/links";
import { pickDestination } from "@/lib/smart-link.ts";
import { sendEmail } from "@/lib/email/mailer";
import { submitReport } from "@/lib/services/reports";
import { phase2Enabled } from "@/lib/features";
import { castVote, pollResults } from "@/lib/services/engage";
import { pollOptionsFromData } from "@/lib/engage.ts";
import type { FormState } from "@/components/client";

/** Password-protected short link: verify, count the click, then redirect. */
export async function unlockLinkAction(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  await enforceHost();
  const info = await reqInfo();
  if (!(await rateLimit(`unlock:${info.ip}:${slug}`, 8, 600))) return { errors: { password: "Too many attempts. Try again in a few minutes." } };
  const link = await getLinkBySlug(slug);
  if (!link || !link.password_hash || linkState(link) !== "active" || !link.owner_active) return { errors: { password: "This link is no longer available." } };
  const ok = await verifyPassword(String(fd.get("password") ?? ""), link.password_hash);
  if (!ok) return { errors: { password: "That password is not right." } };
  const dest = pickDestination(link, info.ua);
  const blocked = await isBlocked(dest);
  if (blocked) return { errors: { password: "This link has been blocked." } };
  if (link.max_clicks != null && !(await takeClick(link.id))) {
    if (link.expired_url && !(await isBlocked(link.expired_url))) redirect(link.expired_url);
    return { errors: { password: "This link is no longer available." } };
  }
  const b = await getBrand();
  await recordClick({ type: "link", id: link.id, userId: link.user_id, info, ownHost: b.host });
  redirect(dest);
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Tell them who you are.").max(100),
  email: emailSchema,
  message: z.string().trim().min(5, "Write a few words.").max(2000),
  website: z.string().max(0).optional(), // honeypot
});

/** Contact form block (Phase 2). Stored in the DB first, then emailed to the page owner if mail is configured. */
export async function contactAction(blockId: number, _: FormState, fd: FormData): Promise<FormState> {
  if (!phase2Enabled()) return { errors: { form: "Contact forms are turned off on this server." } };
  const info = await reqInfo();
  if (!(await rateLimit(`contact:${info.ip}`, 5, 3600))) return { errors: { form: "You have sent several messages already. Try again later." } };
  const p = contactSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  if (p.data.website) return { ok: true, message: "Message sent." }; // bots get a fake success
  const block = await queryOne<{ id: number; user_id: number; email: string; username: string }>(
    `SELECT b.id, p.user_id, u.email, u.username FROM blocks b JOIN pages p ON p.id = b.page_id JOIN users u ON u.id = p.user_id
      WHERE b.id = ? AND b.type = 'contact_form' AND b.enabled = 1 AND p.published = 1 AND p.moderated = 0 AND u.status = 'active'`,
    [blockId],
  );
  if (!block) return { errors: { form: "This form is not available." } };
  if (!(await rateLimit(`contact:block:${blockId}`, 30, 3600))) return { errors: { form: "This inbox is receiving too many messages right now." } };
  await exec("INSERT INTO contact_messages (block_id, user_id, name, email, message) VALUES (?, ?, ?, ?, ?)", [blockId, block.user_id, p.data.name, p.data.email, p.data.message]);
  const b = await getBrand();
  await sendEmail("contact_form", block.email, {
    subject: `New message from ${p.data.name}`,
    heading: "Someone wrote to you",
    paragraphs: [`${p.data.name} (${p.data.email}) sent a message through your ${b.name} page:`, p.data.message],
    footnote: "Reply directly to the sender at the address above. You can also read it in your dashboard under Messages.",
  }).catch(() => undefined);
  return { ok: true, message: "Message sent." };
}

const subscribeSchema = z.object({ email: emailSchema, website: z.string().max(0).optional() });

/** Email signup block: stores the address for the page owner. A repeat signup looks the same as a new one, so nobody can check who is on a list. */
export async function subscribeAction(blockId: number, _: FormState, fd: FormData): Promise<FormState> {
  if (!phase2Enabled()) return { errors: { form: "Signup forms are turned off on this server." } };
  const info = await reqInfo();
  if (!(await rateLimit(`subscribe:${info.ip}`, 5, 3600))) return { errors: { form: "Too many attempts. Try again later." } };
  const p = subscribeSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { errors: fieldErrors(p.error) };
  if (p.data.website) return { ok: true, message: "You are on the list." }; // bots get a fake success
  const block = await queryOne<{ id: number; user_id: number }>(
    `SELECT b.id, p.user_id FROM blocks b JOIN pages p ON p.id = b.page_id JOIN users u ON u.id = p.user_id
      WHERE b.id = ? AND b.type = 'subscribe' AND b.enabled = 1 AND p.published = 1 AND p.moderated = 0 AND u.status = 'active'`,
    [blockId],
  );
  if (!block) return { errors: { form: "This form is not available." } };
  if (!(await rateLimit(`subscribe:block:${blockId}`, 100, 3600))) return { errors: { form: "This list is receiving too many signups right now." } };
  await exec("INSERT IGNORE INTO bio_subscribers (block_id, user_id, email) VALUES (?, ?, ?)", [blockId, block.user_id, p.data.email.toLowerCase()]).catch(() => undefined);
  return { ok: true, message: "You are on the list." };
}

export type PollState = { ok: true; total: number; options: { label: string; votes: number; percent: number }[]; voted?: boolean } | { ok: false; error: string };

async function openPoll(blockId: number) {
  return queryOne<{ id: number; data: Record<string, string> | null }>(
    `SELECT b.id, b.data FROM blocks b JOIN pages p ON p.id = b.page_id JOIN users u ON u.id = p.user_id
      WHERE b.id = ? AND b.type = 'poll' AND b.enabled = 1 AND p.published = 1 AND p.moderated = 0 AND u.status = 'active'`,
    [blockId],
  );
}

/** Poll block: counts one vote per visitor and returns the results. */
export async function voteAction(blockId: number, optionIdx: number): Promise<PollState> {
  if (!phase2Enabled()) return { ok: false, error: "Polls are turned off on this server." };
  const info = await reqInfo();
  if (!(await rateLimit(`vote:${info.ip}`, 30, 3600))) return { ok: false, error: "Too many votes. Try again later." };
  const poll = await openPoll(blockId);
  if (!poll) return { ok: false, error: "This poll is not available." };
  const options = pollOptionsFromData(poll.data);
  if (!Number.isInteger(optionIdx) || optionIdx < 0 || optionIdx >= options.length) return { ok: false, error: "Choose one of the options." };
  const fresh = await castVote(blockId, optionIdx, `${info.ip}|${info.ua}`);
  return { ...(await pollResults(blockId, poll.data)), ok: true, voted: !fresh };
}

export async function pollResultsAction(blockId: number): Promise<PollState> {
  const poll = await openPoll(blockId);
  if (!poll) return { ok: false, error: "This poll is not available." };
  return { ...(await pollResults(blockId, poll.data)), ok: true };
}

export async function reportAction(_: FormState, fd: FormData): Promise<FormState> {
  const info = await reqInfo();
  const r = await submitReport(Object.fromEntries(fd), info.ip);
  if (!r.ok) return { errors: r.errors };
  return { ok: true, message: "Thanks. An administrator will review it." };
}
