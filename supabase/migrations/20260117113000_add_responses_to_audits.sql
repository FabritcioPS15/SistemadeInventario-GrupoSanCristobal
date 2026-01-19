-- Add responses column to branch_audits
ALTER TABLE branch_audits ADD COLUMN IF NOT EXISTS responses JSONB DEFAULT '{}'::jsonb;
