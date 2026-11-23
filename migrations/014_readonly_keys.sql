-- Read-only API keys: they can list and read, never create, change or delete. Added only when missing.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'api_keys' AND column_name = 'read_only');
SET @q = IF(@c = 0, 'ALTER TABLE api_keys ADD COLUMN read_only TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
