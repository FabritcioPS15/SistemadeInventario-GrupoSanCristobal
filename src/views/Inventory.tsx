import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, MapPin, Upload, Package, Search, Layers, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, AssetWithDetails, Location, Category, Subcategory } from '../lib/supabase';
import AssetForm from '../components/forms/AssetForm';
import AssetDetails from '../components/AssetDetails';
import ExcelImportModal from '../components/ExcelImportModal';
import Pagination from '../components/ui/Pagination';
import { useAuth } from '../contexts/AuthContext';

type InventoryProps = {
  categoryFilter?: string; // e.g., 'inventory-computo-ti'
  subcategoryFilter?: string; // e.g., 'cpu'
};

// Map categoryFilter path to actual Category names in DB
const pathCategoryMap: Record<string, string> = {
  'computo-ti': 'Equipos de Cómputo y TI',
  'biometricos-control': 'Equipos Biométricos y Control',
  'equipos-medicos': 'Equipos Médicos',
  'mobiliario': 'Mobiliario',
  'seguridad': 'Seguridad',
  'utiles-oficina': 'Útiles de Oficina',
  'disco-extraido': 'EXTRAIDO'
};

// Subcategory prefix/slug mapping
const subcategorySlugMap: Record<string, string[]> = {
  'cpu': ['Computadoras (CPU)'],
  'monitores': ['Monitores'],
  'laptops': ['Laptops'],
  'perifericos': ['Teclados', 'Mouse'],
  'impresoras': ['Impresoras', 'Impresoras multifuncionales'],
  'redes': ['Redes (router y DVR)'],
  'lector': ['Biométricos'],
  'huella': ['Control de huella'],
  'diagnostico': ['Diagnóstico general'],
  'clinicos': ['Equipos clínicos'],
  'laboratorio': ['Laboratorio - Equipos de análisis', 'Laboratorio - Equipos de esterilización', 'Laboratorio - Equipos de muestras', 'Laboratorio - Equipos ópticos'],
  'evaluacion': ['Evaluación Técnica - Equipos de evaluación visual', 'Evaluación Técnica - Equipos de evaluación auditiva', 'Evaluación Técnica - Equipos psicotécnicos', 'Evaluación Técnica - Equipos de simulación o pruebas'],
  'oficina': ['Escritorios', 'Mesas', 'Sillas', 'Estantes', 'Armarios', 'Muebles de archivo', 'Módulos', 'Biombos'],
  'infraestructura': ['Infraestructura - Refrigeración', 'Infraestructura - Lavaderos', 'Infraestructura - Instalaciones de agua', 'Infraestructura - Dispensadores', 'Infraestructura - Ventilación', 'Infraestructura - Instalaciones del local'],
};

const statusMap: Record<string, { label: string, color: string }> = {
  active: { label: 'Activo', color: 'emerald' },
  inactive: { label: 'Inactivo', color: 'slate' },
  maintenance: { label: 'Mantenimiento', color: 'amber' },
  extracted: { label: 'Extraído', color: 'rose' }
};

export default function Inventory({ categoryFilter, subcategoryFilter }: InventoryProps) {
  const { canEdit } = useAuth();
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | undefined>();
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | undefined>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Mapping moved to top of file

  useEffect(() => {
    fetchCategories();
    fetchSubcategories();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [currentPage, itemsPerPage, searchTerm, filterCategory, selectedLocations, filterStatus, categoryFilter, subcategoryFilter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('assets')
        .select('*, categories(name), subcategories(name), locations(name), areas(name)', { count: 'exact' });

      // Apply Filters
      if (searchTerm) {
        query = query.or(`codigo_unico.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`);
      }

      const cleanCategoryFilter = categoryFilter?.replace('inventory-', '');
      const activePathCategory = cleanCategoryFilter ? pathCategoryMap[cleanCategoryFilter] : null;

      if (cleanCategoryFilter === 'disco-extraido') {
        query = query.eq('status', 'extracted');
      } else if (activePathCategory) {
        // Since we can't easily filter by joined column name in a simple .eq() on assets, 
        // we first need to find the category ID if we don't have it.
        const cat = categories.find(c => c.name === activePathCategory);
        if (cat) query = query.eq('category_id', cat.id);
      }

      if (filterCategory) {
        query = query.eq('category_id', filterCategory);
      }

      if (selectedLocations.length > 0) {
        query = query.in('location_id', selectedLocations);
      }

      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }

      // Pagination and Sort
      const { data, error, count } = await query
        .order(sortConfig?.key || 'created_at', { ascending: sortConfig?.direction === 'asc' })
        .range(from, to);

      if (error) throw error;
      setAssets(data as AssetWithDetails[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [assets]); // Use assets dependency to ensure export uses latest data

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const fetchSubcategories = async () => {
    const { data } = await supabase.from('subcategories').select('*').order('name');
    if (data) setSubcategories(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const handleDeleteAsset = async (asset: AssetWithDetails) => {
    if (window.confirm(`¿Estás seguro de eliminar "${asset.codigo_unico} - ${asset.brand} ${asset.model}"?`)) {
      setLoading(true);
      try {
        const { error } = await supabase.from('assets').delete().eq('id', asset.id);
        if (error) throw error;
        await fetchAssets();
      } catch (err: any) {
        alert('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`¿Eliminar ${selectedIds.size} activos seleccionados?`)) {
      setLoading(true);
      try {
        const { error } = await supabase.from('assets').delete().in('id', Array.from(selectedIds));
        if (error) throw error;
        setSelectedIds(new Set());
        await fetchAssets();
      } catch (err: any) {
        alert('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.size === 0 || !newStatus) return;
    if (window.confirm(`¿Cambiar el estado de ${selectedIds.size} activos a "${statusMap[newStatus]?.label || newStatus}"?`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('assets')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .in('id', Array.from(selectedIds));

        if (error) throw error;
        setSelectedIds(new Set());
        await fetchAssets();
      } catch (err: any) {
        alert('Error: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const paginatedAssets = assets;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
      assets.forEach(a => {
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
    const tableData = assets.map(a => [
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

  const currentCategoryName = categoryFilter ? pathCategoryMap[categoryFilter.replace('inventory-', '')] : 'General';
  const currentSubcatLabel = subcategoryFilter ? (Object.keys(subcategorySlugMap).find(k => k === subcategoryFilter) ? subcategoryFilter.charAt(0).toUpperCase() + subcategoryFilter.slice(1) : '') : '';

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
          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="BUSCAR POR CÓDIGO, MARCA, SERIE O MODELO..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 uppercase tracking-[0.1em]"
            />
          </div>

          {/* Filters + Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {!categoryFilter && (
              <select
                value={filterCategory}
                onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
              >
                <option value="">Categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
              </select>
            )}

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
                            setSelectedLocations(prev => prev.includes(loc.id) ? prev.filter(id => id !== loc.id) : [...prev, loc.id]);
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

            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest outline-none transition-all min-w-[130px] appearance-none cursor-pointer"
            >
              <option value="">Estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="extracted">Extraído</option>
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
                <List size={16} />
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
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                  title="Importar Excel"
                >
                  <Upload size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
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
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-5 text-center w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                        checked={paginatedAssets.length > 0 && paginatedAssets.every(a => selectedIds.has(a.id))}
                        onChange={(e) => {
                          const newSelected = new Set(selectedIds);
                          if (e.target.checked) {
                            paginatedAssets.forEach(a => newSelected.add(a.id));
                          } else {
                            paginatedAssets.forEach(a => newSelected.delete(a.id));
                          }
                          setSelectedIds(newSelected);
                        }}
                      />
                    </th>
                    <th className="px-6 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Código / Activo</span></th>
                    <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Categoría</span></th>
                    <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Ubicación</span></th>
                    <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                    <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAssets.map(asset => {
                    const status = statusMap[asset.status] || { label: asset.status, color: 'slate' };
                    return (
                      <tr
                        key={asset.id}
                        className={`hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0 ${selectedIds.has(asset.id) ? 'bg-blue-50/50' : ''}`}
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
                        <td className="px-4 py-5 text-center" onClick={(e) => e.stopPropagation()}>
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
                        <td className="px-6 py-5 font-bold text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 border border-slate-100 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md uppercase font-black text-[10px]">
                              {asset.codigo_unico ? asset.codigo_unico.slice(-3) : '??'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{asset.codigo_unico || 'SIN CÓDIGO'}</span>
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{asset.brand} {asset.model}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <div className="flex flex-col gap-1">
                            <span className="text-[13px] font-black text-[#002855] uppercase">{asset.categories?.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.subcategories?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin size={12} className="text-rose-500" />
                            <span className="text-[13px] font-black text-[#002855] uppercase">{asset.locations?.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-5">{asset.areas?.name || 'Área general'}</span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-current bg-opacity-10 bg-${status.color}-500 text-${status.color}-700 border-${status.color}-200`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); setShowAssetDetails(true); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-100 shadow-sm transition-all"><Eye size={14} /></button>
                            {canEdit() && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setShowAssetForm(true); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white border border-slate-100 shadow-sm transition-all"><Edit size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-100 shadow-sm transition-all"><Trash2 size={14} /></button>
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
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
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
              {paginatedAssets.map(asset => {
                const status = statusMap[asset.status] || { label: asset.status, color: 'slate' };
                return (
                  <div
                    key={asset.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden"
                    onDoubleClick={() => { setSelectedAsset(asset); setShowAssetDetails(true); }}
                  >
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors cursor-pointer"
                            checked={selectedIds.has(asset.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedIds);
                              if (newSelected.has(asset.id)) newSelected.delete(asset.id);
                              else newSelected.add(asset.id);
                              setSelectedIds(newSelected);
                            }}
                          />
                          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-[#002855]/20 group-hover:bg-[#002855] group-hover:text-white transition-all duration-300">
                            <Package size={24} />
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border border-current bg-opacity-10 bg-${status.color}-500 text-${status.color}-700 border-${status.color}-200`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-[15px] font-black text-[#002855] uppercase leading-tight truncate">{asset.brand} {asset.model}</h3>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{asset.codigo_unico || 'SIN CÓDIGO'}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 uppercase">
                            <Layers size={14} className="text-blue-500" />
                            <span className="truncate">{asset.categories?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 uppercase">
                            <MapPin size={14} className="text-rose-500" />
                            <span className="truncate">{asset.locations?.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => { setSelectedAsset(asset); setShowAssetDetails(true); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Eye size={14} /> Detalle
                      </button>
                      {canEdit() && (
                        <>
                          <button
                            onClick={() => { setEditingAsset(asset); setShowAssetForm(true); }}
                            className="p-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-sm"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset)}
                            className="p-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm"
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
          onSave={async () => { setShowAssetForm(false); await fetchAssets(); }}
          editAsset={editingAsset}
          initialCategoryId={!editingAsset && categoryFilter ? categories.find(c => c.name === pathCategoryMap[categoryFilter.replace('inventory-', '')])?.id : undefined}
          initialSubcategoryId={!editingAsset && subcategoryFilter ? subcategories.find(s => subcategorySlugMap[subcategoryFilter]?.includes(s.name))?.id : undefined}
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
          onSuccess={async () => { setShowUploadModal(false); await fetchAssets(); }}
          assetTypes={[]}
          locations={locations}
        />
      )}
    </div>
  );
}
