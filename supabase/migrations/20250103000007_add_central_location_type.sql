-- Migración para agregar el tipo 'central' a la tabla locations
-- Fecha: 2025-01-03
-- Descripción: Actualiza el constraint CHECK para permitir el nuevo tipo 'central'

-- 1. Primero, verificar el constraint actual
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'locations'::regclass 
AND contype = 'c';

-- 2. Eliminar el constraint existente (si existe)
-- Nota: El nombre del constraint puede variar, ajustar según el resultado del paso 1
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_type_check;

-- 3. Agregar el nuevo constraint que incluye 'central'
ALTER TABLE locations ADD CONSTRAINT locations_type_check 
CHECK (type IN ('revision', 'policlinico', 'escuela_conductores', 'central'));

-- 4. Verificar que el constraint se aplicó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'locations'::regclass 
AND contype = 'c';

-- 5. Probar insertar un registro con el nuevo tipo (opcional)
-- INSERT INTO locations (name, type, address, notes) 
-- VALUES ('Sede Central Test', 'central', 'Dirección de prueba', 'Nota de prueba');

-- 6. Si el test fue exitoso, eliminar el registro de prueba
-- DELETE FROM locations WHERE name = 'Sede Central Test';

-- 7. Verificar los tipos disponibles después de la migración
SELECT DISTINCT type FROM locations ORDER BY type;

