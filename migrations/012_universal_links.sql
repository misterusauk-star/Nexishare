-- Universal links: a link with only device URLs and no destination of its own. The column is added only when missing.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'universal');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN universal TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
