-- Add is_active flag to camps. Only one camp should be active at a time.
-- A DB trigger enforces this: setting a camp active clears all others.

ALTER TABLE camps ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION enforce_single_active_camp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE camps SET is_active = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_active_camp ON camps;
CREATE TRIGGER single_active_camp
  AFTER INSERT OR UPDATE OF is_active ON camps
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_active_camp();
