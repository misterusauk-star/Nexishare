-- Domain purpose: "site" (main, link and other domains) or "api" (serves the REST API only).
-- Additive. Existing domains stay "site".
ALTER TABLE site_domains ADD COLUMN purpose ENUM('site','api') NOT NULL DEFAULT 'site' AFTER status;

-- Names that match our own subdomains and the API must never be claimable.
INSERT IGNORE INTO slug_lists (kind, value) VALUES ('reserved','link'),('reserved','links'),('reserved','api'),('reserved','dashboard'),('reserved','admin');
