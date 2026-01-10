-- Migration to fix RLS policies for maintenance_records table

-- Enable RLS (just in case it wasn't enabled)
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Enable all for all users" ON maintenance_records;
    DROP POLICY IF EXISTS "Users can view all maintenance records" ON maintenance_records;
    DROP POLICY IF EXISTS "Users can insert maintenance records" ON maintenance_records;
    DROP POLICY IF EXISTS "Users can update maintenance records" ON maintenance_records;
    DROP POLICY IF EXISTS "Users can delete maintenance records" ON maintenance_records;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create permissive policies (matching the existing security model in other migrations)
CREATE POLICY "Enable all for all users" ON maintenance_records
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ensure updated_at trigger exists (best practice)
CREATE OR REPLACE FUNCTION update_maintenance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_maintenance_records_updated_at') THEN
        CREATE TRIGGER trigger_update_maintenance_records_updated_at
        BEFORE UPDATE ON maintenance_records
        FOR EACH ROW
        EXECUTE FUNCTION update_maintenance_records_updated_at();
    END IF;
END $$;
