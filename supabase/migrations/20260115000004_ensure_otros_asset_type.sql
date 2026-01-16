-- Asegurar que el tipo de activo 'Otros' exista
INSERT INTO asset_types (id, name, created_at) 
VALUES (
  gen_random_uuid(),
  'Otros',
  NOW()
)
ON CONFLICT (name) DO NOTHING;
