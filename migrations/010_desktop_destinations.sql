-- Per-link destinations for Windows, macOS and Linux visitors. Each column is added only when missing.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'windows_url');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN windows_url VARCHAR(2048) NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'mac_url');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN mac_url VARCHAR(2048) NULL', 'SELECT 1');
PREPARE s2 FROM @q; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'linux_url');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN linux_url VARCHAR(2048) NULL', 'SELECT 1');
PREPARE s3 FROM @q; EXECUTE s3; DEALLOCATE PREPARE s3;
