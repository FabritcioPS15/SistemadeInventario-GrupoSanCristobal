-- Create servers table linked to locations
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  ip_address TEXT,
  anydesk_id TEXT,
  username TEXT,
  password TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servers_location ON public.servers(location_id);
CREATE INDEX IF NOT EXISTS idx_servers_name ON public.servers(name);

-- Optional: basic RLS toggle (adjust as needed)
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'servers' AND policyname = 'servers_select_all'
  ) THEN
    CREATE POLICY servers_select_all ON public.servers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'servers' AND policyname = 'servers_modify_all'
  ) THEN
    CREATE POLICY servers_modify_all ON public.servers FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


