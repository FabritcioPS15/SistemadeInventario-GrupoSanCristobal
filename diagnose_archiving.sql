-- SCRIPT DE DIAGNÓSTICO PARA TICKETS ARCHIVADOS
-- Ejecutar este script en el dashboard de Supabase SQL Editor

-- 1. Verificar todos los estados de tickets existentes
SELECT 
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest_created,
    MAX(created_at) as newest_created,
    MIN(closed_at) as oldest_closed,
    MAX(closed_at) as newest_closed
FROM public.tickets 
GROUP BY status 
ORDER BY status;

-- 2. Verificar tickets cerrados que podrían archivarse
SELECT 
    id,
    title,
    status,
    created_at,
    closed_at,
    CASE 
        WHEN closed_at IS NOT NULL AND closed_at <= NOW() - INTERVAL '10 minutes' THEN 'DEBERÍA ESTAR ARCHIVADO'
        WHEN closed_at IS NOT NULL THEN 'Aún no cumple 10 minutos'
        ELSE 'No tiene closed_at'
    END as archiving_status
FROM public.tickets 
WHERE status = 'closed'
ORDER BY closed_at DESC NULLS LAST;

-- 3. Verificar restricción CHECK actual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.tickets'::regclass 
AND contype = 'c'
AND conname LIKE '%status%';

-- 4. Verificar si hay tickets archivados
SELECT 
    id,
    title,
    status,
    created_at,
    closed_at,
    updated_at
FROM public.tickets 
WHERE status = 'archived'
ORDER BY created_at DESC;

-- 5. Forzar archivado de tickets cerrados antiguos (para prueba)
UPDATE public.tickets 
SET status = 'archived' 
WHERE status = 'closed' 
AND closed_at IS NOT NULL 
AND closed_at <= NOW() - INTERVAL '1 minute'  -- Reducido a 1 minuto para prueba
RETURNING id, title, status, closed_at;
