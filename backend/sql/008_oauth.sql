SET @has_role_selected = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role_selected'
);
SET @add_role_selected = IF(
  @has_role_selected = 0,
  'ALTER TABLE users ADD COLUMN role_selected TINYINT(1) NOT NULL DEFAULT 1 AFTER role',
  'SELECT 1'
);
PREPARE stmt FROM @add_role_selected;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_oauth_provider = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'oauth_provider'
);
SET @add_oauth_provider = IF(
  @has_oauth_provider = 0,
  'ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(32) NULL AFTER account_status',
  'SELECT 1'
);
PREPARE stmt FROM @add_oauth_provider;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_oauth_subject = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'oauth_subject'
);
SET @add_oauth_subject = IF(
  @has_oauth_subject = 0,
  'ALTER TABLE users ADD COLUMN oauth_subject VARCHAR(255) NULL AFTER oauth_provider',
  'SELECT 1'
);
PREPARE stmt FROM @add_oauth_subject;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_oauth_unique = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'uq_users_oauth'
);
SET @add_oauth_unique = IF(
  @has_oauth_unique = 0,
  'ALTER TABLE users ADD UNIQUE KEY uq_users_oauth (oauth_provider, oauth_subject)',
  'SELECT 1'
);
PREPARE stmt FROM @add_oauth_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
