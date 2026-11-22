import { getBrand } from "@/lib/brand";
import { getDomainState } from "@/lib/domains";
import { BOT_GROUPS } from "@/lib/crawlers";
import { indexNowEnabled, indexNowHosts, indexNowKey } from "@/lib/indexnow";
import { keyFileUrl } from "@/lib/indexnow-rules";
import { ActionForm, CopyButton } from "@/components/client";
import { saveIndexNowAction, submitAllAction } from "@/app/actions/search";

export const metadata = { title: "Search engines" };
export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const b = await getBrand();
  const st = await getDomainState();
  const [on, key, hosts] = [await indexNowEnabled(), await indexNowKey(), await indexNowHosts()];
  const sitemaps = [...new Set([b.appUrl, `https://${st.bioHost}`])].map((o) => `${o}/sitemap.xml`);
  return (
    <>
      <div className="page-head"><div><h1>Search engines</h1><p>How Google, Bing, DuckDuckGo and other crawlers find your public pages: the sitemap, robots.txt, and IndexNow for instant updates.</p></div></div>

      <div className="cols" style={{ alignItems: "start" }}>
        <section>
          <h2 className="section-h">Sitemaps to submit</h2>
          <p className="small muted">Add each address once in Google Search Console and Bing Webmaster Tools. Each domain is its own property there. DuckDuckGo uses Bing, so Bing covers it.</p>
          <ul className="dom-list">
            {sitemaps.map((u) => (
              <li key={u} className="dom"><div className="dom-head"><span className="slug dom-host">{u}</span><CopyButton value={u} /></div></li>
            ))}
          </ul>

          <h2 className="section-h" style={{ marginTop: 32 }}>IndexNow</h2>
          <p className="small muted">When a bio page is published or changed, Bing, Yandex, Seznam and Naver are told straight away instead of waiting for the next crawl. It is limited to once per page every 10 minutes.</p>
          <ActionForm action={saveIndexNowAction} submit="Save" pendingLabel="Saving...">
            <label className="check"><input type="checkbox" name="enabled" defaultChecked={on} /> Tell search engines about new and changed pages</label>
          </ActionForm>
          <h3 className="section-h" style={{ marginTop: 24 }}>Key files</h3>
          <p className="small muted">Search engines open these addresses to check that you own the domain. Each must show the key.</p>
          <ul className="dom-list">
            {hosts.map((h) => {
              const u = keyFileUrl(h, key);
              return (
                <li key={h} className="dom">
                  <div className="dom-head"><a className="slug dom-host" href={u} target="_blank" rel="noreferrer">{u}</a><CopyButton value={u} /></div>
                </li>
              );
            })}
          </ul>
          <h3 className="section-h" style={{ marginTop: 24 }}>Send everything now</h3>
          <p className="small muted">Sends the site pages and every published bio page. Use it once after setup or after moving to a new domain.</p>
          <ActionForm action={submitAllAction} submit="Submit all pages" pendingLabel="Sending..." submitClass="btn">{null}</ActionForm>
        </section>

        <section>
          <h2 className="section-h">Crawlers allowed</h2>
          <p className="small muted">robots.txt names each of these with an explicit Allow for public pages. The dashboard, admin, API and sign-in pages stay closed to everyone. Short link domains are redirects and are not indexed.</p>
          {BOT_GROUPS.map((g) => (
            <div key={g.id} style={{ marginBottom: 20 }}>
              <h3 className="section-h">{g.label}</h3>
              <ul className="chips" style={{ marginTop: 8 }}>
                {g.bots.map((x) => <li key={x} className="chip" style={{ paddingRight: 8 }}>{x}</li>)}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
