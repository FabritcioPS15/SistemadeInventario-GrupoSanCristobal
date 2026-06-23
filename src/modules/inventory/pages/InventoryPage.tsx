import { useState, useEffect, useRef } from 'react';
import { Edit, Trash2, MapPin, Upload, Package, Layers, ChevronDown, LayoutGrid, List, BarChart3, FileSpreadsheet } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import AssetForm from '../forms/AssetForm';
import AssetDetails from '../components/AssetDetails';
import ExcelImportModal from '../../../shared/components/ExcelImportModal';
import { generateAndDownloadTemplate } from '../../../shared/utils/excelTemplate';
import Pagination from '../../../shared/components/ui/Pagination';
import { useAuth } from '../../../app/providers/AuthContext';
import SearchBar from '../../../shared/components/ui/SearchBar';
import SortableTableHeader from '../../../shared/components/ui/SortableTableHeader';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import { useInventory } from '../hooks/useInventory';
import { STATUS_MAP, PATH_CATEGORY_MAP, SUBCATEGORY_SLUG_MAP } from '../constants/inventory.constants';
import InventoryDashboard from '../components/InventoryDashboard';
import { InventoryFilter } from '../../../shared/types/inventory.types';

type InventoryProps = {
  categoryFilter?: string; // e.g., 'inventory-computo-ti'
  subcategoryFilter?: string; // e.g., 'cpu'
};

export default function Inventory({ categoryFilter, subcategoryFilter }: InventoryProps) {
  const { success: notifySuccess, error: notifyError, confirm } = useNotify();
  const { canEdit } = useAuth();

  // UI-only state
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | undefined>();
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | undefined>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showDashboard, setShowDashboard] = useState(false);
  const [multiEnterpriseFilters, setMultiEnterpriseFilters] = useState<InventoryFilter>({});
  const [showRubroDropdown, setShowRubroDropdown] = useState(false);
  const rubroRef = useRef<HTMLDivElement>(null);

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
    showLocationDropdown,
    filterRubro,
    dropdownRef,
    currentPage,
    itemsPerPage,
    totalPages,
    sortConfig,
    setSearchTerm,
    setSelectedLocations,
    setShowLocationDropdown,

    setFilterRubro,
    setCurrentPage,
    setItemsPerPage,
    refresh,
    handleSort,
  } = useInventory({ categoryFilter, subcategoryFilter });

  // Cierra dropdown rubro al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rubroRef.current && !rubroRef.current.contains(event.target as Node)) {
        setShowRubroDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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


  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Inventario');

      ws.columns = [
        { header: 'CÓDIGO', key: 'code', width: 15 },
        { header: 'CATEGORÍA', key: 'category', width: 25 },
        { header: 'SUBCATEGORÍA', key: 'subcategory', width: 25 },
        { header: 'MARCA', key: 'brand', width: 15 },
        { header: 'MODELO', key: 'model', width: 20 },
        { header: 'SERIE', key: 'serial', width: 20 },
        { header: 'SEDE', key: 'location', width: 25 },
        { header: 'ÁREA', key: 'area', width: 20 },
        { header: 'ESTADO', key: 'status', width: 15 },
        { header: 'FECHA ADQUISICIÓN', key: 'purchase_date', width: 20 },
        { header: 'NOTAS', key: 'notes', width: 40 }
      ];

      // Use current page assets for export
      inventory.forEach((a: any) => {
        ws.addRow({
          code: a.codigo_unico,
          category: a.categories?.name,
          subcategory: a.subcategories?.name,
          brand: a.brand,
          model: a.model,
          serial: a.serial_number,
          location: a.locations?.name,
          area: a.areas?.name,
          status: a.status,
          purchase_date: a.fecha_adquisicion ? new Date(a.fecha_adquisicion).toLocaleDateString() : '—',
          notes: a.notes || '—'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    // Use current page assets for export
    const tableData = inventory.map((a: any) => [
      a.codigo_unico || '',
      a.categories?.name || '',
      `${a.brand || ''} ${a.model || ''}`.trim(),
      a.serial_number || '',
      a.locations?.name || '',
      a.status
    ]);

    autoTable(doc, {
      head: [['Código', 'Categoría', 'Marca/Modelo', 'Serie', 'Sede', 'Estado']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 40, 85] }
    });

    doc.save(`Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Map moved to top of file


  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Action Bar — Standardized */}
        <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
          <div className="absolute -top-3 -left-3">
            <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
              {totalCount} Activos
            </div>
          </div>

          {/* Search */}
          <SearchBar
            placeholder="BUSCAR POR CÓDIGO, MARCA, SERIE O MODELO..."
            value={searchTerm}
            onChange={(value) => { setSearchTerm(value); setCurrentPage(1); }}
          />

          {/* Filters + Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[200px]"
              >
                <MapPin size={14} className="text-rose-500" />
                <span className="truncate">{selectedLocations.length === 0 || selectedLocations.length === locations.length ? 'Todas las sedes' : `${selectedLocations.length} Sedes`}</span>
                <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full left-0 z-[70] mt-2 bg-white border border-slate-200 shadow-2xl min-w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 max-h-[300px] overflow-y-auto sidebar-scroll">
                    <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer group/loc">
                      <input
                        type="checkbox"
                        checked={selectedLocations.length === locations.length && locations.length > 0}
                        onChange={() => { setSelectedLocations(selectedLocations.length === locations.length ? [] : locations.map(l => l.id)); setCurrentPage(1); }}
                        className="w-3.5 h-3.5 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                      />
                      <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest">Todas las sedes</span>
                    </label>
                    <div className="h-px bg-slate-100 my-1" />
                    {locations.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer group/loc">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(loc.id)}
                          onChange={() => {
                            const newSelected = selectedLocations.includes(loc.id)
                              ? selectedLocations.filter((id: string) => id !== loc.id)
                              : [...selectedLocations, loc.id];
                            setSelectedLocations(newSelected);
                            setCurrentPage(1);
                          }}
                          className="w-3.5 h-3.5 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none group-hover/loc:text-[#002855] transition-colors">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dropdown Rubros */}
            {(() => {
              const RUBROS = [
                { id: '', label: 'Todos los rubros' },
                { id: 'revisiones_tecnicas', label: 'CTIV' },
                { id: 'escuela_conductores', label: 'ESCON' },
                { id: 'polclinico', label: 'ECSAL' },
                { id: 'oficinas_administrativas', label: 'CIRCUITOS' },
              ];
              const activeRubro = RUBROS.find(r => r.id === filterRubro);
              return (
                <div className="relative" ref={rubroRef}>
                  <button
                    onClick={() => setShowRubroDropdown(!showRubroDropdown)}
                    className={`px-4 py-3 bg-slate-50 border text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[170px] ${showRubroDropdown
                      ? 'border-[#002855]/30 bg-white'
                      : filterRubro
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 hover:border-[#002855]/30'
                      }`}
                  >
                    <Layers size={14} className={filterRubro ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="truncate flex-1 text-left">
                      {activeRubro?.id ? activeRubro.label : 'Rubros'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 ml-auto transition-transform ${showRubroDropdown ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showRubroDropdown && (
                    <div className="absolute top-full left-0 z-[70] mt-2 bg-white border border-slate-200 shadow-2xl min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1">
                        {RUBROS.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setFilterRubro(r.id);
                              setCurrentPage(1);
                              setShowRubroDropdown(false);
                            }}
                            className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors ${filterRubro === r.id
                              ? 'text-[#002855] bg-blue-50'
                              : 'text-slate-600'
                              }`}
                          >
                            {filterRubro === r.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#002855] shrink-0" />
                            )}
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => {
                  setViewMode('grid');
                  setShowDashboard(false);
                }}
                className={`p-1.5 transition-all ${viewMode === 'grid' && !showDashboard ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => {
                  setViewMode('table');
                  setShowDashboard(false);
                }}
                className={`p-1.5 transition-all ${viewMode === 'table' && !showDashboard ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
                title="Vista Tabla"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className={`p-1.5 transition-all ${showDashboard ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`}
                title="Dashboard"
              >
                <BarChart3 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
              <button
                onClick={handleExportExcel}
                className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
                title="Exportar a Excel"
              >
                <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>
              <button
                onClick={handleExportPdf}
                className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                title="Exportar a PDF"
              >
                <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
              </button>
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
                    className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm rounded-l-md"
                    title="Descargar Plantilla"
                  >
                    <FileSpreadsheet size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </button>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm rounded-r-md -ml-px"
                    title="Importar Excel"
                  >
                    <Upload size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

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
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
            <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                selectedCount={selectedIds.size}
                onDeleteSelected={handleBulkDelete}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 backdrop-blur-sm">
                    <th className="px-4 py-4 text-center w-12">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                        checked={inventory.length > 0 && inventory.every((a: any) => selectedIds.has(a.id))}
                        onChange={(e) => {
                          const newSelected = new Set(selectedIds);
                          if (e.target.checked) {
                            inventory.forEach((a: any) => newSelected.add(a.id));
                          } else {
                            inventory.forEach((a: any) => newSelected.delete(a.id));
                          }
                          setSelectedIds(newSelected);
                        }}
                      />
                    </th>
                    <th className="px-6 py-4 text-left"><SortableTableHeader label="Activo" sortKey="brand" sortConfig={sortConfig} onSort={handleSort} /></th>
                    <th className="px-4 py-4 text-left"><SortableTableHeader label="Categoría" sortKey="category_id" sortConfig={sortConfig} onSort={handleSort} /></th>
                    <th className="px-4 py-4 text-left"><SortableTableHeader label="Sede" sortKey="location_id" sortConfig={sortConfig} onSort={handleSort} /></th>
                    <th className="px-4 py-4 text-left"><SortableTableHeader label="Cantidad" sortKey="cantidad" sortConfig={sortConfig} onSort={handleSort} /></th>
                    <th className="px-4 py-4 text-left"><SortableTableHeader label="Costo" sortKey="valor_estimado" sortConfig={sortConfig} onSort={handleSort} /></th>
                    <th className="px-4 py-4 text-left"><SortableTableHeader label="Estado Operativo" sortKey="status" sortConfig={sortConfig} onSort={handleSort} /></th>
                    <th className="px-6 py-4 text-center"><span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Acción</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.map((asset: any) => {
                    return (
                      <tr
                        key={asset.id}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group relative border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/20 ${selectedIds.has(asset.id) ? '!bg-blue-50/50' : ''}`}
                        onClick={() => {
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
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                            checked={selectedIds.has(asset.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedIds);
                              if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                              else newSelected.add(asset.id);
                              setSelectedIds(newSelected);
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-left">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800 uppercase leading-none">
                              {asset.item || asset.descripcion || 'Sin descripción'}
                            </span>
                            {(asset.brand || asset.model) && (
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">
                                {asset.brand} {asset.model}
                              </span>
                            )}
                            {asset.codigo_unico && (
                              <span className="inline-flex items-center text-[9px] font-bold text-slate-400 font-mono mt-1.5 bg-slate-100 px-2 py-0.5 rounded w-max">
                                CÓD: {asset.codigo_unico}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800 uppercase leading-none">{asset.categories?.name}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">{asset.subcategories?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800 uppercase leading-none">{asset.locations?.name || 'No asignada'}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1.5">{asset.areas?.name || 'Sin área'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-[#002855] leading-none">{asset.cantidad || 1}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">{asset.unidad_medida || 'UNIDAD(ES)'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-slate-800 leading-none">
                              {asset.valor_estimado != null ? `S/ ${Number(asset.valor_estimado).toFixed(2)}` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <StatusBadge status={asset.status} statusMap={STATUS_MAP} size="md" />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                            {canEdit() && (
                              <>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
                selectedCount={selectedIds.size}
                onDeleteSelected={handleBulkDelete}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inventory.map((asset: any) => {
                const status = STATUS_MAP[asset.status] || { label: asset.status, color: 'slate' };
                return (
                  <div
                    key={asset.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col group overflow-hidden hover:-translate-y-0.5"
                    onDoubleClick={() => { setSelectedAsset(asset); setShowAssetDetails(true); }}
                  >
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-center mb-5">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                            checked={selectedIds.has(asset.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedIds);
                              if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                              else newSelected.add(asset.id);
                              setSelectedIds(newSelected);
                            }}
                          />
                          <span className="text-[10px] font-black text-[#002855] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full font-mono">
                            CÓD: {asset.codigo_unico || 'N/A'}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${asset.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          asset.status === 'inactive' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                            asset.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                          {status.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-[14px] font-black text-slate-800 uppercase leading-none truncate">{asset.brand}</h3>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{asset.model}</p>
                      </div>

                      <div className="space-y-3 mt-5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase">
                          <Layers size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate">{asset.categories?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase">
                          <MapPin size={14} className="text-rose-500 shrink-0" />
                          <span className="truncate">{asset.locations?.name || 'No asignada'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase">
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
          asset={selectedAsset}
          onClose={() => setShowAssetDetails(false)}
          onEdit={() => { setShowAssetDetails(false); setEditingAsset(selectedAsset); setShowAssetForm(true); }}
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
