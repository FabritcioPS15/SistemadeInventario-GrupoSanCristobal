-- Add administrator_name to branch_audits
ALTER TABLE branch_audits 
ADD COLUMN IF NOT EXISTS administrator_name TEXT;
