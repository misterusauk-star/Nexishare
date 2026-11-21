import type { MetadataRoute } from "next";
import { getBrand } from "@/lib/brand";
import { currentHost } from "@/lib/host-guard";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const b = await getBrand();
  // Each domain points crawlers at its own sitemap (the main domain lists site pages, the bio host lists bio pages).
  const host = await currentHost();
  const origin = `${b.appUrl.startsWith("http://") ? "http" : "https"}://${host || new URL(b.appUrl).host}`;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/api/", "/install", "/out/", "/login", "/register"] }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
