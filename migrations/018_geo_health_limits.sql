-- Per-account overrides for the limits of country routes and destination checks. NULL = use the site-wide value or the default.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_geo_per_link');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_geo_per_link INT UNSIGNED NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_geo_links');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_geo_links INT UNSIGNED NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'limit_health_checks_per_hour');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN limit_health_checks_per_hour INT UNSIGNED NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
