-- Unified Resource Credentials Table
-- Supports polymorphic relationships with Servers, MTC Accesses, and Assets

CREATE TABLE IF NOT EXISTS resource_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- 'server', 'mtc_acceso', 'asset'
    label VARCHAR(255) NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for polymorphic queries
CREATE INDEX IF NOT EXISTS idx_res_creds_lookup ON resource_credentials(resource_id, resource_type);

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_resource_credentials_updated_at') THEN
        CREATE TRIGGER update_resource_credentials_updated_at 
        BEFORE UPDATE ON resource_credentials 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Data Migration from server_credentials (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'server_credentials') THEN
        INSERT INTO resource_credentials (resource_id, resource_type, label, username, password, notes, created_at, updated_at)
        SELECT server_id, 'server', label, username, password, notes, created_at, updated_at
        FROM server_credentials;
        
        -- Optional: Drop old table after migration
        -- DROP TABLE server_credentials;
    END IF;
END $$;

-- Comments
COMMENT ON TABLE resource_credentials IS 'Polymorphic table to store credentials for different modules (Servers, MTC portal, Inventory).';
COMMENT ON COLUMN resource_credentials.resource_type IS 'The type of resource: server, mtc_acceso, or asset.';
