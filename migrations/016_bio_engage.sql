-- Email signups from bio pages, poll votes, and saved copies (snapshots) of a bio page. All additive, safe to run twice.
CREATE TABLE IF NOT EXISTS bio_subscribers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  block_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subscriber (block_id, email),
  INDEX idx_subscriber_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS poll_votes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  block_id BIGINT UNSIGNED NOT NULL,
  option_idx TINYINT UNSIGNED NOT NULL,
  voter_hash CHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vote (block_id, voter_hash),
  INDEX idx_vote_block (block_id, option_idx)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS page_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) NOT NULL,
  data MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_snapshot_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
