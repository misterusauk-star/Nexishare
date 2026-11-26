import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { getDomainState } from "@/lib/domains";
import { CopyButton } from "@/components/client";
import { API_ENDPOINTS, API_GROUPS } from "@/lib/api-index.ts";

export const metadata: Metadata = { title: "API reference" };

function Endpoint({ id, method, path, children }: { id: string; method: "get" | "post" | "patch" | "delete"; path: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2><span className={`method ${method}`}>{method.toUpperCase()}</span><code>{path}</code></h2>
      {children}
    </section>
  );
}


function Code({ children }: { children?: React.ReactNode }) {
  const text = Array.isArray(children) ? children.join("") : String(children ?? "");
  return (
    <div className="codebox">
      <pre className="code">{text}</pre>
      <CopyButton value={text} label="Copy" className="btn btn-sm btn-ghost copy-code" />
    </div>
  );
}

function Field({ name, type, req, children }: { name: string; type: string; req?: boolean; children: React.ReactNode }) {
  return (
    <tr>
      <td><code>{name}</code></td>
      <td>{type}</td>
      <td>{req ? "Required" : "Optional"}</td>
      <td>{children}</td>
    </tr>
  );
}

function Langs({ samples }: { samples: { label: string; code: string }[] }) {
  return (
    <div className="lang-samples">
      {samples.map((s, i) => (
        <details key={s.label} open={i === 0}>
          <summary>{s.label}</summary>
          <Code>{s.code}</Code>
        </details>
      ))}
    </div>
  );
}

function createSamples(base: string) {
  const body = `{ target_url: "https://example.com/launch-day", slug: "launch", expires_at: "2026-12-31T23:59:00Z" }`;
  return [
    {
      label: "JavaScript (Node 18+ / browser)",
      code: `const res = await fetch("${base}/links", {
  method: "POST",
  headers: {
    Authorization: "Bearer ob_your_key",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${body}),
});
const json = await res.json();
if (!res.ok) throw new Error(JSON.stringify(json.error));
console.log(json.data.short_url);`,
    },
    {
      label: "Python (requests)",
      code: `import requests

res = requests.post(
    "${base}/links",
    headers={"Authorization": "Bearer ob_your_key"},
    json={
        "target_url": "https://example.com/launch-day",
        "slug": "launch",
        "expires_at": "2026-12-31T23:59:00Z",
    },
    timeout=15,
)
data = res.json()
if not res.ok:
    raise RuntimeError(data["error"])
print(data["data"]["short_url"])`,
    },
    {
      label: "PHP (cURL)",
      code: `<?php
$ch = curl_init("${base}/links");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer ob_your_key",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "target_url" => "https://example.com/launch-day",
        "slug" => "launch",
        "expires_at" => "2026-12-31T23:59:00Z",
    ]),
]);
$out = json_decode(curl_exec($ch), true);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($status >= 400) { throw new Exception(json_encode($out["error"])); }
echo $out["data"]["short_url"];`,
    },
    {
      label: "Go (net/http)",
      code: `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

func main() {
	payload, _ := json.Marshal(map[string]any{
		"target_url": "https://example.com/launch-day",
		"slug":       "launch",
		"expires_at": "2026-12-31T23:59:00Z",
	})
	req, _ := http.NewRequest("POST", "${base}/links", bytes.NewReader(payload))
	req.Header.Set("Authorization", "Bearer ob_your_key")
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	fmt.Println(res.StatusCode, out)
}`,
    },
    {
      label: "Ruby (net/http)",
      code: `require "net/http"
require "json"

uri = URI("${base}/links")
req = Net::HTTP::Post.new(uri, "Authorization" => "Bearer ob_your_key", "Content-Type" => "application/json")
req.body = { target_url: "https://example.com/launch-day", slug: "launch", expires_at: "2026-12-31T23:59:00Z" }.to_json
res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
puts JSON.parse(res.body)`,
    },
  ];
}

function listSamples(base: string) {
  return [
    {
      label: "JavaScript",
      code: `const res = await fetch("${base}/links?q=launch&limit=10", {
  headers: { Authorization: "Bearer ob_your_key" },
});
const { data, meta } = await res.json();
console.log(meta.total, data.map((l) => l.short_url));`,
    },
    {
      label: "Python",
      code: `import requests

r = requests.get("${base}/links", params={"q": "launch", "limit": 10},
                 headers={"Authorization": "Bearer ob_your_key"}, timeout=15)
for link in r.json()["data"]:
    print(link["slug"], link["short_url"])`,
    },
    {
      label: "PHP",
      code: `<?php
$ch = curl_init("${base}/links?q=launch&limit=10");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer ob_your_key"],
]);
$res = json_decode(curl_exec($ch), true);
foreach ($res["data"] as $l) { echo $l["slug"] . " " . $l["short_url"] . "\\n"; }`,
    },
    {
      label: "Go",
      code: `req, _ := http.NewRequest("GET", "${base}/links?q=launch&limit=10", nil)
req.Header.Set("Authorization", "Bearer ob_your_key")
res, _ := http.DefaultClient.Do(req)
defer res.Body.Close()
var out struct {
	Data []struct {
		Slug     string \`json:"slug"\`
		ShortURL string \`json:"short_url"\`
	} \`json:"data"\`
}
json.NewDecoder(res.Body).Decode(&out)`,
    },
  ];
}

function updateSamples(base: string) {
  return [
    {
      label: "JavaScript",
      code: `// Clear the expiry and pause the link. Fields you leave out stay as they are.
await fetch("${base}/links/12", {
  method: "PATCH",
  headers: { Authorization: "Bearer ob_your_key", "Content-Type": "application/json" },
  body: JSON.stringify({ expires_at: null, enabled: false }),
});`,
    },
    {
      label: "Python",
      code: `import requests

requests.patch("${base}/links/12",
               headers={"Authorization": "Bearer ob_your_key"},
               json={"expires_at": None, "enabled": False}, timeout=15)`,
    },
    {
      label: "PHP",
      code: `<?php
$ch = curl_init("${base}/links/12");
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => "PATCH",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer ob_your_key", "Content-Type: application/json"],
    CURLOPT_POSTFIELDS => json_encode(["expires_at" => null, "enabled" => false]),
]);
curl_exec($ch);`,
    },
    {
      label: "Go",
      code: `body := bytes.NewReader([]byte(\`{"expires_at":null,"enabled":false}\`))
req, _ := http.NewRequest("PATCH", "${base}/links/12", body)
req.Header.Set("Authorization", "Bearer ob_your_key")
req.Header.Set("Content-Type", "application/json")
http.DefaultClient.Do(req)`,
    },
  ];
}

export default async function Docs() {
  const b = await getBrand();
  const apiOrigin = (await getDomainState()).apiUrl; // the API domain once one is active, otherwise the main domain
  const base = `${apiOrigin}/api/v1`;
  return (
    <SiteShell wide>
      <div className="docs">
        <nav aria-label="API sections">
          <span className="nav-group">Start</span>
          <a href="#quickstart">Quickstart</a>
          <a href="#endpoints">All endpoints</a>
          <a href="#conventions">How it works</a>
          <a href="#auth">Authentication</a>
          <a href="#errors">Errors and limits</a>
          <a href="#link-object">The link object</a>
          <span className="nav-group">Links</span>
          <a href="#create">Create a link</a>
          <a href="#get">Get a link</a>
          <a href="#update">Update a link</a>
          <a href="#delete">Delete a link</a>
          <a href="#list">List links</a>
          <a href="#fields">Link fields</a>
          <a href="#bulk">Bulk create</a>
          <a href="#more-links">Duplicate and bulk</a>
          <span className="nav-group">Link features</span>
          <a href="#schedule">Scheduling</a>
          <a href="#geo">Country routes</a>
          <a href="#health">Destination health</a>
          <a href="#devices">Device destinations</a>
          <a href="#universal">Universal links</a>
          <a href="#limit">Click limit</a>
          <a href="#filters">Tags and filters</a>
          <a href="#recipes">Recipes</a>
          <span className="nav-group">Stats</span>
          <a href="#link-stats">Link stats</a>
          <a href="#stats">Account stats</a>
          <span className="nav-group">Bio page</span>
          <a href="#page">Bio page</a>
          <a href="#blocks">Bio page blocks</a>
          <a href="#subscribers">Signups, polls, copies</a>
          <a href="#templates">Templates and icons</a>
          <span className="nav-group">Account and extras</span>
          <a href="#notifications">Report and alerts</a>
          <a href="#domains">Domains</a>
          <a href="#keys-qr-export">Keys, QR and export</a>
          <a href="#search">Search engines</a>
        </nav>
        <div>
          <h1>API reference</h1>
          <p>Create, change and measure short links, and set up your bio page, from your own code. Everything is JSON over HTTPS. Base URL: <code>{base}</code></p>
          <p className="small muted">New here? Start with the <a href="#quickstart">quickstart</a>, then the <a href="#recipes">recipes</a>. Every example has a Copy button.</p>
          <section id="quickstart">
            <h2>Quickstart</h2>
            <p>Make your first short link with the API in three steps.</p>
            <ol>
              <li>Open <em>API keys</em> in your dashboard, press <em>Create key</em> and copy it. It is shown once. It starts with <code>ob_</code>.</li>
              <li>Send it as a bearer token. This creates a link:</li>
            </ol>
            <Code>{`export KEY=ob_your_key

curl -X POST ${base}/links \\
  -H "Authorization: Bearer $KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/spring-sale", "slug": "spring", "title": "Spring sale" }'`}</Code>
            <ol start={3}>
              <li>Read <code>data.short_url</code> in the answer. That is the address to share.</li>
            </ol>
            <Code>{`{ "data": { "id": 31, "slug": "spring", "short_url": "${b.url}/spring", "target_url": "https://example.com/spring-sale", "status": "active", ... } }`}</Code>
            <p>Next: <a href="#link-object">the link object</a>, <a href="#recipes">recipes for common jobs</a> and <a href="#errors">errors and limits</a>.</p>
          </section>

          <section id="endpoints">
            <h2>All endpoints</h2>
            <p>Every endpoint on one page. Press a path to jump to its details. The same list as JSON: <code>GET {base}</code> (no key needed).</p>
            {API_GROUPS.map((g) => (
              <div key={g}>
                <h3>{g}</h3>
                <div className="table-wrap">
                  <table className="table ep-table">
                    <tbody>
                      {API_ENDPOINTS.filter((e) => e.group === g).map((e) => (
                        <tr key={`${e.method} ${e.path}`}>
                          <td className="ep-m"><span className={`method ${e.method.toLowerCase()}`}>{e.method}</span></td>
                          <td className="ep-p"><a href={`#${e.doc}`}><code>{e.path}</code></a></td>
                          <td>{e.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          <section id="conventions">
            <h2>How it works</h2>
            <p>The same few rules apply everywhere, so once you know one endpoint you know them all.</p>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  <tr><th scope="row">Base URL</th><td><code>{base}</code></td></tr>
                  <tr><th scope="row">Format</th><td>JSON in, JSON out. Send <code>Content-Type: application/json</code> with a body. Success: <code>{"{ \"data\": ... }"}</code>. Failure: <code>{"{ \"error\": { \"message\": ... } }"}</code>.</td></tr>
                  <tr><th scope="row">Sign in</th><td><code>Authorization: Bearer ob_your_key</code>. A read-only key can only use <code>GET</code>; anything else answers 403.</td></tr>
                  <tr><th scope="row">Lists</th><td><code>limit</code> and <code>page</code>; the answer has <code>meta</code> with <code>total</code>, <code>page</code> and <code>limit</code>.</td></tr>
                  <tr><th scope="row">Times</th><td>ISO 8601 in UTC, for example <code>2026-12-01T09:30:00.000Z</code>.</td></tr>
                  <tr><th scope="row">Changing things</th><td><code>PATCH</code> changes only the fields you send. Send <code>null</code> (or <code>""</code> for text) to clear a field.</td></tr>
                  <tr><th scope="row">Mistakes</th><td><code>422</code> with <code>fields</code> naming what to fix, <code>404</code> for something that is not yours, <code>429</code> when you go over a limit. See <a href="#errors">errors and limits</a>.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="auth">
            <h2>Authentication</h2>
            <p>Create a key under <em>API keys</em> in your dashboard and send it as a bearer token. Keys start with <code>ob_</code>. Revoking a key cuts it off at once.</p>
            <Code>{`curl ${base}/links \\
  -H "Authorization: Bearer ob_your_key"`}</Code>
          </section>

          <section id="errors">
            <h2>Errors and limits</h2>
            <p>Failures return a non-2xx status and a body shaped like this:</p>
            <Code>{`{ "error": { "message": "Validation failed.", "fields": { "slug": "That short name is already taken." } } }`}</Code>
            <p>Usage is limited, and the defaults are low on purpose: <strong>20 requests per minute per key</strong> and <strong>1,000 requests per day per account</strong>, <strong>100 links in total</strong> per account, and <strong>3 active keys</strong>. Past a request limit you get <code>429</code> with a <code>Retry-After</code> header and a body that names the limit (<code>limit</code> and <code>window</code>: <code>minute</code> or <code>day</code>). Only the server administrator can raise these, for everyone or for one account. Your API keys page shows the limits that apply to you, and a request that would pass your link limit returns <code>422</code> with a clear message.</p>
            <p>Abuse protection: an account can create up to 500 links per day (50 until its email is confirmed), and repeated wrong keys from one address are blocked for ten minutes. Links with look-alike names or unsafe destinations are held for review or refused.</p>
            <p>Sign-up is limited to the email providers the administrator allows (Gmail and Outlook by default, plus any domains they add), and sign-in, sign-up and password reset can show a Cloudflare Turnstile check. Neither affects API calls.</p>
            <h3>Status codes</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Code</th><th>Meaning</th><th>What to do</th></tr></thead>
                <tbody>
                  <tr><td><code>200</code>, <code>201</code>, <code>204</code></td><td>Done. <code>201</code> after a create, <code>204</code> (no body) after a delete.</td><td></td></tr>
                  <tr><td><code>400</code></td><td>The body is not a JSON object.</td><td>Send <code>Content-Type: application/json</code> and an object.</td></tr>
                  <tr><td><code>401</code></td><td>No key, or the key is wrong or revoked.</td><td>Send <code>Authorization: Bearer ob_...</code>. Create a new key if needed.</td></tr>
                  <tr><td><code>403</code></td><td>A read-only key tried to change something.</td><td>Use a normal key for writes.</td></tr>
                  <tr><td><code>404</code></td><td>That link does not exist or is not yours.</td><td>Check the id.</td></tr>
                  <tr><td><code>422</code></td><td>A field is not valid. <code>error.fields</code> says which one and why.</td><td>Fix the named field and send again.</td></tr>
                  <tr><td><code>429</code></td><td>A limit was reached. <code>error.window</code> is <code>minute</code> or <code>day</code>.</td><td>Wait for the <code>Retry-After</code> seconds.</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="link-object">
            <h2>The link object</h2>
            <p>Every endpoint that returns a link returns this shape, inside <code>data</code> (a single link) or as a list in <code>data</code> with a <code>meta</code> block for paging.</p>
            <Code>{`{
  "id": 31,
  "slug": "spring",
  "short_url": "${b.url}/spring",
  "domain": "${b.host}",
  "domain_id": null,
  "target_url": "https://example.com/spring-sale",
  "tags": ["sale", "spring"],
  "universal": false,
  "ios_url": null,
  "android_url": null,
  "windows_url": null,
  "mac_url": null,
  "linux_url": null,
  "expired_url": "https://example.com/sale-over",
  "title": "Spring sale",
  "password_protected": false,
  "enabled": true,
  "max_clicks": 100,
  "click_count": 37,
  "status": "active",
  "starts_at": null,
  "expires_at": "2026-04-30T23:59:00.000Z",
  "created_at": "2026-04-01T09:14:00.000Z"
}`}</Code>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><code>short_url</code></td><td>The address to share. Built from the link's domain, so it is always right even if you move the link.</td></tr>
                  <tr><td><code>domain</code>, <code>domain_id</code></td><td>Which of your domains the link lives on. <code>domain_id</code> is <code>null</code> on the default domain.</td></tr>
                  <tr><td><code>status</code></td><td><code>active</code>, <code>scheduled</code> (not live yet), <code>expired</code> (date passed or click limit used up), <code>disabled</code>, <code>review</code> (held for a check) or <code>moderated</code> (taken offline by an administrator).</td></tr>
                  <tr><td><code>starts_at</code>, <code>expires_at</code></td><td>UTC times in ISO 8601. <code>null</code> means live at once / never expires.</td></tr>
                  <tr><td><code>max_clicks</code>, <code>click_count</code></td><td>The click limit (<code>null</code> = unlimited) and how many of it is used. <code>click_count</code> is <code>null</code> when there is no limit.</td></tr>
                  <tr><td><code>universal</code></td><td><code>true</code> when the link has only device URLs and no destination of its own.</td></tr>
                  <tr><td><code>password_protected</code></td><td>Whether visitors must enter a password. The password itself is never returned.</td></tr>
                  <tr><td><code>tags</code></td><td>Up to 5 labels you use to group and filter links.</td></tr>
                  <tr><td><code>last_click_at</code></td><td>Time of the latest click, or <code>null</code> if it was never clicked. Only in <code>GET /links</code> and <code>GET /links/{"{id}"}</code>.</td></tr>
                </tbody>
              </table>
            </div>
            <p>A list response also has <code>meta</code>: <code>{"{ \"total\": 120, \"page\": 1, \"limit\": 25 }"}</code>. Pages start at 1 and <code>limit</code> is at most 100.</p>
          </section>

          <Endpoint id="create" method="post" path="/links">
            <p>The smallest valid request is just the destination:</p>
            <Code>{`curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/launch-day" }'`}</Code>
            <p>With a custom name and an expiry only (no <code>starts_at</code>):</p>
            <Code>{`curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://example.com/launch-day",
    "slug": "launch",
    "expires_at": "2026-12-31T23:59:00Z"
  }'`}</Code>
            <p>With every optional field:</p>
            <Code>{`curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://example.com/launch-day",
    "slug": "launch",
    "title": "Launch day",
    "password": "secret123",
    "starts_at": "2026-12-01T00:00:00Z",
    "expires_at": "2026-12-31T23:59:00Z",
    "enabled": true
  }'`}</Code>
            <p>Returns <code>201</code> with the link:</p>
            <Code>{`{
  "data": {
    "id": 12,
    "slug": "launch",
    "short_url": "${b.url}/launch",
    "domain": "${b.host}",
    "domain_id": null,
    "target_url": "https://example.com/launch-day",
    "title": null,
    "password_protected": false,
    "enabled": true,
    "starts_at": null,
    "expires_at": "2026-12-31T23:59:00.000Z",
    "created_at": "2026-11-20T09:14:00.000Z"
  }
}`}</Code>
            <p>A bad field returns <code>422</code>. The slug and destination errors are deliberately generic:</p>
            <Code>{`{ "error": { "message": "Validation failed.", "fields": { "slug": "This name is not available." } } }`}</Code>
            <h3>Examples in other languages</h3>
            <Langs samples={createSamples(base)} />
          </Endpoint>

          <Endpoint id="get" method="get" path="/links/{id}">
            <p>One link by numeric id. Returns <code>404</code> if it does not exist or is not yours.</p>
            <Code>{`curl ${base}/links/12 -H "Authorization: Bearer ob_your_key"`}</Code>
          </Endpoint>

          <Endpoint id="update" method="patch" path="/links/{id}">
            <p>Send only the fields to change. Set <code>password</code> to an empty string to remove protection, or <code>expires_at</code> to <code>null</code> to clear the expiry. <code>enabled: false</code> pauses the link.</p>
            <Code>{`# pause a link
curl -X PATCH ${base}/links/12 \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "enabled": false }'

# remove the expiry and the password
curl -X PATCH ${base}/links/12 \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "expires_at": null, "password": "" }'

# schedule it: live from 1 Dec, gone after 31 Dec
curl -X PATCH ${base}/links/12 \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "starts_at": "2026-12-01T00:00:00Z", "expires_at": "2026-12-31T23:59:00Z" }'`}</Code>
            <Langs samples={updateSamples(base)} />
          </Endpoint>

          <Endpoint id="delete" method="delete" path="/links/{id}">
            <p>Deletes the link and its click history. Returns <code>204</code>.</p>
            <Code>{`curl -X DELETE ${base}/links/12 -H "Authorization: Bearer ob_your_key"`}</Code>
          </Endpoint>

          <Endpoint id="list" method="get" path="/links">
            <p>Your links, newest first. Query: <code>q</code> (search), <code>status</code>, <code>tag</code>, <code>page</code>, <code>limit</code> (max 100).</p>
            <Code>{`curl "${base}/links?q=launch&limit=10" -H "Authorization: Bearer ob_your_key"`}</Code>
            <Code>{`{
  "data": [ { "id": 12, "slug": "launch", "short_url": "${b.url}/launch", "target_url": "https://example.com/launch-day", "status": "active", "tags": [], ... } ],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}`}</Code>
            <p>Each item is a <a href="#link-object">link object</a>. Filter with <code>q</code>, <code>status</code> and <code>tag</code> (see <a href="#filters">Tags and filters</a>).</p>
            <Langs samples={listSamples(base)} />
          </Endpoint>

          <section id="fields">
            <h2>Link fields</h2>
            <p>Used by <code>POST /links</code> and <code>PATCH /links/{"{id}"}</code>. On create only <code>target_url</code> is required. On update every field is optional and anything you leave out stays unchanged.</p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Field</th><th>Type</th><th></th><th>Notes</th></tr></thead>
                <tbody>
                  <Field name="target_url" type="string" req>Destination. Must be a public http(s) URL, up to 2048 characters. Required unless you give at least one device URL (see <a href="#universal">Universal links</a>).</Field>
                  <Field name="slug" type="string">3 to 32 characters: letters, numbers, <code>-</code> and <code>_</code>. Leave it out for a random one. Some names are reserved.</Field>
                  <Field name="title" type="string">Up to 160 characters. Only for your own reference.</Field>
                  <Field name="tags" type="string | string[]">Up to 5 labels, each up to 24 characters (letters, numbers, <code>-</code>, <code>_</code>). Send <code>"sale, summer"</code> or <code>["sale","summer"]</code>. Responses return an array. On update, <code>[]</code> or <code>""</code> clears them. Filter with <code>GET /links?tag=sale</code>.</Field>
                  <Field name="password" type="string">Up to 100 characters. On update, send <code>""</code> to remove protection.</Field>
                  <Field name="starts_at" type="string | null">When the link goes live. Leave it out, or send <code>null</code>, to start at once. Before this time visitors see a not-live-yet page.</Field>
                  <Field name="starts_in" type="string">Relative start: <code>30m</code>, <code>12h</code>, <code>7d</code> or <code>2w</code>, counted from now. Use instead of <code>starts_at</code>, not together with it.</Field>
                  <Field name="expires_in" type="string">Relative expiry, same format, counted from the start time (or from now when there is no start). Use instead of <code>expires_at</code>.</Field>
                  <Field name="max_clicks" type="integer | null">Optional click limit, 1 to 1,000,000,000. After this many visits the link behaves as expired (it goes to <code>expired_url</code> when set). Leave it out, or send <code>null</code>, for unlimited. Visits are counted only for links that have a limit.</Field>
                  <Field name="expires_at" type="string | null">When the link stops working. Leave it out, or send <code>null</code>, for no expiry. Must be later than <code>starts_at</code>.</Field>
                  <Field name="enabled" type="boolean">Default <code>true</code>. <code>false</code> pauses the link.</Field>
                  <Field name="domain_id" type="number | null">Which domain the short link lives on, by id from <code>GET /domains</code>. Leave it out, or send <code>null</code>, to use the default domain.</Field>
                  <Field name="domain" type="string | null">Same thing by host name, for example <code>go.example.com</code>. Use either this or <code>domain_id</code>.</Field>
                  <Field name="ios_url" type="string | null">Where iPhone and iPad visitors go instead of <code>target_url</code>, for example an App Store page. Same rules as <code>target_url</code>. Send <code>null</code> to remove.</Field>
                  <Field name="android_url" type="string | null">Same for Android visitors.</Field>
                  <Field name="windows_url" type="string | null">Same for visitors on Windows. Also <code>mac_url</code> for macOS and <code>linux_url</code> for Linux. Any platform without its own URL goes to <code>target_url</code>.</Field>
                  <Field name="expired_url" type="string | null">Where visitors go after <code>expires_at</code> has passed, instead of the expired notice.</Field>
                  <Field name="utm_source" type="string">Also <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_term</code> and <code>utm_content</code> (up to 100 characters each). Added to <code>target_url</code> as query parameters, replacing the same tag if it is already there. Sent together with <code>target_url</code>.</Field>
                  <Field name="group_id" type="number | null">Id of one of your link groups.</Field>
                  <Field name="team_id" type="number | null">Id of a team you belong to.</Field>
                </tbody>
              </table>
            </div>
            <p>Dates use ISO 8601, for example <code>2026-12-31T23:59:00Z</code> or <code>2026-12-31T23:59:00+05:30</code>. Without an offset the time is read as UTC. An invalid date returns <code>422</code> with <code>fields.expires_at</code> or <code>fields.starts_at</code>.</p>
          </section>

          <Endpoint id="bulk" method="post" path="/links/bulk">
            <p>Create up to 50 links in one request. Every item takes the same fields as <code>POST /links</code> and is checked on its own, so one bad item does not stop the rest. Results come back in the same order.</p>
            <Code>{`curl -X POST ${base}/links/bulk \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "links": [
    { "target_url": "https://example.com/a", "slug": "promo-a" },
    { "target_url": "https://example.com/b", "ios_url": "https://apps.apple.com/app/id1" },
    { "target_url": "not a url" }
  ] }'`}</Code>
            <Code>{`{
  "created": 2,
  "failed": 1,
  "results": [
    { "ok": true, "data": { "id": 21, "slug": "promo-a", "short_url": "${b.url}/promo-a" } },
    { "ok": true, "data": { "id": 22, "slug": "k3f9x2", "short_url": "${b.url}/k3f9x2" } },
    { "ok": false, "fields": { "target_url": "Enter a valid web address." } }
  ]
}`}</Code>
            <p>Status is <code>201</code> when at least one link was created and <code>422</code> when none were. The daily link limit counts every item.</p>
          </Endpoint>

          <section id="more-links">
            <h2>Duplicate, bulk actions and device routes</h2>
            <p><code>POST /links/{"{id}"}/duplicate</code> copies a link with a new random short name and returns <code>201</code> with the copy. Everything is copied except the password (only its hash is stored). The copy counts toward your daily link limit.</p>
            <p><code>POST /links/bulk/tag</code> adds or removes one tag on up to 200 links: <code>{"{ \"action\": \"add_tag\", \"tag\": \"summer\", \"ids\": [12, 13] }"}</code> (<code>action</code> is <code>add_tag</code> or <code>remove_tag</code>). The response has <code>done</code>, <code>failed</code> and one result per id. A link that already has 5 tags, or is not yours, reports <code>ok: false</code> and never blocks the rest.</p>
            <p><code>POST /links/bulk/action</code> enables, disables or deletes up to 200 links: <code>{"{ \"action\": \"disable\", \"ids\": [12, 13, 14] }"}</code>. The response has <code>done</code>, <code>failed</code> and one result per id, so a link that is not yours never blocks the rest.</p>
            <p><code>GET /links/{"{id}"}/routes</code> shows where a visitor on each device ends up: iPhone and iPad, Android, Windows, Mac, Linux and any other device. A <code>null</code> url means a universal link shows its chooser page there.</p>
            <Code>{`curl -X POST ${base}/links/12/duplicate -H "Authorization: Bearer ob_your_key"

curl -X POST ${base}/links/bulk/action -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "action": "disable", "ids": [12, 13, 14] }'

curl ${base}/links/12/routes -H "Authorization: Bearer ob_your_key"`}</Code>
          </section>

          <section id="schedule">
            <h2>Scheduling</h2>
            <p>Both dates are optional and the defaults are explicit:</p>
            <ul>
              <li>No <code>starts_at</code> (or <code>null</code>): the link is live <strong>immediately</strong>.</li>
              <li>No <code>expires_at</code> (or <code>null</code>): the link <strong>never expires</strong>.</li>
              <li>If you send a date, it is used as given (ISO 8601; no offset means UTC).</li>
            </ul>
            <p>Instead of a date you can send a relative value: <code>starts_in</code> and <code>expires_in</code> with a number and a unit <code>m</code>, <code>h</code>, <code>d</code> or <code>w</code> (up to 3650 days). <code>starts_in</code> counts from now; <code>expires_in</code> counts from the start time, or from now when there is no start. Sending both the absolute and the relative value for the same side returns <code>422</code>. On update, <code>null</code> clears a side and a side you do not send is kept.</p>
            <Code>{`# Live in 1 day, expires 7 days after it goes live
curl -X POST ${base}/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/sale", "starts_in": "1d", "expires_in": "7d" }'

# No dates at all: live now, never expires
curl -X POST ${base}/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/always" }'`}</Code>
            <p>Every link in a response has a <code>status</code>: <code>active</code>, <code>scheduled</code> (start is in the future), <code>expired</code>, <code>disabled</code>, <code>review</code> or <code>moderated</code>.</p>
          </section>

          <section id="devices">
            <h2>Device destinations</h2>
            <p>One short link, different destinations by device. <code>ios_url</code>, <code>android_url</code>, <code>windows_url</code>, <code>mac_url</code> and <code>linux_url</code> are all optional; a visitor on a platform without its own URL goes to <code>target_url</code>. <code>expired_url</code> is where visitors land after the link expires. Send <code>null</code> on update to remove one. The same fields work in bulk create.</p>
            <Code>{`curl -X POST ${base}/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://example.com/get-the-app",
    "ios_url": "https://apps.apple.com/app/id123456789",
    "android_url": "https://play.google.com/store/apps/details?id=com.example.app",
    "windows_url": "https://apps.microsoft.com/detail/9NBLGGH4NNS1",
    "mac_url": "https://apps.apple.com/app/id987654321",
    "linux_url": "https://example.com/download/linux",
    "expires_in": "30d",
    "expired_url": "https://example.com/campaign-ended"
  }'`}</Code>
            <Code>{`// JavaScript
await fetch("${base}/links", {
  method: "POST",
  headers: { Authorization: "Bearer ob_your_key", "Content-Type": "application/json" },
  body: JSON.stringify({ target_url: "https://example.com/app", ios_url: "https://apps.apple.com/app/id1", android_url: "https://play.google.com/store/apps/details?id=com.example" }),
});

# Python
requests.post("${base}/links", headers={"Authorization": "Bearer ob_your_key"},
  json={"target_url": "https://example.com/app", "ios_url": "https://apps.apple.com/app/id1", "linux_url": "https://example.com/linux", "expires_in": "2w"}, timeout=15)`}</Code>
          </section>

          <section id="universal">
            <h2>Universal links</h2>
            <p>A universal link has no destination of its own, only device URLs. Leave out <code>target_url</code> and send at least one of <code>ios_url</code>, <code>android_url</code>, <code>windows_url</code>, <code>mac_url</code> or <code>linux_url</code>. Visitors on a device with a URL go straight to it. Visitors on any other device see a page that lists the devices the link does support. The response has <code>universal: true</code>, and <code>target_url</code> shows the first device URL.</p>
            <Code>{`curl -X POST ${base}/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{
    "slug": "myapp",
    "ios_url": "https://apps.apple.com/app/id123456789",
    "android_url": "https://play.google.com/store/apps/details?id=com.example.app"
  }'`}</Code>
            <p>If you send no <code>target_url</code> and no device URL, the request returns <code>422</code> with <code>fields.target_url</code>. On update, sending a <code>target_url</code> turns it into a normal link (that address becomes the fallback for every other device). A universal link must keep at least one device URL. It works in bulk create too. In the dashboard, use <strong>Universal links</strong> in the menu.</p>
          </section>

          <section id="limit">
            <h2>Click limit</h2>
            <p>Set <code>max_clicks</code> to stop a link after a number of visits, for example a coupon for the first 100 people. The count is exact: two visitors can never take the same last click. When the limit is used up the link shows <code>status: "expired"</code>, visitors see the expired notice or are sent to <code>expired_url</code>, and the response shows <code>click_count</code> next to <code>max_clicks</code>. On update, send a higher number to extend it, or <code>null</code> to remove the limit.</p>
            <Code>{`curl -X POST ${base}/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/coupon", "max_clicks": 100, "expires_in": "7d", "expired_url": "https://example.com/sold-out" }'`}</Code>
          </section>

          <section id="filters">
            <h2>Tags and filters</h2>
            <p><code>GET /links</code> accepts <code>tag</code> (one tag) and <code>status</code>: <code>active</code>, <code>disabled</code>, <code>expired</code>, <code>protected</code>, <code>scheduled</code> (not live yet), <code>expiring</code> (expires within 7 days), <code>limited</code> (has a click limit), <code>limit_near</code> (80% or more of the limit used), <code>universal</code>, <code>review</code> and <code>stale</code> (older than a week with no click in the last 30 days: candidates to clean up). Combine them with <code>q</code>, for example <code>?tag=sale&amp;status=expiring</code>.</p>
            <Code>{`# create with tags
curl -X POST ${base}/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/a", "tags": ["sale", "summer"] }'

# only links tagged "sale" that expire within 7 days
curl "${base}/links?tag=sale&status=expiring" -H "Authorization: Bearer ob_your_key"

# replace the tags, or clear them
curl -X PATCH ${base}/links/12 -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" -d '{ "tags": ["winter"] }'
curl -X PATCH ${base}/links/12 -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" -d '{ "tags": [] }'`}</Code>
          </section>

          <section id="recipes">
            <h2>Recipes</h2>
            <p>Copy, change the values, run. All of them use the key from the <a href="#quickstart">quickstart</a> in <code>$KEY</code>.</p>

            <h3>A weekend sale link</h3>
            <p>Goes live tomorrow, ends 3 days later, and sends late visitors to a "sale is over" page.</p>
            <Code>{`curl -X POST ${base}/links -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://example.com/weekend-sale",
    "slug": "weekend",
    "tags": ["sale"],
    "starts_in": "1d",
    "expires_in": "3d",
    "expired_url": "https://example.com/sale-over"
  }'`}</Code>

            <h3>One link for your app</h3>
            <p>Phones go to their store, everything else to your website. Leave out <code>target_url</code> to make a <a href="#universal">universal link</a>.</p>
            <Code>{`curl -X POST ${base}/links -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{
    "slug": "app",
    "target_url": "https://example.com/get-the-app",
    "ios_url": "https://apps.apple.com/app/id123456789",
    "android_url": "https://play.google.com/store/apps/details?id=com.example.app"
  }'`}</Code>

            <h3>A coupon for the first 100 people</h3>
            <Code>{`curl -X POST ${base}/links -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/coupon", "max_clicks": 100, "expired_url": "https://example.com/sold-out" }'`}</Code>
            <p>Watch it with <code>GET /links/{"{id}"}</code>: <code>click_count</code> goes up to <code>max_clicks</code>, then <code>status</code> becomes <code>expired</code>.</p>

            <h3>Tidy up links that are about to expire</h3>
            <p>List them, then turn them off in one request (up to 200 ids).</p>
            <Code>{`curl "${base}/links?status=expiring&limit=100" -H "Authorization: Bearer $KEY"

curl -X POST ${base}/links/bulk/action -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{ "action": "disable", "ids": [12, 13, 14] }'`}</Code>

            <h3>A QR code for print</h3>
            <Code>{`curl "${base}/links/31/qr?format=png&size=1200&track=1" -H "Authorization: Bearer $KEY" -o spring-qr.png`}</Code>
            <p><code>track=1</code> adds <code>utm_source=qr</code>, so scans show up as their own source in your stats.</p>

            <h3>Set up your bio page</h3>
            <p>Pick a template, add social icons and publish. Starter links are saved switched off, so edit them in the dashboard before turning them on.</p>
            <Code>{`curl -X POST ${base}/page/template -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{ "id": "musician", "starter_content": true }'

curl -X PATCH ${base}/page -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{ "display_name": "Mia Rivers", "published": true,
        "socials": { "instagram": "https://instagram.com/miarivers", "spotify": "https://open.spotify.com/artist/1", "email": "booking@example.com" } }'`}</Code>

            <h3>Last week's numbers</h3>
            <Code>{`curl "${base}/stats?days=7" -H "Authorization: Bearer $KEY"
curl "${base}/links/31/stats?days=7" -H "Authorization: Bearer $KEY"`}</Code>
          </section>

          <Endpoint id="link-stats" method="get" path="/links/{id}/stats">
            <p>Totals, a daily series and breakdowns for one link. Query: <code>days</code> (1 to 365, default 30). <code>previous</code> holds the totals of the same number of days just before this period, and <code>change_percent</code> the change in whole percent (<code>null</code> when the earlier period had none), so you can say "12% more than last month".</p>
            <Code>{`curl "${base}/links/12/stats?days=7" -H "Authorization: Bearer ob_your_key"`}</Code>
            <Code>{`{
  "data": {
    "total": 214,
    "unique": 171,
    "series": [{ "day": "2026-03-02", "total": 9, "unique": 7 }],
    "countries": [{ "label": "DE", "n": 80 }],
    "devices": [{ "label": "Mobile", "n": 150 }],
    "browsers": [{ "label": "Safari", "n": 90 }],
    "referrers": [{ "label": "Direct", "n": 120 }],
    "campaigns": [{ "label": "No campaign", "n": 214 }]
  }
}`}</Code>
          </Endpoint>

          <Endpoint id="stats" method="get" path="/stats">
            <p>The same shape, across everything you own. With <code>kind=clicks</code> it also has <code>top</code> (your five most clicked links and bio buttons: <code>type</code>, <code>id</code>, <code>label</code>, <code>n</code>) and, for both kinds, <code>hours_utc</code> (24 counts, index = hour of day in UTC) and <code>busiest_hour_utc</code> (0 to 23, or <code>null</code>). Query: <code>days</code>, and <code>kind</code> set to <code>clicks</code> (default) or <code>views</code> for bio page visits. It also has <code>previous</code> and <code>change_percent</code>, as for a single link.</p>
            <Code>{`curl "${base}/stats?days=30&kind=views" -H "Authorization: Bearer ob_your_key"`}</Code>
          </Endpoint>

          <Endpoint id="page" method="get" path="/page">
            <p>Your bio page settings and its blocks. <code>PATCH /page</code> accepts the same profile fields as the editor: <code>display_name</code>, <code>bio</code>, <code>theme</code>, <code>published</code>, plus <code>socials</code> (see <a href="#templates">Templates and icons</a>). Each link block in <code>GET /page</code> has an <code>icon</code>: the platform its address belongs to, or <code>null</code>.</p>
            <Code>{`curl ${base}/page -H "Authorization: Bearer ob_your_key"`}</Code>
            <Code>{`{ "data": {
  "username": "mia",
  "page": { "display_name": "Mia Rivers", "bio": "New music and tour dates.", "theme": "musician", "published": 1, "socials": { "instagram": "https://instagram.com/miarivers" } },
  "blocks": [
    { "id": 8, "type": "link", "title": "Stream on Spotify", "url": "https://open.spotify.com/artist/1", "enabled": 1, "icon": "spotify" },
    { "id": 9, "type": "header", "title": "Listen", "url": null, "enabled": 1, "icon": null }
  ]
} }`}</Code>
            <Code>{`curl -X PATCH ${base}/page -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "bio": "New single out now.", "theme": "slate" }'`}</Code>
          </Endpoint>

          <section id="blocks">
            <h2>Bio page blocks</h2>
            <p>Add, change, remove and reorder the blocks on your bio page. Types: <code>link</code>, <code>header</code>, <code>text</code> (plus <code>contact_form</code>, <code>product</code>, <code>embed</code>, <code>vcard</code>, <code>subscribe</code> and <code>poll</code> when enabled). A poll needs <code>title</code> (the question) and <code>options</code> (2 to 6, as a list or one per line). Fields: <code>title</code>, <code>url</code>, <code>description</code>, <code>options</code>, <code>price</code>, <code>button</code>, <code>featured</code> (true shows a larger link with a star), <code>enabled</code>, <code>starts_at</code>, <code>ends_at</code>, <code>group_id</code>. <code>PATCH</code> changes only the fields you send; the type cannot change. Send <code>""</code> to clear a text field. A new block goes to the end. Unknown block: 404. Bad input: 422 with <code>fields</code>.</p>
            <ul className="small">
              <li><code>GET /page/blocks</code> and <code>POST /page/blocks</code></li>
              <li><code>GET</code>, <code>PATCH</code>, <code>DELETE /page/blocks/{"{id}"}</code></li>
              <li><code>POST /page/blocks/order</code> with <code>{"{ \"ids\": [12, 9, 15] }"}</code>: blocks you leave out go after these</li>
            </ul>
            <Code>{`curl -X POST ${base}/page/blocks -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "type": "link", "title": "New single", "url": "https://example.com/single", "featured": true }'`}</Code>
            <Code>{`curl -X POST ${base}/page/blocks -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "type": "text", "title": "Opening hours", "description": "Mon-Fri 9:00-17:00" }'`}</Code>
          </section>

          <section id="subscribers">
            <h2>Signups, polls and saved copies</h2>
            <p><strong>Email signup</strong> (<code>type: "subscribe"</code>): visitors type their email on your bio page and it lands on your list. Repeat signups are ignored without telling the visitor, a hidden field catches bots, and each visitor and each block has an hourly limit. <code>GET /page/subscribers</code> lists them (<code>limit</code> up to 100, <code>page</code>); add <code>format=csv</code> for every address as a CSV file. <code>DELETE /page/subscribers/{"{id}"}</code> removes one. The same list is in the dashboard under Subscribers.</p>
            <p><strong>Poll</strong> (<code>type: "poll"</code>): one vote per visitor (stored as a hash, never the address), results shown after voting. <code>GET /page/blocks/{"{id}"}/votes</code> returns <code>total</code> and each option with <code>votes</code> and <code>percent</code>.</p>
            <p><strong>Saved copies</strong>: <code>GET /page/snapshots</code> lists them, <code>POST /page/snapshots</code> with an optional <code>label</code> saves the page now (profile, look, social icons, every block; the newest 10 are kept), <code>POST /page/snapshots/{"{id}"}/restore</code> puts it back and <code>DELETE /page/snapshots/{"{id}"}</code> removes one. A restore updates blocks that still exist in place, so their click counts stay; blocks that no longer pass today's checks are skipped and counted in <code>skipped</code>.</p>
            <Code>{`curl -X POST ${base}/page/blocks -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "type": "poll", "title": "Which should I post next?", "options": ["Tutorial", "Behind the scenes", "Q&A"] }'`}</Code>
            <Code>{`curl -X POST ${base}/page/snapshots -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" -d '{ "label": "Before the launch" }'
curl -X POST ${base}/page/snapshots/3/restore -H "Authorization: Bearer ob_your_key"
# { "data": { "restored": 8, "skipped": 0, "removed": 1 } }`}</Code>
            <p className="small muted">These need migration 016 (Admin &gt; Domains &gt; Run database updates). Until it runs, the endpoints answer 503 with that hint. Signups and polls follow the Phase 2 switch.</p>
          </section>

          <section id="geo">
            <h2>Country routes</h2>
            <p>Send visitors from a country to their own page and everyone else to the normal destination. <code>GET /links/{"{id}"}/geo</code> returns <code>[{"{ \"country\": \"PK\", \"url\": ... }"}]</code>. <code>PUT /links/{"{id}"}/geo</code> replaces the whole list: <code>{"{ \"routes\": [{ \"country\": \"PK\", \"url\": \"https://example.com/pk\" }] }"}</code>. Two-letter codes, up to 10 countries, each address checked like a destination. An empty list removes all. The link object has <code>geo: true</code> when it has routes. A country route wins over a device destination.</p>
            <Code>{`curl -X PUT ${base}/links/12/geo -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "routes": [{ "country": "PK", "url": "https://example.com/pk" }, { "country": "US", "url": "https://example.com/us" }] }'`}</Code>
            <p className="small muted">The visitor's country comes from a CDN header (Cloudflare, Vercel) or, on a server without a CDN, from a free ipinfo.io token the administrator saves in Admin &gt; Security (or sets as <code>GEOIP_TOKEN</code>): the visitor's address is then sent to ipinfo.io once and remembered for a day. When the country is unknown the normal destination is used. Needs migration 017.</p>
          </section>

          <section id="health">
            <h2>Destination health</h2>
            <p>Every active link is checked about once a day. A destination that answers with 404, 410 or a server error, or that no longer exists, is marked <code>broken</code> after <strong>two failed checks in a row</strong>, and the owner gets one email. Sites that only refuse automated visits (401, 403, 405, 429) count as working. The link object has <code>health</code>: <code>{"{ \"status\": \"ok\" | \"broken\" | null, \"code\": 404, \"checked_at\": ... }"}</code>. Filter with <code>GET /links?status=broken</code>. <code>POST /links/{"{id}"}/check</code> checks now (20 per hour) and returns <code>status</code> and <code>code</code>. Changing the destination resets the record. Private and internal addresses are never visited. Needs migration 017.</p>
          </section>

          <section id="notifications">
            <h2>Weekly report and alerts</h2>
            <p>A summary every Monday (UTC): clicks and unique visitors against the week before, bio page views, your three most clicked links, the busiest hour, new signups and links that stopped working. A quiet week sends nothing. It is off until you turn it on; broken-link alerts are on by default. <code>GET /account/notifications</code> returns <code>weekly_report</code> and <code>health_alerts</code>; <code>PATCH</code> changes either with true or false. The same switches are on the Account page, with a button that emails you this week's report now.</p>
            <Code>{`curl -X PATCH ${base}/account/notifications -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" -d '{ "weekly_report": true }'`}</Code>
          </section>

          <section id="templates">
            <h2>Templates and icons</h2>
            <p><code>GET /page/templates</code> lists the 27 ready-made templates (<code>id</code>, <code>niche</code>, colours, starter links) and the <code>social_platforms</code> you can set. <code>POST /page/template</code> with <code>{"{ \"id\": \"musician\", \"starter_content\": true }"}</code> puts that look on your page and clears custom colours. With <code>starter_content</code> it also fills an empty bio and, only when your page has no blocks yet, adds the starter links <strong>switched off</strong>, because their addresses are placeholders. The response has <code>starter_blocks_added</code>. A template id also works as <code>theme</code> in <code>PATCH /page</code>.</p>
            <p><strong>Social icons</strong> are separate from link blocks. Send <code>{"{ \"socials\": { \"instagram\": \"https://instagram.com/you\", \"email\": \"you@example.com\" } }"}</code> to <code>PATCH /page</code>: each platform you send is changed, the others stay, and <code>""</code> removes one. They show as round icon buttons under your links. A <strong>link block</strong> whose address is on a known platform (Instagram, YouTube, Spotify, WhatsApp, Etsy and about 40 more) gets that platform's logo on its button automatically.</p>
            <Code>{`curl ${base}/page/templates -H "Authorization: Bearer ob_your_key"`}</Code>
            <Code>{`{ "data": {
  "templates": [
    { "id": "musician", "name": "Musician", "niche": "Musicians and bands", "note": "Midnight purple with a hot pink button.",
      "colors": { "background": "#140B26", "text": "#F5ECFF", "button": "#FF4FA3", "button_text": "#1A0A18" },
      "shape": "round", "style": "solid", "font": "sans",
      "starter": [ { "type": "header", "title": "Listen" }, { "type": "link", "title": "Stream on Spotify", "url": "https://open.spotify.com/" } ] }
  ],
  "social_platforms": [ { "key": "instagram", "label": "Instagram" }, { "key": "spotify", "label": "Spotify" }, { "key": "email", "label": "Email" } ]
} }`}</Code>
            <Code>{`curl -X POST ${base}/page/template -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" \\
  -d '{ "id": "musician", "starter_content": true }'

# { "data": { "page": { ... }, "starter_blocks_added": 5 } }`}</Code>
          </section>

          <Endpoint id="domains" method="get" path="/domains">
            <p><strong>Custom domains are not supported.</strong> You can only use the domains we provide; this endpoint lists them. A link answers only on its own domain, so <code>short_url</code> always shows the right one. Every link in a response also carries <code>domain</code> and <code>domain_id</code>.</p>
            <Code>{`curl ${base}/domains -H "Authorization: Bearer ob_your_key"`}</Code>
            <Code>{`{ "data": [
  { "id": 1, "domain": "${b.host}", "is_default": true },
  { "id": 3, "domain": "go.example.com", "is_default": false }
] }`}</Code>
            <Code>{`# put a new link on a specific domain
curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com", "domain_id": 3 }'

# move an existing link (by host name)
curl -X PATCH ${base}/links/12 \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "domain": "go.example.com" }'`}</Code>
          </Endpoint>

          <section id="keys-qr-export">
            <h2>Read-only keys, QR codes and CSV export</h2>
            <p><strong>Read-only keys.</strong> When you create a key you can tick <em>Read-only</em>. It can list and read (<code>GET</code>) but any <code>POST</code>, <code>PATCH</code> or <code>DELETE</code> returns <code>403</code>. Use it for dashboards and reporting scripts so a leaked key cannot change anything.</p>
            <p><code>GET /links/{"{id}"}/qr</code> returns the QR code of one of your links as SVG, or PNG with <code>format=png</code>. Options: <code>size</code> (64 to 2048, PNG), <code>fg</code> and <code>bg</code> as <code>#rrggbb</code>, <code>margin</code> (0 to 8), <code>logo</code> (https image, SVG only), and <code>track=1</code> to add <code>utm_source=qr</code> so scans show up as a campaign in the stats. The code points at the link's own domain.</p>
            <p><code>GET /links/export</code> returns all your links as CSV: id, short_url, domain, slug, target_url, universal, the device URLs, expired_url, title, status, starts_at, expires_at, max_clicks, clicks, unique_clicks and created_at (up to 50,000 rows, 6 exports per 10 minutes). It works with read-only keys.</p>
            <Code>{`curl "${base}/links/12/qr?format=png&size=800&fg=%230e7c66&track=1" -H "Authorization: Bearer ob_your_key" -o qr.png

curl ${base}/links/export -H "Authorization: Bearer ob_your_key" -o links.csv`}</Code>
          </section>

          <section id="search">
            <h2>Search engines and crawlers</h2>
            <p>Public pages are built to be found. Nothing here needs an API call; it is handled for you:</p>
            <ul>
              <li><code>/sitemap.xml</code> on the main domain lists the site pages, and on the bio domain lists every published bio page with its last change. Submit each address once in Google Search Console and Bing Webmaster Tools.</li>
              <li><code>/robots.txt</code> names the major search engines (Google, Bing, DuckDuckGo, Yandex, Baidu, Apple, Yahoo and more), social preview bots (Facebook, X, LinkedIn, Slack, WhatsApp, Telegram, Discord) and AI search assistants, and allows them on public pages. Short link and API domains are never indexed.</li>
              <li>IndexNow: when a bio page is published or edited, Bing, Yandex, Seznam and Naver are notified at once, at most once per page every 10 minutes. The key file is served at <code>/&lt;key&gt;.txt</code> on the main and bio domains. Admins manage it under Admin, Search.</li>
              <li><code>/llms.txt</code> gives language models a plain-text map of the site on every domain.</li>
            </ul>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
