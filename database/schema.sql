-- Chat App Database Schema
-- Run this if you prefer manual DB setup instead of Laravel migrations

CREATE DATABASE IF NOT EXISTS chat_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE chat_app;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    password        VARCHAR(255) NOT NULL,
    is_online       TINYINT(1) NOT NULL DEFAULT 0,
    last_seen_at    TIMESTAMP NULL DEFAULT NULL,
    remember_token  VARCHAR(100) NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sender_id       BIGINT UNSIGNED NOT NULL,
    receiver_id     BIGINT UNSIGNED NOT NULL,
    type            VARCHAR(255) NOT NULL DEFAULT 'text',
    content         TEXT NOT NULL,
    media_url       LONGTEXT NULL,
    duration_seconds INT UNSIGNED NULL,
    delivered_at    TIMESTAMP NULL DEFAULT NULL,
    read_at         TIMESTAMP NULL DEFAULT NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,

    CONSTRAINT fk_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_conversation (sender_id, receiver_id),
    INDEX idx_created_at   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Call Sessions Table
CREATE TABLE IF NOT EXISTS call_sessions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    caller_id           BIGINT UNSIGNED NOT NULL,
    callee_id           BIGINT UNSIGNED NOT NULL,
    type                VARCHAR(255) NOT NULL,
    status              VARCHAR(255) NOT NULL DEFAULT 'ringing',
    offer_sdp           LONGTEXT NULL,
    answer_sdp          LONGTEXT NULL,
    caller_candidates   JSON NULL,
    callee_candidates   JSON NULL,
    started_at          TIMESTAMP NULL DEFAULT NULL,
    ended_at            TIMESTAMP NULL DEFAULT NULL,
    created_at          TIMESTAMP NULL DEFAULT NULL,
    updated_at          TIMESTAMP NULL DEFAULT NULL,

    CONSTRAINT fk_call_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_callee FOREIGN KEY (callee_id) REFERENCES users(id) ON DELETE CASCADE,

    INDEX idx_call_status (caller_id, callee_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Personal Access Tokens (Laravel Sanctum)
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type  VARCHAR(255) NOT NULL,
    tokenable_id    BIGINT UNSIGNED NOT NULL,
    name            VARCHAR(255) NOT NULL,
    token           VARCHAR(64) NOT NULL UNIQUE,
    abilities       TEXT NULL,
    last_used_at    TIMESTAMP NULL DEFAULT NULL,
    expires_at      TIMESTAMP NULL DEFAULT NULL,
    created_at      TIMESTAMP NULL DEFAULT NULL,
    updated_at      TIMESTAMP NULL DEFAULT NULL,

    INDEX idx_tokenable (tokenable_type, tokenable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
