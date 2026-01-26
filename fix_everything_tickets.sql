-- NUCLEAR REPAIR SCRIPT FOR TICKETS SYSTEM
-- This script forcefully removes old policies and constraints to fix foreign key and RLS errors.

-- 1. DESTRUCTIVE PHASE: Clear dependencies
-- Forcefully drop all existing policies on tickets and comments to allow column changes
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tickets') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.tickets';
    END LOOP;
    
    FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ticket_comments') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.ticket_comments';
    END LOOP;
END $$;

-- Drop old foreign keys that point to auth.users
ALTER TABLE public.tickets 
  DROP CONSTRAINT IF EXISTS tickets_requester_id_fkey,
  DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey,
  DROP CONSTRAINT IF EXISTS tickets_location_id_fkey;

ALTER TABLE public.ticket_comments 
  DROP CONSTRAINT IF EXISTS ticket_comments_user_id_fkey;

-- 2. CONSTRUCTION PHASE: Fix columns and foreign keys
-- Ensure columns are the correct type and point to the PUBLIC users table
ALTER TABLE public.tickets
  ALTER COLUMN requester_id TYPE UUID,
  ALTER COLUMN assigned_to TYPE UUID,
  ALTER COLUMN location_id TYPE UUID;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id),
  ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id),
  ADD CONSTRAINT tickets_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id);

ALTER TABLE public.ticket_comments
  ALTER COLUMN user_id TYPE UUID,
  ADD CONSTRAINT ticket_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Add tracking columns if missing
ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE;

-- 3. OPTIMIZATION PHASE: Realtime and Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_id ON public.tickets(requester_id);

-- Enable Realtime (Crucial for the "Atender" status to show up instantly)
-- We remove and re-add to be sure
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.tickets, public.ticket_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets, public.ticket_comments;

-- 4. SECURITY PHASE: Global Transparent Policies
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select tickets" ON public.tickets FOR SELECT USING (true);
CREATE POLICY "Allow all insert tickets" ON public.tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update tickets" ON public.tickets FOR UPDATE USING (true);
CREATE POLICY "Allow all delete tickets" ON public.tickets FOR DELETE USING (true);

CREATE POLICY "Allow all select comments" ON public.ticket_comments FOR SELECT USING (true);
CREATE POLICY "Allow all insert comments" ON public.ticket_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update comments" ON public.ticket_comments FOR UPDATE USING (true);
CREATE POLICY "Allow all delete comments" ON public.ticket_comments FOR DELETE USING (true);
