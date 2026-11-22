import { currentHost } from "@/lib/host-guard";
import { indexNowHosts, indexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/**
 * Serves https://<host>/<key>.txt (next.config.mjs rewrites /<key>.txt here). The file proves we own the host:
 * it answers only on the main and bio domains, only for the real key, and with the key as plain text.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const host = await currentHost();
  const [hosts, mine] = await Promise.all([indexNowHosts(), indexNowKey()]);
  if (!hosts.includes(host) || key !== mine) return new Response("Not found", { status: 404 });
  return new Response(mine, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
