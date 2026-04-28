-- Quick Fix: Add permissions column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissions TEXT[];

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_users_permissions ON public.users USING GIN (permissions);
