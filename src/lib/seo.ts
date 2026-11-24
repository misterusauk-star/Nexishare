import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { clip } from "@/lib/seo-pages.ts";

/** Metadata for a marketing page: canonical address on the main domain, Open Graph and Twitter text. */
export async function pageMeta(o: { title: string; description: string; path: string; type?: "website" | "article" }): Promise<Metadata> {
  const b = await getBrand();
  const url = `${b.appUrl}${o.path}`;
  const description = clip(o.description, 160);
  return {
    title: o.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: o.title, description, url, siteName: b.name, type: o.type ?? "website" },
    twitter: { card: "summary", title: o.title, description },
  };
}
