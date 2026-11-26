import { NextResponse } from "next/server";
import { getBrand } from "@/lib/brand";
import { getSetting } from "@/lib/settings";
import { randomToken } from "@/lib/crypto";
import { safeNext } from "@/lib/validation";
import { guardApi } from "@/lib/host-guard";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Starts Google sign-in. Only works when the owner has saved a client ID in the admin settings. */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; } // domain rules: API only on the main and API domains
  const clientId = await getSetting("google_client_id");
  const brand = await getBrand();
  if (!clientId) return NextResponse.redirect(`${brand.appUrl}/login`);
  const state = randomToken(24);
  const q = new URL(req.url).searchParams;
  const next = safeNext(q.get("next"));
  // link=1 connects Google to the signed-in account. It never creates or merges accounts by itself.
  const linking = q.get("link") === "1";
  if (linking && !(await currentUser())) return NextResponse.redirect(`${brand.appUrl}/login`);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${brand.appUrl}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const res = NextResponse.redirect(url);
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: brand.appUrl.startsWith("https://"), path: "/api/auth/google", maxAge: 600 };
  res.cookies.set("g_state", state, opts);
  res.cookies.set("g_next", next, opts);
  if (linking) res.cookies.set("g_link", "1", opts);
  return res;
}
