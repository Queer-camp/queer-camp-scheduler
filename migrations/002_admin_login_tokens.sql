-- Add one-time login token fields to admin_users
-- These are set when an admin requests a magic link and cleared after use.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS login_token text,
  ADD COLUMN IF NOT EXISTS login_token_expires_at timestamptz;
