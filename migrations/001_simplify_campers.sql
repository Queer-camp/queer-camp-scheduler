-- ─────────────────────────────────────────────────────────────────────────────
-- Simplify campers: scheduling-only identity, no guardian/emergency data
-- Safe to run — wipes test data in registrations and campers first
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Wipe test data (registrations first, campers has FK)
TRUNCATE TABLE registrations;
TRUNCATE TABLE campers;

-- 2. Drop all guardian + emergency columns, and the old chosen_name column
ALTER TABLE campers
  DROP COLUMN IF EXISTS chosen_name,
  DROP COLUMN IF EXISTS guardian_first_name,
  DROP COLUMN IF EXISTS guardian_last_name,
  DROP COLUMN IF EXISTS guardian_email,
  DROP COLUMN IF EXISTS guardian_phone,
  DROP COLUMN IF EXISTS guardian_relationship,
  DROP COLUMN IF EXISTS emergency_same_as_guardian,
  DROP COLUMN IF EXISTS emergency_first_name,
  DROP COLUMN IF EXISTS emergency_last_name,
  DROP COLUMN IF EXISTS emergency_phone,
  DROP COLUMN IF EXISTS emergency_relationship,
  ADD COLUMN chosen_first_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN chosen_last_name  TEXT NOT NULL DEFAULT '';

-- 3. Remove the temporary DEFAULT (table is empty so this is safe)
ALTER TABLE campers
  ALTER COLUMN chosen_first_name DROP DEFAULT,
  ALTER COLUMN chosen_last_name  DROP DEFAULT;
