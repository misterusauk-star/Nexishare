import { NextResponse, type NextRequest } from "next/server";
import { looksLikeProbe } from "./lib/waf";

/**
 * The edge runtime cannot reach MySQL, so the host check itself lives in src/lib/host-guard.ts (Node).
 * All this does is hand the request path to server components under a header the client cannot forge, and turn away
 * obvious scanner probes (SQL injection, script and path-traversal payloads in the URL) before they reach a page.
 * Database access is prepared statements only, so this is a second layer, not the first.
 */
export function middleware(req: NextRequest) {
  if ((req.method === "GET" || req.method === "HEAD") && looksLikeProbe(req.nextUrl.pathname, req.nextUrl.search)) {
    return new NextResponse("Bad request", { status: 400, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
  const h = new Headers(req.headers);
  h.set("x-ob-path", req.nextUrl.pathname);
  h.set("x-ob-search", req.nextUrl.search);
  return NextResponse.next({ request: { headers: h } });
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
