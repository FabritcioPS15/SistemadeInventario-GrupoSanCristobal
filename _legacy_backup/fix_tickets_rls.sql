-- Fix RLS Policy for Tickets Table
-- This script resolves the "new row violates row-level security policy" error

-- Step 1: Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert tickets" ON public.tickets;

-- Step 2: Create a new, permissive INSERT policy
-- Allow any authenticated user to create tickets
CREATE POLICY "Users can insert tickets" ON public.tickets 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Step 3: Verify the policy was created
-- You can run this to check:
-- SELECT * FROM pg_policies WHERE tablename = 'tickets';

-- Optional: Also update the comments policy if needed
DROP POLICY IF EXISTS "Users can insert comments" ON public.ticket_comments;

CREATE POLICY "Users can insert comments" ON public.ticket_comments 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
