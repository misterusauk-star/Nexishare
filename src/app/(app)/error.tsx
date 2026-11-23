"use client";

import Link from "next/link";

// Keeps the sidebar visible: only the content area shows the problem.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty" role="alert">
      <h3>This page could not be loaded</h3>
      <p>Trying again often fixes it. If it keeps happening, the database may need its updates: an administrator can press Run database updates in Admin &gt; Domains.{error.digest ? ` Reference: ${error.digest}.` : ""}</p>
      <div className="row"><button className="btn btn-primary" onClick={reset}>Try again</button><Link className="btn" href="/dashboard">Go to Overview</Link></div>
    </div>
  );
}
