-- A domain can now be dedicated to bio pages ("bio"). Re-running this is harmless.
ALTER TABLE site_domains MODIFY purpose ENUM('site','api','bio') NOT NULL DEFAULT 'site';
-- Rows saved as "bio" before this update (when the database did not know the value) were stored empty: make them valid.
UPDATE site_domains SET purpose = 'site' WHERE purpose = '';
