import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { currentUser } from "@/lib/auth";

/** Chrome for marketing-free public pages: home, legal, report. */
export async function SiteShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const b = await getBrand();
  const user = await currentUser();
  return (
    <div className="site">
      <header className="site-head">
        <Link href="/" className="brand">{b.logoUrl ? <img src={b.logoUrl} alt={b.name} height={28} /> : b.name}</Link>
        <nav className="site-links" aria-label="Explore">
          <Link href="/link-in-bio">Link in bio</Link>
          <Link href="/tools">Tools</Link>
          <Link href="/learn">Guides</Link>
          <Link href="/docs">API</Link>
        </nav>
        <nav aria-label="Account">
          {user ? (
            <Link className="btn btn-primary" href="/dashboard">Dashboard</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" href="/login">Sign in</Link>
              <Link className="btn btn-primary" href="/register">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main id="main" className={wide ? "site-main wide" : "site-main"}>{children}</main>
      <footer className="site-foot">
        <span>{b.footerText || `${b.name}`}</span>
        <nav aria-label="Explore more">
          <Link href="/link-in-bio">Link in bio templates</Link>
          <Link href="/tools/qr-code-generator">QR code generator</Link>
          <Link href="/tools/utm-builder">UTM builder</Link>
          <Link href="/learn">Guides</Link>
        </nav>
        <nav aria-label="Legal">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/report">Report abuse</Link>
          <Link href="/docs">API</Link>
        </nav>
      </footer>
    </div>
  );
}

/** Renders the simple legal markup: lines starting with "# " are headings, blank lines separate paragraphs. */
export function LegalText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return (
    <>
      {blocks.map((blk, i) => {
        if (blk.startsWith("# ")) return <h2 key={i}>{blk.slice(2)}</h2>;
        return <p key={i}>{blk}</p>;
      })}
    </>
  );
}
