-- Per-account API access set by a super admin. NULL = follow the site policy, 1 = allowed, 0 = blocked.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'api_access');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN api_access TINYINT NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
