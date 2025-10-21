import { supabase } from './supabase';
import { logAuditAction } from './relations';

/**
 * Funciones de sincronización para mantener la integridad de los datos
 */

/**
 * Sincroniza el estado de un activo cuando se crea un registro de mantenimiento
 */
export async function syncAssetMaintenanceStatus(
  assetId: string,
  maintenanceStatus: 'pending' | 'in_progress' | 'completed',
  userId?: string
): Promise<boolean> {
  try {
    let assetStatus: 'active' | 'inactive' | 'maintenance' | 'extracted';
    
    switch (maintenanceStatus) {
      case 'pending':
      case 'in_progress':
        assetStatus = 'maintenance';
        break;
      case 'completed':
        assetStatus = 'active';
        break;
      default:
        assetStatus = 'active';
    }

    const { error } = await supabase
      .from('assets')
      .update({ 
        status: assetStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (error) {
      console.error('Error syncing asset maintenance status:', error);
      return false;
    }

    // Registrar en auditoría
    await logAuditAction(
      userId,
      'SYNC',
      'assets',
      assetId,
      {
        action: 'maintenance_status_sync',
        maintenance_status: maintenanceStatus,
        new_asset_status: assetStatus
      }
    );

    return true;
  } catch (error) {
    console.error('Error in syncAssetMaintenanceStatus:', error);
    return false;
  }
}

/**
 * Sincroniza la ubicación de un activo cuando se completa un envío
 */
export async function syncAssetLocationOnShipmentComplete(
  shipmentId: string,
  userId?: string
): Promise<boolean> {
  try {
    // Obtener el envío
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('asset_id, to_location_id, status')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      console.error('Error fetching shipment:', shipmentError);
      return false;
    }

    // Solo sincronizar si el envío está entregado
    if (shipment.status === 'delivered') {
      const { error: updateError } = await supabase
        .from('assets')
        .update({ 
          location_id: shipment.to_location_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipment.asset_id);

      if (updateError) {
        console.error('Error updating asset location:', updateError);
        return false;
      }

      // Registrar en auditoría
      await logAuditAction(
        userId,
        'SYNC',
        'assets',
        shipment.asset_id,
        {
          action: 'shipment_location_sync',
          shipment_id: shipmentId,
          new_location_id: shipment.to_location_id
        }
      );
    }

    return true;
  } catch (error) {
    console.error('Error in syncAssetLocationOnShipmentComplete:', error);
    return false;
  }
}

/**
 * Valida y sincroniza la integridad de los datos de un activo
 */
export async function validateAndSyncAssetIntegrity(assetId: string): Promise<{
  isValid: boolean;
  issues: string[];
  fixes: string[];
}> {
  const issues: string[] = [];
  const fixes: string[] = [];

  try {
    // Obtener el activo con todas sus relaciones
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

    if (assetError || !asset) {
      return {
        isValid: false,
        issues: ['Asset not found'],
        fixes: []
      };
    }

    // Validar tipo de activo
    if (!asset.asset_types) {
      issues.push('Asset type not found');
      fixes.push('Create or assign asset type');
    }

    // Validar ubicación
    if (!asset.location_id && asset.status !== 'extracted') {
      issues.push('Asset has no location assigned');
      fixes.push('Assign location to asset');
    }

    // Validar estado vs mantenimiento
    const hasActiveMaintenance = asset.maintenance_records?.some(
      record => record.status === 'pending' || record.status === 'in_progress'
    );

    if (hasActiveMaintenance && asset.status !== 'maintenance') {
      issues.push('Asset has active maintenance but status is not maintenance');
      fixes.push('Update asset status to maintenance');
      
      // Auto-fix
      await supabase
        .from('assets')
        .update({ status: 'maintenance' })
        .eq('id', assetId);
      fixes.push('✓ Auto-fixed: Updated asset status to maintenance');
    }

    // Validar envíos pendientes
    const hasInTransitShipments = asset.shipments?.some(
      shipment => shipment.status === 'in_transit'
    );

    if (hasInTransitShipments && asset.status !== 'maintenance') {
      issues.push('Asset has in-transit shipments but status is not maintenance');
      fixes.push('Update asset status to maintenance');
      
      // Auto-fix
      await supabase
        .from('assets')
        .update({ status: 'maintenance' })
        .eq('id', assetId);
      fixes.push('✓ Auto-fixed: Updated asset status to maintenance');
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixes
    };
  } catch (error) {
    console.error('Error in validateAndSyncAssetIntegrity:', error);
    return {
      isValid: false,
      issues: ['Validation error occurred'],
      fixes: []
    };
  }
}

/**
 * Sincroniza todos los activos del sistema para mantener integridad
 */
export async function syncAllAssetsIntegrity(): Promise<{
  totalProcessed: number;
  issuesFound: number;
  fixesApplied: number;
}> {
  let totalProcessed = 0;
  let issuesFound = 0;
  let fixesApplied = 0;

  try {
    // Obtener todos los activos
    const { data: assets, error } = await supabase
      .from('assets')
      .select('id');

    if (error || !assets) {
      console.error('Error fetching assets for sync:', error);
      return { totalProcessed: 0, issuesFound: 0, fixesApplied: 0 };
    }

    // Procesar cada activo
    for (const asset of assets) {
      const result = await validateAndSyncAssetIntegrity(asset.id);
      totalProcessed++;

      if (!result.isValid) {
        issuesFound += result.issues.length;
        fixesApplied += result.fixes.filter(fix => fix.startsWith('✓')).length;
      }
    }

    return { totalProcessed, issuesFound, fixesApplied };
  } catch (error) {
    console.error('Error in syncAllAssetsIntegrity:', error);
    return { totalProcessed, issuesFound, fixesApplied };
  }
}

/**
 * Crea un reporte de integridad del sistema
 */
export async function generateIntegrityReport(): Promise<{
  summary: {
    totalAssets: number;
    totalLocations: number;
    totalUsers: number;
    totalCameras: number;
    totalMaintenanceRecords: number;
    totalShipments: number;
  };
  issues: {
    assetsWithoutLocation: number;
    assetsWithInconsistentStatus: number;
    maintenanceRecordsWithoutAssets: number;
    shipmentsWithoutAssets: number;
  };
  recommendations: string[];
}> {
  try {
    // Obtener conteos básicos
    const [
      assetsResult,
      locationsResult,
      usersResult,
      camerasResult,
      maintenanceResult,
      shipmentsResult
    ] = await Promise.all([
      supabase.from('assets').select('id, location_id, status', { count: 'exact' }),
      supabase.from('locations').select('id', { count: 'exact' }),
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('cameras').select('id', { count: 'exact' }),
      supabase.from('maintenance_records').select('id, asset_id', { count: 'exact' }),
      supabase.from('shipments').select('id, asset_id', { count: 'exact' })
    ]);

    const assets = assetsResult.data || [];
    const maintenanceRecords = maintenanceResult.data || [];
    const shipments = shipmentsResult.data || [];

    // Calcular problemas
    const assetsWithoutLocation = assets.filter(asset => 
      !asset.location_id && asset.status !== 'extracted'
    ).length;

    const assetsWithInconsistentStatus = assets.filter(asset => {
      const hasActiveMaintenance = maintenanceRecords.some(record => 
        record.asset_id === asset.id
      );
      return hasActiveMaintenance && asset.status !== 'maintenance';
    }).length;

    const maintenanceRecordsWithoutAssets = maintenanceRecords.filter(record => 
      !assets.some(asset => asset.id === record.asset_id)
    ).length;

    const shipmentsWithoutAssets = shipments.filter(shipment => 
      !assets.some(asset => asset.id === shipment.asset_id)
    ).length;

    // Generar recomendaciones
    const recommendations: string[] = [];
    
    if (assetsWithoutLocation > 0) {
      recommendations.push(`Asignar ubicaciones a ${assetsWithoutLocation} activos sin ubicación`);
    }
    
    if (assetsWithInconsistentStatus > 0) {
      recommendations.push(`Corregir estado de ${assetsWithInconsistentStatus} activos con estado inconsistente`);
    }
    
    if (maintenanceRecordsWithoutAssets > 0) {
      recommendations.push(`Eliminar ${maintenanceRecordsWithoutAssets} registros de mantenimiento huérfanos`);
    }
    
    if (shipmentsWithoutAssets > 0) {
      recommendations.push(`Eliminar ${shipmentsWithoutAssets} envíos huérfanos`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema en buen estado - no se requieren acciones');
    }

    return {
      summary: {
        totalAssets: assetsResult.count || 0,
        totalLocations: locationsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalCameras: camerasResult.count || 0,
        totalMaintenanceRecords: maintenanceResult.count || 0,
        totalShipments: shipmentsResult.count || 0
      },
      issues: {
        assetsWithoutLocation,
        assetsWithInconsistentStatus,
        maintenanceRecordsWithoutAssets,
        shipmentsWithoutAssets
      },
      recommendations
    };
  } catch (error) {
    console.error('Error generating integrity report:', error);
    return {
      summary: {
        totalAssets: 0,
        totalLocations: 0,
        totalUsers: 0,
        totalCameras: 0,
        totalMaintenanceRecords: 0,
        totalShipments: 0
      },
      issues: {
        assetsWithoutLocation: 0,
        assetsWithInconsistentStatus: 0,
        maintenanceRecordsWithoutAssets: 0,
        shipmentsWithoutAssets: 0
      },
      recommendations: ['Error generando reporte']
    };
  }
}

/**
 * Función para limpiar datos huérfanos
 */
export async function cleanupOrphanedData(): Promise<{
  maintenanceRecordsDeleted: number;
  shipmentsDeleted: number;
  errors: string[];
}> {
  let maintenanceRecordsDeleted = 0;
  let shipmentsDeleted = 0;
  const errors: string[] = [];

  try {
    // Obtener todos los IDs de activos
    const { data: assets } = await supabase.from('assets').select('id');
    const assetIds = assets?.map(asset => asset.id) || [];

    // Eliminar registros de mantenimiento huérfanos
    const { data: orphanedMaintenance } = await supabase
      .from('maintenance_records')
      .select('id')
      .not('asset_id', 'in', `(${assetIds.join(',')})`);

    if (orphanedMaintenance && orphanedMaintenance.length > 0) {
      const { error: maintenanceError } = await supabase
        .from('maintenance_records')
        .delete()
        .not('asset_id', 'in', `(${assetIds.join(',')})`);

      if (maintenanceError) {
        errors.push(`Error deleting orphaned maintenance records: ${maintenanceError.message}`);
      } else {
        maintenanceRecordsDeleted = orphanedMaintenance.length;
      }
    }

    // Eliminar envíos huérfanos
    const { data: orphanedShipments } = await supabase
      .from('shipments')
      .select('id')
      .not('asset_id', 'in', `(${assetIds.join(',')})`);

    if (orphanedShipments && orphanedShipments.length > 0) {
      const { error: shipmentsError } = await supabase
        .from('shipments')
        .delete()
        .not('asset_id', 'in', `(${assetIds.join(',')})`);

      if (shipmentsError) {
        errors.push(`Error deleting orphaned shipments: ${shipmentsError.message}`);
      } else {
        shipmentsDeleted = orphanedShipments.length;
      }
    }

    return {
      maintenanceRecordsDeleted,
      shipmentsDeleted,
      errors
    };
  } catch (error) {
    console.error('Error in cleanupOrphanedData:', error);
    errors.push(`Unexpected error: ${error}`);
    return {
      maintenanceRecordsDeleted: 0,
      shipmentsDeleted: 0,
      errors
    };
  }
}
