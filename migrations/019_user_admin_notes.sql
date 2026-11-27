-- Why an account was suspended (shown to the person at sign-in) and a private note for admins.
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'suspend_reason');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN suspend_reason VARCHAR(190) NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'admin_note');
SET @q = IF(@c = 0, 'ALTER TABLE users ADD COLUMN admin_note VARCHAR(500) NULL', 'SELECT 1');
PREPARE s1 FROM @q; EXECUTE s1; DEALLOCATE PREPARE s1;
