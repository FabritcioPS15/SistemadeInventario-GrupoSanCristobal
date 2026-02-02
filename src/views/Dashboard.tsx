import { useEffect, useState } from 'react';
import {
  Package,
  AlertCircle,
  Truck,
  Activity,
  Clock,
  ArrowRight,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Building2,
  Ticket,
  ClipboardList,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { api } from '../lib/api';
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
  pendingMaintenance: number;
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  // Tickets
  totalTickets: number;
  openTickets: number;
  criticalTickets: number;
  unassignedTickets: number;
  // Documents
  expiredSoat: number;
  warningSoat: number;
  expiredCitv: number;
  warningCitv: number;
  expiredPoliza: number;
  warningPoliza: number;
  expiredContrato: number;
  warningContrato: number;
  expiringPlates: string[];
}

interface SutranLocationAlert {
  locationId: string | null;
  locationName: string;
  lastVisit: string;
  nextEstimatedVisit: string;
  daysUntilNext: number;
  status: 'ok' | 'warning' | 'danger';
}

interface RecentActivity {
  id: string;
  type: 'asset' | 'ticket' | 'maintenance' | 'sutran' | 'system';
  description: string;
  location?: string;
  date: string;
  user?: string;
  status?: string;
  priority?: string;
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
    pendingMaintenance: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    totalTickets: 0,
    openTickets: 0,
    criticalTickets: 0,
    unassignedTickets: 0,
    expiredSoat: 0,
    warningSoat: 0,
    expiredCitv: 0,
    warningCitv: 0,
    expiredPoliza: 0,
    warningPoliza: 0,
    expiredContrato: 0,
    warningContrato: 0,
    expiringPlates: []
  });

  // Alertas SUTRAN por sede
  const [sutranAlerts, setSutranAlerts] = useState<SutranLocationAlert[]>([]);
  const [activeSutranIndex, setActiveSutranIndex] = useState(0);


  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSutranDetails, setShowSutranDetails] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchVehicleData();
  }, []);

  const fetchVehicleData = async () => {
    try {
      const { data: vehicles } = await supabase
        .from('vehiculos')
        .select('id, placa, estado, soat_vencimiento, citv_vencimiento, poliza_vencimiento, contrato_alquiler_vencimiento, ubicacion_actual');

      const filteredVehicles = vehicles || [];

      const totalVehicles = filteredVehicles.length;
      // Con la nueva convención: 'activa', 'en_proceso', 'inactiva'
      const activeVehicles = filteredVehicles.filter(v => v.estado === 'activa').length;
      const maintenanceVehicles = filteredVehicles.filter(v => v.estado === 'en_proceso').length;

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let expiredSoat = 0, warningSoat = 0;
      let expiredCitv = 0, warningCitv = 0;
      let expiredPoliza = 0, warningPoliza = 0;
      let expiredContrato = 0, warningContrato = 0;

      const expiringPlatesSet = new Set<string>();

      filteredVehicles.forEach(v => {
        let hasIssue = false;
        if (v.soat_vencimiento) {
          const date = new Date(v.soat_vencimiento);
          if (date <= thirtyDaysFromNow) { expiredSoat += (date < today ? 1 : 0); warningSoat += (date >= today ? 1 : 0); hasIssue = true; }
        }
        if (v.citv_vencimiento) {
          const date = new Date(v.citv_vencimiento);
          if (date <= thirtyDaysFromNow) { expiredCitv += (date < today ? 1 : 0); warningCitv += (date >= today ? 1 : 0); hasIssue = true; }
        }
        if (v.poliza_vencimiento) {
          const date = new Date(v.poliza_vencimiento);
          if (date <= thirtyDaysFromNow) { expiredPoliza += (date < today ? 1 : 0); warningPoliza += (date >= today ? 1 : 0); hasIssue = true; }
        }
        if (v.contrato_alquiler_vencimiento) {
          const date = new Date(v.contrato_alquiler_vencimiento);
          if (date <= thirtyDaysFromNow) { expiredContrato += (date < today ? 1 : 0); warningContrato += (date >= today ? 1 : 0); hasIssue = true; }
        }
        if (hasIssue) expiringPlatesSet.add(v.placa);
      });

      setStats(prev => ({
        ...prev,
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        expiredSoat,
        warningSoat,
        expiredCitv,
        warningCitv,
        expiredPoliza,
        warningPoliza,
        expiredContrato,
        warningContrato,
        expiringPlates: Array.from(expiringPlatesSet)
      }));

    } catch (err) {
      console.error('Error fetching vehicle stats:', err);
    }
  };

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
        { count: pendingMaintenance },
      ] = await Promise.all([
        api.from('assets').select('*', { count: 'exact', head: true }),
        api.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        api.from('cameras').select('*', { count: 'exact', head: true }),
        api.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        api.from('locations').select('*', { count: 'exact', head: true }),
        api.from('users').select('*', { count: 'exact', head: true }),
        api.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
        api.from('maintenance_records').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      // 2. Fetch Ticket Stats
      const { data: tickets } = await api.from('tickets').select('status, priority, assigned_to');
      const totalTickets = tickets?.length || 0;
      const openTickets = tickets?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;
      const criticalTickets = tickets?.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length || 0;
      const unassignedTickets = tickets?.filter(t => !t.assigned_to && t.status !== 'closed' && t.status !== 'resolved').length || 0;

      // Update basic stats without touching vehicle stats (handled by fetchVehicleData)
      setStats(prev => ({
        ...prev,
        totalAssets: totalAssets || 0,
        activeAssets: activeAssets || 0,
        totalCameras: totalCameras || 0,
        activeCameras: activeCameras || 0,
        totalLocations: totalLocations || 0,
        totalUsers: totalUsers || 0,
        maintenanceAssets: maintenanceAssets || 0,
        pendingMaintenance: pendingMaintenance || 0,
        totalTickets,
        openTickets,
        criticalTickets,
        unassignedTickets
      }));

      // 4. Fetch SUTRAN Info por sede
      const { data: sutranVisits } = await supabase
        .from('sutran_visits')
        .select('id, visit_date, location_id, location_name')
        .order('visit_date', { ascending: false });

      if (sutranVisits && sutranVisits.length > 0) {
        // Agrupar por sede y quedarnos con la última visita de cada una
        const latestByLocation = new Map<string | null, typeof sutranVisits[0]>();
        sutranVisits.forEach(visit => {
          const key = visit.location_id;
          if (!latestByLocation.has(key) || new Date(visit.visit_date) > new Date(latestByLocation.get(key)!.visit_date)) {
            latestByLocation.set(key, visit);
          }
        });

        // Construir alertas por sede
        const alerts: SutranLocationAlert[] = Array.from(latestByLocation.values()).map(visit => {
          const lastDate = new Date(visit.visit_date);
          const nextDate = new Date(lastDate);
          nextDate.setMonth(nextDate.getMonth() + 2);

          const today = new Date();
          const diffTime = nextDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let status: SutranLocationAlert['status'] = 'ok';
          if (diffDays <= 15) status = 'danger';
          else if (diffDays <= 30) status = 'warning';

          return {
            locationId: visit.location_id,
            locationName: visit.location_name || 'Sin sede',
            lastVisit: visit.visit_date,
            nextEstimatedVisit: nextDate.toISOString().split('T')[0],
            daysUntilNext: diffDays,
            status
          };
        });

        // Ordenar por urgencia (menos días hasta la próxima visita)
        alerts.sort((a, b) => a.daysUntilNext - b.daysUntilNext);

        setSutranAlerts(alerts);
        setActiveSutranIndex(0);
      }

      // 5. Fetch Recent Activity (Modified)
      // Fetch Recent Tickets
      const { data: recentTickets } = await supabase
        .from('tickets')
        .select('id, created_at, title, status, priority')
        .order('created_at', { ascending: false })
        .limit(4);

      const { data: recentMaintenance } = await supabase
        .from('maintenance_records')
        .select('id, created_at, status, description')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentSutran } = await supabase
        .from('sutran_visits')
        .select('id, created_at, location_name, inspector_name')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = [];

      recentTickets?.forEach(t => {
        activities.push({
          id: t.id,
          type: 'ticket',
          description: `Ticket: ${t.title}`,
          date: t.created_at,
          status: t.status,
          priority: t.priority
        });
      });

      recentMaintenance?.forEach(m => {
        activities.push({
          id: m.id,
          type: 'maintenance',
          description: `Mantenimiento ${m.status.replace('_', ' ')}`,
          date: m.created_at
        });
      });

      recentSutran?.forEach(s => {
        activities.push({
          id: s.id,
          type: 'sutran',
          description: `Visita SUTRAN en ${s.location_name}`,
          location: s.location_name,
          date: s.created_at
        });
      });

      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 6));

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
      title: 'Mesa de Ayuda',
      value: stats.openTickets,
      subtitle: `${stats.criticalTickets} críticos, ${stats.unassignedTickets} sin asignar`,
      icon: Ticket,
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      path: '/tickets'
    },
    {
      title: 'Mantenimiento',
      value: stats.maintenanceAssets + stats.maintenanceVehicles,
      subtitle: `${stats.pendingMaintenance} pendientes de atención`,
      icon: Wrench,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      path: '/maintenance'
    },
    {
      title: 'Flota Vehicular',
      value: stats.totalVehicles,
      subtitle: `${stats.activeVehicles} operativas`,
      icon: Truck,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      path: '/flota-vehicular'
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-auto text-center md:text-left">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard General</h2>
          <p className="text-gray-600">Resumen de operaciones y estado del sistema</p>
        </div>
        <div className="flex w-full md:w-auto gap-3 justify-center md:justify-end">
          <button
            onClick={() => navigate('/tickets')}
            className="flex-1 md:flex-none justify-center items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm font-bold text-[11px] uppercase tracking-wider"
          >
            <Ticket size={16} />
            <span className="md:hidden lg:inline">Ver Tickets</span>
            <span className="hidden md:inline lg:hidden">Tickets</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="flex-1 md:flex-none justify-center items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 font-bold text-[11px] uppercase tracking-wider"
          >
            <Plus size={16} />
            <span className="md:hidden lg:inline">Nuevo Activo</span>
            <span className="hidden md:inline lg:hidden">Activo</span>
          </button>
        </div>
      </div>

      {/* System Alerts Section (Consolidated) */}
      <div className="grid grid-cols-1 gap-4">
        {sutranAlerts.length > 0 && (
          <div className={`rounded-xl p-4 border shadow-sm transition-all hover:shadow-md ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-gradient-to-r from-red-50 to-white border-red-200' :
            sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' :
              'bg-gradient-to-r from-blue-50 to-white border-blue-200'
            }`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto text-center sm:text-left">
                <div className={`p-3 rounded-full shadow-sm mx-auto sm:mx-0 ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-white text-red-600' :
                  sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-white text-yellow-600' :
                    'bg-white text-blue-600'
                  }`}>
                  <Activity size={24} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-base font-bold ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-900' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                    SUTRAN: {sutranAlerts[activeSutranIndex].locationName}
                  </h3>
                  <p className={`text-xs mt-1 ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-700' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                    Est: <span className="font-semibold">{sutranAlerts[activeSutranIndex].nextEstimatedVisit}</span>
                    <span className="mx-2">•</span>
                    {sutranAlerts[activeSutranIndex].daysUntilNext > 0
                      ? `Faltan ${sutranAlerts[activeSutranIndex].daysUntilNext} días`
                      : 'Inminente'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sutranAlerts.length > 1 && (
                  <div className="flex items-center justify-center gap-1 bg-white/60 backdrop-blur px-2 py-1 rounded-lg">
                    <button
                      onClick={() => setActiveSutranIndex((prev) => (prev - 1 + sutranAlerts.length) % sutranAlerts.length)}
                      className="p-1 hover:bg-black/10 rounded transition-colors"
                    >
                      <ArrowRight size={14} className="rotate-180" />
                    </button>
                    <span className="text-[10px] font-bold text-gray-700 px-1">
                      {activeSutranIndex + 1}/{sutranAlerts.length}
                    </span>
                    <button
                      onClick={() => setActiveSutranIndex((prev) => (prev + 1) % sutranAlerts.length)}
                      className="p-1 hover:bg-black/10 rounded transition-colors"
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowSutranDetails(true)}
                  className="px-3 py-1.5 bg-white/80 hover:bg-white text-xs font-bold rounded-lg border border-black/5 shadow-sm transition-all"
                >
                  Ver Info
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Critical Tickets & Docs Alert Row */}
        {/* Critical Tickets & Docs Alert Row */}
        {(stats.criticalTickets > 0 || (stats.expiredSoat + stats.expiredCitv + stats.expiredPoliza + stats.expiredContrato) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.criticalTickets > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => navigate('/tickets')}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Tickets Críticos</h4>
                    <p className="text-xs text-red-700">{stats.criticalTickets} ticket(s) requieren atención urgente</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-red-400" />
              </div>
            )}

            {/* Documentos Vencidos - Desglose Detallado */}
            {(stats.expiredSoat + stats.expiredCitv + stats.expiredPoliza + stats.expiredContrato + stats.warningSoat + stats.warningCitv + stats.warningPoliza + stats.warningContrato) > 0 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => navigate('/flota-vehicular')}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-orange-600" size={18} />
                    <h4 className="text-sm font-bold text-orange-900">Alertas de Documentación</h4>
                  </div>
                  <ArrowRight size={16} className="text-orange-400" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { label: 'SOAT', exp: stats.expiredSoat, warn: stats.warningSoat },
                    { label: 'CITV', exp: stats.expiredCitv, warn: stats.warningCitv },
                    { label: 'Póliza', exp: stats.expiredPoliza, warn: stats.warningPoliza },
                    { label: 'Contrato', exp: stats.expiredContrato, warn: stats.warningContrato },
                  ].map((doc, idx) => (
                    <div key={idx} className={`px-2 py-1.5 rounded text-center border ${doc.exp > 0 ? 'bg-red-100 border-red-200 text-red-800' :
                      doc.warn > 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                        'bg-white border-orange-100 text-gray-400 opacity-60'
                      }`}>
                      <p className="text-[10px] font-bold uppercase">{doc.label}</p>
                      <p className="text-xs font-bold">
                        {doc.exp > 0 ? `${doc.exp} venc.` : doc.warn > 0 ? `${doc.warn} por venc.` : 'OK'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              onClick={() => navigate(stat.path)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.bgColor} p-2.5 rounded-lg group-hover:scale-110 transition-transform`}>
                  <Icon className={stat.textColor} size={22} />
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
              <h3 className="text-gray-600 text-xs font-medium mb-0.5 uppercase tracking-wide">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 leading-snug">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.subtitle}</p>
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
            <div className="flex flex-col sm:flex-row justify-around items-center gap-6 py-4">
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
                subLabel="Flota activa"
                size={140}
                strokeWidth={12}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Quick Checklists Links */}
              <h4 className="text-sm font-medium text-gray-500 mb-2">Accesos Rápidos</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/checklist/escon')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wide">ESCON</h5>
                    <p className="text-[10px] text-gray-500">Escuelas</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/checklist/citv')}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                >
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs uppercase tracking-wide">CITV</h5>
                    <p className="text-[10px] text-gray-500">Rev. Técnicas</p>
                  </div>
                </button>
              </div>

              <div className="mt-2 bg-orange-50 rounded-lg p-4 border border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-800 font-bold">Mantenimientos Pendientes</p>
                    <p className="text-xs text-orange-600 mt-0.5">Requieren atención inmediata</p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm text-orange-600 font-bold border border-orange-100">
                    {stats.pendingMaintenance}
                  </div>
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
                  <div className={`mt-1 p-2 rounded-lg transition-colors group-hover:scale-105 ${activity.type === 'ticket' ? 'bg-indigo-50 text-indigo-600' :
                    activity.type === 'maintenance' ? 'bg-orange-50 text-orange-600' :
                      activity.type === 'sutran' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-600'
                    }`}>
                    {activity.type === 'ticket' ? <Ticket size={16} /> :
                      activity.type === 'maintenance' ? <Wrench size={16} /> :
                        activity.type === 'sutran' ? <Building2 size={16} /> :
                          <Clock size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {activity.description}
                    </p>
                    {activity.type === 'ticket' && activity.priority && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${activity.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>{activity.status === 'open' ? 'Abierto' : activity.status}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${activity.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          activity.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>{activity.priority}</span>
                      </div>
                    )}
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

          <button
            onClick={() => navigate('/audit')}
            className="w-full mt-4 text-[11px] font-bold text-slate-600 uppercase tracking-widest hover:text-slate-800 py-3 rounded-lg hover:bg-slate-50 transition-colors border border-dashed border-slate-200 hover:border-slate-300"
          >
            Ver historial completo
          </button>
        </div>
      </div>



      {/* SUTRAN Details Modal */}
      {showSutranDetails && sutranAlerts.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className={`p-6 border-b ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-red-50 border-red-100' :
              sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-yellow-50 border-yellow-100' :
                'bg-blue-50 border-blue-100'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-white text-red-600' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-white text-yellow-600' :
                      'bg-white text-blue-600'
                    }`}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Detalles de Estimación</h3>
                    <p className="text-sm text-gray-600 mt-1">{sutranAlerts[activeSutranIndex].locationName}</p>
                  </div>
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
                  {sutranAlerts[activeSutranIndex].status === 'danger' ? <AlertTriangle className="text-red-600" size={20} /> :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? <AlertTriangle className="text-yellow-600" size={20} /> :
                      <CheckCircle className="text-blue-600" size={20} />
                  }
                  <span className={`font-bold text-lg ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-700' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                    {sutranAlerts[activeSutranIndex].status === 'danger' ? 'Atención Inmediata Requerida' :
                      sutranAlerts[activeSutranIndex].status === 'warning' ? 'Visita Próxima' :
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
                <span className="font-semibold text-gray-900">{sutranAlerts[activeSutranIndex].lastVisit}</span>
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
                <span className={`font-bold ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                  {sutranAlerts[activeSutranIndex].nextEstimatedVisit}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp size={18} />
                  <span>Tiempo Restante</span>
                </div>
                <span className={`font-bold ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-600' :
                  sutranAlerts[activeSutranIndex].status === 'warning' ? 'text-yellow-600' : 'text-gray-900'
                  }`}>
                  {sutranAlerts[activeSutranIndex].daysUntilNext > 0
                    ? `${sutranAlerts[activeSutranIndex].daysUntilNext} días`
                    : 'Inminente'
                  }
                </span>
              </div>

              {/* Lista de otras sedes con alertas */}
              {sutranAlerts.length > 1 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">Otras sedes con estimaciones</p>
                  <div className="space-y-2">
                    {sutranAlerts.map((alert, idx) => (
                      idx !== activeSutranIndex && (
                        <div
                          key={idx}
                          onClick={() => setActiveSutranIndex(idx)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${alert.status === 'danger' ? 'bg-red-500' :
                              alert.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}></div>
                            <span className="text-sm font-medium text-gray-700">{alert.locationName}</span>
                          </div>
                          <span className="text-xs text-gray-500">{alert.nextEstimatedVisit}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    navigate('/sutran');
                    setShowSutranDetails(false);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Ver Historial Completo
                </button>
                <button
                  onClick={() => {
                    navigate('/sutran?action=new');
                    setShowSutranDetails(false);
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Registrar Nueva Visita
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

