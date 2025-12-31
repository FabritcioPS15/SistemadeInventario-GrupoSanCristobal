import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Clock, AlertTriangle, CheckCircle, Wrench, X, Filter, Copy, Check, Calendar, User, Package } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';
import MaintenanceForm from '../components/forms/MaintenanceForm';
import { useAuth } from '../contexts/AuthContext';

type MaintenanceProps = {
  categoryFilter?: string;
};

type MaintenanceRecord = {
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
  assets?: AssetWithDetails;
};

export default function Maintenance({ categoryFilter }: MaintenanceProps) {
  const { canEdit } = useAuth();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>();
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    preventive: 0,
    corrective: 0,
    recentlyAdded: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchMaintenanceRecords(), fetchAssets(), fetchLocations()]);
    setLoading(false);
  };

  const fetchMaintenanceRecords = async () => {
    console.log('🔄 Cargando registros de mantenimiento...');
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*, assets(*, asset_types(*), locations(*))')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error al cargar registros de mantenimiento:', error);
        alert(`Error al cargar registros: ${error.message}`);
        return;
      }

      if (data) {
        console.log(`✅ ${data.length} registros de mantenimiento cargados`);
        setMaintenanceRecords(data as MaintenanceRecord[]);
        calculateStats(data as MaintenanceRecord[]);
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar registros:', err);
      alert('Error inesperado al cargar registros de mantenimiento');
    }
  };

  const calculateStats = (records: MaintenanceRecord[]) => {
    const stats = {
      total: records.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      preventive: 0,
      corrective: 0,
      recentlyAdded: 0,
      overdue: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const today = new Date();

    records.forEach(record => {
      // Contar por estado
      switch (record.status) {
        case 'pending': stats.pending++; break;
        case 'in_progress': stats.inProgress++; break;
        case 'completed': stats.completed++; break;
      }

      // Contar por tipo
      switch (record.maintenance_type) {
        case 'preventive': stats.preventive++; break;
        case 'corrective': stats.corrective++; break;
      }

      // Contar recientes
      const createdDate = new Date(record.created_at);
      if (createdDate >= oneWeekAgo) {
        stats.recentlyAdded++;
      }

      // Contar vencidos (programados pero no completados)
      if (record.scheduled_date && record.status !== 'completed') {
        const scheduledDate = new Date(record.scheduled_date);
        if (scheduledDate < today) {
          stats.overdue++;
        }
      }
    });

    setStats(stats);
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, asset_types(*), locations(*)')
      .order('created_at', { ascending: false });
    if (data) setAssets(data as AssetWithDetails[]);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
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
      // Fallback para navegadores más antiguos
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
        const { data, error } = await supabase
          .from('maintenance_records')
          .delete()
          .eq('id', record.id)
          .select();

        console.log('📋 Resultado de eliminación:', { data, error });

        if (error) {
          console.error('❌ Error al eliminar registro:', error);
          alert(`Error al eliminar el registro: ${error.message}\n\nCódigo: ${error.code}\nDetalles: ${error.details}`);
        } else {
          console.log('✅ Registro eliminado correctamente');
          // Pequeño delay para asegurar que la base de datos se actualice
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
    // Pequeño delay para asegurar que la base de datos se actualice
    setTimeout(async () => {
      await fetchMaintenanceRecords();
    }, 100);
    console.log('✅ Registro guardado y datos actualizados');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRecord(undefined);
  };

  // Mapear filtro de categoría de mantenimiento
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

    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || typeFilter;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  const statusLabels = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completado',
  };

  const typeColors = {
    preventive: 'bg-blue-50 text-blue-700',
    corrective: 'bg-red-50 text-red-700',
  };

  const typeLabels = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      case 'in_progress': return <AlertTriangle size={16} className="text-blue-600" />;
      case 'completed': return <CheckCircle size={16} className="text-green-600" />;
      default: return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive': return <Wrench size={16} className="text-blue-600" />;
      case 'corrective': return <AlertTriangle size={16} className="text-red-600" />;
      default: return <Wrench size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 border border-orange-200 rounded-lg p-2">
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mantenimiento
              {categoryFilter && (
                <span className="ml-2 text-sm font-normal text-orange-600">({getMaintenanceCategoryFromFilter(categoryFilter)})</span>
              )}
            </h1>
            <p className="text-gray-600">Gestión de mantenimientos de activos</p>
          </div>
        </div>

        {/* Dashboard de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Mantenimientos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Wrench size={24} className="text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Progreso</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <AlertTriangle size={24} className="text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Preventivos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.preventive}</p>
              </div>
              <Wrench size={24} className="text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Correctivos</p>
                <p className="text-2xl font-bold text-red-600">{stats.corrective}</p>
              </div>
              <AlertTriangle size={24} className="text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recientes</p>
                <p className="text-2xl font-bold text-purple-600">{stats.recentlyAdded}</p>
              </div>
              <Calendar size={24} className="text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Filtros Avanzados */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros Avanzados</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por descripción, técnico, activo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los Estados</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los Tipos</option>
              <option value="preventive">Preventivo</option>
              <option value="corrective">Correctivo</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtros activos:</span>
                {searchTerm && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    Búsqueda: "{searchTerm}"
                  </span>
                )}
                {statusFilter && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    Estado: {statusLabels[statusFilter as keyof typeof statusLabels]}
                  </span>
                )}
                {typeFilter && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                    Tipo: {typeLabels[typeFilter as keyof typeof typeLabels]}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <X size={16} />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Botón Nueva Mantenimiento */}
        <div className="flex justify-end mb-6">
          {canEdit() && (
            <button
              onClick={() => {
                setEditingRecord(undefined);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Nuevo Mantenimiento
            </button>
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
              <div key={record.id} className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`${statusColors[record.status]} border rounded-lg p-2`}>
                        {getStatusIcon(record.status)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {record.assets?.asset_types?.name} - {record.assets?.brand} {record.assets?.model}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">{record.description}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
                            {statusLabels[record.status]}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[record.maintenance_type]}`}>
                            {typeLabels[record.maintenance_type]}
                          </span>
                          {isOverdue && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Vencido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {record.assets?.locations && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                      <span>📍 {record.assets.locations.name}</span>
                      <button
                        onClick={() => copyToClipboard(record.assets?.locations?.name || '', `location-${record.id}`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar ubicación"
                      >
                        {copiedItems[`location-${record.id}`] ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {record.scheduled_date && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Fecha Programada</label>
                        <p className="text-sm text-gray-900">
                          {new Date(record.scheduled_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    )}

                    {record.completed_date && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Fecha Completado</label>
                        <p className="text-sm text-gray-900">
                          {new Date(record.completed_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    )}

                    {record.technician && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Técnico</label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-900">{record.technician}</p>
                          <button
                            onClick={() => copyToClipboard(record.technician || '', `technician-${record.id}`)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="Copiar técnico"
                          >
                            {copiedItems[`technician-${record.id}`] ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {record.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <label className="text-xs font-medium text-blue-700 block mb-1">Notas</label>
                      <p className="text-sm text-blue-900">{record.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleViewRecord(record)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Eye size={16} />
                      Ver
                    </button>
                    {canEdit() && (
                      <>
                        <button
                          onClick={() => handleEditRecord(record)}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(record)}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Detalles de Mantenimiento</h2>
              <button
                onClick={() => setViewingRecord(undefined)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Activo</label>
                <p className="text-gray-900 font-medium">
                  {viewingRecord.assets?.asset_types?.name} - {viewingRecord.assets?.brand} {viewingRecord.assets?.model}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Descripción</label>
                <p className="text-gray-900">{viewingRecord.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Tipo</label>
                  <p className="text-gray-900">{typeLabels[viewingRecord.maintenance_type]}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                  <p className="text-gray-900">{statusLabels[viewingRecord.status]}</p>
                </div>
              </div>
              {viewingRecord.scheduled_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Fecha Programada</label>
                  <p className="text-gray-900">{new Date(viewingRecord.scheduled_date).toLocaleDateString('es-ES')}</p>
                </div>
              )}
              {viewingRecord.completed_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Fecha Completado</label>
                  <p className="text-gray-900">{new Date(viewingRecord.completed_date).toLocaleDateString('es-ES')}</p>
                </div>
              )}
              {viewingRecord.technician && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Técnico</label>
                  <p className="text-gray-900">{viewingRecord.technician}</p>
                </div>
              )}
              {viewingRecord.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Notas</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingRecord.notes}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setViewingRecord(undefined)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
                {canEdit() && (
                  <button
                    onClick={() => {
                      setViewingRecord(undefined);
                      handleEditRecord(viewingRecord);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}