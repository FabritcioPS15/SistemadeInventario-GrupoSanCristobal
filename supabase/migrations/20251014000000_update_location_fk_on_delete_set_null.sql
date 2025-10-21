-- Update FK constraints to set related records' location references to NULL when a location is deleted
-- This preserves assets, users, cameras, shipments, and visits history

-- Ensure nullable columns for relations
ALTER TABLE IF EXISTS assets ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE IF EXISTS users ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE IF EXISTS cameras ALTER COLUMN location_id DROP NOT NULL;
ALTER TABLE IF EXISTS shipments ALTER COLUMN from_location_id DROP NOT NULL;
ALTER TABLE IF EXISTS shipments ALTER COLUMN to_location_id DROP NOT NULL;
ALTER TABLE IF EXISTS sutran_visits ALTER COLUMN location_id DROP NOT NULL;

-- Drop existing FK constraints if they exist
ALTER TABLE IF EXISTS assets DROP CONSTRAINT IF EXISTS assets_location_id_fkey;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_location_id_fkey;
ALTER TABLE IF EXISTS cameras DROP CONSTRAINT IF EXISTS cameras_location_id_fkey;
ALTER TABLE IF EXISTS shipments DROP CONSTRAINT IF EXISTS shipments_from_location_id_fkey;
ALTER TABLE IF EXISTS shipments DROP CONSTRAINT IF EXISTS shipments_to_location_id_fkey;
ALTER TABLE IF EXISTS sutran_visits DROP CONSTRAINT IF EXISTS sutran_visits_location_id_fkey;

-- Recreate FKs with ON DELETE SET NULL
ALTER TABLE IF EXISTS assets
  ADD CONSTRAINT assets_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS users
  ADD CONSTRAINT users_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS cameras
  ADD CONSTRAINT cameras_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS shipments
  ADD CONSTRAINT shipments_from_location_id_fkey
  FOREIGN KEY (from_location_id) REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS shipments
  ADD CONSTRAINT shipments_to_location_id_fkey
  FOREIGN KEY (to_location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- sutran_visits already created with ON DELETE SET NULL in earlier migration, but we enforce it here too
ALTER TABLE IF EXISTS sutran_visits
  ADD CONSTRAINT sutran_visits_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;


