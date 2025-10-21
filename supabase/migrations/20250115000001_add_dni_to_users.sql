-- Agregar columna DNI a la tabla users
ALTER TABLE users ADD COLUMN dni text;

-- Crear índice único para DNI
CREATE UNIQUE INDEX idx_users_dni ON users(dni) WHERE dni IS NOT NULL;
