import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Clock, AlertTriangle, CheckCircle, Wrench, X, MapPin, ShieldCheck, DollarSign, Package, LayoutGrid, List as ListIcon } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';
import MaintenanceForm from '../components/forms/MaintenanceForm';
import { useAuth } from '../contexts/AuthContext';

type MaintenanceProps = {
  categoryFilter?: string;
};

interface PartUsed {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
}

type MaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_type: 'preventive' | 'corrective' | 'technical_review' | 'repair';
  status: 'pending' | 'in_progress' | 'completed' | 'waiting_parts';
  description: string;
  scheduled_date?: string;
  completed_date?: string;
  technician?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  assets?: AssetWithDetails;
  failure_cause?: string;
  solution_applied?: string;
  work_hours?: number;
  parts_used?: PartUsed[];
  next_maintenance_date?: string;
  maintenance_frequency?: number;
  total_cost?: number;
  warranty_claim?: boolean;
  warranty_details?: string;
  location_id?: string;
  locations?: Location;
};

export default function Maintenance({ categoryFilter }: MaintenanceProps) {
  const { canEdit } = useAuth();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>();
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [machineTypeFilter, setMachineTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    waitingParts: 0,
    preventive: 0,
    corrective: 0,
    technicalReview: 0,
    repair: 0,
    recentlyAdded: 0,
    overdue: 0,
    totalCost: 0
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter, typeFilter, machineTypeFilter]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchMaintenanceRecords(), fetchLocations()]);
    setLoading(false);
  };

  const fetchMaintenanceRecords = async () => {
    try {
      let query = supabase
        .from('maintenance_records')
        .select('*, assets(*, asset_types(*), locations(*)), locations!location_id(*)')
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);
      if (typeFilter) query = query.eq('maintenance_type', typeFilter);
      if (machineTypeFilter) query = query.eq('assets.asset_type_id', machineTypeFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        setMaintenanceRecords(data as MaintenanceRecord[]);
        calculateStats(data as MaintenanceRecord[]);
      }
    } catch (err: any) {
      console.error('Error loading maintenance records:', err);
      alert(`Error al cargar registros: ${err.message}`);
    }
  };

  const calculateStats = (records: MaintenanceRecord[]) => {
    const newStats = {
      total: records.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      waitingParts: 0,
      preventive: 0,
      corrective: 0,
      technicalReview: 0,
      repair: 0,
      recentlyAdded: 0,
      overdue: 0,
      totalCost: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const today = new Date();

    records.forEach(record => {
      switch (record.status) {
        case 'pending': newStats.pending++; break;
        case 'in_progress': newStats.inProgress++; break;
        case 'completed': newStats.completed++; break;
        case 'waiting_parts': newStats.waitingParts++; break;
      }
      switch (record.maintenance_type) {
        case 'preventive': newStats.preventive++; break;
        case 'corrective': newStats.corrective++; break;
        case 'technical_review': newStats.technicalReview++; break;
        case 'repair': newStats.repair++; break;
      }
      if (record.total_cost) newStats.totalCost += record.total_cost;
      const createdDate = new Date(record.created_at);
      if (createdDate >= oneWeekAgo) newStats.recentlyAdded++;
      if (record.scheduled_date && record.status !== 'completed') {
        const scheduledDate = new Date(record.scheduled_date);
        if (scheduledDate < today) newStats.overdue++;
      }
    });

    setStats(newStats);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase.from('locations').select('*').order('name');
    if (error) console.error('Error fetching locations:', error);
    if (data) setLocations(data);
  };

  // Removed copyToClipboard as it was unused

  const handleEditRecord = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleViewRecord = (record: MaintenanceRecord) => {
    setViewingRecord(record);
  };

  const handleDeleteRecord = async (record: MaintenanceRecord) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el registro de mantenimiento "${record.description}"?`)) {
      try {
        const { error } = await supabase.from('maintenance_records').delete().eq('id', record.id);
        if (error) throw error;
        await fetchMaintenanceRecords();
        alert('Registro de mantenimiento eliminado correctamente');
      } catch (err: any) {
        alert('Error al eliminar el registro: ' + err.message);
      }
    }
  };

  const handleSaveRecord = async () => {
    setShowForm(false);
    setEditingRecord(undefined);
    await fetchMaintenanceRecords();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(undefined);
  };

  const getMaintenanceCategoryFromFilter = (filter?: string) => {
    if (!filter) return '';
    const categoryMap: Record<string, string> = {
      'maintenance-pending': 'Pendientes',
      'maintenance-in-progress': 'En Progreso',
      'maintenance-completed': 'Completados',
      'maintenance-preventive': 'Preventivo',
      'maintenance-corrective': 'Correctivo',
    };
    return categoryMap[filter] || '';
  };

  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesSearch =
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.technician?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assets?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assets?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.assets?.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const categoryFromFilter = getMaintenanceCategoryFromFilter(categoryFilter);
    let matchesCategory = true;
    if (categoryFromFilter) {
      switch (categoryFilter) {
        case 'maintenance-pending': matchesCategory = record.status === 'pending'; break;
        case 'maintenance-in-progress': matchesCategory = record.status === 'in_progress'; break;
        case 'maintenance-completed': matchesCategory = record.status === 'completed'; break;
        case 'maintenance-preventive': matchesCategory = record.maintenance_type === 'preventive'; break;
        case 'maintenance-corrective': matchesCategory = record.maintenance_type === 'corrective'; break;
      }
    }

    const matchesStatus = !statusFilter || record.status === statusFilter;
    const matchesType = !typeFilter || record.maintenance_type === typeFilter;
    const matchesLocation = !locationFilter || record.assets?.location_id === locationFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesType && matchesLocation;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setLocationFilter('');
    setMachineTypeFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || typeFilter || locationFilter || machineTypeFilter || categoryFilter;

  type StatusKey = MaintenanceRecord['status'];
  type MaintenanceTypeKey = MaintenanceRecord['maintenance_type'];

  const statusColors: Record<StatusKey, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    waiting_parts: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  const statusLabels: Record<StatusKey, string> = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completado',
    waiting_parts: 'En espera de repuestos',
  };

  const typeColors: Record<MaintenanceTypeKey, string> = {
    preventive: 'bg-blue-50 text-blue-700 border-blue-100',
    corrective: 'bg-rose-50 text-rose-700 border-rose-100',
    technical_review: 'bg-purple-50 text-purple-700 border-purple-100',
    repair: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  const typeLabels: Record<MaintenanceTypeKey, string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    technical_review: 'Revisión técnica',
    repair: 'Reparación',
  };

  const getStatusIcon = (status: StatusKey) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'in_progress': return <AlertTriangle size={16} className="text-blue-600" />;
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      case 'waiting_parts': return <Clock size={16} className="text-orange-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="w-full px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">
            Mantenimiento
            {categoryFilter && (
              <span className="ml-2 text-sm font-medium text-slate-500 lowercase italic">({getMaintenanceCategoryFromFilter(categoryFilter)})</span>
            )}
          </h2>
          <p className="text-slate-500 text-sm font-medium">Gestión integral y seguimiento técnico de activos operativos</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={16} className="mx-auto" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista Listado"
            >
              <ListIcon size={16} className="mx-auto" />
            </button>
          </div>
          {canEdit() && (
            <button
              onClick={() => {
                setEditingRecord(undefined);
                setShowForm(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Plus size={14} />
              Nuevo Mantenimiento
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Mantenimientos</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <Wrench size={20} className="text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pendientes</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <Clock size={20} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Inversión Total</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-blue-600">S/ {stats.totalCost.toFixed(2)}</div>
            <DollarSign size={20} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completados</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-400 sm:text-sm transition-all"
              placeholder="Buscar descripción, técnico, activo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 rounded-md bg-white font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los Estados</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 rounded-md bg-white font-medium"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos los Tipos</option>
              {Object.entries(typeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 text-sm border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-400 rounded-md bg-white font-medium"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">Todas las Sedes</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
              {searchTerm && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">"{searchTerm}"</span>}
              {statusFilter && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-100">{statusLabels[statusFilter as StatusKey]}</span>}
              {typeFilter && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100">{typeLabels[typeFilter as MaintenanceTypeKey]}</span>}
              {locationFilter && <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100">{locations.find(l => l.id === locationFilter)?.name}</span>}
            </div>
            <button onClick={clearFilters} className="text-xs font-bold text-gray-400 hover:text-rose-600 flex items-center gap-1">
              <X size={14} /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {
        loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando mantenimientos...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Wrench size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg mb-2">No se encontraron registros de mantenimiento</p>
            <p className="text-gray-400">
              {hasActiveFilters ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando un nuevo mantenimiento'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map(record => {
              const isOverdue = record.scheduled_date && record.status !== 'completed' && new Date(record.scheduled_date) < new Date();
              return (
                <div key={record.id} className={`group bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${isOverdue ? 'border-rose-200 bg-rose-50/20' : 'border-gray-200 hover:border-blue-200'}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`${statusColors[record.status]} border rounded-lg p-1.5 shadow-sm group-hover:scale-105 transition-transform`}>
                          {getStatusIcon(record.status)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm leading-tight group-hover:text-blue-700 transition-colors line-clamp-1">
                            {record.assets?.asset_types?.name}
                          </h3>
                          <p className="text-[10px] text-gray-500 font-medium">#{record.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      {record.total_cost && record.total_cost > 0 && (
                        <div className="text-right">
                          <p className="text-[9px] font-black text-blue-500 tracking-tighter leading-none italic">S/ {record.total_cost.toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-gray-700 font-semibold line-clamp-1 mb-1">{record.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${statusColors[record.status]}`}>{statusLabels[record.status]}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${typeColors[record.maintenance_type]}`}>{typeLabels[record.maintenance_type]}</span>
                        {record.warranty_claim && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">Garantía</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-t border-gray-50 mb-3 overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium truncate">
                        <MapPin size={12} className="text-rose-400 shrink-0" />
                        <span className="truncate">{record.locations?.name || record.assets?.locations?.name || 'Sede N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium truncate">
                        <CheckCircle size={12} className="text-blue-400 shrink-0" />
                        <span className="truncate">{record.technician || 'Sin técnico'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => handleViewRecord(record)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors font-bold border border-slate-100">
                        <Eye size={14} /> Ver
                      </button>
                      {canEdit() && (
                        <div className="flex gap-1">
                          <button onClick={() => handleEditRecord(record)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteRecord(record)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-100">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Activo / Informe</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción / Causa</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado / Tipo</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Responsable</th>
                    <th scope="col" className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Inversión</th>
                    <th scope="col" className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredRecords.map(record => {
                    const isOverdue = record.scheduled_date && record.status !== 'completed' && new Date(record.scheduled_date) < new Date();
                    return (
                      <tr key={record.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/10' : ''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`${statusColors[record.status]} p-1.5 rounded-lg border flex items-center justify-center shrink-0`}>
                              {getStatusIcon(record.status)}
                            </div>
                            <div>
                              <div className="text-xs font-black text-gray-900 leading-none">{record.assets?.asset_types?.name}</div>
                              <div className="text-[10px] font-bold text-gray-400 mt-1 font-mono uppercase">#{record.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs xl:max-w-md">
                            <div className="text-[11px] font-bold text-gray-800 truncate" title={record.description}>{record.description}</div>
                            {record.failure_cause && (
                              <div className="text-[9px] text-rose-500 font-bold mt-0.5 truncate flex items-center gap-1 italic">
                                <span className="w-1 h-1 bg-rose-400 rounded-full"></span> {record.failure_cause}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${statusColors[record.status]}`}>
                                {statusLabels[record.status]}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${typeColors[record.maintenance_type]}`}>
                                {typeLabels[record.maintenance_type]}
                              </span>
                            </div>
                            {record.warranty_claim && (
                              <span className="text-[8px] font-black text-indigo-500 uppercase flex items-center gap-0.5">
                                <ShieldCheck size={10} /> Garantía Activa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-tighter">
                            <CheckCircle size={12} className="text-blue-400" /> {record.technician || 'S.A'}
                          </div>
                          <div className="text-[9px] text-gray-400 mt-0.5 font-bold flex items-center gap-1">
                            <MapPin size={10} className="text-rose-300" /> {record.locations?.name || record.assets?.locations?.name || 'Sede N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="text-xs font-black text-slate-900 font-mono italic">
                            {record.total_cost && record.total_cost > 0 ? `S/ ${record.total_cost.toFixed(2)}` : 'S/ 0.00'}
                          </div>
                          {record.work_hours && (
                            <div className="text-[9px] font-bold text-blue-500 mt-0.5 italic">{record.work_hours} hs</div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleViewRecord(record)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Ver Detalles">
                              <Eye size={16} />
                            </button>
                            {canEdit() && (
                              <>
                                <button onClick={() => handleEditRecord(record)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Editar">
                                  <Edit size={16} />
                                </button>
                                <button onClick={() => handleDeleteRecord(record)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar">
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (List Mode) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredRecords.map(record => {
                const isOverdue = record.scheduled_date && record.status !== 'completed' && new Date(record.scheduled_date) < new Date();
                return (
                  <div key={record.id} className={`p-4 hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/5' : ''}`}>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`${statusColors[record.status]} p-2 rounded-lg border`}>
                          {getStatusIcon(record.status)}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase">{record.assets?.brand} {record.assets?.model}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">#{record.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      {record.total_cost && record.total_cost > 0 ? (
                        <div className="text-right">
                          <p className="text-xs font-black text-blue-600">S/ {record.total_cost.toFixed(2)}</p>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-xs font-medium text-slate-600 mb-3 line-clamp-2">{record.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${statusColors[record.status]}`}>{statusLabels[record.status]}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${typeColors[record.maintenance_type]}`}>{typeLabels[record.maintenance_type]}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <button onClick={() => handleViewRecord(record)} className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 rounded-md hover:bg-slate-100 uppercase tracking-widest">
                        <Eye size={14} /> Detalle
                      </button>
                      {canEdit() && (
                        <div className="flex gap-2">
                          <button onClick={() => handleEditRecord(record)} className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-md transition-all border border-slate-100">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteRecord(record)} className="p-1.5 text-slate-400 hover:text-rose-600 bg-red-50 rounded-md transition-all border border-red-100">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {
        showForm && (
          <MaintenanceForm editRecord={editingRecord} onClose={handleCloseForm} onSave={handleSaveRecord} />
        )
      }

      {
        viewingRecord && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col scale-in-center">
              <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Wrench size={20} className="text-blue-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest italic">Informe Técnico Detallado</h2>
                </div>
                <button onClick={() => setViewingRecord(undefined)} className="p-1.5 hover:bg-rose-600 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-slate-50/30">
                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">
                      {viewingRecord?.assets?.brand} {viewingRecord?.assets?.model}
                    </h3>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                      {viewingRecord?.assets?.asset_types?.name}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${viewingRecord?.status ? statusColors[viewingRecord.status] : ''}`}>{viewingRecord?.status ? statusLabels[viewingRecord.status] : ''}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${viewingRecord?.maintenance_type ? typeColors[viewingRecord.maintenance_type] : ''}`}>{viewingRecord?.maintenance_type ? typeLabels[viewingRecord.maintenance_type] : ''}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1">Diagnóstico & Solución</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Falla / Motivo</p>
                        <p className="text-xs font-semibold text-slate-700">{viewingRecord?.description}</p>
                      </div>
                      {viewingRecord?.failure_cause && (
                        <div>
                          <p className="text-[9px] font-bold text-rose-400 uppercase italic">Causa Raíz</p>
                          <p className="text-xs font-semibold text-slate-800 border-l-2 border-rose-200 pl-2">{viewingRecord?.failure_cause}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase">Acción Realizada</p>
                        <p className="text-xs font-medium text-slate-600 italic leading-relaxed">{viewingRecord?.solution_applied || 'Sin registro.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ejecución</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400">TÉCNICO</p>
                          <p className="text-[10px] font-black text-slate-700 truncate">{viewingRecord?.technician || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-400">ESFUERZO</p>
                          <p className="text-[10px] font-black text-blue-600">{viewingRecord?.work_hours || 0} h</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-400">FECHA</p>
                          <p className="text-[10px] font-bold text-slate-700">{viewingRecord?.completed_date ? new Date(viewingRecord.completed_date as any).toLocaleDateString() : 'Pend.'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-400">COSTO</p>
                          <p className="text-[10px] font-black text-emerald-600 font-mono">S/ {viewingRecord?.total_cost?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${viewingRecord?.warranty_claim ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                      <ShieldCheck size={18} className={viewingRecord?.warranty_claim ? 'text-indigo-600' : 'text-slate-300'} />
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">Garantía</p>
                        <p className={`text-[10px] font-black ${viewingRecord?.warranty_claim ? 'text-indigo-800' : 'text-slate-400'}`}>
                          {viewingRecord?.warranty_claim ? 'RECLAMO ACTIVO' : 'SIN RECLAMO'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {viewingRecord?.parts_used && Array.isArray(viewingRecord?.parts_used) && (viewingRecord?.parts_used as any[]).length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Package size={12} className="text-blue-400" /> Repuestos e Insumos
                      </h4>
                      <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase italic">{(viewingRecord?.parts_used as any[]).length} ítems</span>
                    </div>
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-50/30 text-slate-400 font-bold border-b border-slate-50 text-left">
                        <tr>
                          <th className="px-4 py-1.5 font-bold uppercase tracking-tighter">Nombre</th>
                          <th className="px-4 py-1.5 text-center">Cant.</th>
                          <th className="px-4 py-1.5 text-right uppercase tracking-tighter">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(viewingRecord.parts_used as any[]).map((part, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 font-bold text-slate-700">{part.name}</td>
                            <td className="px-4 py-2 text-center text-slate-500 font-black">{part.quantity} <span className="opacity-40">{part.unit}</span></td>
                            <td className="px-4 py-2 text-right font-black text-slate-900 italic">S/ {(part.quantity * part.unit_price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
                <button onClick={() => setViewingRecord(undefined)} className="flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">Cerrar</button>
                {canEdit() && (
                  <button onClick={() => { setViewingRecord(undefined); handleEditRecord(viewingRecord); }} className="flex-1 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transform active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <Edit size={14} /> Actualizar Registro
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}