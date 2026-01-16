-- Asegurar que el tipo de activo 'Maquinaria' exista
INSERT INTO asset_types (id, name, created_at) 
VALUES (
  gen_random_uuid(),
  'Maquinaria',
  NOW()
)
ON CONFLICT (name) DO NOTHING;
