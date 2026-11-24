import Link from "next/link";

export function Breadcrumbs({ trail }: { trail: { name: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <ol>
        {trail.map((t, i) => (
          <li key={t.name}>{t.href && i < trail.length - 1 ? <Link href={t.href}>{t.name}</Link> : <span aria-current={i === trail.length - 1 ? "page" : undefined}>{t.name}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}
