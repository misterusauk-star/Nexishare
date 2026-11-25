import "../editor.css";
import Link from "next/link";
import { ensureInstalled } from "@/lib/install";
import { requireUser } from "@/lib/auth";
import { getBrand } from "@/lib/brand";
import { bioUrl, getDomainState } from "@/lib/domains";
import { getT } from "@/lib/i18n";
import { NavLinks, type NavItem } from "@/components/nav";
import { NavToggle, ThemeToggle } from "@/components/client";
import { HelpLink } from "@/components/help-link";
import { logoutAction } from "@/app/actions/auth";
import { phase2Enabled } from "@/lib/features";
import { verificationRequired } from "@/lib/services/users";
import { emailAvailable } from "@/lib/email/mailer";
import { ResendButton } from "@/app/(auth)/verify/resend";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await ensureInstalled();
  const user = await requireUser();
  const [b, t, st] = [await getBrand(), await getT(), await getDomainState()];
  const p2 = phase2Enabled();
  const nav: NavItem[] = [
    { href: "/dashboard", label: t("nav.overview"), icon: "overview", exact: true },
    { href: "/dashboard/links", label: t("nav.links"), icon: "links" },
    { href: "/dashboard/universal", label: "Universal links", icon: "universal" },
    { href: "/dashboard/page", label: t("nav.page"), icon: "page" },
    { href: "/dashboard/analytics", label: t("nav.analytics"), icon: "analytics" },
    { href: "/dashboard/qr", label: t("nav.qr"), icon: "qr" },
  ];
  const more: NavItem[] = [];
  if (p2) {
    more.push({ href: "/dashboard/contacts", label: "Messages", icon: "contacts" }, { href: "/dashboard/subscribers", label: "Subscribers", icon: "subscribers" }, { href: "/dashboard/teams", label: "Teams", icon: "teams" }, { href: "/dashboard/goals", label: "Goals", icon: "goals" });
  }
  more.push({ href: "/dashboard/api", label: t("nav.api"), icon: "api" }, { href: "/docs", label: t("nav.docs"), icon: "docs" }, { href: "/dashboard/account", label: t("nav.settings"), icon: "settings" });
  const gated = (await verificationRequired()) && !user.email_verified_at && (await emailAvailable("verification"));
  return (
    <div className="shell">
      <a className="skip" href="#main">Skip to content</a>
      <aside className="side" id="side">
        <Link href="/dashboard" className="brand">{b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : b.name}</Link>
        <nav className="nav" aria-label="Main">
          <NavLinks items={nav} />
          <div className="group">More</div>
          <NavLinks items={more} />
          {user.role === "super_admin" && (
            <>
              <div className="group">Administration</div>
              <NavLinks items={[{ href: "/admin", label: t("nav.admin"), icon: "admin" }]} />
            </>
          )}
        </nav>
        <div className="side-foot stack-sm">
          <div className="row" style={{ justifyContent: "space-between" }}>
            {user.username ? <a href={bioUrl(st, user.username)} className="small mono" target="_blank" rel="noopener">/{user.username}</a> : <Link href="/dashboard/page" className="small">Create bio page</Link>}
            <ThemeToggle />
          </div>
          <HelpLink className="btn btn-sm btn-ghost" />
          <form action={logoutAction}><button className="btn btn-sm" style={{ width: "100%" }}>{t("nav.signout")}</button></form>
        </div>
      </aside>
      <div className="shell-col">
        <div className="topbar"><NavToggle /><span className="brand" style={{ padding: 0 }}>{b.name}</span><span style={{ marginLeft: "auto" }}><HelpLink className="btn btn-ghost btn-sm" /></span></div>
        <main id="main" className="main">
          {gated ? (
            <div className="empty">
              <h3>Confirm your email to continue</h3>
              <p>We sent a link to {user.email}. Open it and you can start building. Nothing is lost while you wait.</p>
              <ResendButton />
            </div>
          ) : children}
        </main>
        <footer className="app-foot">
          <span>{b.footerText || b.name}</span>
          <nav aria-label="Footer">
            <Link href="/docs">API docs</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/report">Report abuse</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
