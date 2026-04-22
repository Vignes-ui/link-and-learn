SET @has_parent_comment_column = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_comments'
    AND COLUMN_NAME = 'parent_comment_id'
);

SET @add_parent_comment_column = IF(
  @has_parent_comment_column = 0,
  'ALTER TABLE post_comments ADD COLUMN parent_comment_id BIGINT UNSIGNED NULL AFTER user_id',
  'SELECT 1'
);
PREPARE stmt FROM @add_parent_comment_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_parent_comment_index = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_comments'
    AND INDEX_NAME = 'idx_post_comments_parent'
);

SET @add_parent_comment_index = IF(
  @has_parent_comment_index = 0,
  'ALTER TABLE post_comments ADD INDEX idx_post_comments_parent (post_id, parent_comment_id, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @add_parent_comment_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_parent_comment_fk = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'post_comments'
    AND CONSTRAINT_NAME = 'fk_post_comments_parent'
);

SET @add_parent_comment_fk = IF(
  @has_parent_comment_fk = 0,
  'ALTER TABLE post_comments ADD CONSTRAINT fk_post_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @add_parent_comment_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
