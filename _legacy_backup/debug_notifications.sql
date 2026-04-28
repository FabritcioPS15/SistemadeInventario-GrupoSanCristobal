-- Debug script for notifications table
-- Check if table exists and has data

-- Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'notifications'
);

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'notifications'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Check sample data
SELECT * FROM public.notifications ORDER BY created_at DESC LIMIT 5;

-- Check if user has permissions
SELECT has_table_privilege('authenticated', 'notifications', 'INSERT') as can_insert,
       has_table_privilege('authenticated', 'notifications', 'SELECT') as can_select,
       has_table_privilege('authenticated', 'notifications', 'UPDATE') as can_update;
