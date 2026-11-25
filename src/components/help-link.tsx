"use client";

import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";

// Which part of the docs explains each dashboard page. Anything not listed opens the docs home.
const TOPICS: [string, string][] = [
  ["/dashboard/links/import", "#more-links"],
  ["/dashboard/links", "#fields"],
  ["/dashboard/universal", "#universal"],
  ["/dashboard/subscribers", "#subscribers"],
  ["/dashboard/qr", "#keys-qr-export"],
  ["/dashboard/api", "#auth"],
  ["/dashboard/analytics", "#filters"],
  ["/admin/search", "#search"],
];

export function helpHref(path: string): string {
  const hit = TOPICS.find(([p]) => path === p || path.startsWith(p + "/"));
  return `/docs${hit ? hit[1] : ""}`;
}

/** "Help" link that opens the docs at the part that matches the page you are on. */
export function HelpLink({ className = "btn btn-sm btn-ghost" }: { className?: string }) {
  const path = usePathname() ?? "";
  return (
    <a className={className} href={helpHref(path)} target="_blank" rel="noopener" aria-label="Help for this page (opens the docs in a new tab)">
      <CircleHelp className="icon" />Help
    </a>
  );
}
