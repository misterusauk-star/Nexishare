import { NextResponse } from "next/server";
import { exec, queryOne } from "@/lib/db";
import { getBrand } from "@/lib/brand";
import { emailDomainError } from "@/lib/security";
import { getSetting } from "@/lib/settings";
import { decrypt, safeEqual } from "@/lib/crypto";
import { createSession, currentUser, audit } from "@/lib/auth";
import { safeNext } from "@/lib/validation";
import { rateLimit } from "@/lib/ratelimit";
import { fromHeaders } from "@/lib/request";
import { guardApi } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

interface GoogleUser { sub?: string; email?: string; email_verified?: boolean; name?: string }

export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const brand = await getBrand();
  const url = new URL(req.url);
  const cookies = Object.fromEntries((req.headers.get("cookie") ?? "").split(/;\s*/).map((c) => c.split("=") as [string, string]));
  const linking = cookies.g_link === "1";
  const clear = (r: NextResponse) => {
    for (const n of ["g_state", "g_next", "g_link"]) r.cookies.delete({ name: n, path: "/api/auth/google" });
    return r;
  };
  const bad = (code: string) => clear(NextResponse.redirect(linking ? `${brand.appUrl}/dashboard/account?google=${code}` : `${brand.appUrl}/login?error=${code}`));
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (!code || !cookies.g_state || !safeEqual(state, cookies.g_state)) return bad("google");

  const ip = fromHeaders(req.headers).ip;
  if (!(await rateLimit(`google:${ip}`, 20, 600))) return bad("google");

  const clientId = await getSetting("google_client_id");
  const enc = await getSetting("google_client_secret");
  if (!clientId || !enc) return bad("google");

  let profile: GoogleUser;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: decrypt(enc), redirect_uri: `${brand.appUrl}/api/auth/google/callback`, grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenRes.ok) return bad("google");
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return bad("google");
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!info.ok) return bad("google");
    profile = (await info.json()) as GoogleUser;
  } catch {
    return bad("google");
  }
  const email = (profile.email ?? "").toLowerCase();
  if (!profile.sub || !email || !profile.email_verified) return bad("google");

  // Manual linking: connecting Google to an existing account happens only from the signed-in Account page.
  if (linking) {
    const me = await currentUser();
    if (!me) return bad("google");
    if (me.email.toLowerCase() !== email) return bad("mismatch");
    const used = await queryOne<{ id: number }>("SELECT id FROM users WHERE google_id = ? AND id <> ?", [profile.sub, me.id]);
    if (used) return bad("taken");
    await exec("UPDATE users SET google_id = ?, email_verified_at = COALESCE(email_verified_at, UTC_TIMESTAMP()) WHERE id = ?", [profile.sub, me.id]);
    await audit(me.id, "user.google_link");
    return clear(NextResponse.redirect(`${brand.appUrl}/dashboard/account?google=linked`));
  }

  let user = await queryOne<{ id: number; status: string }>("SELECT id, status FROM users WHERE google_id = ?", [profile.sub]);
  if (!user) {
    const byEmail = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ?", [email]);
    if (byEmail) {
      // One email is one account. It is not merged silently: sign in with the password, then connect Google in Account.
      return bad("exists");
    } else {
      const reg = await getSetting("registration_enabled");
      if (reg === "0") return bad("closed");
      if (await emailDomainError(email)) return bad("domain");
      const res = await exec(
        "INSERT INTO users (email, username, google_id, role, email_verified_at) VALUES (?, NULL, ?, 'user', UTC_TIMESTAMP())",
        [email, profile.sub],
      );
      user = { id: res.insertId, status: "active" };
    }
  }
  if (user.status !== "active") return bad("suspended");
  await exec("UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?", [user.id]);
  await createSession(user.id);
  return clear(NextResponse.redirect(`${brand.appUrl}${safeNext(cookies.g_next ? decodeURIComponent(cookies.g_next) : null)}`));
}
