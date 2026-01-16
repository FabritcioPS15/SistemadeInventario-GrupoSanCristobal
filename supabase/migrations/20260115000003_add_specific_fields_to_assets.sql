-- Agregar campos específicos para diferentes tipos de activos a la tabla assets

-- Campos para PC/Laptop
ALTER TABLE assets ADD COLUMN IF NOT EXISTS processor TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS ram TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operating_system TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS bios_mode TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS placa TEXT;

-- Campos para Cámaras/DVR
ALTER TABLE assets ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS port TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS access_type TEXT CHECK (access_type IN ('url', 'ivms', 'esviz'));
ALTER TABLE assets ADD COLUMN IF NOT EXISTS auth_code TEXT;

-- Campos para Celulares
ALTER TABLE assets ADD COLUMN IF NOT EXISTS imei TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS operator TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS data_plan TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS physical_condition TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS sistema_operativo TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS version_so TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS almacenamiento TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS bateria_estado TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS accesorios TEXT;

-- Campos para Impresoras/Escáneres
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tipo_impresion TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tecnologia_impresion TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS velocidad_impresion INTEGER;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS resolucion TEXT;

-- Campos para Monitores/Proyectores
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tamaño_pantalla TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS resolucion_pantalla TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS tipo_conexion TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS luminosidad INTEGER;
