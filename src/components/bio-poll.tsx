"use client";

import { useEffect, useState, useTransition } from "react";
import { pollResultsAction, voteAction, type PollState } from "@/app/actions/public";

const key = (id: number) => `poll-voted-${id}`;

/** A poll on a bio page: pick an option to vote, then see the shares. Remembers in this browser that you voted. */
export function BioPoll({ id, title, options }: { id: number; title: string; options: string[] }) {
  const [res, setRes] = useState<PollState | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    let voted = false;
    try { voted = !!localStorage.getItem(key(id)); } catch { /* storage blocked */ }
    if (voted) start(async () => { const r = await pollResultsAction(id); if (r.ok) setRes(r); });
  }, [id]);
  const vote = (i: number) => start(async () => {
    const r = await voteAction(id, i);
    if (!r.ok) { setErr(r.error); return; }
    setErr(""); setRes(r);
    try { localStorage.setItem(key(id), "1"); } catch { /* storage blocked */ }
  });
  const show = () => start(async () => { const r = await pollResultsAction(id); if (r.ok) setRes(r); else setErr(r.error); });
  return (
    <section className="bio-poll" aria-label={title}>
      <p className="bio-poll-q">{title}</p>
      {res && res.ok ? (
        <>
          <ul className="bio-poll-results">
            {res.options.map((o) => (
              <li key={o.label}>
                <div className="bio-poll-row"><span>{o.label}</span><span>{o.percent}%</span></div>
                <div className="bio-poll-bar" role="img" aria-label={`${o.label}: ${o.percent} percent, ${o.votes} votes`}><i style={{ width: `${o.percent}%` }} /></div>
              </li>
            ))}
          </ul>
          <p className="bio-poll-note">{res.total} vote{res.total === 1 ? "" : "s"}{res.voted ? ". You have already voted." : ""}</p>
        </>
      ) : (
        <>
          <div className="bio-poll-opts">
            {options.map((o, i) => <button key={o} type="button" className="bio-btn" disabled={pending} onClick={() => vote(i)}><span>{o}</span></button>)}
          </div>
          <button type="button" className="bio-poll-link" disabled={pending} onClick={show}>See results</button>
        </>
      )}
      {err && <p className="bio-poll-note" role="alert">{err}</p>}
    </section>
  );
}
