CREATE TABLE IF NOT EXISTS requirement_quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requirement_id BIGINT UNSIGNED NOT NULL,
  vendor_user_id BIGINT UNSIGNED NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  price VARCHAR(64) NULL,
  timeline VARCHAR(255) NULL,
  terms TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_requirement_vendor (requirement_id, vendor_user_id),
  KEY idx_quotes_requirement (requirement_id),
  CONSTRAINT fk_quotes_requirement FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_vendor FOREIGN KEY (vendor_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @has_quote_vendor_name = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'requirement_quotes'
    AND COLUMN_NAME = 'vendor_name'
);
SET @add_quote_vendor_name = IF(
  @has_quote_vendor_name = 0,
  'ALTER TABLE requirement_quotes ADD COLUMN vendor_name VARCHAR(255) NOT NULL DEFAULT '''' AFTER vendor_user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_quote_vendor_name;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_quote_status = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'requirement_quotes'
    AND COLUMN_NAME = 'status'
);
SET @add_quote_status = IF(
  @has_quote_status = 0,
  'ALTER TABLE requirement_quotes ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT ''pending'' AFTER terms',
  'SELECT 1'
);
PREPARE stmt FROM @add_quote_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_quote_submitted_at = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'requirement_quotes'
    AND COLUMN_NAME = 'submitted_at'
);
SET @add_quote_submitted_at = IF(
  @has_quote_submitted_at = 0,
  'ALTER TABLE requirement_quotes ADD COLUMN submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @add_quote_submitted_at;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_quote_unique = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'requirement_quotes'
    AND INDEX_NAME = 'uq_requirement_vendor'
);
SET @add_quote_unique = IF(
  @has_quote_unique = 0,
  'ALTER TABLE requirement_quotes ADD UNIQUE KEY uq_requirement_vendor (requirement_id, vendor_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @add_quote_unique;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
