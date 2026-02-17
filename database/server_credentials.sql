-- Add server_credentials table to support multiple users/passwords per server
ALTER TABLE IF EXISTS servers ADD COLUMN IF NOT EXISTS anydesk_password VARCHAR(255);

CREATE TABLE IF NOT EXISTS server_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL, -- e.g., 'Admin', 'Root', 'Database'
    username VARCHAR(255),
    password VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_server_credentials_server ON server_credentials(server_id);

-- Trigger to update updated_at automatically
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_server_credentials_updated_at') THEN
        CREATE TRIGGER update_server_credentials_updated_at 
        BEFORE UPDATE ON server_credentials 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Optional: Comments for clarity
COMMENT ON TABLE server_credentials IS 'Stores multiple login credentials for each server in the infrastructure.';
COMMENT ON COLUMN server_credentials.label IS 'Descriptive label for the credential (e.g., Administrator, SSH User, DB Access)';
