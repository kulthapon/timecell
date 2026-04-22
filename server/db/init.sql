CREATE DATABASE IF NOT EXISTS TimeCell_db;
USE TimeCell_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  lang       VARCHAR(5)   NOT NULL DEFAULT 'th',
  theme      VARCHAR(10)  NOT NULL DEFAULT 'light',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NULL,
  type        ENUM('realtime','classify','detect') NOT NULL,
  image_path  VARCHAR(500) NOT NULL,
  result_json JSON         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
