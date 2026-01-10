import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Clock, AlertTriangle, CheckCircle, Wrench, X, Copy, Check, Calendar, MapPin } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';
import MaintenanceForm from '../components/forms/MaintenanceForm';
import { useAuth } from '../contexts/AuthContext';

type MaintenanceProps = {
  categoryFilter?: string;
};

interface PartUsed {
  id: string;
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
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
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
    console.log(' Cargando registros de mantenimiento...');
    try {
      let query = supabase
        .from('maintenance_records')
        .select('*, assets(*, asset_types(*), locations(*))')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
      if (typeFilter) {
        query = query.eq('maintenance_type', typeFilter);
      }
      if (machineTypeFilter) {
        query = query.eq('assets.asset_type_id', machineTypeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error(' Error al cargar registros de mantenimiento:', error);
        alert(`Error al cargar registros: ${error.message}`);
        return;
      }

      if (data) {
        console.log(` ${data.length} registros de mantenimiento cargados`);
        setMaintenanceRecords(data as MaintenanceRecord[]);
        calculateStats(data as MaintenanceRecord[]);
      }
    } catch (err) {
      console.error(' Error inesperado al cargar registros:', err);
      alert('Error inesperado al cargar registros de mantenimiento');
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

      if (record.total_cost) {
        newStats.totalCost += record.total_cost;
      }

      const createdDate = new Date(record.created_at);
      if (createdDate >= oneWeekAgo) {
        newStats.recentlyAdded++;
      }

      if (record.scheduled_date && record.status !== 'completed') {
        const scheduledDate = new Date(record.scheduled_date);
        if (scheduledDate < today) {
          newStats.overdue++;
        }
      }
    });

    setStats(newStats);
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      return;
    }

    if (data) setLocations(data);
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    }
  };

  const handleEditRecord = (record: MaintenanceRecord) => {
    console.log('✏️ Editando registro de mantenimiento:', record);
    setEditingRecord(record);
    setShowForm(true);
  };

  const handleViewRecord = (record: MaintenanceRecord) => {
    console.log('👁️ Viendo registro de mantenimiento:', record);
    setViewingRecord(record);
  };

  const handleDeleteRecord = async (record: MaintenanceRecord) => {
    console.log('🗑️ Iniciando eliminación de registro:', record.id);

    if (window.confirm(`¿Estás seguro de que quieres eliminar el registro de mantenimiento "${record.description}"?`)) {
      try {
        const { error } = await supabase
          .from('maintenance_records')
          .delete()
          .eq('id', record.id);

        if (error) {
          console.error('❌ Error al eliminar registro:', error);
          alert(`Error al eliminar el registro: ${error.message}\n\nCódigo: ${error.code}\nDetalles: ${error.details}`);
        } else {
          console.log('✅ Registro eliminado correctamente');
          setTimeout(async () => {
            await fetchMaintenanceRecords();
          }, 100);
          alert('Registro de mantenimiento eliminado correctamente');
        }
      } catch (err) {
        console.error('❌ Error inesperado al eliminar registro:', err);
        alert('Error inesperado al eliminar el registro: ' + err);
      }
    }
  };

  const handleSaveRecord = async () => {
    console.log('💾 Guardando registro de mantenimiento...');
    setShowForm(false);
    setEditingRecord(undefined);
    setTimeout(async () => {
      await fetchMaintenanceRecords();
    }, 100);
    console.log('✅ Registro guardado y datos actualizados');
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
        case 'maintenance-pending':
          matchesCategory = record.status === 'pending';
          break;
        case 'maintenance-in-progress':
          matchesCategory = record.status === 'in_progress';
          break;
        case 'maintenance-completed':
          matchesCategory = record.status === 'completed';
          break;
        case 'maintenance-preventive':
          matchesCategory = record.maintenance_type === 'preventive';
          break;
        case 'maintenance-corrective':
          matchesCategory = record.maintenance_type === 'corrective';
          break;
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
    <div className="p-8 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Mantenimiento
            {categoryFilter && (
              <span className="ml-2 text-sm font-normal text-blue-600">({getMaintenanceCategoryFromFilter(categoryFilter)})</span>
            )}
          </h2>
          <p className="text-gray-600">Gestión de mantenimientos de activos</p>
        </div>

        <div className="flex items-center gap-3">
          {canEdit() && (
            <button
              onClick={() => {
                setEditingRecord(undefined);
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Nuevo Mantenimiento
            </button>
          )}
        </div>
      </div>

      {/* Dashboard de Estadísticas Standardized */}
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
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">En Progreso</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <AlertTriangle size={20} className="text-blue-500" />
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

      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Buscar descripción, técnico, activo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="waiting_parts">En espera de repuestos</option>
              </select>
            </div>

            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">Todos los Tipos</option>
                <option value="preventive">Preventivo</option>
                <option value="corrective">Correctivo</option>
                <option value="technical_review">Revisión técnica</option>
                <option value="repair">Reparación</option>
              </select>
            </div>

            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="">Todas las Sedes</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                    "{searchTerm}"
                  </span>
                )}
                {statusFilter && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">
                    {statusLabels[statusFilter as StatusKey]}
                  </span>
                )}
                {typeFilter && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-100">
                    {typeLabels[typeFilter as MaintenanceTypeKey]}
                  </span>
                )}
                {locationFilter && (
                  <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold border border-rose-100">
                    Sede: {locations.find(l => l.id === locationFilter)?.name}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors"
              >
                <X size={14} /> Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando mantenimientos...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(record => {
            const isOverdue = record.scheduled_date && record.status !== 'completed' && new Date(record.scheduled_date) < new Date();

            return (
              <div key={record.id} className={`group bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-lg ${isOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-gray-200 hover:border-blue-300'}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${statusColors[record.status]} border rounded-lg p-2.5 shadow-sm transition-transform group-hover:scale-110`}>
                        {getStatusIcon(record.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-700 transition-colors">
                            {record.assets?.asset_types?.name} - {record.assets?.brand} {record.assets?.model}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 font-medium">{record.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${statusColors[record.status]}`}>
                            {statusLabels[record.status]}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${typeColors[record.maintenance_type]}`}>
                            {typeLabels[record.maintenance_type]}
                          </span>
                          {isOverdue && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold shadow-sm bg-rose-100 text-rose-800 border border-rose-200">
                              ⚠️ Vencido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 py-3 border-t border-b border-gray-100 my-4">
                    {record.assets?.locations && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                        <MapPin size={14} className="text-rose-500" />
                        <span>{record.assets.locations.name}</span>
                        <button
                          onClick={() => copyToClipboard(record.assets?.locations?.name || '', `location-${record.id}`)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copiar ubicación"
                        >
                          {copiedItems[`location-${record.id}`] ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    )}

                    {record.technician && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium border-l border-gray-200 pl-4">
                        <span className="text-gray-400">Técnico:</span>
                        <span>{record.technician}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {record.scheduled_date && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Programación</label>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={14} className="text-blue-500" />
                          <p className="text-sm font-bold">
                            {new Date(record.scheduled_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    )}

                    {record.completed_date && (
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Finalización</label>
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle size={14} />
                          <p className="text-sm font-bold">
                            {new Date(record.completed_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {record.notes && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Notas técnicas</label>
                      <p className="text-sm text-gray-700 leading-relaxed italic">{record.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleViewRecord(record)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
                    >
                      <Eye size={16} /> Ver
                    </button>
                    {canEdit() && (
                      <>
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors font-medium border border-gray-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredRecords.length === 0 && (
        <div className="text-center py-12">
          <Wrench size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-2">No se encontraron registros de mantenimiento</p>
          <p className="text-gray-400">
            {hasActiveFilters ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando un nuevo mantenimiento'}
          </p>
        </div>
      )}

      {showForm && (
        <MaintenanceForm
          editRecord={editingRecord}
          onClose={handleCloseForm}
          onSave={handleSaveRecord}
        />
      )}

      {viewingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalles de Mantenimiento</h2>
                <p className="text-xs text-gray-500 mt-0.5">ID: {viewingRecord.id}</p>
              </div>
              <button
                onClick={() => setViewingRecord(undefined)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Encabezado del Activo */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className={`${statusColors[viewingRecord.status]} p-3 rounded-lg border shadow-sm`}>
                  {getStatusIcon(viewingRecord.status)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">
                    {viewingRecord.assets?.asset_types?.name}
                  </h3>
                  <p className="text-sm text-gray-600">{viewingRecord.assets?.brand} {viewingRecord.assets?.model}</p>
                  <div className="mt-2 flex gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[viewingRecord.status]}`}>
                      {statusLabels[viewingRecord.status]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${typeColors[viewingRecord.maintenance_type]}`}>
                      {typeLabels[viewingRecord.maintenance_type]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Descripción del Servicio</label>
                    <p className="text-gray-900 text-sm font-medium leading-relaxed">{viewingRecord.description}</p>
                  </div>

                  {viewingRecord.technician && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Responsable Técnico</label>
                      <p className="text-gray-900 text-sm font-medium">{viewingRecord.technician}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {viewingRecord.scheduled_date && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Programado</label>
                        <p className="text-gray-900 text-sm font-bold flex items-center gap-1.5">
                          <Calendar size={14} className="text-blue-500" />
                          {new Date(viewingRecord.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {viewingRecord.completed_date && (
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Completado</label>
                        <p className="text-emerald-700 text-sm font-bold flex items-center gap-1.5">
                          <CheckCircle size={14} />
                          {new Date(viewingRecord.completed_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {viewingRecord.assets?.locations && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ubicación</label>
                      <p className="text-gray-900 text-sm font-medium flex items-center gap-1.5">
                        <MapPin size={14} className="text-rose-500" />
                        {viewingRecord.assets.locations.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {viewingRecord.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Observaciones y Notas</label>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed italic">
                    "{viewingRecord.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingRecord(undefined)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cerrar
              </button>
              {canEdit() && (
                <button
                  onClick={() => {
                    setViewingRecord(undefined);
                    handleEditRecord(viewingRecord);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Editar Registro
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}