-- Country routes, destination health checks and the weekly email report. Additive; columns are added only when missing.
CREATE TABLE IF NOT EXISTS link_geo_routes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  link_id BIGINT UNSIGNED NOT NULL,
  country CHAR(2) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  UNIQUE KEY uq_geo (link_id, country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'has_geo');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN has_geo TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'health_status');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN health_status VARCHAR(10) NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'health_code');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN health_code SMALLINT UNSIGNED NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'health_fails');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN health_fails TINYINT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'health_checked_at');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN health_checked_at DATETIME NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'health_alerted_at');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN health_alerted_at DATETIME NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'weekly_report');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN weekly_report TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'weekly_report_sent_at');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN weekly_report_sent_at DATETIME NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'health_alerts');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN health_alerts TINYINT(1) NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
