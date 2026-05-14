CREATE DATABASE IF NOT EXISTS TimeCell_db;
USE TimeCell_db;

-- Users Table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  firstname  VARCHAR(100) NOT NULL,
  lastname   VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  lang       VARCHAR(5) NOT NULL DEFAULT 'th',
  theme      VARCHAR(10) NOT NULL DEFAULT 'light',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
 
-- PDF History ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_history (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  file_path  VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at)
);
 
-- Default ADMIN User ────────────────────────────────────────────────────────
INSERT INTO users (firstname, lastname, email, password, lang, theme)
VALUES (
  'Admin',
  'TimeCell',
  'admin@mail.com',
  '$2b$12$Z89Ll9EpNgodN9stgoPOOORW6j5qHdXzsBhkmGqERuvcc7ICeDkOS', -- password: 123
  'th',
  'light'
) ON DUPLICATE KEY UPDATE id = id;