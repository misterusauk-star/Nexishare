-- Links may pick one of the active site domains (NULL = follow the default domain).
-- Users may exist without a bio username: they claim one later from the dashboard.
ALTER TABLE links ADD COLUMN domain_id BIGINT UNSIGNED NULL AFTER slug;
ALTER TABLE links ADD KEY idx_links_domain (domain_id);
ALTER TABLE users MODIFY username VARCHAR(40) NULL;
