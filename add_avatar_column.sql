-- Add avatar_url column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
