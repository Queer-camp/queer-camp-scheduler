-- PIN login for admin_users: an optional hashed 4-digit PIN as a faster
-- alternative to the magic-link email flow. pin_failed_attempts/pin_locked_until
-- implement account lockout after repeated wrong-PIN attempts.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS pin_hash text,
  ADD COLUMN IF NOT EXISTS pin_failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;
