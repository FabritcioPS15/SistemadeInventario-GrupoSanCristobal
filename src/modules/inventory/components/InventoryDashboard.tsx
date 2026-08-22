import { useState, useEffect } from 'react';
import { 
  Package, Building2, MapPin, Wrench, TrendingUp, AlertTriangle, 
  CheckCircle, DollarSign, BarChart3, PieChart 
} from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import { 
  DashboardMetrics, 
  AssetStatistics, 
  AssetWithDetails,
  MaintenanceRecord,
  Company 
} from '../../../shared/types/inventory.types';

// Estados reales de la columna assets.estado_uso (la app no usa el campo
// legacy `status` con valores en inglés).
const ESTADO_USO_LABELS: Record<string, string> = {
  Operativo: 'Operativo',
  Inoperativo: 'Inoperativo',
  'En Reparación': 'En Reparación',
  Baja: 'De Baja',
};

const ESTADO_USO_COLORS: Record<string, string> = {
  Operativo: 'bg-emerald-100 text-emerald-700',
  Inoperativo: 'bg-slate-100 text-slate-600',
  'En Reparación': 'bg-amber-100 text-amber-700',
  Baja: 'bg-rose-100 text-rose-700',
};

const ESTADO_USO_DOT_COLORS: Record<string, string> = {
  Operativo: 'bg-emerald-500',
  Inoperativo: 'bg-slate-400',
  'En Reparación': 'bg-amber-500',
  Baja: 'bg-rose-500',
};

interface InventoryDashboardProps {
  companyId?: string;
  locationId?: string;
}

export default function InventoryDashboard({ companyId, locationId }: InventoryDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardMetrics();
  }, [companyId, locationId]);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch basic counts
      const [assetsResult, companiesResult, locationsResult] = await Promise.all([
        supabase
          .from('assets')
          .select('*, companies(*), locations(*)')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase.from('companies').select('*').eq('is_active', true),
        supabase.from('locations').select('*').eq('is_active', true),
      ]);

      if (assetsResult.error) throw assetsResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (locationsResult.error) throw locationsResult.error;

      const assets = assetsResult.data as AssetWithDetails[] || [];
      const companies = companiesResult.data as Company[] || [];
      const locations = locationsResult.data || [];

      // Filter by company/location if provided
      const filteredAssets = assets.filter(asset => {
        if (companyId && asset.company_id !== companyId) return false;
        if (locationId && asset.location_id !== locationId) return false;
        return true;
      });

      // Calculate assets by status
      const assetsByStatus: Record<string, number> = {};
      Object.keys(ESTADO_USO_LABELS).forEach(status => {
        assetsByStatus[status] = filteredAssets.filter(a => a.estado_uso === status).length;
      });

      // Fetch asset statistics by category
      const { data: categoryStats } = await supabase.rpc('get_asset_statistics_by_category', {
        p_company_id: companyId || null
      });

      const assetsByCategory: AssetStatistics[] = categoryStats || [];

      // Fetch recent maintenance records
      const { data: recentMaintenance } = await supabase
        .from('maintenance_records')
        .select('*, assets(*)')
        .order('created_at', { ascending: false })
        .limit(5);

      // Calculate total maintenance cost
      const { data: maintenanceCost } = await supabase
        .from('maintenance_records')
        .select('total_cost')
        .eq('status', 'completed');

      const totalMaintenanceCost = maintenanceCost?.reduce((sum, record) => 
        sum + (record.total_cost || 0), 0
      ) || 0;

      // Calculate assets value by company
      const assetsValueByCompany = companies.map(company => {
        const companyAssets = filteredAssets.filter(a => a.company_id === company.id);
        const totalValue = companyAssets.reduce((sum, asset) => 
          sum + (asset.purchase_price || 0), 0
        );
        return {
          company_name: company.name,
          total_value: totalValue,
          asset_count: companyAssets.length,
        };
      }).filter(item => item.asset_count > 0);

      // Find assets needing maintenance (en reparación)
      const assetsNeedingMaintenance = filteredAssets.filter(a => a.estado_uso === 'En Reparación');

      const dashboardMetrics: DashboardMetrics = {
        total_assets: filteredAssets.length,
        total_companies: companies.length,
        total_locations: locations.length,
        assets_by_status: assetsByStatus as any,
        assets_by_category: assetsByCategory,
        recent_maintenance: recentMaintenance as MaintenanceRecord[],
        assets_needing_maintenance: assetsNeedingMaintenance,
        total_maintenance_cost: totalMaintenanceCost,
        assets_value_by_company: assetsValueByCompany,
      };

      setMetrics(dashboardMetrics);
    } catch (err: any) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertTriangle className="mx-auto mb-4 text-red-600" size={48} />
        <p className="text-red-800 font-semibold">Error al cargar métricas</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!metrics) return null;

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    trend 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    color: string; 
    trend?: string;
  }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
          <p className="text-3xl font-semibold text-slate-800">{value}</p>
          {trend && (
            <p className="text-[10px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
              <TrendingUp size={12} />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Dashboard de Inventario</h2>
          <p className="text-slate-400 text-sm font-semibold mt-1">
            {companyId ? 'Vista por Empresa' : locationId ? 'Vista por Sede' : 'Vista General'}
          </p>
        </div>
        <button
          onClick={fetchDashboardMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-[11px] font-semibold uppercase tracking-wider"
        >
          <BarChart3 size={16} />
          Actualizar
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Activos"
          value={metrics.total_assets}
          icon={Package}
          color="bg-blue-600"
        />
        <StatCard
          title="Empresas"
          value={metrics.total_companies}
          icon={Building2}
          color="bg-emerald-600"
        />
        <StatCard
          title="Sedes"
          value={metrics.total_locations}
          icon={MapPin}
          color="bg-purple-600"
        />
        <StatCard
          title="Costo Mantenimiento"
          value={`S/ ${metrics.total_maintenance_cost.toLocaleString()}`}
          icon={DollarSign}
          color="bg-amber-600"
        />
      </div>

      {/* Assets by Status */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <PieChart size={20} className="text-blue-600" />
          Activos por Estado
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(metrics.assets_by_status).map(([status, count]) => (
            <div key={status} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${ESTADO_USO_DOT_COLORS[status] || 'bg-slate-300'}`} />
                <span className={`text-[10px] font-semibold uppercase ${ESTADO_USO_COLORS[status] || 'text-slate-600'}`}>
                  {ESTADO_USO_LABELS[status] || status}
                </span>
              </div>
              <p className="text-2xl font-semibold text-slate-800">{count as number}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assets by Category */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-600" />
          Activos por Categoría
        </h3>
        <div className="space-y-4">
          {metrics.assets_by_category.map(stat => (
            <div key={stat.category_id} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">{stat.category_name}</span>
                  <span className="text-sm font-semibold text-slate-800">{stat.total_assets}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${metrics.total_assets > 0 ? (stat.total_assets / metrics.total_assets) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Valor: S/ {stat.total_value.toLocaleString()}</p>
                <p>Activos: {stat.total_assets}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assets Value by Company */}
      {metrics.assets_value_by_company.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            Valor de Activos por Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.assets_value_by_company.map(item => (
              <div key={item.company_name} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{item.company_name}</p>
                <p className="text-xl font-semibold text-slate-800">S/ {item.total_value.toLocaleString()}</p>
                <p className="text-[14px] font-semibold text-slate-800 mt-1">{item.asset_count} activos</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Maintenance & Assets Needing Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Maintenance */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Wrench size={20} className="text-blue-600" />
            Mantenimientos Recientes
          </h3>
          <div className="space-y-3">
            {metrics.recent_maintenance.length > 0 ? (
              metrics.recent_maintenance.map(record => (
                <div key={record.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wrench size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {record.assets?.brand} {record.assets?.model}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{record.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-600">
                      {new Date(String(record.created_at).includes('T') ? String(record.created_at) : `${record.created_at}T12:00:00`).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 text-sm py-8">No hay mantenimientos recientes</p>
            )}
          </div>
        </div>

        {/* Assets Needing Maintenance */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-600" />
            Activos Requieren Mantenimiento
          </h3>
          <div className="space-y-3">
            {metrics.assets_needing_maintenance.length > 0 ? (
              metrics.assets_needing_maintenance.slice(0, 5).map(asset => (
                <div key={asset.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {asset.brand} {asset.model}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{asset.codigo_unico || 'Sin código'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-amber-600">
                      {asset.locations?.name || 'Sede N/A'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto mb-3 text-emerald-600" size={32} />
                <p className="text-emerald-600 font-semibold text-sm">No hay activos en reparación</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
