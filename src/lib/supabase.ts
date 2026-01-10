import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: verificar variables de entorno
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Presente' : 'Faltante');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables de entorno de Supabase faltantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Presente' : 'Faltante');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debug: verificar autenticación
supabase.auth.getSession()
  .then(({ data: { session }, error }) => {
    if (error) {
      console.error('❌ Error de autenticación:', error);
    } else if (session) {
      console.log('✅ Usuario autenticado:', session.user.email);
    } else {
      console.log('⚠️ Usuario no autenticado - usando acceso anónimo');
    }
  })
  .catch(err => {
    console.error('❌ Error crítico de autenticación:', err);
  });

// Debug: verificar conexión y datos
supabase.from('locations').select('count', { count: 'exact', head: true })
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error de conexión a Supabase:', error);
    } else {
      console.log('✅ Conexión a Supabase exitosa');
      console.log('📊 Ubicaciones disponibles:', data);
    }
  })
  .catch(err => {
    console.error('❌ Error crítico de conexión:', err);
  });

// Debug: verificar datos de activos
supabase.from('assets').select('count', { count: 'exact', head: true })
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error al obtener activos:', error);
    } else {
      console.log('📊 Activos disponibles:', data);
    }
  })
  .catch(err => {
    console.error('❌ Error crítico con activos:', err);
  });

// Debug: verificar datos de cámaras
supabase.from('cameras').select('count', { count: 'exact', head: true })
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error al obtener cámaras:', error);
    } else {
      console.log('📊 Cámaras disponibles:', data);
    }
  })
  .catch(err => {
    console.error('❌ Error crítico con cámaras:', err);
  });

// Debug: probar operación de inserción
supabase.from('cameras').insert([{
  name: 'Test Connection ' + Date.now(),
  url: 'http://test.com',
  status: 'active'
}]).select()
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Error al insertar cámara de prueba:', error);
    } else {
      console.log('✅ Inserción de prueba exitosa:', data);
      // Limpiar datos de prueba
      if (data && data[0]) {
        supabase.from('cameras').delete().eq('id', data[0].id)
          .then(() => console.log('🧹 Datos de prueba limpiados'));
      }
    }
  })
  .catch(err => {
    console.error('❌ Error crítico con inserción de prueba:', err);
  });

export type Location = {
  id: string;
  name: string;
  type: 'revision' | 'policlinico' | 'escuela_conductores' | 'central' | 'circuito';
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  region?: 'lima' | 'provincia';
  checklist_url?: string;
  history_url?: string;
};

export type AssetType = {
  id: string;
  name: string;
  created_at: string;
};

export type Asset = {
  id: string;
  asset_type_id: string;
  location_id?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  anydesk_id?: string;
  ip_address?: string;
  phone_number?: string;
  camera_url?: string;
  camera_username?: string;
  camera_password?: string;
  capacity?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'extracted';
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
};

export type AssetWithDetails = Asset & {
  asset_types: AssetType;
  locations?: Location;
};

export type CameraDisk = {
  id: string;
  camera_id: string;
  disk_number: number;
  total_capacity_gb: number;
  remaining_capacity_gb: number;
  used_space_gb: number;
  disk_type: 'HDD' | 'SSD' | 'NVMe' | 'Other';
  status: 'active' | 'full' | 'error' | 'maintenance';
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type Camera = {
  id: string;
  name: string;
  location_id?: string;
  url: string;
  username?: string;
  password?: string;
  ip_address?: string;
  port?: string;
  brand?: string;
  model?: string;
  status: 'active' | 'inactive' | 'maintenance';
  notes?: string;
  access_type?: 'url' | 'ivms' | 'esviz'; // Tipo de acceso
  auth_code?: string; // Código de autenticación para IVMS y ESVIZ
  display_count?: number;
  created_at: string;
  updated_at: string;
  locations?: Location;
  camera_disks?: CameraDisk[];
};

export type Server = {
  id: string;
  name: string;
  location_id?: string;
  ip_address?: string;
  anydesk_id?: string;
  username?: string;
  password?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  locations?: Location;
};

export type SutranVisit = {
  id: string;
  visit_date: string;
  inspector_name: string;
  inspector_email?: string;
  inspector_phone?: string;
  location_id?: string;
  location_name: string;
  visit_type: 'programada' | 'no_programada' | 'de_gabinete';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  observations?: string;
  findings?: string;
  recommendations?: string;
  documents: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  locations?: Location;
};

// Re-exportar tipos y funciones de relaciones
export * from './relations';
export * from './sync';
