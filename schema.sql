-- Struktur database Asesmen Merdeka (MySQL 5.7+/MariaDB 10.3+)
-- Opsional: tabel juga dibuat otomatis saat aplikasi pertama kali dijalankan.
-- Impor lewat phpMyAdmin jika user database tidak punya izin CREATE.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'guru',
  theme TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token CHAR(64) NOT NULL PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS docs (
  kind VARCHAR(32) NOT NULL,
  id VARCHAR(64) NOT NULL,
  data LONGTEXT NOT NULL,
  exam_code VARCHAR(16) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT UNSIGNED NULL,
  PRIMARY KEY (kind, id),
  INDEX (exam_code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scores (
  assessment_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (assessment_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS submissions (
  assessment_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  data LONGTEXT NOT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assessment_id, student_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
