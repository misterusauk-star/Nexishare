-- Per-link extras: send iPhone / Android visitors to their own destination, and a fallback for expired links.
-- Each column is added only when it is missing, so a half-applied run can be repeated.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'ios_url');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN ios_url VARCHAR(2048) NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'android_url');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN android_url VARCHAR(2048) NULL', 'SELECT 1');
PREPARE s2 FROM @q; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'expired_url');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN expired_url VARCHAR(2048) NULL', 'SELECT 1');
PREPARE s3 FROM @q; EXECUTE s3; DEALLOCATE PREPARE s3;
