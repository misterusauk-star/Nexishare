import type { Metadata } from "next";
import { getBrand } from "@/lib/brand";
import { SiteShell } from "@/components/site-shell";
import { getDomainState } from "@/lib/domains";

export const metadata: Metadata = { title: "API reference" };

function Endpoint({ id, method, path, children }: { id: string; method: "get" | "post" | "patch" | "delete"; path: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2><span className={`method ${method}`}>{method.toUpperCase()}</span><code>{path}</code></h2>
      {children}
    </section>
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
          <pre className="code">{s.code}</pre>
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
          <a href="#auth">Authentication</a>
          <a href="#errors">Errors and limits</a>
          <a href="#domains">Domains</a>
          <a href="#list">List links</a>
          <a href="#fields">Link fields</a>
          <a href="#create">Create a link</a>
          <a href="#get">Get a link</a>
          <a href="#update">Update a link</a>
          <a href="#delete">Delete a link</a>
          <a href="#link-stats">Link stats</a>
          <a href="#stats">Account stats</a>
          <a href="#page">Bio page</a>
        </nav>
        <div>
          <h1>API reference</h1>
          <p>Everything below is JSON over HTTPS. Base URL: <code>{base}</code></p>

          <section id="auth">
            <h2>Authentication</h2>
            <p>Create a key under <em>API keys</em> in your dashboard and send it as a bearer token. Keys start with <code>ob_</code>. Revoking a key cuts it off at once.</p>
            <pre className="code">{`curl ${base}/links \\
  -H "Authorization: Bearer ob_your_key"`}</pre>
          </section>

          <section id="errors">
            <h2>Errors and limits</h2>
            <p>Failures return a non-2xx status and a body shaped like this:</p>
            <pre className="code">{`{ "error": { "message": "Validation failed.", "fields": { "slug": "That short name is already taken." } } }`}</pre>
            <p>Each key gets a fixed number of requests per minute (the server owner sets it; the default is 60). Past that you get <code>429</code> with a <code>Retry-After</code> header.</p>
            <p>Abuse protection: an account can create up to 500 links per day (50 until its email is confirmed), you can hold 10 active keys, and repeated wrong keys from one address are blocked for ten minutes. Links with look-alike names or unsafe destinations are held for review or refused.</p>
          </section>

          <Endpoint id="domains" method="get" path="/domains">
            <p>The domains you can put a link on. A link answers only on its own domain, so <code>short_url</code> always shows the right one. Every link in a response also carries <code>domain</code> and <code>domain_id</code>.</p>
            <pre className="code">{`curl ${base}/domains -H "Authorization: Bearer ob_your_key"`}</pre>
            <pre className="code">{`{ "data": [
  { "id": 1, "domain": "${b.host}", "is_default": true },
  { "id": 3, "domain": "go.example.com", "is_default": false }
] }`}</pre>
            <pre className="code">{`# put a new link on a specific domain
curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com", "domain_id": 3 }'

# move an existing link (by host name)
curl -X PATCH ${base}/links/12 \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "domain": "go.example.com" }'`}</pre>
          </Endpoint>

          <Endpoint id="list" method="get" path="/links">
            <p>Your links, newest first. Query: <code>q</code> (search), <code>page</code>, <code>limit</code> (max 100).</p>
            <pre className="code">{`curl "${base}/links?q=launch&limit=10" -H "Authorization: Bearer ob_your_key"`}</pre>
            <pre className="code">{`{
  "data": [{
    "id": 12,
    "slug": "launch",
    "short_url": "${b.url}/launch",
    "target_url": "https://example.com/launch-day",
    "title": "Launch day",
    "password_protected": false,
    "enabled": true,
    "starts_at": null,
    "expires_at": null,
    "created_at": "2026-03-02T09:14:00.000Z"
  }],
  "meta": { "total": 1, "page": 1, "limit": 10 }
}`}</pre>
            <Langs samples={listSamples(base)} />
          </Endpoint>

          <section id="fields">
            <h2>Link fields</h2>
            <p>Used by <code>POST /links</code> and <code>PATCH /links/{"{id}"}</code>. On create only <code>target_url</code> is required. On update every field is optional and anything you leave out stays unchanged.</p>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Field</th><th>Type</th><th></th><th>Notes</th></tr></thead>
                <tbody>
                  <Field name="target_url" type="string" req>Destination. Must be a public http(s) URL, up to 2048 characters.</Field>
                  <Field name="slug" type="string">3 to 32 characters: letters, numbers, <code>-</code> and <code>_</code>. Leave it out for a random one. Some names are reserved.</Field>
                  <Field name="title" type="string">Up to 160 characters. Only for your own reference.</Field>
                  <Field name="password" type="string">Up to 100 characters. On update, send <code>""</code> to remove protection.</Field>
                  <Field name="starts_at" type="string | null">When the link goes live. Leave it out, or send <code>null</code>, to start at once. Before this time visitors see a not-live-yet page.</Field>
                  <Field name="expires_at" type="string | null">When the link stops working. Leave it out, or send <code>null</code>, for no expiry. Must be later than <code>starts_at</code>.</Field>
                  <Field name="enabled" type="boolean">Default <code>true</code>. <code>false</code> pauses the link.</Field>
                  <Field name="domain_id" type="number | null">Which domain the short link lives on, by id from <code>GET /domains</code>. Leave it out, or send <code>null</code>, to use the default domain.</Field>
                  <Field name="domain" type="string | null">Same thing by host name, for example <code>go.example.com</code>. Use either this or <code>domain_id</code>.</Field>
                  <Field name="group_id" type="number | null">Id of one of your link groups.</Field>
                  <Field name="team_id" type="number | null">Id of a team you belong to.</Field>
                </tbody>
              </table>
            </div>
            <p>Dates use ISO 8601, for example <code>2026-12-31T23:59:00Z</code> or <code>2026-12-31T23:59:00+05:30</code>. Without an offset the time is read as UTC. An invalid date returns <code>422</code> with <code>fields.expires_at</code> or <code>fields.starts_at</code>.</p>
          </section>

          <Endpoint id="create" method="post" path="/links">
            <p>The smallest valid request is just the destination:</p>
            <pre className="code">{`curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "target_url": "https://example.com/launch-day" }'`}</pre>
            <p>With a custom name and an expiry only (no <code>starts_at</code>):</p>
            <pre className="code">{`curl -X POST ${base}/links \\
  -H "Authorization: Bearer ob_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "target_url": "https://example.com/launch-day",
    "slug": "launch",
    "expires_at": "2026-12-31T23:59:00Z"
  }'`}</pre>
            <p>With every optional field:</p>
            <pre className="code">{`curl -X POST ${base}/links \\
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
  }'`}</pre>
            <p>Returns <code>201</code> with the link:</p>
            <pre className="code">{`{
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
}`}</pre>
            <p>A bad field returns <code>422</code>. The slug and destination errors are deliberately generic:</p>
            <pre className="code">{`{ "error": { "message": "Validation failed.", "fields": { "slug": "This name is not available." } } }`}</pre>
            <h3>Examples in other languages</h3>
            <Langs samples={createSamples(base)} />
          </Endpoint>

          <Endpoint id="get" method="get" path="/links/{id}">
            <p>One link by numeric id. Returns <code>404</code> if it does not exist or is not yours.</p>
            <pre className="code">{`curl ${base}/links/12 -H "Authorization: Bearer ob_your_key"`}</pre>
          </Endpoint>

          <Endpoint id="update" method="patch" path="/links/{id}">
            <p>Send only the fields to change. Set <code>password</code> to an empty string to remove protection, or <code>expires_at</code> to <code>null</code> to clear the expiry. <code>enabled: false</code> pauses the link.</p>
            <pre className="code">{`# pause a link
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
  -d '{ "starts_at": "2026-12-01T00:00:00Z", "expires_at": "2026-12-31T23:59:00Z" }'`}</pre>
            <Langs samples={updateSamples(base)} />
          </Endpoint>

          <Endpoint id="delete" method="delete" path="/links/{id}">
            <p>Deletes the link and its click history. Returns <code>204</code>.</p>
            <pre className="code">{`curl -X DELETE ${base}/links/12 -H "Authorization: Bearer ob_your_key"`}</pre>
          </Endpoint>

          <Endpoint id="link-stats" method="get" path="/links/{id}/stats">
            <p>Totals, a daily series and breakdowns for one link. Query: <code>days</code> (1 to 365, default 30).</p>
            <pre className="code">{`curl "${base}/links/12/stats?days=7" -H "Authorization: Bearer ob_your_key"`}</pre>
            <pre className="code">{`{
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
}`}</pre>
          </Endpoint>

          <Endpoint id="stats" method="get" path="/stats">
            <p>The same shape, across everything you own. Query: <code>days</code>, and <code>kind</code> set to <code>clicks</code> (default) or <code>views</code> for bio page visits.</p>
            <pre className="code">{`curl "${base}/stats?days=30&kind=views" -H "Authorization: Bearer ob_your_key"`}</pre>
          </Endpoint>

          <Endpoint id="page" method="get" path="/page">
            <p>Your bio page settings and its blocks. <code>PATCH /page</code> accepts the same profile fields as the editor: <code>display_name</code>, <code>bio</code>, <code>theme</code>, <code>published</code>.</p>
          </Endpoint>
        </div>
      </div>
    </SiteShell>
  );
}
