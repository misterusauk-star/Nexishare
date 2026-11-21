-- A domain can now be dedicated to bio pages ("bio"). Re-running this is harmless.
ALTER TABLE site_domains MODIFY purpose ENUM('site','api','bio') NOT NULL DEFAULT 'site';
