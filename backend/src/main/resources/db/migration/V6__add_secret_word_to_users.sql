ALTER TABLE users
  ADD COLUMN secret_word_hash VARCHAR(255) NULL AFTER password,
  ADD COLUMN secret_word_last_password_reset_at TIMESTAMP NULL AFTER created_at;
