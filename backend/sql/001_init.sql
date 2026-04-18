-- Link & Learn - initial schema for PHP + MySQL/MariaDB
-- Tested with MySQL 8 / MariaDB 10.4+

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  avatar_url TEXT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  login_type VARCHAR(32) NOT NULL DEFAULT 'personal', -- personal | institutional
  account_status VARCHAR(32) NOT NULL DEFAULT 'active', -- active | pending | rejected | suspended
  profile_completed TINYINT(1) NOT NULL DEFAULT 0,
  bio TEXT NULL,
  skills_json JSON NULL,
  education_json JSON NULL,
  experience_json JSON NULL,
  publications_json JSON NULL,
  certificates_json JSON NULL,
  departments_json JSON NULL,
  catalogue_json JSON NULL,
  org_type VARCHAR(64) NULL,
  verified_badge TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(32) NOT NULL,
  author_avatar TEXT NULL,
  content TEXT NOT NULL,
  image_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_posts_created_at (created_at),
  KEY idx_posts_user_id (user_id),
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  KEY idx_post_likes_user (user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post_comments_post (post_id),
  KEY idx_post_comments_created_at (created_at),
  CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  category VARCHAR(128) NULL,
  tags_json JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending | published | flagged | rejected
  ai_score DECIMAL(5,2) NULL,
  ai_category VARCHAR(128) NULL,
  admin_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_articles_status_created (status, created_at),
  KEY idx_articles_user_created (user_id, created_at),
  CONSTRAINT fk_articles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  organizer_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(128) NULL,
  location VARCHAR(255) NULL,
  date_time DATETIME NULL,
  capacity INT NOT NULL DEFAULT 0,
  registered_count INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'upcoming', -- upcoming | ongoing | completed | cancelled
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_created (created_at),
  KEY idx_events_user (user_id),
  CONSTRAINT fk_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  ticket_id VARCHAR(64) NOT NULL,
  attended TINYINT(1) NOT NULL DEFAULT 0,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  UNIQUE KEY uq_event_ticket (ticket_id),
  KEY idx_event_attendees_user (user_id),
  CONSTRAINT fk_event_attendees_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_attendees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vacancies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  institution_name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  role_type VARCHAR(128) NULL,
  department VARCHAR(255) NULL,
  eligibility TEXT NULL,
  description TEXT NULL,
  deadline VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open', -- open | closed
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vacancies_status_created (status, created_at),
  KEY idx_vacancies_user_created (user_id, created_at),
  CONSTRAINT fk_vacancies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vacancy_applicants (
  vacancy_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'applied',
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vacancy_id, user_id),
  KEY idx_vacancy_applicants_user (user_id),
  CONSTRAINT fk_vacancy_applicants_vacancy FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE,
  CONSTRAINT fk_vacancy_applicants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS requirements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  institution_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(255) NOT NULL,
  description TEXT NULL,
  quantity VARCHAR(64) NULL,
  budget_min VARCHAR(64) NULL,
  budget_max VARCHAR(64) NULL,
  deadline VARCHAR(64) NULL,
  location VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open', -- open | awarded | closed
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_requirements_status_created (status, created_at),
  KEY idx_requirements_user_created (user_id, created_at),
  CONSTRAINT fk_requirements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS requirement_quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  requirement_id BIGINT UNSIGNED NOT NULL,
  vendor_user_id BIGINT UNSIGNED NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  price VARCHAR(64) NULL,
  timeline VARCHAR(255) NULL,
  terms TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending', -- pending | awarded | rejected
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_requirement_vendor (requirement_id, vendor_user_id),
  KEY idx_quotes_requirement (requirement_id),
  CONSTRAINT fk_quotes_requirement FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_vendor FOREIGN KEY (vendor_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user1_id BIGINT UNSIGNED NOT NULL,
  user2_id BIGINT UNSIGNED NOT NULL,
  last_message TEXT NULL,
  last_message_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_conversation_pair (user1_id, user2_id),
  KEY idx_conversations_last_message_at (last_message_at),
  CONSTRAINT fk_conversations_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conversations_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_messages_conversation_created (conversation_id, created_at),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed an admin user (password: admin123). Change after first login.
-- Uses bcrypt hash.
INSERT INTO users (email, password_hash, name, role, login_type, account_status, profile_completed, verified_badge)
VALUES (
  'admin@linklearn.local',
  '$2y$10$C7h8Yjq6gpz9HEGTSf4C6O4YB2p9Q9nH4nPjA9y8m7gE2Q8Oa9V1q',
  'Platform Admin',
  'admin',
  'institutional',
  'active',
  1,
  1
)
ON DUPLICATE KEY UPDATE email = email;

