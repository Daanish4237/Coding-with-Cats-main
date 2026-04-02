-- ──────────────────────────────────────────
--  users table  –  required by login.php
--                  and register.php
--  Run this once in your database.
-- ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(80)  NOT NULL UNIQUE,
  `email`      VARCHAR(160) NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('User','Admin') NOT NULL DEFAULT 'User',
  `last_login` DATETIME     DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
