-- Optional click limit per link. click_count only counts visits for links that have a limit. Each column is added only when missing.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'max_clicks');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN max_clicks INT UNSIGNED NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'links' AND column_name = 'click_count');
SET @q = IF(@c = 0, 'ALTER TABLE links ADD COLUMN click_count INT UNSIGNED NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s2 FROM @q; EXECUTE s2; DEALLOCATE PREPARE s2;
