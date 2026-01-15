-- Create branch_audits table
CREATE TABLE IF NOT EXISTS branch_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    auditor_name TEXT NOT NULL,
    audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('excellent', 'good', 'regular', 'critical')),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE branch_audits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON branch_audits
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON branch_audits
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON branch_audits
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON branch_audits
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_branch_audits_updated_at
    BEFORE UPDATE ON branch_audits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
