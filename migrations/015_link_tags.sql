-- Tags on links: up to 5 short labels, stored comma separated. Added only when missing.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'tags');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN tags VARCHAR(160) NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
