-- Add 'circuito' to the location types enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE TYPE location_type AS ENUM ('revision', 'escuela_conductores', 'policlinico', 'circuito');
    ELSE
        ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'circuito';
    END IF;
END $$;

-- Insert the 'Circuito' location if it doesn't exist
INSERT INTO locations (name, type, description)
SELECT 'Circuito', 'circuito', 'Ubicación para cámaras de circuito cerrado'
WHERE NOT EXISTS (
    SELECT 1 FROM locations WHERE type = 'circuito'
);
