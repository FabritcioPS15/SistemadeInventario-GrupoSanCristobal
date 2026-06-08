import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, LayoutGrid, List, MapPin, Search, Map, Calendar, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/ui/Pagination';
import { supabase, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PlanoDefensaCivil = {
  id: string;
  nombre: string;
  tipo: string;
  ubicacion_id: string;
  fecha_actualizacion: string;
  estado: 'vigente' | 'actualizado' | 'pendiente';
  descripcion?: string;
  archivo_url?: string;
  created_at: string;
  updated_at: string;
  locations?: Location;
};

export default function PlanosDefensaCivil() {
  const { canEdit } = useAuth();
  const [planos, setPlanos] = useState<PlanoDefensaCivil[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'nombre' | 'tipo' | 'fecha_actualizacion' | 'ubicacion'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchPlanos(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

  const fetchPlanos = async () => {
    const { data, error } = await supabase.from('planos_defensa_civil').select('*, locations(*)').order('created_at', { ascending: false });
    if (!error && data) {
      setPlanos(data as PlanoDefensaCivil[]);
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const sortedPlanos = [...planos].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortField) {
      case 'nombre':
        aValue = a.nombre || '';
        bValue = b.nombre || '';
        break;
      case 'tipo':
        aValue = a.tipo || '';
        bValue = b.tipo || '';
        break;
      case 'fecha_actualizacion':
        aValue = a.fecha_actualizacion ? new Date(a.fecha_actualizacion).getTime() : 0;
        bValue = b.fecha_actualizacion ? new Date(b.fecha_actualizacion).getTime() : 0;
        break;
      case 'ubicacion':
        aValue = a.locations?.name || '';
        bValue = b.locations?.name || '';
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filtered = sortedPlanos.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch = p.nombre?.toLowerCase().includes(q) ||
      p.tipo?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.locations?.name?.toLowerCase().includes(q);

    const matchesLocation = selectedLocations.length === 0 ||
      selectedLocations.length === locations.length ||
      selectedLocations.includes(p.ubicacion_id || '');

    return matchesSearch && matchesLocation;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: 'nombre' | 'tipo' | 'fecha_actualizacion' | 'ubicacion') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const renderStatus = (plano: PlanoDefensaCivil) => {
    const dateStr = new Date(plano.fecha_actualizacion).toLocaleDateString('es-PE');

    if (plano.estado === 'pendiente') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
            <AlertTriangle size={11} className="text-rose-500 shrink-0" />
            Pendiente
          </span>
          <span className="text-[10px] font-black text-rose-600/80 ml-1">{dateStr}</span>
        </div>
      );
    }

    if (plano.estado === 'actualizado') {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
            <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
            Actualizado
          </span>
          <span className="text-[10px] font-bold text-slate-500 ml-1">{dateStr}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
          <CheckCircle2 size={11} className="text-blue-500 shrink-0" />
          Vigente
        </span>
        <span className="text-[10px] font-bold text-slate-500 ml-1">{dateStr}</span>
      </div>
    );
  };

  const downloadReport = () => {
    const headers = ['Nombre', 'Tipo', 'Ubicación', 'Fecha Actualización', 'Estado', 'Descripción'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(p => [
        `"${p.nombre || ''}"`,
        `"${p.tipo || ''}"`,
        `"${p.locations?.name || ''}"`,
        `"${p.fecha_actualizacion ? new Date(p.fecha_actualizacion).toLocaleDateString('es-PE') : ''}"`,
        `"${p.estado || ''}"`,
        `"${p.descripcion || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `planos_defensa_civil_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadReportPdf = () => {
    const doc = new jsPDF();
    const tableData = filtered.map(p => [
      p.nombre || '',
      p.tipo || '',
      p.locations?.name || '',
      p.fecha_actualizacion ? new Date(p.fecha_actualizacion).toLocaleDateString('es-PE') : '',
      p.estado || '',
      p.descripcion || ''
    ]);

    autoTable(doc, {
      head: [['Nombre', 'Tipo', 'Ubicación', 'Actualización', 'Estado', 'Descripción']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 40, 85] }
    });

    doc.save(`planos_defensa_civil_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans min-h-screen relative overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
        <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-4">
          {/* Action Bar */}
          <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
            <div className="absolute -top-3 -left-3">
              <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                {filtered.length} Planos
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar por nombre, tipo o descripción..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </div>

            {/* Filters + Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest min-w-[220px]">
                <MapPin size={14} className="text-rose-500" />
                <select
                  value={selectedLocations[0] || ''}
                  onChange={e => { setSelectedLocations(e.target.value ? [e.target.value] : []); setCurrentPage(1); }}
                  className="bg-transparent outline-none cursor-pointer flex-1"
                >
                  <option value="">Todas las sedes</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

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

              {canEdit() && (
                <button
                  onClick={() => alert('Función para crear nuevo plano')}
                  className="flex items-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  Nuevo Plano
                </button>
              )}

              <button
                onClick={downloadReport}
                className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
                title="Exportar a Excel"
              >
                <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button
                onClick={downloadReportPdf}
                className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                title="Exportar a PDF"
              >
                <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#002855]"></div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedData.map(plano => (
                <div key={plano.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-xl transition-all p-6 flex flex-col group overflow-hidden hover:-translate-y-0.5 duration-200">
                  <div className="flex justify-between items-center mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 group-hover:bg-[#002855] group-hover:text-white transition-all shadow-sm">
                      <Map size={20} />
                    </div>
                    {renderStatus(plano)}
                  </div>

                  <div className="mb-4">
                    <h4 className="text-[14px] font-black text-slate-800 uppercase leading-none">{plano.nombre}</h4>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{plano.tipo}</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase">
                      <MapPin size={14} className="text-rose-500 shrink-0" />
                      <span className="truncate">{plano.locations?.name || 'Sede N/A'}</span>
                    </div>
                    {plano.descripcion && (
                      <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-semibold text-slate-600 line-clamp-2">{plano.descripcion}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150 mt-auto">
                    {canEdit() && (
                      <>
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
              <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 backdrop-blur-sm">
                      <th className="px-6 py-4 text-left">
                        <button
                          onClick={() => handleSort('nombre')}
                          className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Nombre</span>
                          {sortField === 'nombre' && (
                            sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left">
                        <button
                          onClick={() => handleSort('tipo')}
                          className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Tipo</span>
                          {sortField === 'tipo' && (
                            sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left">
                        <button
                          onClick={() => handleSort('ubicacion')}
                          className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Ubicación</span>
                          {sortField === 'ubicacion' && (
                            sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left">
                        <button
                          onClick={() => handleSort('fecha_actualizacion')}
                          className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                        >
                          <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Actualización</span>
                          {sortField === 'fecha_actualizacion' && (
                            sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left">
                        <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Estado</span>
                      </th>
                      <th className="px-6 py-4 text-center">
                        <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((plano) => (
                      <tr
                        key={plano.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group relative border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/20"
                      >
                        <td className="px-6 py-4 font-bold text-left">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-400 group-hover:bg-[#002855] group-hover:text-white transition-all shadow-sm">
                              <Map size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-black text-slate-800 uppercase leading-none">{plano.nombre}</span>
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{plano.tipo}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <span className="text-[12px] font-bold text-slate-700 uppercase">{plano.tipo}</span>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin size={14} className="text-rose-500 shrink-0" />
                            <span className="text-[12px] font-bold uppercase truncate max-w-xs block">{plano.locations?.name || 'Sede N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Calendar size={14} className="text-blue-500 shrink-0" />
                            <span className="text-[12px] font-black text-slate-800">
                              {plano.fecha_actualizacion ? new Date(plano.fecha_actualizacion).toLocaleDateString('es-PE') : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-left">
                          {renderStatus(plano)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
                            {canEdit() && (
                              <>
                                <button 
                                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                  title="Editar"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
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
          )}
        </div>
      </div>
    </div>
  );
}
