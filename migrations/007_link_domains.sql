-- Links may pick one of the active site domains (NULL = follow the default domain).
-- Users may exist without a bio username: they claim one later from the dashboard.
-- Each step checks first, so a half-applied run can be repeated safely.

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'domain_id');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN domain_id BIGINT UNSIGNED NULL AFTER slug', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'links' AND index_name = 'idx_links_domain');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD KEY idx_links_domain (domain_id)', 'SELECT 1');
PREPARE s2 FROM @q; EXECUTE s2; DEALLOCATE PREPARE s2;

-- Re-running MODIFY is harmless.
ALTER TABLE users MODIFY username VARCHAR(40) NULL;
