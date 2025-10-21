-- Agrega la columna opcional display_count para indicar cuántas vistas debe mostrar una cámara
ALTER TABLE IF EXISTS cameras
  ADD COLUMN IF NOT EXISTS display_count INTEGER;

-- Restringir a valores no negativos
ALTER TABLE IF EXISTS cameras
  ADD CONSTRAINT cameras_display_count_non_negative CHECK (display_count IS NULL OR display_count >= 0);


