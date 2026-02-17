-- SQL Fix for Vehiculos Table: Normalization, RLS and Realtime
-- This script ensures the 'vehiculos' table exists (renaming from 'vehicles' if needed),
-- has the correct RLS policies, and supports realtime updates.

DO $$
BEGIN
    -- 1. NORMALIZE TABLE NAME
    -- If 'vehicles' exists but 'vehiculos' does not, rename it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicles') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehiculos') THEN
        ALTER TABLE public.vehicles RENAME TO vehiculos;
    END IF;

    -- 2. CREATE TABLE IF MISSING
    -- If 'vehiculos' still doesn't exist (neither 'vehicles' nor 'vehiculos' were there), create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehiculos') THEN
        CREATE TABLE public.vehiculos (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            placa VARCHAR(20) NOT NULL UNIQUE,
            marca VARCHAR(100),
            modelo VARCHAR(100),
            año INTEGER,
            color VARCHAR(50),
            estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'en_proceso', 'inactiva')),
            ubicacion_actual UUID REFERENCES public.locations(id),
            soat_emision DATE,
            soat_vencimiento DATE,
            citv_emision DATE,
            citv_vencimiento DATE,
            poliza_emision DATE,
            poliza_vencimiento DATE,
            contrato_alquiler_emision DATE,
            contrato_alquiler_vencimiento DATE,
            imagen_url TEXT,
            image_position VARCHAR(50) DEFAULT 'center',
            notas TEXT,
            fecha_ultimo_mantenimiento DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. ENABLE RLS
ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;

-- 4. DROP EXISTING POLICIES
DROP POLICY IF EXISTS "Allow public read access on vehicles" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow authenticated insert on vehicles" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow authenticated update on vehicles" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow authenticated delete on vehicles" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow public read access on vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow authenticated insert on vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow authenticated update on vehiculos" ON public.vehiculos;
DROP POLICY IF EXISTS "Allow authenticated delete on vehiculos" ON public.vehiculos;

-- 5. CREATE PERMISSIVE POLICIES
CREATE POLICY "Allow public read access on vehiculos" ON public.vehiculos FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on vehiculos" ON public.vehiculos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on vehiculos" ON public.vehiculos FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete on vehiculos" ON public.vehiculos FOR DELETE USING (true);

-- 6. ENABLE REALTIME
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'vehiculos'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.vehiculos;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.vehiculos;
