# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Smart destinations per link: iPhone/iPad and Android visitors can go to their own URL (for example an app store page), and an expired link can redirect to a fallback URL instead of the expired notice. Dashboard: "Different destinations" on new and existing links. API: `ios_url`, `android_url`, `expired_url`. Migration 009.
- API: `POST /api/v1/links/bulk` creates up to 50 links per request with a result per item.
- Admin > Domains opens with a table "What each address does right now" (main, default, bio pages, API) that shows whether the bio and API domains are active or still waiting for Check & activate. Saving a domain before the database updates are applied now shows a clear message instead of an error page.
- `llms.txt` on every domain (a plain-text map for language models: product and docs on the main domain, public pages on the bio domain). `robots.txt` is now per domain: link and API domains disallow everything, the bio domain allows bio pages only. `sitemap.xml` lists site pages on the main domain and bio pages on the bio host, with change frequency and priority.
- Bio domain: a domain type "Bio pages only" (for example bio.example.com). Bio pages, their redirects and vCards are served only there, short links only on link domains. Bio page URLs (dashboard, admin, QR, vCard, sitemap, canonical tags) follow it. Migration 008.
- Campaign tags (UTM): a collapsible section on the new-link form and `utm_*` fields in the API are added to the destination URL.
- Admin > Domains lists short name ideas (go, to, s, u, bio, me, qr, hi) for link domains.
- Links can live on any active site domain. Dashboard: a Domain dropdown on new and existing links, with the default domain preselected. API: `domain_id` / `domain` on create and update, `GET /api/v1/domains`, and `domain` / `domain_id` in every link response. A link answers only on its own domain; bio pages stay on the default domain. Migration 007.
- Abuse limits: 500 links per account per day (50 unverified), 5 new API keys per hour, wrong-key throttle per IP, email confirmation required for keys when verification is on.

- Admin > Domains shows how many links sit on each domain. Deleting a domain moves its links back to following the default. The links table shows each link's full address.

### Fixed (links in the app)
- "View page", the header page link and the bio/link/report links in Admin now open the public address on the right domain (the default domain, or the link's own domain) instead of a relative path on the main domain, which returned 404.

### Changed (accounts)
- Registration asks only for email and password. The bio page is created later from Dashboard > Bio page, where the person picks a name. Google sign-up works the same way. `users.username` may be empty.
- API keys page shows the API domain (for example api.example.com) as the request address.

### Fixed
- Choosing "Bio pages only" silently turned into a link domain when migration 008 was not applied (the database stored an empty type). The Domains page now has a permanent Database panel that lists waiting updates with a Run database updates button, saving a type the database does not know is refused with a clear message, and migration 008 repairs rows saved empty.
- Sign-in links (verify, reset, dashboard e-mail buttons) and the Google OAuth redirect now always use the main domain, so making a link domain the default no longer breaks Google sign-in. Sitemap, robots and metadata base follow the main domain, and each host lists its own sitemap.
- API: `starts_at` and `expires_at` are now truly optional on create (missing, `null` or empty all mean no date), matching the docs.

### Docs
- `/docs` now has a field table (required vs optional), more curl examples and samples in JavaScript, Python, PHP, Go and Ruby.

### Changed
- **Breaking:** user-owned custom domains are gone. Domains are now managed by the Super Admin in Admin > Domains. Run `npm run migrate`: migration 004 is additive and copies old user domains in as *pending* admin domains, 005 drops the old `domains` table. Remove `APP_SERVER_IP` and `APP_CNAME_TARGET` from your environment if you set them.
- Links and bio pages are served only on the default domain. Every other host returns 404 for them. App pages (home, login, dashboard, admin) run on the main domain (`APP_URL` host); other domains redirect them there. The REST API (`/api/v1`) is accepted only on an API domain once one is active. Unknown hosts return 404.
- Every public URL is built from the current default domain at render time. Nothing about a domain is stored on links or pages.
- `X-Forwarded-Host` and `X-Forwarded-Proto` are trusted only when `TRUST_PROXY=true`.
- Slugs and usernames: lowercase ASCII, 3 to 32 characters. Existing names are not changed, but renames and new names follow the new rules.

### Added
- Domain purpose: a link domain and an API domain (for example `link.` and `api.` subdomains). Migration 006.
- Names that match our own subdomains (`link`, `api`, ...) are reserved automatically.
- Admin > Domains: add, edit, disable, delete, Check & activate (HTTPS check of `/api/health`, exact failure reason, explicit override), change default with confirmation and audit entry. The `APP_URL` host is seeded as the default.
- `GET /api/health`.
- Reserved route and static names, editable reserved, brand and sensitive-word lists, look-alike detection, review queue (Admin > Names and safety).
- Destination safety: raw IPs, private ranges, credentials, shortener chaining and self-loops rejected; optional Google Safe Browsing; six-hourly re-check.
- Public report page and `POST /api/report`, one-click admin actions, warning page for reported or disabled links, rate limits on name creation.
- Performance: short-TTL cache for slug lookups, batched asynchronous click logging flushed on shutdown, new indexes, lazy-loaded mail library.

### Removed
- User domain UI, API routes, DNS and TXT verification.

## [1.0.0] - 2026-11-14

First release.

### Added
- Web installer at `/install` that checks the database, runs migrations, creates the Super Admin and locks itself
- Accounts: register, login, logout, password reset, optional email verification, optional Google sign-in
- Link-in-bio pages with themes, social icons, unlimited links and drag-and-drop ordering
- URL shortener with custom slugs, expiry, start dates, password protection and enable/disable
- QR codes in PNG and SVG with colour and logo options
- Analytics: clicks, uniques, country, device, browser, referrer, UTM campaigns, hashed IPs, bot filtering
- REST API with keys, rate limits and docs at `/docs`
- Admin panel: dashboard, users, moderation with bulk actions, blocklist, reports, settings, audit log
- Email: SMTP per mailbox type, database queue with retry, daily limits, logs, test button
- White-label branding from environment and admin settings
- Phase 2 (switchable with `FEATURE_PHASE2`): custom domains, vCard, contact form blocks, product and service blocks, embeds, scheduled links, link groups, team workspaces, CSV import and export, conversion goals
- English and Spanish translations
