-- Sistema de Inventario - Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('revision', 'policlinico', 'escuela_conductores', 'central', 'circuito')),
    address TEXT,
    notes TEXT,
    region VARCHAR(50) CHECK (region IN ('lima', 'provincia')),
    checklist_url TEXT,
    history_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Types Table
CREATE TABLE IF NOT EXISTS asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_type_id UUID REFERENCES asset_types(id),
    location_id UUID REFERENCES locations(id),
    brand VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),
    anydesk_id VARCHAR(255),
    ip_address VARCHAR(45),
    phone_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'extracted')),
    notes TEXT,
    image_url TEXT,
    
    -- Additional fields for machinery
    item VARCHAR(255),
    descripcion TEXT,
    unidad_medida VARCHAR(50),
    cantidad INTEGER,
    condicion VARCHAR(100),
    color VARCHAR(100),
    gama VARCHAR(100),
    fecha_adquisicion DATE,
    valor_estimado DECIMAL(10, 2),
    estado_uso VARCHAR(100),
    
    -- PC/Laptop fields
    processor VARCHAR(255),
    ram VARCHAR(100),
    operating_system VARCHAR(255),
    bios_mode VARCHAR(50),
    area VARCHAR(255),
    placa VARCHAR(255),
    
    -- Camera fields
    name VARCHAR(255),
    url TEXT,
    username VARCHAR(255),
    password VARCHAR(255),
    port VARCHAR(10),
    access_type VARCHAR(50) CHECK (access_type IN ('url', 'ivms', 'esviz')),
    auth_code TEXT,
    camera_url TEXT,
    camera_username VARCHAR(255),
    camera_password VARCHAR(255),
    capacity VARCHAR(100),
    
    -- Mobile phone fields
    imei VARCHAR(50),
    operator VARCHAR(100),
    data_plan VARCHAR(255),
    physical_condition VARCHAR(255),
    sistema_operativo VARCHAR(100),
    version_so VARCHAR(100),
    almacenamiento VARCHAR(100),
    bateria_estado VARCHAR(100),
    accesorios TEXT,
    
    -- Printer/Scanner fields
    tipo_impresion VARCHAR(100),
    tecnologia_impresion VARCHAR(100),
    velocidad_impresion VARCHAR(100),
    resolucion VARCHAR(100),
    
    -- Monitor/Projector fields
    tamaño_pantalla VARCHAR(100),
    resolucion_pantalla VARCHAR(100),
    tipo_conexion VARCHAR(100),
    luminosidad VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    placa VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(100),
    modelo VARCHAR(100),
    año INTEGER,
    color VARCHAR(50),
    estado VARCHAR(50) DEFAULT 'activa' CHECK (estado IN ('activa', 'en_proceso', 'inactiva')),
    ubicacion_actual UUID REFERENCES locations(id),
    soat_emision DATE,
    soat_vencimiento DATE,
    citv_emision DATE,
    citv_vencimiento DATE,
    poliza_emision DATE,
    poliza_vencimiento DATE,
    contrato_alquiler_emision DATE,
    contrato_alquiler_vencimiento DATE,
    imagen_url TEXT,
    image_position VARCHAR(50) DEFAULT 'center',
    notas TEXT,
    fecha_ultimo_mantenimiento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Servers Table
CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location_id UUID REFERENCES locations(id),
    ip_address VARCHAR(45),
    anydesk_id VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SUTRAN Visits Table
CREATE TABLE IF NOT EXISTS sutran_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_date DATE NOT NULL,
    inspector_name VARCHAR(255) NOT NULL,
    inspector_email VARCHAR(255),
    inspector_phone VARCHAR(50),
    location_id UUID REFERENCES locations(id),
    location_name VARCHAR(255) NOT NULL,
    visit_type VARCHAR(50) CHECK (visit_type IN ('programada', 'no_programada', 'de_gabinete')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    observations TEXT,
    findings TEXT,
    recommendations TEXT,
    documents TEXT[],
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branch Audits Table
CREATE TABLE IF NOT EXISTS branch_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) NOT NULL,
    auditor_name VARCHAR(255) NOT NULL,
    administrator_name VARCHAR(255),
    audit_date DATE NOT NULL,
    status VARCHAR(50) CHECK (status IN ('excellent', 'good', 'regular', 'critical')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    responses JSONB,
    observations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location_id UUID REFERENCES locations(id),
    url TEXT NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    ip_address VARCHAR(45),
    port VARCHAR(10),
    brand VARCHAR(100),
    model VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    notes TEXT,
    access_type VARCHAR(50) CHECK (access_type IN ('url', 'ivms', 'esviz')),
    auth_code TEXT,
    display_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Camera Disks Table
CREATE TABLE IF NOT EXISTS camera_disks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
    disk_number INTEGER NOT NULL,
    total_capacity_gb DECIMAL(10, 2),
    remaining_capacity_gb DECIMAL(10, 2),
    used_space_gb DECIMAL(10, 2),
    disk_type VARCHAR(50) CHECK (disk_type IN ('HDD', 'SSD', 'NVMe', 'Other')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'full', 'error', 'maintenance')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Records Table
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(100),
    description TEXT,
    cost DECIMAL(10, 2),
    performed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role) 
VALUES ('admin@inventario.com', '$2a$10$rH8qGXvH5xGZqKqGqGqGqOqGqGqGqGqGqGqGqGqGqGqGqGqGqGqGqG', 'Administrador', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_ubicacion ON vehicles(ubicacion_actual);
CREATE INDEX IF NOT EXISTS idx_cameras_location ON cameras(location_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON cameras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
