-- ============================================================
-- FIX: maintenance_records_maintenance_type_check constraint
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================

-- PASO 1: Ver los valores actuales del constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'maintenance_records_maintenance_type_check';

-- PASO 2: Eliminar el constraint existente
ALTER TABLE maintenance_records 
DROP CONSTRAINT IF EXISTS maintenance_records_maintenance_type_check;

-- PASO 3: Volver a crearlo con los valores correctos que usa la aplicación
ALTER TABLE maintenance_records 
ADD CONSTRAINT maintenance_records_maintenance_type_check 
CHECK (maintenance_type IN ('preventive', 'corrective', 'technical_review', 'repair'));

-- PASO 4: Verificar que el constraint fue creado correctamente
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'maintenance_records_maintenance_type_check';
