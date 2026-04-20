-- Advertisement module table.
-- Safe to run on an existing database; creates the table only if it is missing.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS ads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  advertiser_name VARCHAR(255) NOT NULL,
  advertiser_role VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  placement VARCHAR(64) NOT NULL DEFAULT 'feed',
  target_audience_json JSON NULL,
  destination_url TEXT NULL,
  budget VARCHAR(64) NULL,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  admin_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ads_status_created (status, created_at),
  KEY idx_ads_user_created (user_id, created_at),
  CONSTRAINT fk_ads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
