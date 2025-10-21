import { supabase } from './supabase';

// Tipos extendidos para relaciones completas
export type LocationWithAssets = {
  id: string;
  name: string;
  type: 'revision' | 'policlinico' | 'escuela_conductores' | 'central';
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  assets?: AssetWithDetails[];
  users?: UserWithDetails[];
  cameras?: CameraWithDetails[];
};

export type AssetWithFullDetails = {
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
  created_at: string;
  updated_at: string;
  asset_types: AssetType;
  locations?: Location;
  maintenance_records?: MaintenanceRecord[];
  shipments?: Shipment[];
};

export type UserWithDetails = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location_id?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
  locations?: Location;
  audit_logs?: AuditLog[];
};

export type CameraWithDetails = {
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
  created_at: string;
  updated_at: string;
  locations?: Location;
};

export type MaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_type: 'preventive' | 'corrective';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  scheduled_date?: string;
  completed_date?: string;
  technician?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  assets?: AssetWithFullDetails;
};

export type Shipment = {
  id: string;
  asset_id: string;
  from_location_id?: string;
  to_location_id: string;
  shipment_date: string;
  shipped_by?: string;
  received_by?: string;
  tracking_number?: string;
  carrier?: string;
  status: 'shipped' | 'in_transit' | 'delivered' | 'returned';
  notes?: string;
  created_at: string;
  updated_at: string;
  assets?: AssetWithFullDetails;
  from_location?: Location;
  to_location?: Location;
};

export type AuditLog = {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  created_at: string;
  users?: UserWithDetails;
};

export type AssetType = {
  id: string;
  name: string;
  created_at: string;
};

export type Location = {
  id: string;
  name: string;
  type: 'revision' | 'policlinico' | 'escuela_conductores' | 'central';
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// Funciones de sincronización y relaciones

/**
 * Obtiene una ubicación con todos sus activos, usuarios y cámaras relacionados
 */
export async function getLocationWithRelations(locationId: string): Promise<LocationWithAssets | null> {
  try {
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select(`
        *,
        assets:assets(*, asset_types(*)),
        users:users(*),
        cameras:cameras(*)
      `)
      .eq('id', locationId)
      .single();

    if (locationError) {
      console.error('Error fetching location:', locationError);
      return null;
    }

    return location as LocationWithAssets;
  } catch (error) {
    console.error('Error in getLocationWithRelations:', error);
    return null;
  }
}

/**
 * Obtiene un activo con todos sus detalles relacionados
 */
export async function getAssetWithFullDetails(assetId: string): Promise<AssetWithFullDetails | null> {
  try {
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        asset_types(*),
        locations(*),
        maintenance_records(*),
        shipments(*)
      `)
      .eq('id', assetId)
      .single();

    if (assetError) {
      console.error('Error fetching asset:', assetError);
      return null;
    }

    return asset as AssetWithFullDetails;
  } catch (error) {
    console.error('Error in getAssetWithFullDetails:', error);
    return null;
  }
}

/**
 * Obtiene todos los activos de una ubicación específica
 */
export async function getAssetsByLocation(locationId: string): Promise<AssetWithFullDetails[]> {
  try {
    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        *,
        asset_types(*),
        locations(*),
        maintenance_records(*),
        shipments(*)
      `)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assets by location:', error);
      return [];
    }

    return assets as AssetWithFullDetails[];
  } catch (error) {
    console.error('Error in getAssetsByLocation:', error);
    return [];
  }
}

/**
 * Obtiene todos los envíos con detalles completos
 */
export async function getShipmentsWithDetails(): Promise<Shipment[]> {
  try {
    const { data: shipments, error } = await supabase
      .from('shipments')
      .select(`
        *,
        assets(*, asset_types(*), locations(*)),
        from_location:locations!from_location_id(*),
        to_location:locations!to_location_id(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shipments:', error);
      return [];
    }

    return shipments as Shipment[];
  } catch (error) {
    console.error('Error in getShipmentsWithDetails:', error);
    return [];
  }
}

/**
 * Obtiene todos los registros de mantenimiento con detalles completos
 */
export async function getMaintenanceRecordsWithDetails(): Promise<MaintenanceRecord[]> {
  try {
    const { data: maintenance, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        assets(*, asset_types(*), locations(*))
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching maintenance records:', error);
      return [];
    }

    return maintenance as MaintenanceRecord[];
  } catch (error) {
    console.error('Error in getMaintenanceRecordsWithDetails:', error);
    return [];
  }
}

/**
 * Obtiene todos los usuarios con detalles completos
 */
export async function getUsersWithDetails(): Promise<UserWithDetails[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        locations(*),
        audit_logs(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return users as UserWithDetails[];
  } catch (error) {
    console.error('Error in getUsersWithDetails:', error);
    return [];
  }
}

/**
 * Obtiene todas las cámaras con detalles completos
 */
export async function getCamerasWithDetails(): Promise<CameraWithDetails[]> {
  try {
    const { data: cameras, error } = await supabase
      .from('cameras')
      .select(`
        *,
        locations(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching cameras:', error);
      return [];
    }

    return cameras as CameraWithDetails[];
  } catch (error) {
    console.error('Error in getCamerasWithDetails:', error);
    return [];
  }
}

/**
 * Obtiene todos los logs de auditoría con detalles completos
 */
export async function getAuditLogsWithDetails(): Promise<AuditLog[]> {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        users(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return logs as AuditLog[];
  } catch (error) {
    console.error('Error in getAuditLogsWithDetails:', error);
    return [];
  }
}

/**
 * Actualiza la ubicación de un activo y registra el cambio en auditoría
 */
export async function updateAssetLocation(
  assetId: string, 
  newLocationId: string | null, 
  userId?: string
): Promise<boolean> {
  try {
    // Obtener el activo actual para registrar el cambio
    const { data: currentAsset } = await supabase
      .from('assets')
      .select('location_id, brand, model')
      .eq('id', assetId)
      .single();

    // Actualizar la ubicación del activo
    const { error: updateError } = await supabase
      .from('assets')
      .update({ 
        location_id: newLocationId,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (updateError) {
      console.error('Error updating asset location:', updateError);
      return false;
    }

    // Registrar en auditoría
    await logAuditAction(
      userId,
      'UPDATE',
      'assets',
      assetId,
      {
        field: 'location_id',
        old_value: currentAsset?.location_id,
        new_value: newLocationId,
        asset_info: `${currentAsset?.brand} ${currentAsset?.model}`
      }
    );

    return true;
  } catch (error) {
    console.error('Error in updateAssetLocation:', error);
    return false;
  }
}

/**
 * Crea un nuevo envío y actualiza la ubicación del activo
 */
export async function createShipmentWithLocationUpdate(
  shipmentData: Omit<Shipment, 'id' | 'created_at' | 'updated_at'>,
  userId?: string
): Promise<boolean> {
  try {
    // Crear el envío
    const { data: newShipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert(shipmentData)
      .select()
      .single();

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError);
      return false;
    }

    // Actualizar la ubicación del activo
    const updateSuccess = await updateAssetLocation(
      shipmentData.asset_id,
      shipmentData.to_location_id,
      userId
    );

    if (!updateSuccess) {
      // Si falla la actualización de ubicación, eliminar el envío
      await supabase.from('shipments').delete().eq('id', newShipment.id);
      return false;
    }

    // Registrar en auditoría
    await logAuditAction(
      userId,
      'CREATE',
      'shipments',
      newShipment.id,
      {
        asset_id: shipmentData.asset_id,
        from_location: shipmentData.from_location_id,
        to_location: shipmentData.to_location_id,
        status: shipmentData.status
      }
    );

    return true;
  } catch (error) {
    console.error('Error in createShipmentWithLocationUpdate:', error);
    return false;
  }
}

/**
 * Registra una acción en el log de auditoría
 */
export async function logAuditAction(
  userId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details?: any
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

/**
 * Obtiene estadísticas generales del sistema
 */
export async function getSystemStats(): Promise<{
  totalAssets: number;
  totalLocations: number;
  totalUsers: number;
  totalCameras: number;
  activeAssets: number;
  maintenancePending: number;
  shipmentsInTransit: number;
}> {
  try {
    const [
      assetsResult,
      locationsResult,
      usersResult,
      camerasResult,
      maintenanceResult,
      shipmentsResult
    ] = await Promise.all([
      supabase.from('assets').select('id, status', { count: 'exact' }),
      supabase.from('locations').select('id', { count: 'exact' }),
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('cameras').select('id', { count: 'exact' }),
      supabase.from('maintenance_records').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('shipments').select('id', { count: 'exact' }).eq('status', 'in_transit')
    ]);

    const activeAssets = assetsResult.data?.filter(asset => asset.status === 'active').length || 0;

    return {
      totalAssets: assetsResult.count || 0,
      totalLocations: locationsResult.count || 0,
      totalUsers: usersResult.count || 0,
      totalCameras: camerasResult.count || 0,
      activeAssets,
      maintenancePending: maintenanceResult.count || 0,
      shipmentsInTransit: shipmentsResult.count || 0
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    return {
      totalAssets: 0,
      totalLocations: 0,
      totalUsers: 0,
      totalCameras: 0,
      activeAssets: 0,
      maintenancePending: 0,
      shipmentsInTransit: 0
    };
  }
}
