-- SCRIPT COMPLETO PARA ARREGLAR ARCHIVADO
-- Ejecutar este script en el dashboard de Supabase SQL Editor

-- 1. Primero, verificar si la columna status permite 'archived'
DO $$
BEGIN
    -- Eliminar restricción CHECK existente
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
    
    -- Crear nueva restricción CHECK con 'archived'
    ALTER TABLE public.tickets 
    ADD CONSTRAINT tickets_status_check 
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'archived'));
    
    -- Asegurar que las columnas de timestamp existan
    ALTER TABLE public.tickets 
    ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Crear índices para mejor rendimiento
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_closed_at ON public.tickets(closed_at);
    
    -- Actualizar tickets que podrían necesitar archivado manualmente
    UPDATE public.tickets 
    SET status = 'archived' 
    WHERE status = 'closed' 
    AND closed_at IS NOT NULL 
    AND closed_at <= NOW() - INTERVAL '10 minutes';
    
    RAISE NOTICE '✅ Script de archivado ejecutado correctamente';
END $$;

-- 2. Modificar la política de comentarios para permitir user_id NULL (opcional)
ALTER TABLE public.ticket_comments 
ALTER COLUMN user_id DROP NOT NULL,
ALTER COLUMN user_id SET DEFAULT NULL;

-- 3. Verificar resultados
SELECT 
    status,
    COUNT(*) as count,
    MAX(closed_at) as latest_closed_at
FROM public.tickets 
GROUP BY status 
ORDER BY status;
