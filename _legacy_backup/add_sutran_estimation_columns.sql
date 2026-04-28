-- Añadir columnas para estimaciones en sutran_visits
ALTER TABLE sutran_visits 
ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50),
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(12, 2);

-- Comentario para documentar
COMMENT ON COLUMN sutran_visits.estimated_duration IS 'Duración estimada de la visita en horas o texto descriptivo';
COMMENT ON COLUMN sutran_visits.estimated_cost IS 'Costo estimado de la visita en la moneda local';
