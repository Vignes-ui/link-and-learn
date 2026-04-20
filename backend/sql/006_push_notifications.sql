-- Production push notification delivery audit table.
-- Safe to run after 001_init.sql, 002_connections.sql, 003_notifications.sql,
-- 004_ads.sql, and 005_institution_endorsements_groups.sql.

CREATE TABLE IF NOT EXISTS push_notification_deliveries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notification_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'onesignal',
  provider_message_id VARCHAR(128) NULL,
  status ENUM('sent','failed') NOT NULL,
  response_code INT NULL,
  response_body TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_push_deliveries_notification (notification_id),
  KEY idx_push_deliveries_user_created (user_id, created_at),
  CONSTRAINT fk_push_deliveries_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_push_deliveries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
