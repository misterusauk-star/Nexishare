// Structured data for a public bio page: a ProfilePage about one person or business, with their social profiles as `sameAs`.
// Pure, so it can be tested. Only real web addresses are listed (an email address or a handle is skipped).

export interface ProfileInput { url: string; name: string; bio?: string | null; image?: string | null; socials?: Partial<Record<string, string>> | null }

export function profileLd(p: ProfileInput): Record<string, unknown> {
  const sameAs = Object.values(p.socials ?? {})
    .map((v) => String(v ?? "").trim())
    .filter((v) => /^https?:\/\/[^\s]+$/i.test(v))
    .slice(0, 20);
  const about: Record<string, unknown> = { "@type": "Person", name: p.name, url: p.url };
  if (p.bio) about.description = p.bio;
  if (p.image && /^https?:\/\//i.test(p.image)) about.image = p.image;
  if (sameAs.length) about.sameAs = sameAs;
  return { "@context": "https://schema.org", "@type": "ProfilePage", url: p.url, name: p.name, mainEntity: about };
}
