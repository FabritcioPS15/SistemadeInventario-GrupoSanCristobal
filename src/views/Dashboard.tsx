import { useEffect, useState } from 'react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import {
  Package,
  TrendingUp,
  AlertCircle,
  Truck,
  ArrowRight,
  Plus,
  X,
  AlertTriangle,
  Camera,
  CheckSquare,
  MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';

interface QuickStats {
  totalAssets: number;
  activeAssets: number;
  totalCameras: number;
  activeCameras: number;
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  totalTickets: number;
  openTickets: number;
  attendedTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  archivedTickets: number;
  expiredDocuments: number;
  warningDocuments: number;
  // New detailed vehicle stats
  vehiclesByDocument: {
    soat: { expired: number; warning: number; nextExpiring: Array<{plate: string; days: number; location: string}> };
    citv: { expired: number; warning: number; nextExpiring: Array<{plate: string; days: number; location: string}> };
    poliza: { expired: number; warning: number; nextExpiring: Array<{plate: string; days: number; location: string}> };
  };
  // New ticket participants
  recentTicketParticipants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStats>({
    totalAssets: 0,
    activeAssets: 0,
    totalCameras: 0,
    activeCameras: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    totalTickets: 0,
    openTickets: 0,
    attendedTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    archivedTickets: 0,
    expiredDocuments: 0,
    warningDocuments: 0,
    vehiclesByDocument: {
      soat: { expired: 0, warning: 0, nextExpiring: [] },
      citv: { expired: 0, warning: 0, nextExpiring: [] },
      poliza: { expired: 0, warning: 0, nextExpiring: [] }
    },
    recentTicketParticipants: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDocumentPopup, setShowDocumentPopup] = useState<string | null>(null);
  const [documentFilter, setDocumentFilter] = useState<'all' | 'expired' | 'warning'>('all');
  const [expiredVehicles, setExpiredVehicles] = useState<{plate: string; days: number; expiredDate: Date; location: string}[]>([]);
  const [loadingExpired, setLoadingExpired] = useState(false);
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([]);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  // Function to get school name by ID
  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Sede Desconocida';
  };

  // Reset filter when popup opens
  useEffect(() => {
    if (showDocumentPopup) {
      setDocumentFilter('all');
    }
  }, [showDocumentPopup]);

  useEffect(() => {
    fetchQuickStats();
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchQuickStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        totalAssets,
        activeAssets,
        totalCameras,
        activeCameras,
        totalTickets,
        tickets,
        vehicles,
        schoolsData,
        recentTicketsData
      } = await dashboardService.getQuickStats();

      // Process tickets
      const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
      const attendedTickets = tickets?.filter(t => t.status === 'attended').length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0;
      const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;
      const archivedTickets = tickets?.filter(t => t.status === 'archived').length || 0;

      // Extract recent participants
      const participantsMap = new Map();

      recentTicketsData?.forEach((t: any) => {
        if (t.requester) {
          participantsMap.set(t.requester.id, {
            id: t.requester.id,
            name: t.requester.full_name,
            avatar: t.requester.avatar_url,
            role: 'requester'
          });
        }
        if (t.attendant) {
          participantsMap.set(t.attendant.id, {
            id: t.attendant.id,
            name: t.attendant.full_name,
            avatar: t.attendant.avatar_url,
            role: 'attendant'
          });
        }
      });

      const recentTicketParticipants = Array.from(participantsMap.values());

      // Process vehicles
      const totalVehicles = vehicles?.length || 0;
      const activeVehicles = vehicles?.filter(v => v.estado === 'activa').length || 0;
      const maintenanceVehicles = vehicles?.filter(v => v.estado === 'en_proceso').length || 0;

      // Process document expirations with detailed tracking
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      let expiredDocuments = 0;
      let warningDocuments = 0;

      // Detailed document tracking
      const vehiclesByDocument = {
        soat: { expired: 0, warning: 0, nextExpiring: [] as Array<{plate: string; days: number; location: string}> },
        citv: { expired: 0, warning: 0, nextExpiring: [] as Array<{plate: string; days: number; location: string}> },
        poliza: { expired: 0, warning: 0, nextExpiring: [] as Array<{plate: string; days: number; location: string}> }
      };

      vehicles?.forEach((vehicle: any) => {
        // Solo procesar vehículos que tengan placa válida
        if (!vehicle.placa || vehicle.placa.trim() === '') {
          console.log('Vehículo sin placa omitido:', vehicle);
          return;
        }
        
        const documents = [
          { name: 'soat', date: vehicle.soat_vencimiento, plate: vehicle.placa },
          { name: 'citv', date: vehicle.citv_vencimiento, plate: vehicle.placa },
          { name: 'poliza', date: vehicle.poliza_vencimiento, plate: vehicle.placa }
        ];

        documents.forEach(doc => {
          if (doc.date) {
            const date = new Date(doc.date);
            const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            if (date < today) {
              expiredDocuments++;
              vehiclesByDocument[doc.name as keyof typeof vehiclesByDocument].expired++;
            } else if (date <= thirtyDaysFromNow) {
              warningDocuments++;
              vehiclesByDocument[doc.name as keyof typeof vehiclesByDocument].warning++;
              
              // Add to next expiring list (show top 3 closest to expiration)
              if (daysUntil > 0) {
                vehiclesByDocument[doc.name as keyof typeof vehiclesByDocument].nextExpiring.push({
                  plate: doc.plate,
                  days: daysUntil,
                  location: vehicle.ubicacion_actual || 'Sin sede'
                });
              }
            }
          }
        });
      });

      // Sort next expiring vehicles (show all, not just top 3)
      Object.keys(vehiclesByDocument).forEach(docType => {
        vehiclesByDocument[docType as keyof typeof vehiclesByDocument].nextExpiring
          .sort((a, b) => a.days - b.days);
        // Removed .splice(3) to show all vehicles
      });

      // Set schools data
      setSchools(schoolsData || []);

      setStats({
        totalAssets: totalAssets || 0,
        activeAssets: activeAssets || 0,
        totalCameras: totalCameras || 0,
        activeCameras: activeCameras || 0,
        totalVehicles,
        activeVehicles,
        maintenanceVehicles,
        totalTickets: totalTickets || 0,
        openTickets,
        attendedTickets,
        resolvedTickets,
        closedTickets,
        archivedTickets,
        expiredDocuments,
        warningDocuments,
        vehiclesByDocument,
        recentTicketParticipants
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Error al cargar los datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to get filtered vehicles for popup
  const getFilteredVehicles = (docType: 'soat' | 'citv' | 'poliza') => {
    if (documentFilter === 'expired') {
      return expiredVehicles;
    } else {
      return stats.vehiclesByDocument[docType].nextExpiring;
    }
  };

  // Function to get expired vehicles
  const getExpiredVehicles = async (docType: 'soat' | 'citv' | 'poliza') => {
    try {
      const today = new Date();
      let dateField = '';
      
      switch(docType) {
        case 'soat':
          dateField = 'soat_vencimiento';
          break;
        case 'citv':
          dateField = 'citv_vencimiento';
          break;
        case 'poliza':
          dateField = 'poliza_vencimiento';
          break;
      }

      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa, ubicacion_actual, ' + dateField)
        .not('placa', 'is', null)
        .not(dateField, 'is', null)
        .lt(dateField, today.toISOString())
        .order(dateField, { ascending: true });

      if (error) throw error;
      
      return (data as any[])?.map(vehicle => {
        const expiredDate = new Date(vehicle[dateField]);
        const daysExpired = Math.ceil((today.getTime() - expiredDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          plate: vehicle.placa,
          days: -daysExpired, // Negative to indicate expired
          expiredDate: expiredDate,
          location: vehicle.ubicacion_actual || 'Sin sede'
        };
      }) || [];
    } catch (err) {
      console.error('Error fetching expired vehicles:', err);
      return [];
    }
  };

  // Load expired vehicles when filter changes
  useEffect(() => {
    if (showDocumentPopup && documentFilter === 'expired') {
      const loadExpiredVehicles = async () => {
        setLoadingExpired(true);
        const expired = await getExpiredVehicles(showDocumentPopup as 'soat' | 'citv' | 'poliza');
        setExpiredVehicles(expired);
        setLoadingExpired(false);
      };
      loadExpiredVehicles();
    } else {
      setExpiredVehicles([]);
    }
  }, [showDocumentPopup, documentFilter]);

  
  const alertCards = [
    {
      title: 'Documentos Vencidos',
      count: stats.expiredDocuments,
      icon: AlertTriangle,
      color: 'red',
      description: 'Requieren atención inmediata',
      path: '/flota-vehicular'
    },
    {
      title: 'Documentos por Vencer',
      count: stats.warningDocuments,
      icon: AlertCircle,
      color: 'yellow',
      description: 'Próximos a vencer (30 días)',
      path: '/flota-vehicular'
    }
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
            onClick={fetchQuickStats}
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
      {/* Header */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <TrendingUp size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Dashboard General</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Vista Rápida</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{stats.totalAssets + stats.totalCameras + stats.totalVehicles} Recursos</span>
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

          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Date and Time Display */}
        <div className="bg-[#002855] rounded-none shadow-sm p-8 text-white border border-[#002855]">
          <div className="text-center">
            <div className="text-5xl font-black mb-2 tracking-wider">
              {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[12px] font-bold opacity-90 uppercase tracking-[0.2em]">
              {currentTime.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>

        {/* Mixed Size Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Large Card - Inventario */}
          <div className="lg:col-span-2 bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden hover:border-[#002855] transition-all cursor-pointer group"
               onClick={() => navigate('/inventory')}>
            {/* Dark Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="text-[#002855]" size={20} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">Inventario General</span>
                </div>
                <ArrowRight size={18} className="text-[#002855]/40 group-hover:text-[#002855] transition-colors" />
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[#002855] text-4xl font-black mb-2">{stats.totalAssets}</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stats.activeAssets} activos</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Equipos y activos operativos</p>
            </div>
          </div>

          {/* Medium Card - Tickets */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden hover:border-[#002855] transition-all cursor-pointer group"
               onClick={() => navigate('/tickets')}>
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="text-[#002855]" size={20} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">Tickets</span>
                </div>
                <ArrowRight size={18} className="text-[#002855]/40 group-hover:text-[#002855] transition-colors" />
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[#002855] text-3xl font-black mb-3">{stats.totalTickets}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stats.openTickets} abiertos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stats.attendedTickets} en atención</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stats.resolvedTickets} resueltos</span>
                </div>
              </div>
            </div>
          </div>

          {/* Small Card - Cámaras */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden hover:border-[#002855] transition-all cursor-pointer group"
               onClick={() => navigate('/cameras')}>
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Camera className="text-[#002855]" size={20} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">Cámaras</span>
                </div>
                <ArrowRight size={18} className="text-[#002855]/40 group-hover:text-[#002855] transition-colors" />
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-[#002855] text-3xl font-black mb-2">{stats.totalCameras}</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stats.activeCameras} activas</span>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vigilancia</p>
            </div>
          </div>
        </div>

        {/* Vehicle Document Cards */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* SOAT Card */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden hover:border-[#002855] transition-all cursor-pointer group h-full flex flex-col"
               onClick={() => setShowDocumentPopup('soat')}>
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-[#002855]" size={18} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">SOAT</span>
                </div>
                <ArrowRight size={16} className="text-[#002855]/40 group-hover:text-[#002855] transition-colors" />
              </div>
            </div>
            <div className="p-6 flex-grow">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Vencidos</span>
                  <span className="text-2xl font-bold text-red-600">{stats.vehiclesByDocument.soat.expired}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Por vencer</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.vehiclesByDocument.soat.warning}</span>
                </div>
              </div>
              {stats.vehiclesByDocument.soat.nextExpiring.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Próximos a vencer:</p>
                  {stats.vehiclesByDocument.soat.nextExpiring.map((vehicle, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-700">{vehicle.plate}</span>
                      <span className="text-orange-600 font-bold">{vehicle.days} días</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CITV Card */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden hover:border-[#002855] transition-all cursor-pointer group h-full flex flex-col"
               onClick={() => setShowDocumentPopup('citv')}>
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-[#002855]" size={18} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">Revisión Técnica</span>
                </div>
                <ArrowRight size={16} className="text-[#002855]/40 group-hover:text-[#002855] transition-colors" />
              </div>
            </div>
            <div className="p-6 flex-grow">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Vencidas</span>
                  <span className="text-2xl font-bold text-red-600">{stats.vehiclesByDocument.citv.expired}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Por vencer</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.vehiclesByDocument.citv.warning}</span>
                </div>
              </div>
              {stats.vehiclesByDocument.citv.nextExpiring.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Próximas a vencer:</p>
                  {stats.vehiclesByDocument.citv.nextExpiring.map((vehicle, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-700">{vehicle.plate}</span>
                      <span className="text-orange-600 font-bold">{vehicle.days} días</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Póliza Card */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden hover:border-[#002855] transition-all cursor-pointer group h-full flex flex-col"
               onClick={() => setShowDocumentPopup('poliza')}>
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-[#002855]" size={18} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">Póliza</span>
                </div>
                <ArrowRight size={16} className="text-[#002855]/40 group-hover:text-[#002855] transition-colors" />
              </div>
            </div>
            <div className="p-6 flex-grow">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Vencidas</span>
                  <span className="text-2xl font-bold text-red-600">{stats.vehiclesByDocument.poliza.expired}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Por vencer</span>
                  <span className="text-2xl font-bold text-yellow-600">{stats.vehiclesByDocument.poliza.warning}</span>
                </div>
              </div>
              {stats.vehiclesByDocument.poliza.nextExpiring.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Próximas a vencer:</p>
                  {stats.vehiclesByDocument.poliza.nextExpiring.map((vehicle, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-700">{vehicle.plate}</span>
                      <span className="text-orange-600 font-bold">{vehicle.days} días</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fleet Overview Card */}
          <div className="bg-white rounded-none shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck className="text-[#002855]" size={18} />
                  <span className="text-[#002855] font-black uppercase tracking-[0.2em] text-[11px]">Estado General Flota</span>
                </div>
                <button
                  onClick={() => navigate('/flota-vehicular')}
                  className="text-[9px] bg-white border border-slate-200 text-[#002855] hover:bg-slate-100 px-3 py-1.5 rounded-none font-black uppercase tracking-[0.2em] transition-colors"
                >
                  Ver Detalles
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Simple Bar Chart */}
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Distribución de Vehículos</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Operativos</span>
                        <span className="text-sm font-bold text-green-600">{stats.activeVehicles}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalVehicles > 0 ? (stats.activeVehicles / stats.totalVehicles) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">En Mantenimiento</span>
                        <span className="text-sm font-bold text-orange-600">{stats.maintenanceVehicles}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalVehicles > 0 ? (stats.maintenanceVehicles / stats.totalVehicles) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Otros Estados</span>
                        <span className="text-sm font-bold text-gray-600">{stats.totalVehicles - stats.activeVehicles - stats.maintenanceVehicles}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gray-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${stats.totalVehicles > 0 ? ((stats.totalVehicles - stats.activeVehicles - stats.maintenanceVehicles) / stats.totalVehicles) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-3xl font-bold text-blue-900">{stats.totalVehicles}</p>
                    <p className="text-sm text-blue-700 font-medium">Total Vehículos</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-900">
                      {stats.totalVehicles > 0 ? Math.round((stats.activeVehicles / stats.totalVehicles) * 100) : 0}%
                    </p>
                    <p className="text-sm text-green-700 font-medium">Disponibilidad</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>

        {/* Simplified SUTRAN Alert */}
        {/* Simplified SUTRAN Alert */}
        <div className="bg-white shadow-sm border border-slate-200 rounded-none p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 border border-orange-100 rounded-none">
                <AlertTriangle className="text-orange-600" size={20} />
              </div>
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#002855]">Próxima Visita SUTRAN</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Estimación global</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-orange-600">15 DÍAS</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Promedio restante</div>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertCards.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.title}
                onClick={() => navigate(alert.path)}
                className={`bg-white rounded-none shadow-sm border border-slate-200 p-6 hover:border-[#002855] transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-none bg-${alert.color}-50 border border-${alert.color}-100`}>
                    <Icon className={`text-${alert.color}-600`} size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-${alert.color}-600 text-xl font-black mb-1`}>{alert.count}</h3>
                    <p className={`text-${alert.color}-900 text-[10px] uppercase font-black tracking-widest`}>{alert.title}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{alert.description}</p>
                  </div>
                  <ArrowRight size={18} className={`text-${alert.color}-300 group-hover:text-${alert.color}-500 transition-colors`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-none shadow-sm border border-slate-200 p-6">
          <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-[#002855] mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:border-[#002855] hover:text-[#002855] text-slate-700 rounded-none transition-colors"
            >
              <Package size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Ver Inventario</span>
            </button>
            <button
              onClick={() => navigate('/tickets')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:border-orange-600 hover:text-orange-600 text-slate-700 rounded-none transition-colors"
            >
              <CheckSquare size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Tickets</span>
            </button>
            <button
              onClick={() => navigate('/flota-vehicular')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 rounded-none transition-colors"
            >
              <Truck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Flota</span>
            </button>
            <button
              onClick={() => navigate('/cameras')}
              className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 hover:border-emerald-600 hover:text-emerald-600 text-slate-700 rounded-none transition-colors"
            >
              <Camera size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Cámaras</span>
            </button>
          </div>
        </div>        
        </div>


      {/* Document Details Popup */}
      {showDocumentPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className={`p-6 border-b ${
              showDocumentPopup === 'soat' ? 'bg-red-50 border-red-100' :
              showDocumentPopup === 'citv' ? 'bg-orange-50 border-orange-100' :
              'bg-purple-50 border-purple-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    showDocumentPopup === 'soat' ? 'bg-white text-red-600' :
                    showDocumentPopup === 'citv' ? 'bg-white text-orange-600' :
                    'bg-white text-purple-600'
                  }`}>
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {showDocumentPopup === 'soat' ? 'SOAT' :
                       showDocumentPopup === 'citv' ? 'Revisión Técnica' :
                       'Póliza de Seguro'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Estado de documentos vehiculares</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocumentPopup(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDocumentFilter('expired')}
                  className={`text-center p-4 rounded-lg transition-all duration-200 border-2 ${
                    documentFilter === 'expired' 
                      ? 'bg-red-100 border-red-300 shadow-lg' 
                      : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }`}
                >
                  <p className="text-2xl font-bold text-red-600">
                    {showDocumentPopup === 'soat' ? stats.vehiclesByDocument.soat.expired :
                     showDocumentPopup === 'citv' ? stats.vehiclesByDocument.citv.expired :
                     stats.vehiclesByDocument.poliza.expired}
                  </p>
                  <p className="text-sm text-red-700 font-medium">Vencidos</p>
                  {documentFilter === 'expired' && (
                    <div className="mt-2 text-xs text-red-600 font-medium">
                      ✓ Filtrando
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setDocumentFilter('warning')}
                  className={`text-center p-4 rounded-lg transition-all duration-200 border-2 ${
                    documentFilter === 'warning' 
                      ? 'bg-yellow-100 border-yellow-300 shadow-lg' 
                      : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                  }`}
                >
                  <p className="text-2xl font-bold text-yellow-600">
                    {showDocumentPopup === 'soat' ? stats.vehiclesByDocument.soat.warning :
                     showDocumentPopup === 'citv' ? stats.vehiclesByDocument.citv.warning :
                     stats.vehiclesByDocument.poliza.warning}
                  </p>
                  <p className="text-sm text-yellow-700 font-medium">Por vencer</p>
                  {documentFilter === 'warning' && (
                    <div className="mt-2 text-xs text-yellow-600 font-medium">
                      ✓ Filtrando
                    </div>
                  )}
                </button>
              </div>

              {/* Filter Status */}
              {documentFilter !== 'all' && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700">
                      Mostrando: {documentFilter === 'expired' ? 'Vencidos' : 'Por vencer'}
                    </span>
                  </div>
                  <button
                    onClick={() => setDocumentFilter('all')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Limpiar filtro
                  </button>
                </div>
              )}

              {/* Vehicle List */}
              {loadingExpired && documentFilter === 'expired' ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Cargando vehículos vencidos...</p>
                </div>
              ) : (
                (() => {
                  const filteredVehicles = getFilteredVehicles(showDocumentPopup as 'soat' | 'citv' | 'poliza');
                  
                  if (filteredVehicles.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Truck className="text-gray-400" size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">
                          {documentFilter === 'expired' 
                            ? 'No hay vehículos con documentos vencidos' 
                            : 'No hay vehículos próximos a vencer'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          documentFilter === 'expired' ? 'bg-red-500' : 'bg-orange-500'
                        }`}></div>
                        {documentFilter === 'expired' ? 'Vehículos Vencidos' : 'Próximos a Vencer'}
                      </h4>
                      <div className="space-y-3 max-h-80 overflow-y-auto sidebar-scroll">
                        {filteredVehicles.map((vehicle, idx) => (
                          <div key={idx} className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-blue-300">
                            {/* Status Indicator */}
                            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                              documentFilter === 'expired' ? 'bg-red-500 animate-pulse' :
                              Math.abs(vehicle.days) <= 7 ? 'bg-orange-500' :
                              'bg-yellow-500'
                            } shadow-lg`}></div>
                            
                            {/* Header with Plate */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                  documentFilter === 'expired' ? 'bg-red-50' :
                                  showDocumentPopup === 'soat' ? 'bg-orange-50' :
                                  showDocumentPopup === 'citv' ? 'bg-orange-50' :
                                  'bg-purple-50'
                                }`}>
                                  <Truck size={20} className={`${
                                    documentFilter === 'expired' ? 'text-red-600' :
                                    showDocumentPopup === 'soat' ? 'text-orange-600' :
                                    showDocumentPopup === 'citv' ? 'text-orange-600' :
                                    'text-purple-600'
                                  }`} />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-medium">Placa</p>
                                  <p className="text-lg font-bold text-gray-900 tracking-wider">{vehicle.plate}</p>
                                  <p className="text-xs text-blue-600 font-medium mt-1">
                                    <MapPin size={10} className="inline mr-1" />
                                    {getSchoolName(vehicle.location)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Days Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                                  documentFilter === 'expired' ? 'bg-red-100 text-red-700' :
                                  Math.abs(vehicle.days) <= 7 ? 'bg-orange-100 text-orange-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  <AlertTriangle size={12} />
                                  {documentFilter === 'expired' 
                                    ? `Vencido hace ${Math.abs(vehicle.days)} días`
                                    : `${Math.abs(vehicle.days)} días restantes`
                                  }
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-xs font-medium ${
                                  documentFilter === 'expired' ? 'text-red-600' :
                                  Math.abs(vehicle.days) <= 7 ? 'text-orange-600' :
                                  'text-yellow-600'
                                }`}>
                                  {documentFilter === 'expired' ? '¡Vencido!' :
                                   Math.abs(vehicle.days) <= 7 ? 'Crítico' :
                                   'Próximo'}
                                </p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    documentFilter === 'expired' ? 'bg-red-500' :
                                    Math.abs(vehicle.days) <= 7 ? 'bg-orange-500' :
                                    'bg-yellow-500'
                                  }`}
                                  style={{ width: documentFilter === 'expired' ? '100%' : `${Math.max(10, (Math.abs(vehicle.days) / 30) * 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Hover Effect */}
                            <div className={`absolute inset-0 rounded-xl border-2 transition-all duration-300 opacity-0 group-hover:opacity-100 ${
                              documentFilter === 'expired' ? 'border-red-300' :
                              showDocumentPopup === 'soat' ? 'border-orange-300' :
                              showDocumentPopup === 'citv' ? 'border-orange-300' :
                              'border-purple-300'
                            }`}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    navigate('/flota-vehicular');
                    setShowDocumentPopup(null);
                  }}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  Ver Flota Completa
                </button>
                <button
                  onClick={() => setShowDocumentPopup(null)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
