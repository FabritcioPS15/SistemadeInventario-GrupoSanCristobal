import { useEffect, useState, useRef, useMemo } from 'react';
import { Edit, Trash2, MapPin, X, Eye, Building, Package, Users, ChevronDown, ChevronUp, LayoutGrid, List, Globe } from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationForm from '../components/forms/LocationForm';
import Pagination from '../components/Pagination';

const typeLabels: Record<string, string> = {
  revision: 'Revisión',
  policlinico: 'Policlínico',
  escuela_conductores: 'Escuela de Conductores',
  central: 'Central',
  circuito: 'Circuito',
};

const typeColors: Record<string, string> = {
  revision: 'bg-blue-50 text-blue-700 border-blue-200',
  policlinico: 'bg-green-50 text-green-700 border-green-200',
  escuela_conductores: 'bg-purple-50 text-purple-700 border-purple-200',
  central: 'bg-orange-50 text-orange-700 border-orange-200',
  circuito: 'bg-red-50 text-red-700 border-red-200',
};

export default function Sedes() {
  const { canEdit } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | undefined>();
  const [viewingLocation, setViewingLocation] = useState<Location | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'name' | 'type' | 'cameras'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchLocations(), fetchCameraCounts()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handleNew = () => openCreate();
    const handleExport = () => exportToExcel();
    const handleExportPdf = () => exportToPdf();

    window.addEventListener('locations:new', handleNew);
    window.addEventListener('locations:export', handleExport);
    window.addEventListener('locations:export-pdf', handleExportPdf);
    return () => {
      window.removeEventListener('locations:new', handleNew);
      window.removeEventListener('locations:export', handleExport);
      window.removeEventListener('locations:export-pdf', handleExportPdf);
    };
  }, [locations, cameraCounts]);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const fetchCameraCounts = async () => {
    const { data } = await supabase.from('cameras').select('location_id');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(c => { if (c.location_id) counts[c.location_id] = (counts[c.location_id] || 0) + 1; });
      setCameraCounts(counts);
    }
  };

  const openCreate = () => { setEditing(undefined); setShowForm(true); };
  const openEdit = (loc: Location) => { setEditing(loc); setShowForm(true); };

  const del = async (loc: Location) => {
    if (!confirm(`¿Eliminar sede "${loc.name}"?`)) return;
    const { error } = await supabase.from('locations').delete().eq('id', loc.id);
    if (error) return alert('Error al eliminar: ' + error.message);
    setSelectedIds(prev => prev.filter(id => id !== loc.id));
    await Promise.all([fetchLocations(), fetchCameraCounts()]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) setSelectedIds([]);
    else setSelectedIds(paginatedData.map(l => l.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.length} sedes seleccionadas?`)) return;
    const { error } = await supabase.from('locations').delete().in('id', selectedIds);
    if (!error) { setSelectedIds([]); await Promise.all([fetchLocations(), fetchCameraCounts()]); }
    else alert('Error al eliminar: ' + error.message);
  };

  const handleSort = (field: 'name' | 'type' | 'cameras') => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
    setCurrentPage(1);
  };

  const typeEntries = Object.keys(typeLabels);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...locations]
      .filter(loc => {
        const matchesSearch = loc.name?.toLowerCase().includes(q) ||
          loc.address?.toLowerCase().includes(q) ||
          loc.notes?.toLowerCase().includes(q);
        const matchesType = selectedTypes.length === 0 || selectedTypes.length === typeEntries.length ||
          selectedTypes.includes(loc.type || '');
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        let av: string | number = '', bv: string | number = '';
        if (sortField === 'name') { av = a.name || ''; bv = b.name || ''; }
        else if (sortField === 'type') { av = typeLabels[a.type] || a.type || ''; bv = typeLabels[b.type] || b.type || ''; }
        else if (sortField === 'cameras') { av = cameraCounts[a.id] || 0; bv = cameraCounts[b.id] || 0; }
        if (av < bv) return sortDirection === 'asc' ? -1 : 1;
        if (av > bv) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [locations, search, selectedTypes, sortField, sortDirection, cameraCounts]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const exportToExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Sedes');
      ws.columns = [
        { header: 'NOMBRE', key: 'name', width: 30 },
        { header: 'TIPO', key: 'type', width: 25 },
        { header: 'DIRECCIÓN', key: 'address', width: 40 },
        { header: 'CÁMARAS', key: 'cameras', width: 15 },
        { header: 'NOTAS', key: 'notes', width: 40 },
      ];
      ws.getRow(1).font = { bold: true, size: 12 };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      filtered.forEach(loc => ws.addRow({
        name: loc.name,
        type: typeLabels[loc.type] || loc.type,
        address: loc.address || '—',
        cameras: cameraCounts[loc.id] || 0,
        notes: loc.notes || '—'
      }));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Sedes_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
    } catch (e) { console.error('Error exportando Excel:', e); }
  };

  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['Nombre', 'Tipo', 'Dirección', 'Cámaras']],
        body: filtered.map(loc => [
          loc.name,
          typeLabels[loc.type] || loc.type,
          loc.address || '—',
          (cameraCounts[loc.id] || 0).toString()
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 40, 85] }
      });
      doc.save(`Sedes_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('Error exportando PDF:', e); }
  };

  const SortIcon = ({ field }: { field: string }) => sortField === field
    ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null;

  return (
    <div className="flex flex-col h-full bg-white font-sans min-h-screen relative overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
        <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-4">

          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
            <div className="absolute -top-3 -left-3">
              <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                {filtered.length} Sedes
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 relative group/search">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="BUSCAR SEDE, DIRECCIÓN O NOTAS..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 uppercase tracking-[0.1em]"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[220px]"
                >
                  <MapPin size={14} className="text-rose-500" />
                  <span className="truncate">{selectedTypes.length === 0 || selectedTypes.length === typeEntries.length ? 'Todos los tipos' : `${selectedTypes.length} tipos`}</span>
                  <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTypeDropdown && (
                  <div className="absolute top-full right-0 z-[70] mt-2 bg-white border border-slate-200 shadow-2xl min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[300px] overflow-y-auto">
                      <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTypes.length === typeEntries.length}
                          onChange={() => { setSelectedTypes(selectedTypes.length === typeEntries.length ? [] : typeEntries); setCurrentPage(1); }}
                          className="w-4 h-4 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                        />
                        <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest">Todos los tipos</span>
                      </label>
                      <div className="h-px bg-slate-100 my-1" />
                      {typeEntries.map(type => (
                        <label key={type} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type)}
                            onChange={() => { setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]); setCurrentPage(1); }}
                            className="w-4 h-4 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{typeLabels[type]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1 border border-slate-200">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400'}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400'}`}><List size={16} /></button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#002855]"></div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
              {paginatedData.map(loc => {
                const camCount = cameraCounts[loc.id] || 0;
                const isSelected = selectedIds.includes(loc.id);
                return (
                  <div
                    key={loc.id}
                    onClick={() => canEdit() && toggleSelect(loc.id)}
                    className={`bg-white rounded-none shadow-sm border transition-all duration-300 flex flex-col group overflow-hidden relative cursor-pointer hover:bg-slate-50/80 hover:border-blue-200/50 hover:shadow-md ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-100'}`}
                  >
                    {canEdit() && (
                      <div className="absolute top-4 left-4 z-20">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(loc.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm" />
                      </div>
                    )}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                    <div className="p-4 flex-1 relative z-10">
                      <div className="flex items-center gap-3 mb-4 pt-1">
                        <div className={`w-10 h-10 rounded-none flex items-center justify-center transition-all duration-300 ${canEdit() ? 'md:ml-8' : ''} bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20`}>
                          <MapPin size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-tight truncate leading-tight group-hover:text-blue-700 transition-colors">{loc.name}</h3>
                          <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest border mt-1 ${typeColors[loc.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                            {typeLabels[loc.type] || loc.type}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="p-2 rounded-none border bg-slate-50 border-slate-100">
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 ml-1">Dirección</label>
                          <p className="text-[9px] font-mono font-black text-slate-600 truncate">{loc.address || '—'}</p>
                        </div>
                        <div className={`p-2 rounded-none border transition-all ${camCount > 0 ? 'bg-emerald-50/20 border-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 ml-1">Cámaras</label>
                          <p className={`text-[9px] font-mono font-black ${camCount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{camCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex gap-2 z-10">
                      <button onClick={e => { e.stopPropagation(); setViewingLocation(loc); }} className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-200 rounded-none hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">Ficha</button>
                      {canEdit() && (
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); openEdit(loc); }} className="w-7 h-7 flex items-center justify-center text-amber-600 bg-white border border-amber-100 rounded-none hover:bg-amber-500 hover:text-white transition-all shadow-sm"><Edit size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); del(loc); }} className="w-7 h-7 flex items-center justify-center text-rose-500 bg-white border border-rose-100 rounded-none hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
              {/* Pagination Header */}
              <div className="bg-slate-50/50 border-b border-slate-100 relative z-20">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                >
                  {selectedIds.length > 0 && canEdit() && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                      <span className="hidden xl:block text-[10px] font-black text-rose-600 uppercase tracking-widest">{selectedIds.length} marcados</span>
                      <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-rose-600 transition-all shadow-sm active:scale-95" title="Eliminar seleccionados">
                        <Trash2 size={14} /><span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  )}
                </Pagination>
              </div>

              <div className="flex-1">
                {/* Mobile Accordion */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paginatedData.map(loc => {
                    const isExpanded = expandedId === loc.id;
                    const camCount = cameraCounts[loc.id] || 0;
                    const isSelected = selectedIds.includes(loc.id);
                    return (
                      <div key={loc.id} className={`bg-white overflow-hidden transition-all duration-300 ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <div className={`p-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                          <div className="flex items-center gap-4">
                            {canEdit() && (
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(loc.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded-md border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            )}
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : loc.id)}>
                              <div className="w-10 h-10 rounded-none flex items-center justify-center shadow-sm bg-slate-50 text-slate-400">
                                <MapPin size={18} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-[#002855] uppercase leading-tight">{loc.name}</span>
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">{typeLabels[loc.type] || loc.type}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown onClick={() => setExpandedId(isExpanded ? null : loc.id)} className={`text-slate-300 transition-transform duration-500 cursor-pointer ${isExpanded ? 'rotate-180' : ''}`} size={16} />
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-5 border-t border-slate-50/50 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-4 rounded-none border bg-slate-50 border-slate-100">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Dirección</label>
                                <span className="text-[11px] font-mono font-black text-[#002855]">{loc.address || '—'}</span>
                              </div>
                              <div className={`p-4 rounded-none border ${camCount > 0 ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Cámaras</label>
                                <span className={`text-[11px] font-mono font-black ${camCount > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>{camCount}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setViewingLocation(loc)} className="flex-1 py-3 bg-[#002855] text-[10px] font-black uppercase tracking-wider text-white rounded-none shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Eye size={14} /> Ficha Técnica
                              </button>
                              {canEdit() && (
                                <div className="flex gap-2">
                                  <button onClick={() => openEdit(loc)} className="w-12 h-12 bg-white text-amber-600 rounded-none flex items-center justify-center border border-slate-100 shadow-sm active:scale-95 transition-all"><Edit size={14} /></button>
                                  <button onClick={() => del(loc)} className="w-12 h-12 bg-white text-rose-500 rounded-none flex items-center justify-center border border-slate-100 shadow-sm active:scale-95 transition-all"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-hidden relative group/table">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-5 text-left w-12">
                            {canEdit() && (
                              <input type="checkbox" checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                            )}
                          </th>
                          <th className="px-6 py-5 text-left">
                            <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span>
                              <SortIcon field="name" />
                            </button>
                          </th>
                          <th className="px-4 py-5 text-left">
                            <button onClick={() => handleSort('type')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tipo</span>
                              <SortIcon field="type" />
                            </button>
                          </th>
                          <th className="px-4 py-5 text-left">
                            <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Dirección</span>
                          </th>
                          <th className="px-4 py-5 text-left">
                            <button onClick={() => handleSort('cameras')} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Cámaras</span>
                              <SortIcon field="cameras" />
                            </button>
                          </th>
                          <th className="px-6 py-5 text-center">
                            <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedData.map(loc => {
                          const camCount = cameraCounts[loc.id] || 0;
                          return (
                            <tr
                              key={loc.id}
                              className={`hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0 ${selectedIds.includes(loc.id) ? 'bg-blue-50/50' : ''}`}
                              onDoubleClick={() => setViewingLocation(loc)}
                              onClick={() => canEdit() && toggleSelect(loc.id)}
                            >
                              <td className="px-6 py-5 text-left w-12">
                                <input type="checkbox" checked={selectedIds.includes(loc.id)} onChange={() => toggleSelect(loc.id)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                              </td>
                              <td className="px-6 py-5 font-bold text-left">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                    <MapPin size={14} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{loc.name}</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 md:hidden">{typeLabels[loc.type] || loc.type}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-left">
                                <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${typeColors[loc.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                  {typeLabels[loc.type] || loc.type}
                                </span>
                              </td>
                              <td className="px-4 py-5 text-left">
                                <span className="text-sm font-extrabold text-slate-600 truncate max-w-xs block">{loc.address || '—'}</span>
                              </td>
                              <td className="px-4 py-5 text-left">
                                <div className="flex flex-col">
                                  <span className={`text-[14px] font-mono font-black ${camCount > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>{camCount}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Instaladas</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={e => { e.stopPropagation(); setViewingLocation(loc); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm" title="Ver Ficha">
                                    <Eye size={14} />
                                  </button>
                                  {canEdit() && (
                                    <>
                                      <button onClick={e => { e.stopPropagation(); openEdit(loc); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Edit size={14} /></button>
                                      <button onClick={e => { e.stopPropagation(); del(loc); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Trash2 size={14} /></button>
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && canEdit() && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none w-full flex justify-center px-6">
          <div className="bg-[#002855]/95 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-black">{selectedIds.length}</div>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Marcadas</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-100 transition-colors">
                <Trash2 size={12} /> Eliminar lote
              </button>
              <button onClick={() => setSelectedIds([])} className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Location Form Modal */}
      {showForm && (
        <LocationForm
          onClose={() => { setShowForm(false); setEditing(undefined); }}
          onSave={async () => {
            await Promise.all([fetchLocations(), fetchCameraCounts()]);
            setShowForm(false);
            setEditing(undefined);
          }}
          editLocation={editing}
        />
      )}

      {/* Location Detail Modal */}
      {viewingLocation && (
        <div className="fixed inset-0 bg-[#001529]/95 backdrop-blur-sm flex items-center justify-center p-0 md:p-8 lg:p-12 z-[100] animate-in fade-in duration-200">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[95vh] max-w-3xl rounded-none md:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-white/20">
            {/* Header */}
            <div className="bg-[#001529] px-6 py-4 md:px-8 md:py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-2xl" />
              <div className="flex items-center gap-4 md:gap-6 relative z-10">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-none md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Building size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-[0.3em] leading-tight">Ficha de Sede</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    {viewingLocation.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setViewingLocation(undefined)} className="p-2 md:p-2.5 bg-white/5 hover:bg-rose-500 rounded-none md:rounded-xl transition-all text-white/40 hover:text-white border border-white/10 hover:border-rose-500 relative z-10">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {[
                  { label: 'Tipo de Sede', val: typeLabels[viewingLocation.type] || viewingLocation.type, icon: <MapPin size={18} />, color: 'blue' },
                  { label: 'Cámaras Instaladas', val: (cameraCounts[viewingLocation.id] || 0).toString(), icon: <Package size={18} />, color: 'emerald' },
                  { label: 'Usuarios Asignados', val: '—', icon: <Users size={18} />, color: 'purple' },
                ].map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-none border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-none bg-${item.color}-50 text-${item.color}-600 shrink-0`}>{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{item.label}</label>
                      <p className="text-sm font-black text-[#002855]">{item.val || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {viewingLocation.address && (
                <div className="bg-white border border-slate-100 rounded-none p-5 shadow-sm">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dirección</label>
                  <p className="text-sm font-bold text-[#002855]">{viewingLocation.address}</p>
                </div>
              )}

              {viewingLocation.notes && (
                <div className="bg-amber-50/30 rounded-none border border-amber-200/50 p-6 relative overflow-hidden">
                  <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />Observaciones
                  </h3>
                  <p className="text-sm font-medium text-amber-900/80 leading-relaxed italic border-l-2 border-amber-400 pl-4 py-1">
                    "{viewingLocation.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-slate-100 px-6 py-4 md:px-8 md:py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                {canEdit() && (
                  <button onClick={() => { setViewingLocation(undefined); openEdit(viewingLocation); }} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-none hover:bg-amber-500 hover:text-white transition-all uppercase tracking-widest">
                    <Edit size={14} /> Editar
                  </button>
                )}
              </div>
              <button onClick={() => setViewingLocation(undefined)} className="w-full sm:w-auto px-8 py-3 text-[11px] font-black text-white bg-[#002855] rounded-none md:rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95 uppercase tracking-widest">
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
