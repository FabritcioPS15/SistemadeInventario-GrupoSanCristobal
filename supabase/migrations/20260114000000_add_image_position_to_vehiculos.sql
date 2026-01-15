-- Add image_position column to vehiculos table
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS image_position text DEFAULT 'center';
