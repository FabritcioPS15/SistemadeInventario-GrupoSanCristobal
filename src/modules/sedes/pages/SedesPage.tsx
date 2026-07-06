import { useEffect, useState, useMemo } from 'react';
import { Trash2, MapPin, X, Building, ChevronUp, ChevronDown, Search, Plus, Filter } from 'lucide-react';
import FilterSelect from '../../../shared/components/ui/FilterSelect';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, Location } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthContext';
import LocationForm from '../forms/LocationForm';
import {
  ActionToolbar,
  ViewToggle,
  ExportButtons,
  LoadingSpinner,
  PrimaryButton,
  RowActions,
  Pagination,
} from '../../../shared/components/ui';
import DetailModal, {
  DetailModalHeader,
  DetailModalBody,
  StandardModalFooter,
  DetailModalGrid,
  DetailModalSection,
  DetailModalCard,
  DetailModalRow,
} from '../../../shared/components/ui/DetailModal';
import { useNotify } from '../../../shared/hooks/useNotify';

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
  const { confirm, error: notifyError } = useNotify();
  const [locations, setLocations] = useState<Location[]>([]);
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | undefined>();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'name' | 'type' | 'cameras'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    const confirmed = await confirm(`¿Eliminar sede "${loc.name}"?`, 'Eliminar Sede');
    if (!confirmed) return;
    const { error } = await supabase.from('locations').delete().eq('id', loc.id);
    if (error) return notifyError('Error al eliminar: ' + error.message);
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
    const confirmed = await confirm(`¿Eliminar ${selectedIds.length} sedes seleccionadas?`, 'Eliminación por Lote');
    if (!confirmed) return;
    const { error } = await supabase.from('locations').delete().in('id', selectedIds);
    if (!error) { setSelectedIds([]); await Promise.all([fetchLocations(), fetchCameraCounts()]); }
    else notifyError('Error al eliminar: ' + error.message);
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

  const renderSortableHeader = (label: string, sortKey: 'name' | 'type' | 'cameras') => {
    const isSorted = sortField === sortKey;
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-1.5 hover:text-[#002855] text-slate-400 transition-colors"
      >
        <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">{label}</span>
        {isSorted ? (
          <span className="text-[#002855] text-[10px]">
            {sortDirection === 'asc' ? '▲' : '▼'}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px] opacity-50">▲▼</span>
        )}
      </button>
    );
  };

  const SortIcon = ({ field }: { field: string }) => sortField === field
    ? (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null;

  return (
    <>
      <div className="flex flex-col h-full bg-[#f8fafc]">
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">

          <ActionToolbar
            totalItems={filtered.length}
            label="Sedes"
            searchComponent={
              <>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, dirección o notas..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
                />
              </>
            }
          >
            <FilterSelect
              icon={Filter}
              iconClassName="text-rose-500"
              value={selectedTypes.length === 1 ? selectedTypes[0] : ''}
              onChange={e => { const v = e.target.value as string; setSelectedTypes(v ? [v] : []); setCurrentPage(1); }}
              wrapperClassName="md:min-w-[220px]"
            >
              <option value="">TODOS LOS TIPOS</option>
              {typeEntries.map(type => (
                <option key={type} value={type}>{typeLabels[type]}</option>
              ))}
            </FilterSelect>

            <ViewToggle viewMode={viewMode} onChange={setViewMode} />

            {canEdit() && (
              <PrimaryButton icon={Plus} onClick={openCreate}>
                Nueva Sede
              </PrimaryButton>
            )}

            <ExportButtons onExportExcel={exportToExcel} onExportPDF={exportToPdf} />
          </ActionToolbar>

          {loading ? (
            <LoadingSpinner />
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

                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-2 z-10">
                      <RowActions
                        canEdit={canEdit()}
                        onEdit={(e) => { e.stopPropagation(); openEdit(loc); }}
                        onDelete={(e) => { e.stopPropagation(); del(loc); }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
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
                              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(loc.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 cursor-pointer" />
                            )}
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : loc.id)}>
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-slate-50 text-slate-400">
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
                              <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Dirección</label>
                                <span className="text-[11px] font-mono font-black text-[#002855]">{loc.address || '—'}</span>
                              </div>
                              <div className={`p-4 rounded-xl border ${camCount > 0 ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Cámaras</label>
                                <span className={`text-[11px] font-mono font-black ${camCount > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>{camCount}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <RowActions
                                canEdit={canEdit()}
                                onEdit={() => openEdit(loc)}
                                onDelete={() => del(loc)}
                              />
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
                      <thead className="bg-slate-50/70 border-b border-slate-200/80 backdrop-blur-sm">
                        <tr>
                          <th className="px-6 py-4 text-left w-12">
                            {canEdit() && (
                              <input type="checkbox" checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 cursor-pointer" />
                            )}
                          </th>
                          <th className="px-6 py-4 text-left">
                            {renderSortableHeader('Sede', 'name')}
                          </th>
                          <th className="px-4 py-4 text-left">
                            {renderSortableHeader('Tipo', 'type')}
                          </th>
                          <th className="px-4 py-4 text-left">
                            <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Dirección</span>
                          </th>
                          <th className="px-4 py-4 text-left">
                            {renderSortableHeader('Cámaras', 'cameras')}
                          </th>
                          <th className="px-6 py-4 text-center">
                            <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedData.map(loc => {
                          const camCount = cameraCounts[loc.id] || 0;
                          return (
                            <tr
                              key={loc.id}
                              className={`hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group relative border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/20 ${selectedIds.includes(loc.id) ? 'bg-blue-50/40' : ''}`}
                              onClick={() => { setSelectedLocation(loc); setShowDetails(true); if (canEdit()) toggleSelect(loc.id); }}
                            >
                              <td className="px-6 py-4 text-left w-12">
                                <input type="checkbox" checked={selectedIds.includes(loc.id)} onChange={() => toggleSelect(loc.id)} onClick={e => e.stopPropagation()} className="w-4 h-4 rounded border-slate-300 text-[#002855] focus:ring-[#002855]/30 cursor-pointer" />
                              </td>
                              <td className="px-6 py-4 font-bold text-left">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 group-hover:bg-[#002855] group-hover:text-white transition-all shadow-sm shrink-0">
                                    <MapPin size={16} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[13px] font-black text-[#002855] uppercase leading-none">{loc.name}</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 md:hidden">{typeLabels[loc.type] || loc.type}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-left">
                                <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded-full ${typeColors[loc.type] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                  {typeLabels[loc.type] || loc.type}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-left">
                                <span className="text-sm font-extrabold text-slate-600 truncate max-w-xs block leading-none">{loc.address || '—'}</span>
                              </td>
                              <td className="px-4 py-4 text-left">
                                <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${camCount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                  {camCount} Instaladas
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                                  <RowActions
                                    canEdit={canEdit()}
                                    onEdit={(e) => { e.stopPropagation(); openEdit(loc); }}
                                    onDelete={(e) => { e.stopPropagation(); del(loc); }}
                                  />
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

      {showDetails && selectedLocation && (
        <DetailModal maxWidth="5xl" onClose={() => setShowDetails(false)} closeOnBackdrop>
          <DetailModalHeader>
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
              <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                <Building size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-base md:text-[18px] font-black text-white uppercase tracking-tight leading-snug line-clamp-2 sm:line-clamp-1">
                  {selectedLocation.name}
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase tracking-wide mt-1 flex items-start sm:items-center gap-1.5">
                  <MapPin size={10} className="shrink-0 mt-0.5 sm:mt-0" />
                  <span className="line-clamp-2 sm:truncate">{typeLabels[selectedLocation.type] || selectedLocation.type}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all -mr-1"
              aria-label="Cerrar detalle"
            >
              <X size={22} />
            </button>
          </DetailModalHeader>

          <DetailModalBody>
            <DetailModalGrid layout="stack-until-xl">
              <DetailModalSection title="Información General">
                <DetailModalCard className="space-y-2.5 sm:space-y-3">
                  <DetailModalRow label="Tipo de Sede">
                    <span className={`inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${typeColors[selectedLocation.type] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {typeLabels[selectedLocation.type] || selectedLocation.type}
                    </span>
                  </DetailModalRow>
                  <DetailModalRow label="Cámaras Instaladas">
                    <span className="text-[10px] sm:text-[11px] font-black text-[#002855]">{cameraCounts[selectedLocation.id] || 0} CÁMARAS</span>
                  </DetailModalRow>
                </DetailModalCard>

                <DetailModalCard className="space-y-2.5 sm:space-y-3">
                  <DetailModalRow label="Dirección">
                    <span className="text-[10px] sm:text-[11px] font-black text-slate-700 break-words">
                      {selectedLocation.address || '—'}
                    </span>
                  </DetailModalRow>
                </DetailModalCard>
              </DetailModalSection>

              {selectedLocation.notes && (
                <DetailModalSection title="Observaciones">
                  <DetailModalCard className="bg-amber-50 border-amber-100">
                    <p className="text-[10px] sm:text-[11px] font-medium text-amber-900 leading-relaxed">
                      {selectedLocation.notes}
                    </p>
                  </DetailModalCard>
                </DetailModalSection>
              )}
            </DetailModalGrid>
          </DetailModalBody>

          <StandardModalFooter
            onClose={() => setShowDetails(false)}
            onEdit={canEdit() ? () => { setShowDetails(false); openEdit(selectedLocation); } : undefined}
            editLabel="Editar Sede"
          />
        </DetailModal>
      )}
    </>
  );
}