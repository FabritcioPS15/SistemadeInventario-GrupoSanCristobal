-- CreateEnum
CREATE TYPE estado_vehiculo AS ENUM ('disponible', 'en_uso', 'en_mantenimiento', 'inactivo');

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "año" INTEGER NOT NULL,
    "tipo_combustible" TEXT NOT NULL DEFAULT 'gasolina',
    "kilometraje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "estado_vehiculo" NOT NULL DEFAULT 'disponible',
    "ubicacion_actual" TEXT,
    "fecha_ultimo_mantenimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_placa_key" ON "vehiculos"("placa");

-- CreateIndex
CREATE INDEX "vehiculos_estado_idx" ON "vehiculos"("estado");

-- CreateIndex
CREATE INDEX "vehiculos_ubicacion_actual_idx" ON "vehiculos"("ubicacion_actual");

-- CreateIndex
CREATE INDEX "vehiculos_created_at_idx" ON "vehiculos"("created_at");

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE "vehiculos" ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read vehicles
CREATE POLICY "Enable read access for authenticated users"
ON "vehiculos"
FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow admins and technicians to insert vehicles
CREATE POLICY "Enable insert for admins and technicians"
ON "vehiculos"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND (users.role = 'admin' OR users.role = 'technician')
    )
  )
);

-- Create policy to allow admins and technicians to update vehicles
CREATE POLICY "Enable update for admins and technicians"
ON "vehiculos"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND (users.role = 'admin' OR users.role = 'technician')
  )
);

-- Create policy to allow admins to delete vehicles
CREATE POLICY "Enable delete for admins"
ON "vehiculos"
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
