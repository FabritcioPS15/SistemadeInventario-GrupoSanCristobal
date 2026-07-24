import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Wrench, X, MapPin, ShieldCheck, Search, TrendingUp, DollarSign, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { supabase, Location } from '../../../shared/services/supabase';
import MaintenanceForm from '../forms/MaintenanceForm';
import { useAuth } from '../../../app/providers/AuthContext';
import { useNotify } from '../../../shared/hooks/useNotify';
import Pagination from '../../../shared/components/ui/Pagination';
import ActionToolbar from '../../../shared/components/ui/ActionToolbar';
import FilterBar from '../../../shared/components/ui/FilterBar';
import ViewToggle from '../../../shared/components/ui/ViewToggle';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableCellPrimary, TableCellSecondary, TableCellBadge, TableActionButton } from '../../../shared/components/ui/Table';
import DetailModal, {
  DetailModalHeader,
  DetailModalBody,
  StandardModalFooter,
  DetailModalGrid,
  DetailModalSection,
  DetailModalCard,
  DetailModalRow,
} from '../../../shared/components/ui/DetailModal';
import { MaintenanceRecord, AssetWithMaintenanceHistory } from '../../../shared/types/inventory.types';

type MaintenanceProps = {
  categoryFilter?: string;
};

export default function Maintenance({ categoryFilter }: MaintenanceProps) {
  const { canEdit } = useAuth();
  const { success: notifySuccess, error: notifyError, confirm } = useNotify();
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>();
  const [viewingRecord, setViewingRecord] = useState<MaintenanceRecord | undefined>();
  const [viewingAssetHistory, setViewingAssetHistory] = useState<AssetWithMaintenanceHistory | undefined>();
  const locationState = useLocation();
  const [searchTerm, setSearchTerm] = useState(locationState.state?.searchTerm || '');
  const [assetFilter, setAssetFilter] = useState(locationState.state?.assetFilter || '');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [machineTypeFilter, setMachineTypeFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter.join(','), typeFilter.join(','), machineTypeFilter.join(',')]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchMaintenanceRecords(), fetchLocations()]);
    setLoading(false);
  };

  const fetchMaintenanceRecords = async () => {
    try {
      let query = supabase
        .from('maintenance_records')
        .select('*, assets!inner(id, codigo_unico, brand, model, descripcion, serial_number, asset_types(*), locations(*)), locations!location_id(*)')
        .order('created_at', { ascending: false });

      if (statusFilter.length > 0) query = query.in('status', statusFilter);
      if (typeFilter.length > 0) query = query.in('maintenance_type', typeFilter);
      if (machineTypeFilter.length > 0) query = query.in('assets.asset_type_id', machineTypeFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        setMaintenanceRecords(data as MaintenanceRecord[]);
      }
    } catch (err: any) {
      console.error('Error loading maintenance records:', err);
      notifyError(`Error al cargar registros: ${err.message}`);
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

  const handleViewAssetHistory = (assetHistory: AssetWithMaintenanceHistory) => {
    setViewingAssetHistory(assetHistory);
  };

  const handleDeleteRecord = async (record: MaintenanceRecord) => {
    const confirmed = await confirm(`¿Estás seguro de que quieres eliminar el registro de mantenimiento "${record.description}"?`, 'Confirmar Eliminación');
    if (confirmed) {
      try {
        const { error } = await supabase.from('maintenance_records').delete().eq('id', record.id);
        if (error) throw error;
        await fetchMaintenanceRecords();
        notifySuccess('Registro de mantenimiento eliminado correctamente');
      } catch (err: any) {
        notifyError('Error al eliminar el registro: ' + err.message);
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


  // Agrupar mantenimientos por activo
  const assetsWithHistory = useMemo(() => {
    const grouped = new Map<string, AssetWithMaintenanceHistory>();

    maintenanceRecords.forEach(record => {
      if (!record.asset_id || !record.assets) return;

      const existing = grouped.get(record.asset_id);
      if (existing) {
        existing.maintenanceRecords.push(record);
        existing.totalRecords = existing.maintenanceRecords.length;
        // Actualizar el estado más reciente
        const latest = existing.maintenanceRecords.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        existing.latestStatus = latest.status;
        existing.latestMaintenanceType = latest.maintenance_type;
        existing.latestDate = latest.created_at;
      } else {
        grouped.set(record.asset_id, {
          asset: record.assets,
          maintenanceRecords: [record],
          totalRecords: 1,
          latestStatus: record.status,
          latestMaintenanceType: record.maintenance_type,
          latestDate: record.created_at,
        });
      }
    });

    return Array.from(grouped.values());
  }, [maintenanceRecords]);

  const sortedRecords = useMemo(() => {
    const filtered = assetsWithHistory.filter(assetHistory => {
      const matchesSearch =
        assetHistory.asset.codigo_unico?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetHistory.asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetHistory.asset.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetHistory.asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetHistory.asset.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assetHistory.asset as any).item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assetHistory.maintenanceRecords.some(r =>
          r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.technician?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const categoryFromFilter = getMaintenanceCategoryFromFilter(categoryFilter);
      let matchesCategory = true;
      if (categoryFromFilter) {
        switch (categoryFilter) {
          case 'maintenance-pending': matchesCategory = assetHistory.latestStatus === 'pending'; break;
          case 'maintenance-in-progress': matchesCategory = assetHistory.latestStatus === 'in_progress'; break;
          case 'maintenance-completed': matchesCategory = assetHistory.latestStatus === 'completed'; break;
          case 'maintenance-preventive': matchesCategory = assetHistory.maintenanceRecords.some(r => r.maintenance_type === 'preventive'); break;
          case 'maintenance-corrective': matchesCategory = assetHistory.maintenanceRecords.some(r => r.maintenance_type === 'corrective'); break;
        }
      }

      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(assetHistory.latestStatus);
      const matchesType = typeFilter.length === 0 || typeFilter.includes(assetHistory.latestMaintenanceType);
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(assetHistory.asset.location_id ?? '');
      const matchesAsset = !assetFilter || assetHistory.asset.id === assetFilter;
      const matchesMachineType = machineTypeFilter.length === 0 || machineTypeFilter.includes(assetHistory.asset.asset_type_id ?? '');

      return matchesSearch && matchesCategory && matchesStatus && matchesType && matchesLocation && matchesAsset && matchesMachineType;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'asset':
          aValue = (a.asset as any).item || a.asset.descripcion || `${a.asset.brand || ''} ${a.asset.model || ''}`.trim();
          bValue = (b.asset as any).item || b.asset.descripcion || `${b.asset.brand || ''} ${b.asset.model || ''}`.trim();
          break;
        case 'status':
          aValue = statusLabels[a.latestStatus as keyof typeof statusLabels];
          bValue = statusLabels[b.latestStatus as keyof typeof statusLabels];
          break;
        case 'type':
          aValue = typeLabels[a.latestMaintenanceType as keyof typeof typeLabels];
          bValue = typeLabels[b.latestMaintenanceType as keyof typeof typeLabels];
          break;
        case 'location':
          aValue = a.asset.locations?.name || '';
          bValue = b.asset.locations?.name || '';
          break;
        case 'date':
          aValue = a.latestDate;
          bValue = b.latestDate;
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
  }, [assetsWithHistory, searchTerm, locationFilter, statusFilter, typeFilter, categoryFilter, machineTypeFilter, assetFilter, sortConfig]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map(a => a.asset.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm(`¿Eliminar todos los mantenimientos de los ${selectedIds.length} activos seleccionados?`, 'Eliminación por Lote');
    if (confirmed) {
      try {
        const recordsToDelete = assetsWithHistory
          .filter(ah => selectedIds.includes(ah.asset.id))
          .flatMap(ah => ah.maintenanceRecords.map(r => r.id));

        if (recordsToDelete.length === 0) return;

        const { error } = await supabase.from('maintenance_records').delete().in('id', recordsToDelete);
        if (error) throw error;
        setSelectedIds([]);
        await fetchData();
        notifySuccess(`${recordsToDelete.length} registros eliminados correctamente`);
      } catch (err: any) {
        notifyError('Error: ' + err.message);
      }
    }
  };


  const hasActiveFilters = searchTerm || statusFilter.length > 0 || typeFilter.length > 0 || locationFilter.length > 0 || machineTypeFilter.length > 0 || categoryFilter || assetFilter;

  // Calcular estadísticas de mantenimiento
  const maintenanceStats = useMemo(() => {
    const totalCost = maintenanceRecords.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const totalHours = maintenanceRecords.reduce((sum, r) => sum + (r.work_hours || 0), 0);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    maintenanceRecords.forEach(r => {
      byType[r.maintenance_type] = (byType[r.maintenance_type] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    });

    return {
      totalRecords: maintenanceRecords.length,
      totalCost,
      totalHours,
      averageCost: maintenanceRecords.length > 0 ? totalCost / maintenanceRecords.length : 0,
      byType,
      byStatus,
      completedCount: byStatus.completed || 0,
      pendingCount: byStatus.pending || 0,
      inProgressCount: byStatus.in_progress || 0,
    };
  }, [maintenanceRecords]);


  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">

      <div className="p-6 space-y-6">
        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Mantenimientos</span>
              <Wrench size={16} className="text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-800">{maintenanceStats.totalRecords}</p>
            <p className="text-[10px] text-slate-500 mt-1">Registros en sistema</p>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Costo Total</span>
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-800">S/ {maintenanceStats.totalCost.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Acumulado histórico</p>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Costo Promedio</span>
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <p className="text-2xl font-black text-slate-800">S/ {maintenanceStats.averageCost.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Por mantenimiento</p>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Horas Totales</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-800">{maintenanceStats.totalHours.toFixed(1)}</p>
            <p className="text-[10px] text-slate-500 mt-1">Horas de trabajo</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pendientes</span>
            </div>
            <p className="text-xl font-black text-amber-600">{maintenanceStats.pendingCount}</p>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${maintenanceStats.totalRecords > 0 ? (maintenanceStats.pendingCount / maintenanceStats.totalRecords) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">En Progreso</span>
            </div>
            <p className="text-xl font-black text-blue-600">{maintenanceStats.inProgressCount}</p>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${maintenanceStats.totalRecords > 0 ? (maintenanceStats.inProgressCount / maintenanceStats.totalRecords) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Completados</span>
            </div>
            <p className="text-xl font-black text-emerald-600">{maintenanceStats.completedCount}</p>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${maintenanceStats.totalRecords > 0 ? (maintenanceStats.completedCount / maintenanceStats.totalRecords) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <ActionToolbar
          totalItems={sortedRecords.length}
          searchComponent={
            <>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar por equipo, técnico o tarea..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[12px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </>
          }
        >
          <FilterBar
            filters={[
              { key: 'location', placeholder: 'TODAS LAS UBICACIONES', icon: MapPin, iconClassName: 'text-rose-500', wrapperClassName: 'md:min-w-[220px]', options: locations.map(loc => ({ value: loc.id, label: loc.name })) },
              { key: 'type', placeholder: 'TODOS LOS TIPOS', options: Object.entries(typeLabels).map(([key, label]) => ({ value: key, label })) },
              { key: 'status', placeholder: 'TODOS LOS ESTADOS', options: Object.entries(statusLabels).map(([key, label]) => ({ value: key, label })) },
              { key: 'asset', placeholder: 'TODOS', wrapperClassName: 'md:max-w-[220px]', options: assetsWithHistory.map(h => ({ value: h.asset.id, label: `${(h.asset as any).item || h.asset.descripcion || h.asset.brand || 'SIN NOMBRE'} ${h.asset.model ? `(${h.asset.model})` : ''}` })) },
            ]}
            values={{ location: locationFilter, type: typeFilter, status: statusFilter, asset: assetFilter }}
            onChange={(key, value) => {
              if (key === 'location') setLocationFilter(value as string[]);
              else if (key === 'type') setTypeFilter(value as string[]);
              else if (key === 'status') setStatusFilter(value as string[]);
              else if (key === 'asset') setAssetFilter(value as string);
              setCurrentPage(1);
            }}
            onClearAll={() => {
              setStatusFilter([]);
              setTypeFilter([]);
              setLocationFilter([]);
              setMachineTypeFilter([]);
              setCurrentPage(1);
            }}
          />

          <ViewToggle viewMode={viewMode} onChange={setViewMode} />

          {canEdit() && (
            <div className="flex gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-none hover:bg-rose-100 transition-colors border border-rose-200"
                >
                  <Trash2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                    Eliminar ({selectedIds.length})
                  </span>
                </button>
              )}
              <button
                onClick={() => {
                  setEditingRecord(undefined);
                  setShowForm(true);
                }}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
              >
                <Plus size={14} />
                Nuevo Mantenimiento
              </button>
            </div>
          )}
        </ActionToolbar>

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
              {paginatedData.map(assetHistory => (
                <div
                  key={assetHistory.asset.id}
                  className="bg-white rounded-none shadow-sm border border-slate-100 transition-all duration-300 flex flex-col group overflow-hidden relative hover:bg-slate-50/80 hover:border-blue-200/50"
                  onClick={() => handleViewAssetHistory(assetHistory)}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-none flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Wrench size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[13px] font-black text-[#002855] uppercase tracking-tight truncate">
                          {assetHistory.asset.descripcion || `${assetHistory.asset.brand} ${assetHistory.asset.model}` || 'Activo'}
                        </h3>
                        <span className="text-[10px] font-mono font-black text-blue-600">{assetHistory.asset.codigo_unico}</span>
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border mt-1 ${typeColors[assetHistory.latestMaintenanceType]}`}>
                          {typeLabels[assetHistory.latestMaintenanceType]}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 border bg-slate-50 border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Mantenimientos</label>
                        <p className="text-[11px] font-mono font-black text-blue-600">{assetHistory.totalRecords} registro(s)</p>
                      </div>
                      <div className="p-2 border bg-slate-50 border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Estado Actual</label>
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${statusColors[assetHistory.latestStatus]}`}>
                          {statusLabels[assetHistory.latestStatus]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col rounded-none">
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canEdit() && (
                        <TableHead className="w-12 text-center px-4 py-4">
                          <input
                            type="checkbox"
                            checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                            onChange={toggleSelectAll}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </TableHead>
                      )}
                      <TableHead sortable isSorted={sortConfig?.key === 'asset'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('asset')}>
                        Activo / Código
                      </TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'type'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('type')}>
                        Tipo
                      </TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'location'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('location')}>
                        Ubicación
                      </TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'status'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('status')}>
                        Estado
                      </TableHead>
                      <TableHead>
                        Responsable
                      </TableHead>
                      <TableHead className="text-center">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map(assetHistory => (
                      <TableRow
                        key={assetHistory.asset.id}
                        onClick={() => handleViewAssetHistory(assetHistory)}
                      >
                        {canEdit() && (
                          <TableCell className="w-12 text-center px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(assetHistory.asset.id)}
                              onChange={() => toggleSelect(assetHistory.asset.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-bold">
                          <div className="flex flex-col">
                            <TableCellPrimary>
                              {assetHistory.asset.descripcion || `${assetHistory.asset.brand} ${assetHistory.asset.model}` || 'Activo'}
                            </TableCellPrimary>
                            <TableCellSecondary>
                              <span className="font-mono text-blue-600">{assetHistory.asset.codigo_unico}</span>
                              <span className="ml-2">{assetHistory.totalRecords} mantenimiento(s)</span>
                            </TableCellSecondary>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TableCellBadge className={typeColors[assetHistory.latestMaintenanceType] || 'bg-gray-50 text-gray-700 border-gray-200'}>
                            {typeLabels[assetHistory.latestMaintenanceType]}
                          </TableCellBadge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin size={13} className="text-rose-500 shrink-0" />
                            <TableCellSecondary>{assetHistory.asset.locations?.name || 'Ubicación N/A'}</TableCellSecondary>
                          </div>
                        </TableCell>
                        <TableCell>
                          <TableCellBadge className={statusColors[assetHistory.latestStatus] || 'bg-gray-50 text-gray-700 border-gray-200'}>
                            {statusLabels[assetHistory.latestStatus]}
                          </TableCellBadge>
                        </TableCell>
                        <TableCell>
                          <TableCellSecondary>{assetHistory.maintenanceRecords[0]?.technician || 'S.A.'}</TableCellSecondary>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {canEdit() && (
                              <>
                                <TableActionButton
                                  icon={<Edit size={14} />}
                                  onClick={() => handleEditRecord(assetHistory.maintenanceRecords[0])}
                                  title="Editar"
                                />
                                <TableActionButton
                                  icon={<Trash2 size={14} />}
                                  onClick={() => handleDeleteRecord(assetHistory.maintenanceRecords[0])}
                                  title="Eliminar"
                                  variant="danger"
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            <DetailModal maxWidth="5xl" onClose={() => setViewingRecord(undefined)} closeOnBackdrop>
              <DetailModalHeader>
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                    <Wrench size={20} className="sm:size-24" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
                      {(viewingRecord?.assets as any)?.descripcion || (viewingRecord?.assets as any)?.brand || 'Activo'} {(viewingRecord?.assets as any)?.model}
                      <br />
                      <span className="text-[10px] font-mono font-black text-blue-200">{(viewingRecord?.assets as any)?.codigo_unico}</span>
                    </h2>
                    <p className="text-[10px] sm:text-xs text-emerald-200 font-semibold mt-0.5 truncate">
                      {viewingRecord?.assets?.asset_types?.name} • {typeLabels[viewingRecord?.maintenance_type || 'preventive']}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingRecord(undefined)}
                  className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all"
                >
                  <X size={22} />
                </button>
              </DetailModalHeader>

              <DetailModalBody>
                <DetailModalGrid layout="stack-until-xl">

                  <DetailModalSection title="Información General">
                    <div className="space-y-2.5 sm:space-y-3">
                      <DetailModalCard className="space-y-2.5 sm:space-y-3">
                        <DetailModalRow label="Estado">
                          <span className={`inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black tracking-widest border ${statusColors[viewingRecord?.status || 'pending']}`}>
                            {statusLabels[viewingRecord?.status || 'pending']}
                          </span>
                        </DetailModalRow>
                        <DetailModalRow label="Tipo de Mantenimiento">
                          <span className={`inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black tracking-widest border ${typeColors[viewingRecord?.maintenance_type || 'preventive']}`}>
                            {typeLabels[viewingRecord?.maintenance_type || 'preventive']}
                          </span>
                        </DetailModalRow>
                        <DetailModalRow label="Fecha de Completado">
                          <span className="text-[10px] sm:text-[11px] font-black text-slate-600">
                            {viewingRecord?.completed_date ? new Date(String(viewingRecord.completed_date as any).includes('T') ? String(viewingRecord.completed_date as any) : `${viewingRecord.completed_date as any}T12:00:00`).toLocaleDateString('es-PE') : 'Pendiente'}
                          </span>
                        </DetailModalRow>
                      </DetailModalCard>

                      <DetailModalCard className="space-y-2.5 sm:space-y-3">
                        <DetailModalRow label="Técnico">
                          <span className="text-[10px] sm:text-[11px] font-black text-[#002855]">
                            {viewingRecord?.technician || 'No especificado'}
                          </span>
                        </DetailModalRow>
                        <DetailModalRow label="Horas de Trabajo">
                          <span className="text-[10px] sm:text-[11px] font-black text-blue-600">
                            {viewingRecord?.work_hours || 0} h
                          </span>
                        </DetailModalRow>
                        <DetailModalRow label="Costo Total">
                          <span className="text-[10px] sm:text-[11px] font-black text-emerald-600 font-mono">
                            S/ {viewingRecord?.total_cost?.toFixed(2) || '0.00'}
                          </span>
                        </DetailModalRow>
                      </DetailModalCard>
                    </div>
                  </DetailModalSection>

                  <DetailModalSection title="Diagnóstico y Solución">
                    <DetailModalCard>
                      <DetailModalRow label="Falla / Motivo">
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700">
                          {viewingRecord?.description}
                        </span>
                      </DetailModalRow>
                      {viewingRecord?.failure_cause && (
                        <DetailModalRow label="Causa Raíz">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-rose-700">
                            {viewingRecord?.failure_cause}
                          </span>
                        </DetailModalRow>
                      )}
                      <DetailModalRow label="Acción Realizada">
                        <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 italic leading-relaxed">
                          {viewingRecord?.solution_applied || 'Sin registro'}
                        </span>
                      </DetailModalRow>
                    </DetailModalCard>
                  </DetailModalSection>

                  <DetailModalSection title="Garantía">
                    <DetailModalCard>
                      <div className={`flex items-center gap-3 p-3 rounded-lg border ${viewingRecord?.warranty_claim ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                        <ShieldCheck size={20} className={viewingRecord?.warranty_claim ? 'text-indigo-600' : 'text-slate-400'} />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Estado de Garantía</p>
                          <p className={`text-[11px] font-black ${viewingRecord?.warranty_claim ? 'text-indigo-800' : 'text-slate-500'}`}>
                            {viewingRecord?.warranty_claim ? 'RECLAMO ACTIVO' : 'SIN RECLAMO'}
                          </p>
                        </div>
                      </div>
                    </DetailModalCard>
                  </DetailModalSection>

                  {viewingRecord?.parts_used && Array.isArray(viewingRecord?.parts_used) && (viewingRecord?.parts_used as any[]).length > 0 && (
                    <DetailModalSection title="Repuestos Utilizados">
                      <DetailModalCard>
                        <div className="space-y-2">
                          {(viewingRecord?.parts_used as any[]).map((part: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2 last:border-0">
                              <span className="font-semibold text-slate-700">{part.name}</span>
                              <span className="font-mono text-slate-500">{part.quantity} {part.unit} × S/ {part.unit_price?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </DetailModalCard>
                    </DetailModalSection>
                  )}

                  {viewingRecord?.notes && (
                    <DetailModalSection title="Notas Adicionales">
                      <DetailModalCard>
                        <p className="text-[10px] sm:text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {viewingRecord.notes}
                        </p>
                      </DetailModalCard>
                    </DetailModalSection>
                  )}

                </DetailModalGrid>
              </DetailModalBody>

              <StandardModalFooter
                onClose={() => setViewingRecord(undefined)}
                onEdit={canEdit() ? () => { setViewingRecord(undefined); handleEditRecord(viewingRecord); } : undefined}
                editLabel="Editar"
              />
            </DetailModal>
          )
        }

        {
          viewingAssetHistory && (
            <DetailModal maxWidth="5xl" onClose={() => setViewingAssetHistory(undefined)} closeOnBackdrop>
              <DetailModalHeader>
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                    <Wrench size={20} className="sm:size-24" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
                      {viewingAssetHistory?.asset.descripcion || `${viewingAssetHistory?.asset.brand} ${viewingAssetHistory?.asset.model}` || 'Activo'}
                    </h2>
                    <p className="text-[10px] font-black font-mono text-blue-200">{viewingAssetHistory?.asset.codigo_unico}</p>
                    <p className="text-[10px] sm:text-xs text-blue-200 font-semibold mt-0.5 truncate">
                      {viewingAssetHistory?.asset.asset_types?.name} • {viewingAssetHistory?.totalRecords} mantenimiento(s)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingAssetHistory(undefined)}
                  className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all"
                >
                  <X size={22} />
                </button>
              </DetailModalHeader>

              <DetailModalBody>
                <DetailModalGrid layout="stack-until-xl">

                  <DetailModalSection title="Información del Activo">
                    <DetailModalCard>
                      <DetailModalRow label="Marca / Modelo">
                        <span className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase">
                          {viewingAssetHistory?.asset.brand} {viewingAssetHistory?.asset.model}
                        </span>
                      </DetailModalRow>
                      <DetailModalRow label="Número de Serie">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                          {viewingAssetHistory?.asset.serial_number || 'N/A'}
                        </span>
                      </DetailModalRow>
                      <DetailModalRow label="Código Único">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                          {viewingAssetHistory?.asset.codigo_unico || 'N/A'}
                        </span>
                      </DetailModalRow>
                      <DetailModalRow label="Ubicación">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-rose-500" />
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                            {viewingAssetHistory?.asset.locations?.name || 'N/A'}
                          </span>
                        </div>
                      </DetailModalRow>
                      <DetailModalRow label="Estado Actual">
                        <span className={`inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black tracking-widest border ${statusColors[viewingAssetHistory?.latestStatus || 'pending']}`}>
                          {statusLabels[viewingAssetHistory?.latestStatus || 'pending']}
                        </span>
                      </DetailModalRow>
                    </DetailModalCard>
                  </DetailModalSection>

                  <DetailModalSection title="Historial de Mantenimientos">
                    <div className="space-y-3">
                      {viewingAssetHistory?.maintenanceRecords
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((record) => (
                          <DetailModalCard key={record.id}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${typeColors[record.maintenance_type]}`}>
                                  {typeLabels[record.maintenance_type]}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${statusColors[record.status]}`}>
                                  {statusLabels[record.status]}
                                </span>
                              </div>
                              <span className="text-[8px] font-mono text-slate-400">
                                {new Date(String(record.created_at).includes('T') ? String(record.created_at) : `${record.created_at}T12:00:00`).toLocaleDateString('es-PE')}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <DetailModalRow label="Descripción">
                                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700">
                                  {record.description}
                                </span>
                              </DetailModalRow>
                              {record.failure_cause && (
                                <DetailModalRow label="Causa Raíz">
                                  <span className="text-[10px] sm:text-[11px] font-semibold text-rose-700">
                                    {record.failure_cause}
                                  </span>
                                </DetailModalRow>
                              )}
                              {record.solution_applied && (
                                <DetailModalRow label="Solución Aplicada">
                                  <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 italic leading-relaxed">
                                    {record.solution_applied}
                                  </span>
                                </DetailModalRow>
                              )}
                              <div className="grid grid-cols-4 gap-2 text-[9px]">
                                <div>
                                  <p className="font-bold text-slate-400 uppercase">Técnico</p>
                                  <p className="font-black text-slate-700">{record.technician || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-400 uppercase">Horas</p>
                                  <p className="font-black text-blue-600">{record.work_hours || 0} h</p>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-400 uppercase">Completado</p>
                                  <p className="font-black text-slate-700">{record.completed_date ? new Date(String(record.completed_date).includes('T') ? String(record.completed_date) : `${record.completed_date}T12:00:00`).toLocaleDateString('es-PE') : 'Pend.'}</p>
                                </div>
                                <div>
                                  <p className="font-bold text-slate-400 uppercase">Costo</p>
                                  <p className="font-black text-emerald-600 font-mono">S/ {record.total_cost?.toFixed(2) || '0.00'}</p>
                                </div>
                              </div>
                              </div>
                              {canEdit() && (
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                  <button
                                    onClick={() => {
                                      setViewingAssetHistory(undefined);
                                      handleEditRecord(record);
                                    }}
                                    className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeleteRecord(record);
                                      setViewingAssetHistory(undefined);
                                    }}
                                    className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </DetailModalCard>
                          ))}
                        </div>
                      </DetailModalSection>
                    </DetailModalGrid>
                  </DetailModalBody>
                  <StandardModalFooter
                    onClose={() => setViewingAssetHistory(undefined)}
                  />
                </DetailModal>
              )
            }
      </div>
    </div>
  );
}
