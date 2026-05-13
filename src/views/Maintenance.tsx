import { useState, useEffect, useMemo } from 'react';
import { Plus, Wrench, Edit, Trash2, Eye, X, MapPin, ShieldCheck, Package, LayoutGrid, List as ListIcon, Search } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';
import MaintenanceForm from '../components/forms/MaintenanceForm';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/ui/Pagination';

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
  // itemsPerPage, setItemsPerPage and isHeaderVisible no longer needed if not used in the UI
  const [typeFilter, setTypeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [machineTypeFilter, setMachineTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
      }
    } catch (err: any) {
      console.error('Error loading maintenance records:', err);
      alert(`Error al cargar registros: ${err.message}`);
    }
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

  const statusColors: Record<MaintenanceRecord['status'], string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    waiting_parts: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  const statusLabels: Record<MaintenanceRecord['status'], string> = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completado',
    waiting_parts: 'En espera de repuestos',
  };

  const typeColors: Record<MaintenanceRecord['maintenance_type'], string> = {
    preventive: 'bg-blue-50 text-blue-700 border-blue-100',
    corrective: 'bg-rose-50 text-rose-700 border-rose-100',
    technical_review: 'bg-purple-50 text-purple-700 border-purple-100',
    repair: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  const typeLabels: Record<MaintenanceRecord['maintenance_type'], string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    technical_review: 'Revisión técnica',
    repair: 'Reparación',
  };


  const sortedRecords = useMemo(() => {
    const filtered = maintenanceRecords.filter(record => {
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

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'asset':
          aValue = `${a.assets?.brand || ''} ${a.assets?.model || ''}`.trim();
          bValue = `${b.assets?.brand || ''} ${b.assets?.model || ''}`.trim();
          break;
        case 'status':
          aValue = statusLabels[a.status as keyof typeof statusLabels];
          bValue = statusLabels[b.status as keyof typeof statusLabels];
          break;
        case 'type':
          aValue = typeLabels[a.maintenance_type as keyof typeof typeLabels];
          bValue = typeLabels[b.maintenance_type as keyof typeof typeLabels];
          break;
        case 'location':
          aValue = a.locations?.name || a.assets?.locations?.name || '';
          bValue = b.locations?.name || b.assets?.locations?.name || '';
          break;
        case 'date':
          aValue = a.scheduled_date || a.created_at;
          bValue = b.scheduled_date || b.created_at;
          break;
        default:
          aValue = (a as any)[sortConfig.key];
          bValue = (b as any)[sortConfig.key];
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [maintenanceRecords, searchTerm, locationFilter, statusFilter, typeFilter, categoryFilter, sortConfig]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setLocationFilter('');
    setMachineTypeFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || typeFilter || locationFilter || machineTypeFilter || categoryFilter;

  type StatusKey = MaintenanceRecord['status'];

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      
      <div className="p-6 space-y-6">


          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
            <div className="absolute -top-3 -left-3">
              <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                {sortedRecords.length} Registros
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar por equipo, técnico o tarea..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </div>

            {/* Filters + Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest min-w-[220px]">
                <MapPin size={14} className="text-rose-500" />
                <select
                  value={locationFilter}
                  onChange={(e) => { setLocationFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent outline-none cursor-pointer flex-1"
                >
                  <option value="">TODAS LAS SEDES</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
              >
                <option value="">TODOS LOS TIPOS</option>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label.toUpperCase()}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
              >
                <option value="">TODOS LOS ESTADOS</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label.toUpperCase()}</option>
                ))}
              </select>

              <div className="flex bg-slate-100 p-1 border border-slate-200">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`} 
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('table')} 
                  className={`p-1.5 transition-all ${viewMode === 'table' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`} 
                  title="Vista Tabla"
                >
                  <ListIcon size={16} />
                </button>
              </div>

              {canEdit() && (
                <button
                  onClick={() => {
                    setEditingRecord(undefined);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  Nuevo Mantenimiento
                </button>
              )}

              {hasActiveFilters && (
                <button 
                  onClick={clearFilters} 
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" 
                  title="Limpiar Filtros"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

        {
          loading ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando mantenimientos...</p>
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center py-12">
              <Wrench size={48} className="mx-auto mb-4 text-[#002855] opacity-20" />
              <p className="text-[#002855] font-black uppercase text-xs tracking-widest mb-2">Sin mantenimientos</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">
                {hasActiveFilters ? 'Intenta ajustando los filtros' : 'Aún no se han registrado mantenimientos'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedData.map(record => (
                <div
                  key={record.id}
                  className="bg-white rounded-none shadow-sm border border-slate-100 transition-all duration-300 flex flex-col group overflow-hidden relative hover:bg-slate-50/80 hover:border-blue-200/50"
                  onClick={() => handleViewRecord(record)}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-none flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Wrench size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-tight truncate">
                          {record.assets?.brand} {record.assets?.model}
                        </h3>
                        <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border mt-1 ${typeColors[record.maintenance_type]}`}>
                          {typeLabels[record.maintenance_type]}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 border bg-slate-50 border-slate-100">
                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Sede</label>
                        <p className="text-[9px] font-mono font-black text-slate-600 truncate">{record.locations?.name || 'Sede N/A'}</p>
                      </div>
                      <div className="p-2 border bg-slate-50 border-slate-100">
                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Técnico</label>
                        <p className="text-[9px] font-mono font-black text-slate-600 truncate">{record.technician || 'S.A.'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }} className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-200 hover:text-blue-600 hover:border-blue-200 transition-all">Informe</button>
                    {canEdit() && (
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleEditRecord(record); }} className="w-7 h-7 flex items-center justify-center text-amber-600 bg-white border border-amber-100 hover:bg-amber-500 hover:text-white transition-all"><Edit size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRecord(record); }} className="w-7 h-7 flex items-center justify-center text-rose-500 bg-white border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50/50 border-b border-slate-100 relative z-20">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedRecords.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-5 text-left">
                        <button onClick={() => handleSort('asset')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Activo</span>
                        </button>
                      </th>
                      <th className="px-4 py-5 text-left">
                        <button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tipo</span>
                        </button>
                      </th>
                      <th className="px-4 py-5 text-left">
                        <button onClick={() => handleSort('location')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span>
                        </button>
                      </th>
                      <th className="px-4 py-5 text-left">
                        <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                          <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span>
                        </button>
                      </th>
                      <th className="px-4 py-5 text-left">
                        <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Responsable</span>
                      </th>
                      <th className="px-6 py-5 text-center">
                        <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map(record => (
                      <tr key={record.id} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0" onClick={() => handleViewRecord(record)}>
                        <td className="px-6 py-5 font-bold text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white">
                              <Wrench size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{record.assets?.brand} {record.assets?.model}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">#{record.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${typeColors[record.maintenance_type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {typeLabels[record.maintenance_type]}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className="text-sm font-extrabold text-slate-600 truncate max-w-xs block">{record.locations?.name || record.assets?.locations?.name || 'Sede N/A'}</span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${statusColors[record.status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {statusLabels[record.status]}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black text-slate-900 uppercase leading-tight">{record.technician || 'S.A.'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); handleViewRecord(record); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm" title="Ver Informe"><Eye size={14} /></button>
                            {canEdit() && (
                              <>
                                <button onClick={e => { e.stopPropagation(); handleEditRecord(record); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Edit size={14} /></button>
                                <button onClick={e => { e.stopPropagation(); handleDeleteRecord(record); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {
          showForm && (
            <MaintenanceForm editMaintenance={editingRecord} onClose={handleCloseForm} onSave={handleSaveRecord} />
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
    </div>
  );
}
