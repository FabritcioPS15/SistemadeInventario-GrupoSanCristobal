import { useState, useEffect } from 'react';
import { Edit, Trash2, MapPin, Upload, Package, Layers, LayoutGrid, List, BarChart3, FileSpreadsheet, Circle, Plus } from 'lucide-react';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import { generateExcel, generatePDF } from '../../../shared/utils/exportUtils';
import AssetForm from '../forms/AssetForm';
import AssetDetails from '../components/AssetDetails';
import DecoupleModal from '../components/DecoupleModal';
import ExcelImportModal from '../../../shared/components/ExcelImportModal';
import { generateAndDownloadTemplate } from '../../../shared/utils/excelTemplate';
import Pagination from '../../../shared/components/ui/Pagination';
import { useAuth } from '../../../app/providers/AuthContext';
import SelectionModeButton from '../../../shared/components/ui/SelectionModeButton';
import { useSelectionMode } from '../../../shared/hooks/useSelectionMode';
import SearchBar from '../../../shared/components/ui/SearchBar';
import { useInventory } from '../hooks/useInventory';
import { PATH_CATEGORY_MAP, SUBCATEGORY_SLUG_MAP, STATUS_MAP } from '../constants/inventory.constants';
import InventoryDashboard from '../components/InventoryDashboard';
import { InventoryFilter } from '../../../shared/types/inventory.types';
import ActionToolbar from '../../../shared/components/ui/ActionToolbar';
import FilterBar from '../../../shared/components/ui/FilterBar';
import ExportButtons from '../../../shared/components/ui/ExportButtons';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../../shared/components/ui/Table';

type InventoryProps = {
  categoryFilter?: string;
  subcategoryFilter?: string;
};

export default function Inventory({ categoryFilter, subcategoryFilter }: InventoryProps) {
  const { success: notifySuccess, error: notifyError, confirm } = useNotify();
  const { canEdit, user } = useAuth();

  // UI-only state
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [showDecoupleModal, setShowDecoupleModal] = useState(false);
  const [decoupleAssetData, setDecoupleAssetData] = useState<AssetWithDetails | undefined>();
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | undefined>();
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | undefined>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const { selectionMode, setSelectionMode } = useSelectionMode();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showDashboard, setShowDashboard] = useState(false);

  const handleToggleSelectionMode = () => {
    if (selectionMode) setSelectedIds(new Set());
    setSelectionMode(!selectionMode);
  };

  // Determinar los filtros de empresa/sede según el rol y accesos del usuario
  const multiEnterpriseFilters: InventoryFilter = (() => {
    // Super admin y gerencia ven todo
    if (user?.role === 'super_admin' || user?.role === 'gerencia') {
      return {};
    }
    // Otros roles solo ven sus sedes asignadas
    if (user?.location_ids && user.location_ids.length > 0) {
      return {
        location_id: user.location_ids[0] // Usar la primera sede para el dashboard
      };
    }
    return {};
  })();

  // Use hook for inventory logic
  const {
    inventory,
    categories,
    subcategories,
    locations,
    loading,
    totalCount,
    searchTerm,
    selectedLocations,
    filterStatus,
    currentPage,
    itemsPerPage,
    totalPages,
    sortConfig,
    setSearchTerm,
    setSelectedLocations,
    setFilterStatus,
    setCurrentPage,
    setItemsPerPage,
    refresh,
    handleSort,
    fetchAllFilteredIds,
  } = useInventory({ categoryFilter, subcategoryFilter });

  // Listen to TopHeader action events
  useEffect(() => {
    const onNew = () => setShowAssetForm(true);
    const onExport = () => handleExportExcel();
    const onExportPdf = () => handleExportPdf();
    const onSearch = (e: Event) => setSearchTerm((e as CustomEvent).detail ?? '');

    window.addEventListener('inventory:new', onNew);
    window.addEventListener('inventory:export', onExport);
    window.addEventListener('inventory:export-pdf', onExportPdf);
    window.addEventListener('inventory:search', onSearch);

    return () => {
      window.removeEventListener('inventory:new', onNew);
      window.removeEventListener('inventory:export', onExport);
      window.removeEventListener('inventory:export-pdf', onExportPdf);
      window.removeEventListener('inventory:search', onSearch);
    };
  }, [inventory]); // Use inventory dependency to ensure export uses latest data

  const handleDeleteAsset = async (asset: AssetWithDetails) => {
    const confirmed = await confirm(
      `Se eliminará permanentemente ${asset.codigo_unico} — ${asset.brand} ${asset.model}. Esta acción no se puede deshacer.`,
      '¿Eliminar activo?'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('assets').delete().eq('id', asset.id);
      if (error) throw error;
      await refresh();
      notifySuccess(`"${asset.brand} ${asset.model}" se eliminó correctamente`, '¡Eliminado!');
    } catch (err: any) {
      notifyError('Error al eliminar: ' + err.message, 'Error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirm(
      `Se eliminarán ${selectedIds.size} activos seleccionados. Esta acción no se puede deshacer.`,
      `¿Eliminar ${selectedIds.size} activos?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('assets').delete().in('id', Array.from(selectedIds));
      if (error) throw error;
      const count = selectedIds.size;
      setSelectedIds(new Set());
      await refresh();
      notifySuccess(`${count} activos eliminados correctamente`, '¡Eliminación masiva!');
    } catch (err: any) {
      notifyError('Error al eliminar: ' + err.message, 'Error');
    }
  };

  const handleDecoupleAsset = (asset: AssetWithDetails) => {
    const cantidad = parseInt(asset.cantidad?.toString() || '1');
    if (cantidad < 2) return;

    setDecoupleAssetData(asset);
    setShowDecoupleModal(true);
  };

  // FIX: esta función se usaba en el checkbox "seleccionar todo" de la tabla
  // de escritorio pero nunca estaba definida. Ahora marca TODOS los items que
  // coinciden con los filtros actuales (no solo los de la página visible).
  const handleSelectAll = async () => {
    if (selectingAll) return;
    const allSelected = totalCount > 0 && selectedIds.size === totalCount;
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectingAll(true);
    try {
      const ids = await fetchAllFilteredIds();
      setSelectedIds(new Set(ids));
    } catch {
      notifyError('Error al seleccionar todos los items');
    } finally {
      setSelectingAll(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const itemsToExport = selectedIds.size > 0
        ? inventory.filter((a: any) => selectedIds.has(a.id))
        : inventory;

      const data = itemsToExport.map((a: any) => ({
        code: a.codigo_unico,
        category: a.categories?.name || '—',
        subcategory: a.subcategories?.name || '—',
        brand: a.brand || '—',
        model: a.model || '—',
        serial: a.serial_number || '—',
        location: a.locations?.name || '—',
        area: a.areas?.name || '—',
        status: a.status || '—',
        purchase_date: a.fecha_adquisicion ? new Date(String(a.fecha_adquisicion).includes('T') ? String(a.fecha_adquisicion) : `${a.fecha_adquisicion}T12:00:00`).toLocaleDateString() : '—',
        notes: a.notes || '—'
      }));

      await generateExcel({
        title: 'Reporte de Inventario de Activos',
        filename: `Inventario_${new Date().toISOString().split('T')[0]}`,
        columns: [
          { header: 'CÓDIGO', key: 'code', width: 15 },
          { header: 'CATEGORÍA', key: 'category', width: 25 },
          { header: 'SUBCATEGORÍA', key: 'subcategory', width: 25 },
          { header: 'MARCA', key: 'brand', width: 15 },
          { header: 'MODELO', key: 'model', width: 20 },
          { header: 'SERIE', key: 'serial', width: 20 },
          { header: 'UBICACIÓN', key: 'location', width: 25 },
          { header: 'ÁREA', key: 'area', width: 20 },
          { header: 'ESTADO', key: 'status', width: 15 },
          { header: 'FECHA ADQ.', key: 'purchase_date', width: 15 },
          { header: 'NOTAS', key: 'notes', width: 30 }
        ],
        data
      });
    } catch (e) {
      console.error(e);
      notifyError('Error al exportar a Excel', 'Error de exportación');
    }
  };

  const handleExportPdf = () => {
    const itemsToExport = selectedIds.size > 0
      ? inventory.filter((a: any) => selectedIds.has(a.id))
      : inventory;

    const data = itemsToExport.map((a: any) => ({
      code: a.codigo_unico || '—',
      category: a.categories?.name || '—',
      marca_modelo: `${a.brand || ''} ${a.model || ''}`.trim() || '—',
      serial: a.serial_number || '—',
      location: a.locations?.name || '—',
      status: a.status || '—'
    }));

    generatePDF({
      title: 'Reporte de Inventario de Activos',
      filename: `Inventario_${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: 'Código', key: 'code' },
        { header: 'Categoría', key: 'category' },
        { header: 'Marca/Modelo', key: 'marca_modelo' },
        { header: 'Serie', key: 'serial' },
        { header: 'Ubicación', key: 'location' },
        { header: 'Estado', key: 'status' }
      ],
      data
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <ActionToolbar
          totalItems={totalCount}
          label="Activos"
          searchComponent={
            <SearchBar
              placeholder="Buscar por código, nombre, marca, serie o modelo..."
              value={searchTerm}
              onChange={(value) => { setSearchTerm(value); setCurrentPage(1); }}
            />
          }
        >
          <FilterBar
            filters={[
              { key: 'location', placeholder: 'Todas las ubicaciones', icon: MapPin, iconClassName: 'text-rose-500', wrapperClassName: 'md:min-w-[220px]', multiple: true, options: locations.map(loc => ({ value: loc.id, label: loc.name })) },
              {
                key: 'status', placeholder: 'Todos los estados', icon: Circle, iconClassName: 'text-emerald-500', wrapperClassName: 'md:min-w-[170px]', options: [
                  { value: 'Operativo', label: 'Operativo' },
                  { value: 'Inoperativo', label: 'Inoperativo' },
                  { value: 'En Reparación', label: 'En Reparación' },
                  { value: 'Baja', label: 'De Baja' },
                ]
              },
            ]}
            values={{ location: selectedLocations, status: filterStatus }}
            onChange={(key, value) => {
              if (key === 'location') setSelectedLocations(value as string[]);
              else if (key === 'status') setFilterStatus(value as string[]);
              setCurrentPage(1);
            }}
          />

          {canEdit() && (
            <button
              onClick={() => setShowAssetForm(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-normal uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
            >
              <Plus size={14} />
              Agregar Activo
            </button>
          )}

          {canEdit() && (
            <SelectionModeButton
              active={selectionMode}
              onClick={handleToggleSelectionMode}
              selectedCount={selectedIds.size}
            />
          )}

          <div className="flex bg-slate-100 p-1 border border-slate-200 w-full md:w-auto justify-center">
            <button
              onClick={() => {
                setViewMode('grid');
                setShowDashboard(false);
              }}
              className={`flex-1 md:flex-none p-1.5 transition-all flex items-center justify-center ${viewMode === 'grid' && !showDashboard ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => {
                setViewMode('table');
                setShowDashboard(false);
              }}
              className={`flex-1 md:flex-none p-1.5 transition-all flex items-center justify-center ${viewMode === 'table' && !showDashboard ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
              title="Vista Tabla"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`flex-1 md:flex-none p-1.5 transition-all flex items-center justify-center ${showDashboard ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
              title="Dashboard"
            >
              <BarChart3 size={16} />
            </button>
          </div>

          <ExportButtons onExportExcel={handleExportExcel} onExportPDF={handleExportPdf} />
          {canEdit() && (
            <>
              <button
                onClick={async () => {
                  try {
                    await generateAndDownloadTemplate();
                  } catch (err) {
                    notifyError('Error al descargar plantilla');
                  }
                }}
                className="flex-1 md:flex-none group flex items-center justify-center h-10 px-4 bg-white text-slate-400 border border-slate-200 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                title="Descargar Plantilla"
              >
                <FileSpreadsheet size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex-1 md:flex-none group flex items-center justify-center h-10 px-4 bg-white text-slate-400 border border-slate-200 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                title="Importar Excel"
              >
                <Upload size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
            </>
          )}
        </ActionToolbar>

        {/* Dashboard View */}
        {showDashboard ? (
          <InventoryDashboard
            companyId={multiEnterpriseFilters.company_id}
            locationId={multiEnterpriseFilters.location_id}
          />
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
          </div>
        ) : viewMode === 'table' ? (
          <>
            <div className="md:hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
              <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  selectedCount={selectionMode ? selectedIds.size : 0}
                  onDeleteSelected={handleBulkDelete}
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center w-12">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer animate-in fade-in slide-in-from-right-2 duration-200"
                            checked={totalCount > 0 && selectedIds.size === totalCount}
                            onChange={handleSelectAll}
                            disabled={selectingAll}
                          />
                        )}
                      </TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'item'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('item')} className="min-w-[280px] max-w-[360px]">Activo</TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'category_id'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('category_id')} className="w-[180px]">Categoría</TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'location_id'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('location_id')} className="w-[180px]">Ubicación</TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'cantidad'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('cantidad')} className="w-24">Cantidad</TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'valor_estimado'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('valor_estimado')} className="w-36">Costo</TableHead>
                      <TableHead sortable isSorted={sortConfig?.key === 'estado_uso'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('estado_uso')} className="w-36">Estado</TableHead>
                      <TableHead className="text-center w-24">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((asset: any) => {
                      return (
                        <TableRow
                          key={asset.id}
                          className={selectedIds.has(asset.id) ? '!bg-blue-50/50' : ''}
                          onClick={() => {
                            if (!selectionMode) return;
                            const newSelected = new Set(selectedIds);
                            if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                            else newSelected.add(asset.id);
                            setSelectedIds(newSelected);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setSelectedAsset(asset);
                            setShowAssetDetails(true);
                          }}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            {selectionMode && (
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer animate-in fade-in slide-in-from-right-2 duration-200"
                                checked={selectedIds.has(asset.id)}
                                onChange={() => {
                                  const newSelected = new Set(selectedIds);
                                  if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                                  else newSelected.add(asset.id);
                                  setSelectedIds(newSelected);
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-semibold min-w-[280px] max-w-[360px]">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-semibold text-slate-800 leading-none truncate">
                                {asset.item || asset.descripcion || 'Sin descripción'}
                              </span>
                              {(asset.brand || asset.model) && (
                                <span className="text-[10px] font-semibold text-slate-400 tracking-wider mt-1.5 truncate">
                                  {asset.brand} {asset.model}
                                </span>
                              )}
                              {asset.codigo_unico && (
                                <span className="inline-flex items-center text-[9px] font-semibold text-slate-400 font-mono mt-1.5 bg-slate-100 px-2 py-0.5 rounded w-max">
                                  CÓD: {asset.codigo_unico}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-[180px]">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-semibold text-slate-700 leading-none truncate">{asset.categories?.name}</span>
                              <span className="text-[12px] font-semibold text-slate-400 tracking-wider mt-1.5 truncate">{asset.subcategories?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="w-[180px]">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-semibold text-slate-700 leading-none truncate">{asset.locations?.name || 'No asignada'}</span>
                              <span className="text-[12px] font-semibold text-slate-400 tracking-wider mt-1.5 truncate">{asset.areas?.name || 'Sin área'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="w-24 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-[12px] font-semibold text-slate-700 leading-none">{asset.cantidad || 1}</span>
                              <span className="text-[12px] font-semibold text-slate-400 tracking-wider mt-1 truncate">{asset.unidad_medida || 'UNIDAD(ES)'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="w-36 whitespace-nowrap">
                            <span className="text-[12px] font-semibold text-slate-700 leading-none">
                              {asset.valor_estimado != null ? `S/ ${Number(asset.valor_estimado).toFixed(2)}` : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="w-36 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide border rounded-none whitespace-nowrap ${asset.estado_uso === 'Operativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              asset.estado_uso === 'Inoperativo' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                asset.estado_uso === 'En Reparación' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  asset.estado_uso === 'Baja' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                              {asset.estado_uso || 'Sin estado'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {canEdit() && (
                                <>
                                  {(asset.cantidad || 1) > 1 && (
                                    <button onClick={() => handleDecoupleAsset(asset)} className="text-[10px] font-bold text-emerald-600 hover:underline bg-emerald-50 px-2 py-1 rounded-sm w-full text-center" title="Desacoplar">Desacoplar</button>
                                  )}
                                  <button onClick={() => { setEditingAsset(asset); setShowAssetForm(true); }} className="text-[10px] font-bold text-[#002855] hover:underline bg-[#002855]/5 px-2 py-1 rounded-sm w-full text-center">Editar</button>
                                  <button onClick={() => handleDeleteAsset(asset)} className="text-[10px] font-bold text-rose-600 hover:underline bg-rose-50 px-2 py-1 rounded-sm w-full text-center">Eliminar</button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
              <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  selectedCount={selectionMode ? selectedIds.size : 0}
                  onDeleteSelected={handleBulkDelete}
                />
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      {canEdit() && selectionMode && (
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer animate-in fade-in slide-in-from-right-2 duration-200"
                          checked={totalCount > 0 && selectedIds.size === totalCount}
                          onChange={handleSelectAll}
                          disabled={selectingAll}
                        />
                      )}
                    </TableHead>
                    <TableHead sortable isSorted={sortConfig?.key === 'item'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('item')} className="min-w-[280px] max-w-[360px]">Detalle / Códigos</TableHead>
                    <TableHead sortable isSorted={sortConfig?.key === 'category_id'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('category_id')} className="w-[180px]">Categoría</TableHead>
                    <TableHead sortable isSorted={sortConfig?.key === 'location_id'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('location_id')} className="w-[180px]">Ubicación</TableHead>
                    <TableHead sortable isSorted={sortConfig?.key === 'cantidad'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('cantidad')} className="w-24">Stock</TableHead>
                    <TableHead sortable isSorted={sortConfig?.key === 'valor_estimado'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('valor_estimado')} className="w-36">Valor Referencial</TableHead>
                    <TableHead sortable isSorted={sortConfig?.key === 'estado_uso'} sortDirection={sortConfig?.direction || 'asc'} onClick={() => handleSort('estado_uso')} className="w-36">Estado</TableHead>
                    <TableHead className="text-center w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((asset: any) => {
                    return (
                      <TableRow key={asset.id} className="group hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedAsset(asset); setShowAssetDetails(true); }}>
                        <TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                          {canEdit() && selectionMode && (
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer animate-in fade-in slide-in-from-right-2 duration-200"
                              checked={selectedIds.has(asset.id)}
                              onChange={() => {
                                const newSelected = new Set(selectedIds);
                                if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                                else newSelected.add(asset.id);
                                setSelectedIds(newSelected);
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-semibold min-w-[280px] max-w-[360px]">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-semibold text-slate-800 leading-none truncate">
                              {asset.item || asset.descripcion || 'Sin descripción'}
                            </span>
                            {(asset.brand || asset.model) && (
                              <span className="text-[10px] font-semibold text-slate-400 tracking-wider mt-1.5 truncate">
                                {asset.brand} {asset.model}
                              </span>
                            )}
                            {asset.codigo_unico && (
                              <span className="inline-flex items-center text-[9px] font-semibold text-slate-400 font-mono mt-1.5 bg-slate-100 px-2 py-0.5 rounded w-max">
                                CÓD: {asset.codigo_unico}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[180px]">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-semibold text-slate-700 leading-none truncate">{asset.categories?.name}</span>
                            <span className="text-[12px] font-semibold text-slate-400 tracking-wider mt-1.5 truncate">{asset.subcategories?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-[180px]">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12px] font-semibold text-slate-700 leading-none truncate">{asset.locations?.name || 'No asignada'}</span>
                            <span className="text-[12px] font-semibold text-slate-400 tracking-wider mt-1.5 truncate">{asset.areas?.name || 'Sin área'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-24 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[12px] font-semibold text-slate-700 leading-none">{asset.cantidad || 1}</span>
                            <span className="text-[12px] font-semibold text-slate-400 tracking-wider mt-1 truncate">{asset.unidad_medida || 'UNIDAD(ES)'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-36 whitespace-nowrap">
                          <span className="text-[12px] font-semibold text-slate-700 leading-none">
                            {asset.valor_estimado != null ? `S/ ${Number(asset.valor_estimado).toFixed(2)}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="w-36 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold tracking-wide border rounded-none whitespace-nowrap ${asset.estado_uso === 'Operativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            asset.estado_uso === 'Inoperativo' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                              asset.estado_uso === 'En Reparación' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                asset.estado_uso === 'Baja' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                  'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                            {asset.estado_uso || 'Sin estado'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                            {canEdit() && (
                              <>
                                {(asset.cantidad || 1) > 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDecoupleAsset(asset); }}
                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                    title="Desacoplar Activos"
                                  >
                                    <Layers size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setShowAssetForm(true); }}
                                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                  title="Editar Activo"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset); }}
                                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                  title="Eliminar Activo"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                selectedCount={selectionMode ? selectedIds.size : 0}
                onDeleteSelected={handleBulkDelete}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inventory.map((asset: any) => {
                const status = STATUS_MAP[asset.estado_uso] || { label: asset.estado_uso || 'Desconocido', color: 'slate' };
                return (
                  <div
                    key={asset.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col group overflow-hidden hover:-translate-y-0.5"
                    onDoubleClick={() => { setSelectedAsset(asset); setShowAssetDetails(true); }}
                  >
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                          {selectionMode && (
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer animate-in fade-in slide-in-from-right-2 duration-200"
                              checked={selectedIds.has(asset.id)}
                              onChange={() => {
                                const newSelected = new Set(selectedIds);
                                if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                                else newSelected.add(asset.id);
                                setSelectedIds(newSelected);
                              }}
                            />
                          )}
                          <span className="text-[10px] font-semibold text-[#002855] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-none font-mono">
                            CÓD: {asset.codigo_unico || 'N/A'}
                          </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-semibold tracking-wider border rounded-none ${asset.estado_uso === 'Operativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          asset.estado_uso === 'Inoperativo' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                            asset.estado_uso === 'En Reparación' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {status.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-[14px] font-semibold text-slate-800 leading-none truncate">{asset.brand}</h3>
                        <p className="text-[11px] font-semibold text-slate-400 tracking-wider mt-1">{asset.model}</p>
                      </div>

                      <div className="space-y-3 mt-5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <Layers size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate">{asset.categories?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <MapPin size={14} className="text-rose-500 shrink-0" />
                          <span className="truncate">{asset.locations?.name || 'No asignada'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <Package size={14} className="text-emerald-500 shrink-0" />
                          <span>{asset.cantidad || 1} {asset.unidad_medida || 'UNIDADES'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                      {canEdit() && (
                        <>
                          <button
                            onClick={() => { setEditingAsset(asset); setShowAssetForm(true); }}
                            className="p-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAssetForm && (
        <AssetForm
          onClose={() => setShowAssetForm(false)}
          onSave={async () => { setShowAssetForm(false); await refresh(); }}
          editAsset={editingAsset}
          initialCategoryId={!editingAsset && categoryFilter ? categories.find(c => c.name === PATH_CATEGORY_MAP[categoryFilter.replace('inventory-', '')])?.id : undefined}
          initialSubcategoryId={!editingAsset && subcategoryFilter ? subcategories.find(s => SUBCATEGORY_SLUG_MAP[subcategoryFilter]?.includes(s.name))?.id : undefined}
        />
      )}

      {showAssetDetails && selectedAsset && (
        <AssetDetails
          asset={selectedAsset!}
          onClose={() => {
            setShowAssetDetails(false);
            setSelectedAsset(undefined);
          }}
          onEdit={() => { setShowAssetDetails(false); setEditingAsset(selectedAsset); setShowAssetForm(true); }}
        />
      )}

      {showDecoupleModal && decoupleAssetData && (
        <DecoupleModal
          asset={decoupleAssetData}
          onClose={() => {
            setShowDecoupleModal(false);
            setDecoupleAssetData(undefined);
          }}
          onConfirm={() => {
            setShowDecoupleModal(false);
            setDecoupleAssetData(undefined);
            refresh();
          }}
        />
      )}

      {showUploadModal && (
        <ExcelImportModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={async () => { setShowUploadModal(false); await refresh(); }}
          assetTypes={[]}
          locations={locations}
        />
      )}
    </div>
  );
}