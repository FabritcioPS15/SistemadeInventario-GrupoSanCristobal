-- Migration to add missing fields to maintenance_records table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'failure_cause') THEN
        ALTER TABLE maintenance_records ADD COLUMN failure_cause TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'solution_applied') THEN
        ALTER TABLE maintenance_records ADD COLUMN solution_applied TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'work_hours') THEN
        ALTER TABLE maintenance_records ADD COLUMN work_hours NUMERIC;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'parts_used') THEN
        ALTER TABLE maintenance_records ADD COLUMN parts_used JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'next_maintenance_date') THEN
        ALTER TABLE maintenance_records ADD COLUMN next_maintenance_date TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'maintenance_frequency') THEN
        ALTER TABLE maintenance_records ADD COLUMN maintenance_frequency INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'total_cost') THEN
        ALTER TABLE maintenance_records ADD COLUMN total_cost NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'warranty_claim') THEN
        ALTER TABLE maintenance_records ADD COLUMN warranty_claim BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'warranty_details') THEN
        ALTER TABLE maintenance_records ADD COLUMN warranty_details TEXT;
    END IF;
END $$;
