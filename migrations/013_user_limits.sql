-- Per-user limit overrides set by an administrator (NULL = use the site-wide value). Each column is added only when missing.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_api_per_minute');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_api_per_minute INT UNSIGNED NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_api_per_day');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_api_per_day INT UNSIGNED NULL', 'SELECT 1');
PREPARE s2 FROM @q; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_max_links');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_max_links INT UNSIGNED NULL', 'SELECT 1');
PREPARE s3 FROM @q; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_max_api_keys');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_max_api_keys INT UNSIGNED NULL', 'SELECT 1');
PREPARE s4 FROM @q; EXECUTE s4; DEALLOCATE PREPARE s4;

