import { useEffect, useState } from 'react';
import {
  Package,
  Camera,
  MapPin,
  TrendingUp,
  AlertCircle,
  Truck,
  Activity,
  Clock,
  ArrowRight,
  Plus,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import DonutChart from '../components/charts/DonutChart';

interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  totalCameras: number;
  activeCameras: number;
  totalLocations: number;
  totalUsers: number;
  maintenanceAssets: number;
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  activeShipments: number;
  pendingShipments: number;
  deliveredShipments: number;
  expiredSoat: number;
  warningSoat: number;
  expiredCitv: number;
  warningCitv: number;
  expiredPoliza: number;
  warningPoliza: number;
}

interface SutranInfo {
  lastVisit: string | null;
  nextEstimatedVisit: string | null;
  daysUntilNext: number | null;
  status: 'ok' | 'warning' | 'danger' | 'unknown';
}

interface RecentActivity {
  id: string;
  type: 'asset' | 'shipment' | 'maintenance' | 'sutran';
  description: string;
  date: string;
  user?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAssets: 0,
    activeAssets: 0,
    totalCameras: 0,
    activeCameras: 0,
    totalLocations: 0,
    totalUsers: 0,
    maintenanceAssets: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    activeShipments: 0,
    pendingShipments: 0,
    deliveredShipments: 0,
    expiredSoat: 0,
    warningSoat: 0,
    expiredCitv: 0,
    warningCitv: 0,
    expiredPoliza: 0,
    warningPoliza: 0,
  });

  const [sutranInfo, setSutranInfo] = useState<SutranInfo>({
    lastVisit: null,
    nextEstimatedVisit: null,
    daysUntilNext: null,
    status: 'unknown'
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSutranDetails, setShowSutranDetails] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Basic Stats
      const [
        { count: totalAssets },
        { count: activeAssets },
        { count: totalCameras },
        { count: activeCameras },
        { count: totalLocations },
        { count: totalUsers },
        { count: maintenanceAssets },
      ] = await Promise.all([
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('cameras').select('*', { count: 'exact', head: true }),
        supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
      ]);

      // 2. Fetch Vehicle Stats & Expirations
      const { data: vehicles } = await supabase
        .from('vehiculos')
        .select('estado, soat_vencimiento, citv_vencimiento, poliza_vencimiento');

      const totalVehicles = vehicles?.length || 0;
      const activeVehicles = vehicles?.filter(v => v.estado === 'operativo' || v.estado === 'active' || v.estado === 'disponible').length || 0;
      const maintenanceVehicles = vehicles?.filter(v => v.estado === 'mantenimiento' || v.estado === 'en_mantenimiento').length || 0;

      // Calculate Expirations
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let expiredSoat = 0, warningSoat = 0;
      let expiredCitv = 0, warningCitv = 0;
      let expiredPoliza = 0, warningPoliza = 0;

      vehicles?.forEach(v => {
        // SOAT check
        if (v.soat_vencimiento) {
          const date = new Date(v.soat_vencimiento);
          if (date < today) expiredSoat++;
          else if (date <= thirtyDaysFromNow) warningSoat++;
        }
        // CITV check
        if (v.citv_vencimiento) {
          const date = new Date(v.citv_vencimiento);
          if (date < today) expiredCitv++;
          else if (date <= thirtyDaysFromNow) warningCitv++;
        }
        // Poliza check
        if (v.poliza_vencimiento) {
          const date = new Date(v.poliza_vencimiento);
          if (date < today) expiredPoliza++;
          else if (date <= thirtyDaysFromNow) warningPoliza++;
        }
      });

      // 3. Fetch Shipment Stats
      const { data: shipments } = await supabase.from('shipments').select('status');
      const activeShipments = shipments?.filter(s => s.status === 'in_transit').length || 0;
      const pendingShipments = shipments?.filter(s => s.status === 'pending').length || 0;
      const deliveredShipments = shipments?.filter(s => s.status === 'delivered').length || 0;

      setStats({
        totalAssets: totalAssets || 0,
        activeAssets: activeAssets || 0,
        totalCameras: totalCameras || 0,
        activeCameras: activeCameras || 0,
        totalLocations: totalLocations || 0,
        totalUsers: totalUsers || 0,
        maintenanceAssets: maintenanceAssets || 0,
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        activeShipments,
        pendingShipments,
        deliveredShipments,
        expiredSoat,
        warningSoat,
        expiredCitv,
        warningCitv,
        expiredPoliza,
        warningPoliza
      });

      // 4. Fetch SUTRAN Info
      const { data: lastSutranVisit } = await supabase
        .from('sutran_visits')
        .select('visit_date')
        .order('visit_date', { ascending: false })
        .limit(1)
        .single();

      if (lastSutranVisit) {
        const lastDate = new Date(lastSutranVisit.visit_date);
        // Estimate next visit: 3 months after last visit
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + 2);

        const today = new Date();
        const diffTime = nextDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: SutranInfo['status'] = 'ok';
        if (diffDays <= 15) status = 'danger';
        else if (diffDays <= 30) status = 'warning';

        setSutranInfo({
          lastVisit: lastSutranVisit.visit_date,
          nextEstimatedVisit: nextDate.toISOString().split('T')[0],
          daysUntilNext: diffDays,
          status
        });
      }

      // 5. Fetch Recent Activity
      const { data: recentShipments } = await supabase
        .from('shipments')
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentMaintenance } = await supabase
        .from('maintenance_records')
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];

      recentShipments?.forEach(s => {
        activities.push({
          id: s.id,
          type: 'shipment',
          description: `Envío ${s.status === 'pending' ? 'creado' : 'actualizado'}`,
          date: s.created_at
        });
      });

      recentMaintenance?.forEach(m => {
        activities.push({
          id: m.id,
          type: 'maintenance',
          description: `Mantenimiento ${m.status}`,
          date: m.created_at
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Error al cargar los datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Activos',
      value: stats.totalAssets,
      subtitle: `${stats.activeAssets} activos`,
      icon: Package,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      path: '/inventory'
    },
    {
      title: 'Flota Vehicular',
      value: stats.totalVehicles,
      subtitle: `${stats.activeVehicles} operativos`,
      icon: Truck,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      path: '/flota'
    },
    {
      title: 'Cámaras',
      value: stats.totalCameras,
      subtitle: `${stats.activeCameras} activas`,
      icon: Camera,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      path: '/cameras'
    },
    {
      title: 'Sedes',
      value: stats.totalLocations,
      subtitle: 'Ubicaciones',
      icon: MapPin,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      path: '/sedes'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-600" size={20} />
            <h3 className="text-lg font-semibold text-red-800">Error de Conexión</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard General</h2>
          <p className="text-gray-600">Resumen de operaciones y estado del sistema</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Nuevo Activo
          </button>
          <button
            onClick={() => navigate('/enviados')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Truck size={18} />
            Nuevo Envío
          </button>
        </div>
      </div>

      {/* SUTRAN Alert Banner */}
      {sutranInfo.lastVisit && (
        <div className={`rounded-xl p-6 border shadow-sm transition-all hover:shadow-md ${sutranInfo.status === 'danger' ? 'bg-gradient-to-r from-red-50 to-white border-red-200' :
          sutranInfo.status === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' :
            'bg-gradient-to-r from-blue-50 to-white border-blue-200'
          }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full shadow-sm ${sutranInfo.status === 'danger' ? 'bg-white text-red-600' :
                sutranInfo.status === 'warning' ? 'bg-white text-yellow-600' :
                  'bg-white text-blue-600'
                }`}>
                <Activity size={28} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${sutranInfo.status === 'danger' ? 'text-red-900' :
                  sutranInfo.status === 'warning' ? 'text-yellow-900' :
                    'text-blue-900'
                  }`}>
                  Estimación de Visita SUTRAN
                </h3>
                <p className={`text-sm mt-1 ${sutranInfo.status === 'danger' ? 'text-red-700' :
                  sutranInfo.status === 'warning' ? 'text-yellow-700' :
                    'text-blue-700'
                  }`}>
                  Próxima visita estimada: <span className="font-semibold text-base">{sutranInfo.nextEstimatedVisit}</span>
                </p>
                <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${sutranInfo.status === 'danger' ? 'bg-red-100 text-red-800' :
                  sutranInfo.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                  <Clock size={12} />
                  {sutranInfo.daysUntilNext && sutranInfo.daysUntilNext > 0
                    ? `Faltan aprox. ${sutranInfo.daysUntilNext} días`
                    : 'Visita podría ser inminente'
                  }
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowSutranDetails(true)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${sutranInfo.status === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200' :
                sutranInfo.status === 'warning' ? 'bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-yellow-200' :
                  'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'
                }`}
            >
              <Info size={18} />
              Ver Detalles
            </button>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              onClick={() => navigate(stat.path)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} p-3 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className={stat.textColor} size={24} />
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Status with Donut Charts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Estado del Sistema</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-around items-center py-4">
              <DonutChart
                percentage={stats.totalAssets > 0 ? (stats.activeAssets / stats.totalAssets) * 100 : 0}
                color="text-blue-600"
                label={`${stats.totalAssets > 0 ? Math.round((stats.activeAssets / stats.totalAssets) * 100) : 0}%`}
                subLabel="Activos Ops."
                size={140}
                strokeWidth={12}
              />
              <DonutChart
                percentage={stats.totalVehicles > 0 ? (stats.activeVehicles / stats.totalVehicles) * 100 : 0}
                color="text-indigo-600"
                label={`${stats.totalVehicles > 0 ? Math.round((stats.activeVehicles / stats.totalVehicles) * 100) : 0}%`}
                subLabel="Flota Ops."
                size={140}
                strokeWidth={12}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-blue-200 transition-colors">
                <p className="text-sm text-gray-500 mb-1 font-medium">Envíos en Tránsito</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeShipments}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-orange-200 transition-colors">
                <p className="text-sm text-gray-500 mb-1 font-medium">En Mantenimiento</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <p className="text-2xl font-bold text-gray-900">{stats.maintenanceAssets}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-yellow-200 transition-colors">
                <p className="text-sm text-gray-500 mb-1 font-medium">Envíos Pendientes</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingShipments}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-red-200 transition-colors">
                <p className="text-sm text-gray-500 mb-1 font-medium">Vehículos Mant.</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <p className="text-2xl font-bold text-gray-900">{stats.maintenanceVehicles}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="text-gray-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          </div>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0 group">
                  <div className={`mt-1 p-2 rounded-lg transition-colors group-hover:scale-105 ${activity.type === 'shipment' ? 'bg-blue-50 text-blue-600' :
                    activity.type === 'maintenance' ? 'bg-orange-50 text-orange-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                    {activity.type === 'shipment' ? <Truck size={16} /> :
                      activity.type === 'maintenance' ? <Activity size={16} /> :
                        <Clock size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(activity.date).toLocaleDateString()} - {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No hay actividad reciente</p>
            )}
          </div>

          <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors">
            Ver todo el historial
          </button>
        </div>
      </div>

      {/* Fleet Status Section - Replaces Diagnostic Tools */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Truck className="text-indigo-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Estado de la Flota</h3>
          </div>
          <button
            onClick={() => navigate('/flota')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Ver catálogo completo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Summary Cards */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-700 font-medium">Total Unidades</p>
              <p className="text-2xl font-bold text-indigo-900">{stats.totalVehicles}</p>
            </div>
            <Truck className="text-indigo-400" size={24} />
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Operativos</p>
              <p className="text-2xl font-bold text-green-900">{stats.activeVehicles}</p>
            </div>
            <CheckCircle className="text-green-400" size={24} />
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Mantenimiento</p>
              <p className="text-2xl font-bold text-orange-900">{stats.maintenanceVehicles}</p>
            </div>
            <Activity className="text-orange-400" size={24} />
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 font-medium">Otros Estados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVehicles - stats.activeVehicles - stats.maintenanceVehicles}</p>
            </div>
            <AlertCircle className="text-gray-400" size={24} />
          </div>
        </div>

        <h4 className="text-sm font-medium text-gray-700 mb-4">Vencimientos de Documentos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Alert Cards Logic */}
          {[
            { title: 'SOAT', expired: stats.expiredSoat, warning: stats.warningSoat, ok: stats.totalVehicles - stats.expiredSoat - stats.warningSoat },
            { title: 'Rev. Técnica', expired: stats.expiredCitv, warning: stats.warningCitv, ok: stats.totalVehicles - stats.expiredCitv - stats.warningCitv },
            { title: 'Póliza', expired: stats.expiredPoliza, warning: stats.warningPoliza, ok: stats.totalVehicles - stats.expiredPoliza - stats.warningPoliza },
            { title: 'Contrato', expired: 0, warning: 0, ok: stats.totalVehicles } // Contrato placeholder as field doesn't exist yet
          ].map((doc, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-gray-900">{doc.title}</h5>
                {doc.expired > 0 ? (
                  <AlertTriangle size={18} className="text-red-500" />
                ) : doc.warning > 0 ? (
                  <AlertTriangle size={18} className="text-yellow-500" />
                ) : (
                  <CheckCircle size={18} className="text-green-500" />
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center text-red-600 bg-red-50 px-2 py-1 rounded">
                  <span>Vencidos</span>
                  <span className="font-bold">{doc.expired}</span>
                </div>
                <div className="flex justify-between items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  <span>Por Vencer</span>
                  <span className="font-bold">{doc.warning}</span>
                </div>
                <div className="flex justify-between items-center text-green-600 bg-green-50 px-2 py-1 rounded">
                  <span>Vigentes</span>
                  <span className="font-bold">{doc.ok}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SUTRAN Details Modal */}
      {showSutranDetails && sutranInfo.lastVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className={`p-6 border-b ${sutranInfo.status === 'danger' ? 'bg-red-50 border-red-100' :
              sutranInfo.status === 'warning' ? 'bg-yellow-50 border-yellow-100' :
                'bg-blue-50 border-blue-100'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sutranInfo.status === 'danger' ? 'bg-white text-red-600' :
                    sutranInfo.status === 'warning' ? 'bg-white text-yellow-600' :
                      'bg-white text-blue-600'
                    }`}>
                    <Activity size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Detalles de Estimación</h3>
                </div>
                <button
                  onClick={() => setShowSutranDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-sm text-gray-600 mb-2">Estado Actual</p>
                <div className="flex items-center gap-2">
                  {sutranInfo.status === 'danger' ? <AlertTriangle className="text-red-600" size={20} /> :
                    sutranInfo.status === 'warning' ? <AlertTriangle className="text-yellow-600" size={20} /> :
                      <CheckCircle className="text-blue-600" size={20} />
                  }
                  <span className={`font-bold text-lg ${sutranInfo.status === 'danger' ? 'text-red-700' :
                    sutranInfo.status === 'warning' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                    {sutranInfo.status === 'danger' ? 'Atención Inmediata Requerida' :
                      sutranInfo.status === 'warning' ? 'Visita Próxima' :
                        'Estado Normal'
                    }
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={18} />
                  <span>Última Visita Registrada</span>
                </div>
                <span className="font-semibold text-gray-900">{sutranInfo.lastVisit}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={18} />
                  <span>Frecuencia Estimada</span>
                </div>
                <span className="font-semibold text-gray-900">Bimestral (60 días)</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={18} />
                  <span>Próxima Visita Estimada</span>
                </div>
                <span className={`font-bold ${sutranInfo.status === 'danger' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {sutranInfo.nextEstimatedVisit}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp size={18} />
                  <span>Tiempo Restante</span>
                </div>
                <span className={`font-bold px-3 py-1 rounded-full text-sm ${sutranInfo.status === 'danger' ? 'bg-red-100 text-red-700' :
                  sutranInfo.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                  {sutranInfo.daysUntilNext} días
                </span>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex gap-3">
              <Info className="text-blue-600 flex-shrink-0" size={20} />
              <p className="text-sm text-blue-800">
                Esta estimación se basa en la fecha de la última visita registrada. SUTRAN realiza visitas inopinadas, por lo que estas fechas son referenciales para fines de preparación preventiva.
              </p>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex gap-3">
            <button
              onClick={() => {
                setShowSutranDetails(false);
                navigate('/sutran');
              }}
              className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ir al Módulo SUTRAN
            </button>
            <button
              onClick={() => setShowSutranDetails(false)}
              className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}