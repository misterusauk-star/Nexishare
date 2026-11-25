# REST API

JSON over HTTPS. Base URL: `{APP_URL}/api/v1`. The same reference, with your real URL filled in, is served by your install at `/docs`.

## How it works

- **Map of the API:** `GET /api/v1` (no key) lists every endpoint with its method, path and a one-line summary. The `/docs` page shows the same list as a table.
- **Format:** JSON in and out. Success is `{"data": ...}`, failure is `{"error": {"message": ..., "fields": {...}}}`.
- **Sign in:** `Authorization: Bearer ob_...`. A read-only key can only use `GET` (others return 403).
- **Lists:** `limit` and `page`; the answer has `meta.total`, `meta.page`, `meta.limit`.
- **Times:** ISO 8601 in UTC.
- **Changes:** `PATCH` changes only the fields you send; send `null` (or `""` for text) to clear one.
- **Mistakes:** 422 with `fields`, 404 for something that is not yours, 429 over a limit.

## Quickstart

1. Create a key under **API keys** (shown once, starts with `ob_`).
2. Create a link:

```bash
export KEY=ob_your_key
curl -X POST https://your-domain/api/v1/links -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"target_url":"https://example.com/spring-sale","slug":"spring","title":"Spring sale"}'
```

3. Share `data.short_url` from the answer.

The `/docs` page of your install has a link object reference, recipes (weekend sale, app link, first-100 coupon, tidy expiring links, QR for print, bio page setup, weekly numbers) and Copy buttons on every example.

## Authentication

Create a key under **API keys** in the dashboard. Keys start with `ob_`. Send it as a bearer token:

```bash
curl https://your-domain/api/v1/links -H "Authorization: Bearer ob_your_key"
```

Revoking a key cuts it off immediately. Only a hash of each key is stored, so a lost key cannot be shown again.

## Errors

Failures return a non-2xx status and:

```json
{ "error": { "message": "Validation failed.", "fields": { "slug": "That short name is already taken." } } }
```

### Status codes

| Code | Meaning |
|---|---|
| 200, 201, 204 | Done (201 after create, 204 with no body after delete) |
| 400 | Body is not a JSON object |
| 401 | Missing, wrong or revoked key |
| 403 | A read-only key tried to change something |
| 404 | Link not found, or not yours |
| 422 | A field is invalid: see `error.fields` |
| 429 | A limit was reached: `error.window` is `minute` or `day`, wait `Retry-After` seconds |

## Rate limits

Limits are low by default: **20 requests per minute per key**, **1,000 requests per day per account**, **100 links in total** per account and **3 active keys**. Past a request limit you get `429` with a `Retry-After` header and `error.limit` / `error.window` (`minute` or `day`). Only an administrator can change them, for everyone (**Admin > Security**) or for one account (**Admin > Users**). Super admins are not limited. A create that would pass the link limit returns `422`. The API keys page shows your own limits.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/links` | List your links. Query: `q`, `page`, `limit` (max 100) |
| POST | `/links` | Create a link. `target_url` is required unless a device URL is given (universal link) |
| GET | `/links/{id}` | One link |
| PATCH | `/links/{id}` | Change fields; send only what changes |
| DELETE | `/links/{id}` | Delete the link and its clicks. Returns 204 |
| GET | `/links/{id}/stats` | Stats for one link. Query: `days` (1 to 365) |
| GET | `/stats` | Stats across everything you own. Query: `days`, `kind` (`clicks` or `views`) |
| GET | `/page` | Your bio page and blocks |
| PATCH | `/page` | `display_name`, `bio`, `theme`, `published`, `socials` |
| GET | `/page/templates` | The ready-made templates and the social platforms you can set |
| GET | `/page/subscribers` | Emails from signup blocks (`?format=csv` for a file) |
| DELETE | `/page/subscribers/{id}` | Remove one address |
| GET | `/page/blocks/{id}/votes` | Results of a poll block |
| GET, POST | `/page/snapshots` | List / save a copy of your bio page |
| POST, DELETE | `/page/snapshots/{id}/restore`, `/page/snapshots/{id}` | Restore a copy / delete it |
| GET, POST | `/page/blocks` | List blocks / add one (`type`, `title`, `url`, `description`, `featured`, `enabled`, ...) |
| GET, PATCH, DELETE | `/page/blocks/{id}` | Read, change (only the fields you send) or remove a block |
| POST | `/page/blocks/order` | Set the order: `{"ids": [12, 9, 15]}` |
| POST | `/page/template` | Apply a template: `{"id": "musician", "starter_content": true}` |

### Public endpoints (no key)

`GET /api/health` returns `{"ok":true,"app":"openbio"}` on every host. `POST /api/report` takes `{"target":"slug or URL","reason":"phishing","details":"..."}`, is rate limited, and answers `202`.

URLs in API responses are built from the current default domain.

### Create a link

```bash
curl -X POST https://your-domain/api/v1/links \
  -H "Authorization: Bearer ob_your_key" \
  -H "Content-Type: application/json" \
  -d '{"target_url":"https://example.com/launch","slug":"launch","title":"Launch page"}'
```

Returns `201` with the link. A taken slug, a blocked destination or a private address returns `422`.

Only `target_url` is required, unless you send at least one device URL (a universal link, see below). Optional fields: `slug`, `title`, `password`, `starts_at`, `expires_at`, `starts_in`, `expires_in`, `max_clicks`, `enabled`, `group_id`, `team_id`, `domain_id` / `domain`, `ios_url`, `android_url`, `windows_url`, `mac_url`, `linux_url` (platform-specific destinations; a platform without one uses `target_url`), `expired_url` (where to go after expiry), and the campaign tags `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (added to `target_url` as query parameters). Leave a field out (or send `null` for the dates) to skip it. Dates are ISO 8601, e.g. `2026-12-31T23:59:00Z`; without an offset they are read as UTC. `expires_at` must be later than `starts_at`.

**Scheduling defaults:** no `starts_at` = live immediately; no `expires_at` = never expires. Instead of dates you can send `starts_in` (from now) and `expires_in` (from the start, or from now) as a number plus `m`, `h`, `d` or `w`, e.g. `"starts_in": "1d", "expires_in": "7d"`. Do not send both forms for the same side. On update `null` clears a side; unsent sides are kept. Responses include `status`: `active`, `scheduled`, `expired`, `disabled`, `review` or `moderated`.

**Universal links:** leave out `target_url` and send at least one of `ios_url`, `android_url`, `windows_url`, `mac_url`, `linux_url`. Visitors on a device with a URL go to it; other devices see a page listing the supported devices. Responses show `universal: true`, and `target_url` is the first device URL. Sending no `target_url` and no device URL returns 422 on `target_url`. On update, sending a `target_url` makes it a normal link; a universal link must keep at least one device URL. Example: `{"slug":"myapp","ios_url":"https://apps.apple.com/app/id1","android_url":"https://play.google.com/store/apps/details?id=com.example"}`.

**Click limit:** `max_clicks` (1 to 1,000,000,000, or `null` for unlimited) turns the link into an expired link after that many visits (it then goes to `expired_url` when set). The count is atomic. Responses include `max_clicks` and `click_count`; visits are counted only for links that have a limit.

**Device destinations:** `ios_url`, `android_url`, `windows_url`, `mac_url`, `linux_url` fall back to `target_url`; `expired_url` replaces the expired notice. Example: `{"target_url":"https://example.com/app","ios_url":"https://apps.apple.com/app/id1","android_url":"https://play.google.com/store/apps/details?id=com.example","expires_in":"30d","expired_url":"https://example.com/ended"}`.

Minimal request:

```bash
curl -X POST $BASE/links -H "Authorization: Bearer ob_your_key" -H "Content-Type: application/json" -d '{"target_url":"https://example.com"}'
```

Examples in JavaScript, Python, PHP, Go and Ruby are on the `/docs` page of your install.

### Update a link

Set `password` to an empty string to remove protection, `expires_at` to `null` to clear expiry, and `enabled` to `false` to pause the link.

### Stats shape

```json
{
  "total": 120,
  "unique": 87,
  "series": [{ "day": "2026-01-30", "total": 12, "unique": 9 }],
  "countries": [{ "label": "US", "n": 40 }],
  "devices": [{ "label": "mobile", "n": 70 }],
  "browsers": [{ "label": "Chrome", "n": 60 }],
  "referrers": [{ "label": "news.example", "n": 20 }],
  "campaigns": [{ "label": "spring", "n": 15 }]
}
```


## Domains

`GET /domains` lists the domains a link can live on: `[{ "id": 1, "domain": "example.com", "is_default": true }]`.
Send `domain_id` (or `domain`, the host name) on `POST /links` or `PATCH /links/{id}` to place a link. Leave it out for the default domain.
Custom domains are not supported: you can only use the domains we provide (`GET /domains`).

Responses include `domain`, `domain_id` and a `short_url` built from that domain. A link answers only on its own domain.

## Abuse limits

500 new links per account per day (50 until the email is confirmed), 5 new keys per hour, and 30 wrong-key attempts per 10 minutes per IP.


## Bulk create

`POST /links/bulk` with `{"links": [ {...}, {...} ]}` creates up to 50 links. Each item takes the fields of `POST /links` and is validated on its own.
The response is `{"created": n, "failed": m, "results": [{"ok": true, "data": {...}} | {"ok": false, "fields": {...}}]}` in request order.
Status `201` if at least one link was created, `422` if none. The daily limit counts every item.

## Duplicate, bulk actions and device routes

- `POST /links/{id}/duplicate`: copies a link with a new random short name (201). Everything is copied except the password. Counts toward the daily link limit.
- `POST /links/bulk/action`: `{"action": "enable" | "disable" | "delete", "ids": [1, 2, 3]}`, up to 200 ids. Returns `done`, `failed` and one `{id, ok}` per id.
- `POST /links/bulk/tag`: `{"action": "add_tag" | "remove_tag", "tag": "summer", "ids": [1, 2, 3]}`, up to 200 ids, one tag per call. Returns `done`, `failed` and one `{id, ok}` per id. A link with 5 tags already, or not yours, gives `ok: false`.
- `GET /links/{id}/routes`: where each device ends up (`ios`, `android`, `windows`, `macos`, `linux`, `other`) with `source` = `device`, `default` or `chooser`. `url` is `null` for a universal link's chooser page.

## Read-only keys, QR codes and CSV export

- **Read-only keys:** tick *Read-only* when creating a key. It can use `GET` but `POST`, `PATCH` and `DELETE` return `403`.
- `GET /links/{id}/qr`: the QR code of a link as SVG (default) or PNG (`format=png`). Options: `size` (64 to 2048, PNG), `fg` and `bg` (`#rrggbb`), `margin` (0 to 8), `logo` (https image, SVG only), `track=1` (adds `utm_source=qr`).
- `GET /links/export`: all your links as CSV (id, short_url, domain, slug, target_url, universal, device URLs, expired_url, title, status, starts_at, expires_at, max_clicks, clicks, unique_clicks, created_at). Up to 50,000 rows, 6 exports per 10 minutes. Works with read-only keys.

## Tags and filters

- `tags` on create/update: up to 5 labels, each up to 24 characters (letters, numbers, `-`, `_`). Send a string (`"sale, summer"`) or an array. Responses return an array. On update `[]` or `""` clears them.
- `GET /links?tag=sale` lists links with that tag.
- `GET /links?status=` accepts `active`, `disabled`, `expired`, `protected`, `scheduled`, `expiring` (expires within 7 days), `limited` (has a click limit), `limit_near` (80% or more used), `universal`, `review`, `stale` (older than a week with no click in the last 30 days). Works together with `q` and `tag`.
- Tags need migration 015; before it runs, creating a link with tags returns a `tags` error and nothing is created.

## Last click and period comparison

- `GET /links` and `GET /links/{id}` include `last_click_at` (ISO time, or `null` when never clicked).
- `GET /stats` also returns `top` (clicks only: your 5 most clicked links and bio buttons as `{type, id, label, n}`), `hours_utc` (24 counts, index = hour of day in UTC) and `busiest_hour_utc` (0-23 or `null`).
- `GET /stats` and `GET /links/{id}/stats` include `previous` (`total`, `unique` of the same number of days just before this period) and `previous.change_percent` (`total`, `unique`: whole percent, `null` when the earlier period had no clicks).

## Signups, polls and saved copies (migration 016)

- Block types `subscribe` (email signup; optional `title`, `description`, `button`) and `poll` (`title` = question, `options` = 2-6 as a list or one per line, each up to 60 characters). Both follow the Phase 2 switch. Block JSON has `options` (list or `null`).
- `GET /page/subscribers`: `{id, email, block_id, created_at}`, `limit` (max 100) and `page`, `meta.total`. `?format=csv` returns every address as CSV. `DELETE /page/subscribers/{id}`: removes one (404 if not yours).
- `GET /page/blocks/{id}/votes`: `{total, options: [{label, votes, percent}]}`. 422 when the block is not a poll. One vote per visitor (a hash of address and browser).
- `GET /page/snapshots`, `POST /page/snapshots` (`label` optional, 201), `DELETE /page/snapshots/{id}`, `POST /page/snapshots/{id}/restore` -> `{restored, skipped, removed}`. A copy holds profile, look, social icons and all blocks; the newest 10 are kept. Restore updates existing blocks in place (click counts stay), re-adds deleted ones, removes newer ones, and skips blocks that fail today's checks.
- Without migration 016 these endpoints return 503 with a hint.

## Bio page blocks

- Types: `link`, `header`, `text`, and `contact_form`, `product`, `embed`, `vcard` when enabled. `text` needs `description` (max 500 characters in the editor); `title` is optional.
- Fields: `title`, `url`, `description`, `price`, `button`, `featured` (boolean, links show larger with a star), `enabled`, `starts_at`, `ends_at`, `group_id`. Block JSON also has `id`, `type`, `position`, `icon`.
- `POST /page/blocks` returns 201 and the block, added at the end. `PATCH /page/blocks/{id}` changes only the fields sent (`""` clears a text field); the type cannot change. `DELETE` returns `{"deleted": true}`. Not your block: 404. Invalid: 422 with `fields`.
- `POST /page/blocks/order` with `ids`: listed blocks come first in that order, the rest follow in their old order. Returns all blocks.
- Read-only keys can only use `GET`.

## Bio page templates and icons

- `GET /page/templates`: 27 templates (`id`, `niche`, `colors`, `shape`, `style`, `font`, `starter`) and `social_platforms` (`key`, `label`).
- `POST /page/template` with `id` (and optional `starter_content: true`) puts the look on your page and clears custom colours. With `starter_content` it also fills an empty bio and, only when your page has no blocks, adds the starter links **switched off** (their addresses are placeholders). Response: `page` and `starter_blocks_added`. Unknown id: 422. A template `id` also works as `theme` in `PATCH /page`.
- `PATCH /page` with `socials`: `{"socials": {"instagram": "https://instagram.com/you", "email": "you@example.com"}}`. Platforms you send are changed, others stay, `""` removes one. Invalid address: 422 with `fields["socials.<platform>"]`.
- `GET /page` returns `icon` on every link block: the platform key (`instagram`, `youtube`, ...) or `null`. The public page draws that logo on the button.

## Search engines and crawlers

No API call is needed; this is built in.

- `/sitemap.xml`: the main domain lists the site pages, the bio domain lists every published bio page with `lastmod`. Submit each in Google Search Console and Bing Webmaster Tools.
- `/robots.txt`: explicit `Allow: /` groups for search engines (Googlebot, Bingbot, DuckDuckBot, YandexBot, Baiduspider, Applebot, Slurp and more), social preview bots (facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, WhatsApp, TelegramBot, Discordbot) and AI assistants (OAI-SearchBot, PerplexityBot, ClaudeBot and more). App pages, `/api/` and sign-in stay disallowed. Link domains and the API domain disallow everything.
- IndexNow: publishing or editing a bio page pings `api.indexnow.org` (at most once per page per 10 minutes). The key file is served at `/<key>.txt` on the main and bio domains. Admin > Search shows the key files, can send every page at once, and can turn pings off.

## Sign-up and sign-in protection

- Sign-up (email or Google) is limited to allowed email domains: Gmail and Outlook by default (`gmail.com`, `googlemail.com`, `outlook.com`, `hotmail.com`, `live.com`, `msn.com`). A super admin edits the list in **Admin > Security**. Existing accounts are not affected.
- Cloudflare Turnstile can be switched on in **Admin > Security** (site key and secret key). It appears on sign-in, sign-up and password reset.
- Brute force: only failed sign-ins count. 5 failures for one email or 20 from one connection lock sign-in for 15 minutes; 100 from one connection lock it for a day.
- SQL injection: all queries use prepared statements, a test blocks new text inside SQL, and scanner payloads in a URL get a `400`.
