# REST API

JSON over HTTPS. Base URL: `{APP_URL}/api/v1`. The same reference, with your real URL filled in, is served by your install at `/docs`.

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

## Rate limits

Each key gets a fixed number of requests per minute (default 60, set by the server owner in **Admin > Settings > API**). Past it you get `429` with a `Retry-After` header.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/links` | List your links. Query: `q`, `page`, `limit` (max 100) |
| POST | `/links` | Create a link. Only `target_url` is required |
| GET | `/links/{id}` | One link |
| PATCH | `/links/{id}` | Change fields; send only what changes |
| DELETE | `/links/{id}` | Delete the link and its clicks. Returns 204 |
| GET | `/links/{id}/stats` | Stats for one link. Query: `days` (1 to 365) |
| GET | `/stats` | Stats across everything you own. Query: `days`, `kind` (`clicks` or `views`) |
| GET | `/page` | Your bio page and blocks |
| PATCH | `/page` | `display_name`, `bio`, `theme`, `published` |

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

Only `target_url` is required. Optional fields: `slug`, `title`, `password`, `starts_at`, `expires_at`, `starts_in`, `expires_in`, `max_clicks`, `enabled`, `group_id`, `team_id`, `domain_id` / `domain`, `ios_url`, `android_url`, `windows_url`, `mac_url`, `linux_url` (platform-specific destinations; a platform without one uses `target_url`), `expired_url` (where to go after expiry), and the campaign tags `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` (added to `target_url` as query parameters). Leave a field out (or send `null` for the dates) to skip it. Dates are ISO 8601, e.g. `2026-12-31T23:59:00Z`; without an offset they are read as UTC. `expires_at` must be later than `starts_at`.

**Scheduling defaults:** no `starts_at` = live immediately; no `expires_at` = never expires. Instead of dates you can send `starts_in` (from now) and `expires_in` (from the start, or from now) as a number plus `m`, `h`, `d` or `w`, e.g. `"starts_in": "1d", "expires_in": "7d"`. Do not send both forms for the same side. On update `null` clears a side; unsent sides are kept. Responses include `status`: `active`, `scheduled`, `expired`, `disabled`, `review` or `moderated`.

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
Responses include `domain`, `domain_id` and a `short_url` built from that domain. A link answers only on its own domain.

## Abuse limits

500 new links per account per day (50 until the email is confirmed), 10 active keys, 5 new keys per hour, and 30 wrong-key attempts per 10 minutes per IP.


## Bulk create

`POST /links/bulk` with `{"links": [ {...}, {...} ]}` creates up to 50 links. Each item takes the fields of `POST /links` and is validated on its own.
The response is `{"created": n, "failed": m, "results": [{"ok": true, "data": {...}} | {"ok": false, "fields": {...}}]}` in request order.
Status `201` if at least one link was created, `422` if none. The daily limit counts every item.
