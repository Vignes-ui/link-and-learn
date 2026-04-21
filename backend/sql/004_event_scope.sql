ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_scope VARCHAR(32) NOT NULL DEFAULT 'organization' AFTER organizer_name,
  ADD COLUMN IF NOT EXISTS department_name VARCHAR(255) NULL AFTER event_scope,
  ADD COLUMN IF NOT EXISTS club_name VARCHAR(255) NULL AFTER department_name,
  ADD COLUMN IF NOT EXISTS club_description TEXT NULL AFTER club_name;
