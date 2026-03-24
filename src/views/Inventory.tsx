import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, MapPin, Download, Upload, Package, Search, Layers, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, AssetWithDetails, Location, Category, Subcategory } from '../lib/supabase';
import AssetForm from '../components/forms/AssetForm';
import AssetDetails from '../components/AssetDetails';
import ExcelImportModal from '../components/ExcelImportModal';
import Pagination from '../components/Pagination';
import { useAuth } from '../contexts/AuthContext';

type InventoryProps = {
  categoryFilter?: string; // e.g., 'inventory-computo-ti'
  subcategoryFilter?: string; // e.g., 'cpu'
};

export default function Inventory({ categoryFilter, subcategoryFilter }: InventoryProps) {
  const { canEdit } = useAuth();
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | undefined>();
  const [editingAsset, setEditingAsset] = useState<AssetWithDetails | undefined>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });

  // Map categoryFilter path to actual Category names in DB
  const pathCategoryMap: Record<string, string> = {
    'computo-ti': 'Equipos de Cómputo y TI',
    'biometricos-control': 'Equipos Biométricos y Control',
    'equipos-medicos': 'Equipos Médicos',
    'mobiliario': 'Mobiliario',
    'seguridad': 'Seguridad',
    'utiles-oficina': 'Útiles de Oficina'
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAssets(),
        fetchCategories(),
        fetchSubcategories(),
        fetchLocations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    const { data, error } = await supabase
      .from('assets')
      .select('*, categories(*), subcategories(*), locations(*), areas(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) setAssets(data as AssetWithDetails[]);
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

  const filteredAssets = useMemo(() => {
    const cleanCategoryFilter = categoryFilter?.replace('inventory-', '');
    const activePathCategory = cleanCategoryFilter ? pathCategoryMap[cleanCategoryFilter] : null;
    const activeSubcatNames = subcategoryFilter ? subcategorySlugMap[subcategoryFilter] : null;

    return assets.filter(asset => {
      const matchesSearch = 
        (asset.codigo_unico?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (asset.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (asset.model?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (asset.serial_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (asset.categories?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (asset.subcategories?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesPathCategory = !activePathCategory || asset.categories?.name === activePathCategory;
      const matchesPathSubcategory = !activeSubcatNames || activeSubcatNames.includes(asset.subcategories?.name || '');
      
      const matchesCategory = !filterCategory || asset.category_id === filterCategory;
      const matchesSubcategory = !filterSubcategory || asset.subcategory_id === filterSubcategory;
      const matchesLocation = !filterLocation || asset.location_id === filterLocation;
      const matchesArea = !filterArea || asset.area_id === filterArea;
      const matchesStatus = !filterStatus || asset.status === filterStatus;

      return matchesSearch && matchesPathCategory && matchesPathSubcategory && matchesCategory && matchesSubcategory && matchesLocation && matchesArea && matchesStatus;
    });
  }, [assets, searchTerm, categoryFilter, subcategoryFilter, filterCategory, filterSubcategory, filterLocation, filterArea, filterStatus]);

  const sortedAssets = useMemo(() => {
    if (!sortConfig) return filteredAssets;
    return [...filteredAssets].sort((a, b) => {
      let aVal, bVal;
      switch(sortConfig.key) {
        case 'category': aVal = a.categories?.name || ''; bVal = b.categories?.name || ''; break;
        case 'location': aVal = a.locations?.name || ''; bVal = b.locations?.name || ''; break;
        case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
        default: aVal = (a as any)[sortConfig.key] || ''; bVal = (b as any)[sortConfig.key] || '';
      }
      const res = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }, [filteredAssets, sortConfig]);

  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAssets.slice(start, start + itemsPerPage);
  }, [sortedAssets, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  const handleExportExcel = async () => {
    setExporting(true);
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

      filteredAssets.forEach(a => {
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
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const tableData = filteredAssets.map(a => [
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

  const statusMap: Record<string, { label: string, color: string }> = {
    active: { label: 'Activo', color: 'emerald' },
    inactive: { label: 'Inactivo', color: 'slate' },
    maintenance: { label: 'Mantenimiento', color: 'amber' },
    extracted: { label: 'Extraído', color: 'rose' }
  };

  const currentCategoryName = categoryFilter ? pathCategoryMap[categoryFilter.replace('inventory-', '')] : 'General';
  const currentSubcatLabel = subcategoryFilter ? (Object.keys(subcategorySlugMap).find(k => k === subcategoryFilter) ? subcategoryFilter.charAt(0).toUpperCase() + subcategoryFilter.slice(1) : '') : '';

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Dynamic Header */}
      <div className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
            <Package size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">
              <span>Inventario</span>
              <ChevronRight size={10} />
              <span className="text-slate-500">{currentCategoryName}</span>
              {currentSubcatLabel && (
                <>
                  <ChevronRight size={10} />
                  <span className="text-blue-500">{currentSubcatLabel}</span>
                </>
              )}
            </div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              {currentSubcatLabel || currentCategoryName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && canEdit() && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
            >
              <Trash2 size={14} /> Eliminar ({selectedIds.size})
            </button>
          )}
          
          <button onClick={handleExportExcel} disabled={exporting} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Exportar Excel">
            <Download size={20} />
          </button>
          
          {canEdit() && (
            <>
              <button onClick={() => setShowUploadModal(true)} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Importar Excel">
                <Upload size={20} />
              </button>
              <button 
                onClick={() => { setEditingAsset(undefined); setShowAssetForm(true); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Nuevo Activo
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {/* Advanced Filters Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por código, marca, serie..." 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {!categoryFilter && (
              <select 
                className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="">Categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            <select 
              className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
            >
              <option value="">Sedes</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <select 
              className="bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="extracted">Extraído</option>
            </select>

            <button 
              onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterLocation(''); setFilterStatus(''); setFilterArea(''); setFilterSubcategory(''); }}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-xl px-4 py-3 transition-all text-center"
            >
              Cerrar Filtros
            </button>
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.size > 0 && selectedIds.size === paginatedAssets.length}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds(new Set(paginatedAssets.map(a => a.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Código</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Activo / Detalle</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Ubicación / Área</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                  <th className="p-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-20 text-center text-slate-400 font-bold">Cargando activos...</td></tr>
                ) : paginatedAssets.length === 0 ? (
                  <tr><td colSpan={7} className="p-20 text-center text-slate-400 font-bold">Sin resultados</td></tr>
                ) : paginatedAssets.map(asset => {
                    const status = statusMap[asset.status] || { label: asset.status, color: 'slate' };
                    return (
                        <tr key={asset.id} className="hover:bg-slate-50/50 border-b border-slate-50 transition-colors group">
                            <td className="p-4">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedIds.has(asset.id)}
                                    onChange={e => {
                                        const newSet = new Set(selectedIds);
                                        if (e.target.checked) newSet.add(asset.id);
                                        else newSet.delete(asset.id);
                                        setSelectedIds(newSet);
                                    }}
                                />
                            </td>
                            <td className="p-4">
                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                    {asset.codigo_unico}
                                </span>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{asset.brand} {asset.model}</p>
                                        <p className="text-[10px] text-slate-400 font-medium font-mono">SN: {asset.serial_number || 'S/N'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                        <Layers size={14} className="text-slate-300" /> {asset.categories?.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium ml-5 italic">
                                        {asset.subcategories?.name}
                                    </span>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                        <MapPin size={14} className="text-blue-400" /> {asset.locations?.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium ml-5 uppercase tracking-wider">
                                        {asset.areas?.name || 'General'}
                                    </span>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-current bg-${status.color}-50 text-${status.color}-600`}>
                                    {status.label}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setSelectedAsset(asset); setShowAssetDetails(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                        <Eye size={16} />
                                    </button>
                                    {canEdit() && (
                                        <>
                                            <button onClick={() => { setEditingAsset(asset); setShowAssetForm(true); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteAsset(asset)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
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

          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              totalItems={filteredAssets.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        </div>
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