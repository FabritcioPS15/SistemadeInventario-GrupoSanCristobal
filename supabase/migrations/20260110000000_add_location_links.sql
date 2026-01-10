-- Migration to add checklist and history links to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS checklist_url TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS history_url TEXT;

-- Comment for clarity
COMMENT ON COLUMN locations.checklist_url IS 'URL for the school or clinic checklist (Google Sheets, etc.)';
COMMENT ON COLUMN locations.history_url IS 'URL for the checklist history (Google Drive folder, etc.)';
