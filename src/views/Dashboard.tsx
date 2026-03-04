import { useEffect, useState } from 'react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
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
  Info,
  Wrench,
  Building2,
  LayoutDashboard,
  Star,
  Ticket,
  CheckSquare,
  AlertOctagon,
  Car
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
  expiredContrato: number;
  warningContrato: number;
  // Nuevas métricas de tickets
  totalTickets: number;
  resolvedTickets: number;
  pendingTickets: number;
  inProgressTickets: number;
  averageResolutionTime: number;
  // Nuevas métricas de placas
  platesWithExpiredDocuments: number;
  platesWithWarningDocuments: number;
  totalPlates: number;
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
  type: 'asset' | 'shipment' | 'maintenance' | 'sutran' | 'system';
  description: string;
  location?: string;
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
    expiredContrato: 0,
    warningContrato: 0,
    // Nuevas métricas
    totalTickets: 0,
    resolvedTickets: 0,
    pendingTickets: 0,
    inProgressTickets: 0,
    averageResolutionTime: 0,
    platesWithExpiredDocuments: 0,
    platesWithWarningDocuments: 0,
    totalPlates: 0,
  });

  // Filtro de sede para la sección de flota vehicular
  const [vehicleLocationFilter, setVehicleLocationFilter] = useState<string>('todos');
  const [vehicleLocations, setVehicleLocations] = useState<Array<{ id: string; name: string }>>([]);

  // Alertas SUTRAN por sede
  const [sutranAlerts, setSutranAlerts] = useState<SutranLocationAlert[]>([]);
  const [activeSutranIndex, setActiveSutranIndex] = useState(0);

  // Modal para detalles de placas
  const [showPlateDetails, setShowPlateDetails] = useState(false);
  const [plateDetails, setPlateDetails] = useState<any[]>([]);


  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSutranDetails, setShowSutranDetails] = useState(false);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  useEffect(() => {
    fetchDashboardData();
    fetchVehicleData(vehicleLocationFilter);
  }, []);

  useEffect(() => {
    const fetchVehicleLocations = async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('type', 'escuela_conductores')
        .order('name');

      if (!error && data) {
        setVehicleLocations(data as { id: string; name: string }[]);
      }
    };

    fetchVehicleLocations();
  }, []);

  useEffect(() => {
    fetchVehicleData(vehicleLocationFilter);
  }, [vehicleLocationFilter]);

  const fetchVehicleData = async (locationFilter: string) => {
    try {
      const { data: vehicles } = await supabase
        .from('vehiculos')
        .select('estado, placa, soat_vencimiento, citv_vencimiento, poliza_vencimiento, contrato_alquiler_vencimiento, ubicacion_actual');

      const filteredVehicles = locationFilter === 'todos'
        ? (vehicles || [])
        : (vehicles || []).filter(v => v.ubicacion_actual === locationFilter);

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

      filteredVehicles.forEach(v => {
        if (v.soat_vencimiento) {
          const date = new Date(v.soat_vencimiento);
          if (date < today) expiredSoat++;
          else if (date <= thirtyDaysFromNow) warningSoat++;
        }
        if (v.citv_vencimiento) {
          const date = new Date(v.citv_vencimiento);
          if (date < today) expiredCitv++;
          else if (date <= thirtyDaysFromNow) warningCitv++;
        }
        if (v.poliza_vencimiento) {
          const date = new Date(v.poliza_vencimiento);
          if (date < today) expiredPoliza++;
          else if (date <= thirtyDaysFromNow) warningPoliza++;
        }
        if (v.contrato_alquiler_vencimiento) {
          const date = new Date(v.contrato_alquiler_vencimiento);
          if (date < today) expiredContrato++;
          else if (date <= thirtyDaysFromNow) warningContrato++;
        }
      });

      // Calcular placas con documentos vencidos o por vencer
      const platesWithExpiredDocuments = expiredSoat + expiredCitv + expiredPoliza + expiredContrato;
      const platesWithWarningDocuments = warningSoat + warningCitv + warningPoliza + warningContrato;
      const totalPlates = totalVehicles;

      // Guardar detalles de placas para el modal
      const plateDetailsData = filteredVehicles.map(vehicle => {
        const getDocumentStatus = (vencimiento: string | null) => {
          if (!vencimiento) return { status: 'ok', statusText: 'No aplica', daysUntil: null, color: 'text-gray-600' };
          
          const date = new Date(vencimiento);
          const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (date < today) {
            return { status: 'expired', statusText: 'Vencido', daysUntil: Math.abs(daysUntil), color: 'text-red-600' };
          } else if (date <= thirtyDaysFromNow) {
            return { status: 'warning', statusText: 'Por vencer', daysUntil: daysUntil, color: 'text-orange-600' };
          } else {
            return { status: 'ok', statusText: 'Vigente', daysUntil: daysUntil, color: 'text-green-600' };
          }
        };

        const soatStatus = getDocumentStatus(vehicle.soat_vencimiento);
        const citvStatus = getDocumentStatus(vehicle.citv_vencimiento);
        const polizaStatus = getDocumentStatus(vehicle.poliza_vencimiento);
        const contratoStatus = getDocumentStatus(vehicle.contrato_alquiler_vencimiento);

        return {
          placa: vehicle.placa || 'Sin placa',
          ubicacion: vehicle.ubicacion_actual || 'Sin ubicación',
          estado: vehicle.estado || 'Sin estado',
          documentos: {
            soat: {
              vencimiento: vehicle.soat_vencimiento,
              ...soatStatus
            },
            citv: {
              vencimiento: vehicle.citv_vencimiento,
              ...citvStatus
            },
            poliza: {
              vencimiento: vehicle.poliza_vencimiento,
              ...polizaStatus
            },
            contrato: {
              vencimiento: vehicle.contrato_alquiler_vencimiento,
              ...contratoStatus
            }
          }
        };
      });

      setPlateDetails(plateDetailsData);

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
        // Nuevas métricas de placas
        platesWithExpiredDocuments,
        platesWithWarningDocuments,
        totalPlates,
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
      ] = await Promise.all([
        supabase.from('assets').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('cameras').select('*', { count: 'exact', head: true }),
        supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('locations').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'maintenance'),
      ]);

      // 2. Fetch Shipment Stats
      const { data: shipments } = await supabase.from('shipments').select('status');
      const activeShipments = shipments?.filter(s => s.status === 'in_transit').length || 0;
      const pendingShipments = shipments?.filter(s => s.status === 'pending').length || 0;
      const deliveredShipments = shipments?.filter(s => s.status === 'delivered').length || 0;

      // 3. Fetch Ticket Stats
      const { data: tickets } = await supabase.from('tickets').select('status, created_at, resolved_at');
      const totalTickets = tickets?.length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0;
      const pendingTickets = tickets?.filter(t => t.status === 'pending').length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === 'in_progress').length || 0;
      
      // Calcular tiempo promedio de resolución (en días)
      const resolvedTicketsWithTime = tickets?.filter(t => t.status === 'resolved' && t.resolved_at && t.created_at) || [];
      const averageResolutionTime = resolvedTicketsWithTime.length > 0 
        ? resolvedTicketsWithTime.reduce((acc, ticket) => {
            const created = new Date(ticket.created_at);
            const resolved = new Date(ticket.resolved_at);
            const daysDiff = Math.ceil((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
            return acc + daysDiff;
          }, 0) / resolvedTicketsWithTime.length
        : 0;

      // Importante: no tocar aquí las estadísticas de vehículos ni vencimientos,
      // esas las controla fetchVehicleData para respetar el filtro de sede.
      setStats(prev => ({
        ...prev,
        totalAssets: totalAssets || 0,
        activeAssets: activeAssets || 0,
        totalCameras: totalCameras || 0,
        activeCameras: activeCameras || 0,
        totalLocations: totalLocations || 0,
        totalUsers: totalUsers || 0,
        maintenanceAssets: maintenanceAssets || 0,
        activeShipments,
        pendingShipments,
        deliveredShipments,
        // Nuevas métricas de tickets
        totalTickets,
        resolvedTickets,
        pendingTickets,
        inProgressTickets,
        averageResolutionTime,
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

        // Para compatibilidad con el banner principal, usar la más crítica
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

      const { data: recentSutran } = await supabase
        .from('sutran_visits')
        .select('id, created_at, location_name, inspector_name')
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
      title: 'Tickets Resueltos',
      value: stats.resolvedTickets,
      subtitle: `${stats.averageResolutionTime.toFixed(1)} días promedio`,
      icon: CheckSquare,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      path: '/tickets'
    },
    {
      title: 'Flota Vehicular',
      value: stats.totalVehicles,
      subtitle: `${stats.activeVehicles} activas, ${stats.maintenanceVehicles} en proceso`,
      icon: Truck,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      path: '/flota'
    },
    {
      title: 'Placas con Documentos',
      value: stats.platesWithExpiredDocuments + stats.platesWithWarningDocuments,
      subtitle: `${stats.platesWithExpiredDocuments} vencidos, ${stats.platesWithWarningDocuments} por vencer`,
      icon: AlertOctagon,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      path: '/flota'
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
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <LayoutDashboard size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Dashboard General</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Resumen de Operaciones</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{stats.totalAssets + stats.totalCameras + stats.totalVehicles} Items Totales</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all font-bold text-[10px] uppercase tracking-widest mr-2"
          >
            <Plus size={14} />
            Nuevo Activo
          </button>

          <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors" title="Favoritos">
              <Star size={18} />
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* SUTRAN Alert Banner - Carrusel por sede */}
        {sutranAlerts.length > 0 && (
          <div className={`rounded-xl p-6 border shadow-sm transition-all hover:shadow-md ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-gradient-to-r from-red-50 to-white border-red-200' :
            sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' :
              'bg-gradient-to-r from-blue-50 to-white border-blue-200'
            }`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto text-center sm:text-left">
                <div className={`p-3 rounded-full shadow-sm mx-auto sm:mx-0 ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-white text-red-600' :
                  sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-white text-yellow-600' :
                    'bg-white text-blue-600'
                  }`}>
                  <Activity size={28} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-bold ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-900' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'text-yellow-900' :
                      'text-blue-900'
                    }`}>
                    Estimación de Visita SUTRAN
                  </h3>
                  <p className={`text-sm mt-1 ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'text-red-700' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                    <span className="font-medium">{sutranAlerts[activeSutranIndex].locationName}:</span> Próxima visita estimada <span className="font-semibold text-base">{sutranAlerts[activeSutranIndex].nextEstimatedVisit}</span>
                  </p>
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-red-100 text-red-800' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                    <Clock size={12} />
                    {sutranAlerts[activeSutranIndex].daysUntilNext > 0
                      ? `Faltan aprox. ${sutranAlerts[activeSutranIndex].daysUntilNext} días`
                      : 'Visita podría ser inminente'
                    }
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Controles del carrusel */}
                {sutranAlerts.length > 1 && (
                  <div className="flex items-center justify-center gap-2 bg-white/60 backdrop-blur px-3 py-1.5 rounded-lg w-full sm:w-auto">
                    <button
                      onClick={() => setActiveSutranIndex((prev) => (prev - 1 + sutranAlerts.length) % sutranAlerts.length)}
                      className="p-1 hover:bg-black/10 rounded transition-colors"
                      title="Anterior sede"
                    >
                      <ArrowRight size={16} className="rotate-180" />
                    </button>
                    <span className="text-xs font-medium text-gray-700 px-1">
                      {activeSutranIndex + 1} / {sutranAlerts.length}
                    </span>
                    <button
                      onClick={() => setActiveSutranIndex((prev) => (prev + 1) % sutranAlerts.length)}
                      className="p-1 hover:bg-black/10 rounded transition-colors"
                      title="Siguiente sede"
                    >
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowSutranDetails(true)}
                  className={`w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 ${sutranAlerts[activeSutranIndex].status === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200' :
                    sutranAlerts[activeSutranIndex].status === 'warning' ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-amber-200' :
                      'bg-slate-800 text-white hover:bg-slate-700 hover:shadow-slate-300'
                    }`}
                >
                  <Info size={16} />
                  Ver Detalles
                </button>
              </div>
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
                        activity.type === 'maintenance' ? <Wrench size={16} /> :
                          activity.type === 'sutran' ? <Building2 size={16} /> :
                            <Clock size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {activity.description}
                      </p>
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
          </div>
        </div>

        {/* Fleet Status Section - Replaces Diagnostic Tools */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Truck className="text-indigo-600" size={20} />
              <h3 className="text-lg font-semibold text-gray-900">Estado de la Flota</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <select
                value={vehicleLocationFilter}
                onChange={(e) => setVehicleLocationFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="todos">Todas las sedes</option>
                {vehicleLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <button
                onClick={() => navigate('/flota-vehicular')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
              >
                Catálogo
              </button>
            </div>
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
              { title: 'Contrato', expired: stats.expiredContrato, warning: stats.warningContrato, ok: stats.totalVehicles - stats.expiredContrato - stats.warningContrato }
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

        {/* Plate Details Modal */}
        {showPlateDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-orange-50 border-b border-orange-100 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg">
                      <Car className="text-orange-600" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Detalles de Documentos por Placa</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {plateDetails.length} vehículos • {vehicleLocationFilter === 'todos' ? 'Todas las sedes' : vehicleLocationFilter}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPlateDetails(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-semibold text-gray-900 border-r border-gray-200">Placa</th>
                        <th className="text-left p-3 font-semibold text-gray-900 border-r border-gray-200">Ubicación</th>
                        <th className="text-left p-3 font-semibold text-gray-900 border-r border-gray-200">Estado</th>
                        <th className="text-left p-3 font-semibold text-gray-900 border-r border-gray-200">SOAT</th>
                        <th className="text-left p-3 font-semibold text-gray-900 border-r border-gray-200">Rev. Técnica</th>
                        <th className="text-left p-3 font-semibold text-gray-900 border-r border-gray-200">Póliza</th>
                        <th className="text-left p-3 font-semibold text-gray-900">Contrato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plateDetails.map((plate, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium text-gray-900 border-r border-gray-100">{plate.placa}</td>
                          <td className="p-3 text-gray-700 border-r border-gray-100">{plate.ubicacion}</td>
                          <td className="p-3 border-r border-gray-100">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              plate.estado === 'activa' ? 'bg-green-100 text-green-800' :
                              plate.estado === 'en_proceso' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {plate.estado === 'activa' ? 'Activa' :
                               plate.estado === 'en_proceso' ? 'En Proceso' :
                               plate.estado || 'Sin estado'}
                            </span>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="space-y-1">
                              <div className={`text-sm font-medium ${plate.documentos.soat.color}`}>
                                {plate.documentos.soat.statusText}
                              </div>
                              {plate.documentos.soat.vencimiento && (
                                <div className="text-xs text-gray-500">
                                  {new Date(plate.documentos.soat.vencimiento).toLocaleDateString()}
                                </div>
                              )}
                              {plate.documentos.soat.daysUntil !== null && (
                                <div className="text-xs text-gray-600">
                                  {plate.documentos.soat.status === 'expired' 
                                    ? `Hace ${plate.documentos.soat.daysUntil} días`
                                    : `Faltan ${plate.documentos.soat.daysUntil} días`
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="space-y-1">
                              <div className={`text-sm font-medium ${plate.documentos.citv.color}`}>
                                {plate.documentos.citv.statusText}
                              </div>
                              {plate.documentos.citv.vencimiento && (
                                <div className="text-xs text-gray-500">
                                  {new Date(plate.documentos.citv.vencimiento).toLocaleDateString()}
                                </div>
                              )}
                              {plate.documentos.citv.daysUntil !== null && (
                                <div className="text-xs text-gray-600">
                                  {plate.documentos.citv.status === 'expired' 
                                    ? `Hace ${plate.documentos.citv.daysUntil} días`
                                    : `Faltan ${plate.documentos.citv.daysUntil} días`
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border-r border-gray-100">
                            <div className="space-y-1">
                              <div className={`text-sm font-medium ${plate.documentos.poliza.color}`}>
                                {plate.documentos.poliza.statusText}
                              </div>
                              {plate.documentos.poliza.vencimiento && (
                                <div className="text-xs text-gray-500">
                                  {new Date(plate.documentos.poliza.vencimiento).toLocaleDateString()}
                                </div>
                              )}
                              {plate.documentos.poliza.daysUntil !== null && (
                                <div className="text-xs text-gray-600">
                                  {plate.documentos.poliza.status === 'expired' 
                                    ? `Hace ${plate.documentos.poliza.daysUntil} días`
                                    : `Faltan ${plate.documentos.poliza.daysUntil} días`
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className={`text-sm font-medium ${plate.documentos.contrato.color}`}>
                                {plate.documentos.contrato.statusText}
                              </div>
                              {plate.documentos.contrato.vencimiento && (
                                <div className="text-xs text-gray-500">
                                  {new Date(plate.documentos.contrato.vencimiento).toLocaleDateString()}
                                </div>
                              )}
                              {plate.documentos.contrato.daysUntil !== null && (
                                <div className="text-xs text-gray-600">
                                  {plate.documentos.contrato.status === 'expired' 
                                    ? `Hace ${plate.documentos.contrato.daysUntil} días`
                                    : `Faltan ${plate.documentos.contrato.daysUntil} días`
                                  }
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{plateDetails.length}</span> vehículos mostrados
                  </div>
                  <button
                    onClick={() => {
                      navigate('/flota-vehicular');
                      setShowPlateDetails(false);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                  >
                    Ir a Flota Vehicular
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
