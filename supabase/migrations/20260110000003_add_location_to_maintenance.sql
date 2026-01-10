-- Migration to add location_id to maintenance_records table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'location_id') THEN
        ALTER TABLE maintenance_records ADD COLUMN location_id UUID REFERENCES locations(id);
    END IF;
END $$;
