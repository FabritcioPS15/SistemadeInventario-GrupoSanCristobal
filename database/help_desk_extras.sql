-- Create Ticket Canned Responses Table
CREATE TABLE IF NOT EXISTS ticket_canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Initial Canned Responses
INSERT INTO ticket_canned_responses (title, content) VALUES
('Resolución Estándar', 'El problema ha sido resuelto satisfactoriamente. Por favor, verifique el funcionamiento y nos confirma para cerrar el ticket.'),
('Solicitud de Información', 'Para poder procesar su solicitud, necesitamos información adicional. ¿Podría proporcionarnos más detalles o capturas de pantalla del error?'),
('En Espera de Terceros', 'Hemos escalado su requerimiento al proveedor correspondiente. Le informaremos apenas tengamos una respuesta.'),
('Mantenimiento Programado', 'Le informamos que se realizará un mantenimiento programado en los servidores. El servicio podría verse afectado temporalmente.'),
('Cierre por Inactividad', 'Debido a que no hemos recibido respuesta en los últimos días, procederemos a cerrar el ticket. Si el problema persiste, puede abrir uno nuevo.');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_canned_responses;

-- Add tracking columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
