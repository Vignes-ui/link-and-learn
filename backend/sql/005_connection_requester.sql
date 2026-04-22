SET @has_requester_column = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_connections'
    AND COLUMN_NAME = 'requester_user_id'
);

SET @add_requester_column = IF(
  @has_requester_column = 0,
  'ALTER TABLE user_connections ADD COLUMN requester_user_id BIGINT UNSIGNED NULL AFTER user_id_2',
  'SELECT 1'
);
PREPARE stmt FROM @add_requester_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_requester_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user_connections'
    AND CONSTRAINT_NAME = 'fk_user_connections_requester'
);

SET @add_requester_fk = IF(
  @has_requester_fk = 0,
  'ALTER TABLE user_connections ADD CONSTRAINT fk_user_connections_requester FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_requester_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
