import { useEffect, useState, useRef } from 'react';
import { Edit, Trash2, MapPin, X, Eye, Globe, Copy, Server as ServerLucide, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
import { GrServerCluster as ServerIcon } from 'react-icons/gr';
import { SiAnydesk } from "react-icons/si";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, Server, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ServerForm from '../components/forms/ServerForm';
import Pagination from '../components/Pagination';

export default function Servers() {
  const { canEdit } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Server | undefined>();
  const [viewingServer, setViewingServer] = useState<Server | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'name' | 'location' | 'ip' | 'anydesk' | 'updated_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchServers(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

  // Manejador para descarga de reporte
  useEffect(() => {
    const handleDownload = () => downloadServersReport();
    const handleDownloadPdf = () => downloadServersReportPdf();
    const handleNewServer = () => openCreate();
    const handleToggleView = () => setViewMode(prev => prev === 'grid' ? 'list' : 'grid');

    window.addEventListener('servers:download', handleDownload);
    window.addEventListener('servers:download-pdf', handleDownloadPdf);
    window.addEventListener('servers:new', handleNewServer);
    window.addEventListener('servers:toggle-view', handleToggleView);

    return () => {
      window.removeEventListener('servers:download', handleDownload);
      window.removeEventListener('servers:download-pdf', handleDownloadPdf);
      window.removeEventListener('servers:new', handleNewServer);
      window.removeEventListener('servers:toggle-view', handleToggleView);
    };
  }, [servers, locations, viewMode]);

  const fetchServers = async () => {
    const { data, error } = await supabase.from('servers').select('*, locations(*)').order('created_at', { ascending: false });
    if (!error && data) {
      setServers(data as Server[]);
      calculateStats(data as Server[]);
    }
  };

  const calculateStats = (srvData: Server[]) => {
    let withIp = 0, withAnydesk = 0, recentlyUpdated = 0;
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    srvData.forEach(s => {
      if (s.ip_address) withIp++;
      if (s.anydesk_id) withAnydesk++;
      if (new Date(s.updated_at) > oneWeekAgo) recentlyUpdated++;
    });
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const openCreate = () => { setEditing(undefined); setShowForm(true); };
  const openEdit = (s: Server) => { setEditing(s); setShowForm(true); };

  const del = async (s: Server) => {
    if (confirm(`¿Eliminar servidor "${s.name}"?`)) {
      await supabase.from('servers').delete().eq('id', s.id);
      setSelectedIds(prev => prev.filter(id => id !== s.id));
      await fetchServers();
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (confirm(`¿Eliminar ${selectedIds.length} servidores seleccionados?`)) {
      const { error } = await supabase.from('servers').delete().in('id', selectedIds);
      if (!error) {
        setSelectedIds([]);
        await fetchServers();
      } else {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  const handleSort = (field: 'name' | 'location' | 'ip' | 'anydesk' | 'updated_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    resetPagination();
  };

  const sortedServers = [...servers].sort((a, b) => {
    let aValue: string | number = '';
    let bValue: string | number = '';

    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'location':
        aValue = a.locations?.name || '';
        bValue = b.locations?.name || '';
        break;
      case 'ip':
        aValue = a.ip_address || '';
        bValue = b.ip_address || '';
        break;
      case 'anydesk':
        aValue = a.anydesk_id || '';
        bValue = b.anydesk_id || '';
        break;
      case 'updated_at':
        aValue = new Date(a.updated_at).getTime();
        bValue = new Date(b.updated_at).getTime();
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const filtered = sortedServers.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = s.name?.toLowerCase().includes(q) ||
      s.ip_address?.toLowerCase().includes(q) ||
      s.anydesk_id?.toLowerCase().includes(q) ||
      s.locations?.name?.toLowerCase().includes(q);

    const matchesLocation = selectedLocations.length === 0 ||
      selectedLocations.length === locations.length ||
      selectedLocations.includes(s.location_id || '');

    return matchesSearch && matchesLocation;
  });

  // Paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const resetPagination = () => {
    setCurrentPage(1);
  };

  const downloadServersReport = () => {
    // Crear contenido CSV
    const headers = ['Nombre', 'Ubicación', 'IP', 'AnyDesk', 'Usuario', 'Última Actualización'];
    const csvContent = [
      headers.join(','),
      ...filtered.map(server => [
        `"${server.name || ''}"`,
        `"${server.locations?.name || 'VIRTUAL'}"`,
        `"${server.ip_address || ''}"`,
        `"${server.anydesk_id || ''}"`,
        `"${server.username || ''}"`,
        `"${new Date(server.updated_at).toLocaleDateString()}"`
      ].join(','))
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `servidores_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadServersReportPdf = () => {
    const doc = new jsPDF();
    const tableData = filtered.map(s => [
      s.name || '',
      s.locations?.name || 'VIRTUAL',
      s.ip_address || '',
      s.anydesk_id || '',
      new Date(s.updated_at).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: [['Nombre', 'Ubicación', 'IP', 'AnyDesk', 'Última Actualización']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 40, 85] }
    });

    doc.save(`servidores_${new Date().toISOString().split('T')[0]}.pdf`);
  };


  return (
    <div className="flex flex-col h-full bg-white font-sans min-h-screen relative overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
        <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-4">
          {/* Barra de Acciones Rediseñada */}
          <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 group shadow-sm hover:shadow-md transition-all relative">
            {/* Badge de Conteo - Esquina Superior Izquierda */}
            <div className="absolute -top-3 -left-3">
              <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                {filtered.length} Instancias
              </div>
            </div>

            {/* Búsqueda Principal (Lado Izquierdo) */}
            <div className="flex-1 relative group/search">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="BUSCAR SERVIDOR, IP, ID O SEDE..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPagination(); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 uppercase tracking-[0.1em]"
              />
            </div>

            {/* Controles de Filtrado (Lado Derecho) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sedes */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[280px]"
                >
                  <MapPin size={14} className="text-rose-500" />
                  <span className="truncate">{selectedLocations.length === 0 || selectedLocations.length === locations.length ? 'Todas las sedes' : `${selectedLocations.length} Sedes`}</span>
                  <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showLocationDropdown && (
                  <div className="absolute top-full right-0 z-[70] mt-2 bg-white border border-slate-200 shadow-2xl min-w-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 max-h-[300px] overflow-y-auto">
                      <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer group/loc">
                        <input
                          type="checkbox"
                          checked={selectedLocations.length === locations.length}
                          onChange={() => { setSelectedLocations(selectedLocations.length === locations.length ? [] : locations.map(l => l.id)); resetPagination(); }}
                          className="w-4 h-4 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
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
                              resetPagination();
                            }}
                            className="w-4 h-4 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover/loc:text-[#002855]">{loc.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Vistas */}
              <div className="flex bg-slate-100 p-1 border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400'}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#002855]"></div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
              {paginatedData.map(srv => {
                const hasIp = !!srv.ip_address;
                const hasAnydesk = !!srv.anydesk_id;

                const isSelected = selectedIds.includes(srv.id);

                return (
                  <div
                    key={srv.id}
                    onClick={() => canEdit() && toggleSelect(srv.id)}
                    className={`bg-white rounded-none shadow-sm border transition-all duration-300 flex flex-col group overflow-hidden relative cursor-pointer hover:bg-slate-50/80 hover:border-blue-200/50 hover:shadow-md ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-100'}`}
                  >
                    {canEdit() && (
                      <div className="absolute top-4 left-4 z-20">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(srv.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
                        />
                      </div>
                    )}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-colors" />

                    <div className="p-4 flex-1 relative z-10">
                      <div className="flex items-center gap-3 mb-4 pt-1">
                        <div className={`w-10 h-10 rounded-none flex items-center justify-center transition-all duration-300 ${canEdit() ? 'md:ml-8' : ''} bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20`}>
                          <ServerIcon size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-tight truncate leading-tight group-hover:text-blue-700 transition-colors">{srv.name}</h3>
                          <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 mt-0.5 uppercase">
                            <MapPin size={9} className="text-rose-500" /> {srv.locations?.name || 'VIRTUAL'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`p-2 rounded-none border transition-all ${hasIp ? 'bg-emerald-50/20 border-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 ml-1">LAN</label>
                          <p className={`text-[9px] font-mono font-black ${hasIp ? 'text-emerald-700' : 'text-slate-400'}`}>{srv.ip_address || '—'}</p>
                        </div>

                        <div className={`p-2 rounded-none border transition-all ${hasAnydesk ? 'bg-blue-50/20 border-blue-100/50' : 'bg-slate-50 border-slate-100'}`}>
                          <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5 ml-1">AnyDesk</label>
                          <p className={`text-[9px] font-mono font-black ${hasAnydesk ? 'text-blue-700' : 'text-slate-400'}`}>{srv.anydesk_id || '—'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex gap-2 z-10">
                      <button
                        onClick={() => setViewingServer(srv)}
                        className="flex-1 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-600 bg-white border border-slate-200 rounded-none hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                      >
                        Ficha
                      </button>
                      {canEdit() && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(srv)}
                            className="w-7 h-7 flex items-center justify-center text-amber-600 bg-white border border-amber-100 rounded-none hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => del(srv)}
                            className="w-7 h-7 flex items-center justify-center text-rose-500 bg-white border border-rose-100 rounded-none hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
              {/* Paginación Pegada a la Vista (Header de la Tabla) */}
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
                      <span className="hidden xl:block text-[10px] font-black text-rose-600 uppercase tracking-widest">
                        {selectedIds.length} marcados
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-3 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-rose-600 transition-all shadow-sm active:scale-95"
                        title="Eliminar seleccionados"
                      >
                        <Trash2 size={14} />
                        <span className="hidden sm:inline">Eliminar</span>
                      </button>
                    </div>
                  )}
                </Pagination>
              </div>

              <div className="flex-1">
                {/* Vista Mobile Accordion */}
                <div className="md:hidden divide-y divide-slate-100">
                  {paginatedData.map(srv => {
                    const isExpanded = expandedId === srv.id;
                    const hasIp = !!srv.ip_address;
                    const hasAnydesk = !!srv.anydesk_id;
                    const isSelected = selectedIds.includes(srv.id);

                    return (
                      <div key={srv.id} className={`bg-white overflow-hidden transition-all duration-300 ${isSelected ? 'bg-blue-50/30' : ''}`}>
                        <div
                          className={`p-5 flex items-center justify-between transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            {canEdit() && (
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(srv.id)}
                                onChange={() => toggleSelect(srv.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded-md border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                              />
                            )}
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : srv.id)}>
                              <div className="w-10 h-10 rounded-none flex items-center justify-center shadow-sm bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <ServerIcon size={18} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-[#002855] uppercase leading-tight">{srv.name}</span>
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">{srv.locations?.name || 'VIRTUAL'}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown
                            onClick={() => setExpandedId(isExpanded ? null : srv.id)}
                            className={`text-slate-300 transition-transform duration-500 cursor-pointer ${isExpanded ? 'rotate-180' : ''}`}
                            size={16}
                          />
                        </div>

                        {isExpanded && (
                          <div className="px-5 pb-5 space-y-5 border-t border-slate-50/50 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                              <div className={`p-4 rounded-none border ${hasIp ? 'bg-emerald-50/30 border-emerald-100/50' : 'bg-slate-50 border-slate-100'}`}>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Red Interna</label>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[11px] font-mono font-black ${hasIp ? 'text-[#002855]' : 'text-slate-300'}`}>{srv.ip_address || '—'}</span>
                                  {hasIp && <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(srv.ip_address!); }} className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400 active:scale-95 transition-all"><Copy size={12} /></button>}
                                </div>
                              </div>
                              <div className={`p-4 rounded-none border ${hasAnydesk ? 'bg-blue-50/30 border-blue-100/50' : 'bg-slate-50 border-slate-100'}`}>
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">ID Remoto</label>
                                <div className="flex items-center justify-between">
                                  <span className={`text-[11px] font-mono font-black ${hasAnydesk ? 'text-red-600' : 'text-slate-300'}`}>{srv.anydesk_id || '—'}</span>
                                  {hasAnydesk && <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(srv.anydesk_id!); }} className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400 active:scale-95 transition-all"><Copy size={12} /></button>}
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => setViewingServer(srv)}
                                className="flex-1 py-3 bg-[#002855] text-[10px] font-black uppercase tracking-wider text-white rounded-none shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Eye size={14} /> Ficha Técnica
                              </button>
                              {canEdit() && (
                                <div className="flex gap-2">
                                  <button onClick={() => openEdit(srv)} className="w-12 h-12 bg-white text-amber-600 rounded-none flex items-center justify-center border border-slate-100 shadow-sm active:scale-95 transition-all">
                                    <Edit size={14} />
                                  </button>
                                  <button onClick={() => del(srv)} className="w-12 h-12 bg-white text-rose-500 rounded-none flex items-center justify-center border border-slate-100 shadow-sm active:scale-95 transition-all">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Vista Desktop Table */}
                <div className="hidden md:block overflow-hidden relative group/table">

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-5 text-left w-12">
                            {canEdit() && (
                              <input
                                type="checkbox"
                                checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                                onChange={toggleSelectAll}
                                className="w-3.5 h-3.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                              />
                            )}
                          </th>
                          <th className="px-6 py-5 text-left">
                            <button
                              onClick={() => handleSort('name')}
                              className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                            >
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Servidor</span>
                              {sortField === 'name' && (
                                sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-5 text-left">
                            <button
                              onClick={() => handleSort('location')}
                              className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                            >
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Ubicación</span>
                              {sortField === 'location' && (
                                sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-5 text-left">
                            <button
                              onClick={() => handleSort('ip')}
                              className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                            >
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">IP</span>
                              {sortField === 'ip' && (
                                sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-5 text-left">
                            <button
                              onClick={() => handleSort('anydesk')}
                              className="flex items-center justify-start gap-2 hover:text-blue-600 transition-colors"
                            >
                              <SiAnydesk size={12} className="text-red-500" />
                              <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">AnyDesk</span>
                              {sortField === 'anydesk' && (
                                sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className="px-6 py-5 text-center">
                            <span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((srv) => {
                          const hasIp = !!srv.ip_address;
                          const hasAnydesk = !!srv.anydesk_id;

                          return (
                            <tr
                              key={srv.id}
                              className={`hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0 ${selectedIds.includes(srv.id) ? 'bg-blue-50/50' : ''}`}
                              onDoubleClick={() => setViewingServer(srv)}
                              onClick={() => canEdit() && toggleSelect(srv.id)}
                            >
                              <td className="px-6 py-5 text-left w-12">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(srv.id)}
                                  onChange={() => toggleSelect(srv.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3.5 h-3.5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-5 font-bold text-left">
                                <div className="flex items-center justify-start gap-3">
                                  <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                    <ServerIcon size={14} />
                                  </div>
                                  <div className="flex flex-col items-start">
                                    <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{srv.name}</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 md:hidden">{srv.locations?.name || 'VIRTUAL'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-left">
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-extrabold text-slate-600 uppercase tracking-wider">{srv.locations?.name || 'VIRTUAL'}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Sede Física</span>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-left">
                                <div className="flex flex-col items-start group/cell">
                                  <div className="flex items-center justify-start gap-2">
                                    <span className={`text-[14px] font-mono font-black ${hasIp ? 'text-[#002855]' : 'text-slate-300'}`}>{srv.ip_address || '—'}</span>
                                    {hasIp && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(srv.ip_address!);
                                        }}
                                        className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-300 hover:text-blue-500 transition-all opacity-0 group-hover/cell:opacity-100"
                                        title="Copiar IP"
                                      >
                                        <Copy size={13} />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">Red Interna</span>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-left">
                                <div className="flex flex-col items-start group/cell">
                                  <div className="flex items-center justify-start gap-2">
                                    <span className={`text-[14px] font-mono font-black ${hasAnydesk ? 'text-red-600' : 'text-slate-300'}`}>{srv.anydesk_id || '—'}</span>
                                    {hasAnydesk && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(srv.anydesk_id!);
                                        }}
                                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover/cell:opacity-100"
                                        title="Copiar AnyDesk"
                                      >
                                        <Copy size={13} />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">ID Remoto</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setViewingServer(srv); }}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm group/btn"
                                    title="Ver Ficha"
                                  >
                                    <Eye size={14} className="group-hover/btn:scale-110 transition-transform" />
                                  </button>
                                  {canEdit() && (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); openEdit(srv); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm group/btn" title="Editar"><Edit size={14} className="group-hover/btn:scale-110 transition-transform" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); del(srv); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm group/btn" title="Eliminar"><Trash2 size={14} className="group-hover/btn:scale-110 transition-transform" /></button>
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

      {selectedIds.length > 0 && canEdit() && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none w-full flex justify-center px-6">
          <div className="bg-[#002855]/95 backdrop-blur-md text-white px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/10 pointer-events-auto">
            <div className="flex items-center gap-2 pr-4 border-r border-white/10">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-black">
                {selectedIds.length}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Marcados</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-100 transition-colors"
              >
                <Trash2 size={12} /> Eliminar lote
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ServerForm
          onClose={() => setShowForm(false)}
          onSave={() => {
            fetchServers();
            setShowForm(false);
            setEditing(undefined);
          }}
          editServer={editing}
        />
      )}

      {viewingServer && (
        <div className="fixed inset-0 bg-[#001529]/95 backdrop-blur-sm flex items-center justify-center p-0 md:p-8 lg:p-12 z-[100] animate-in fade-in duration-200">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[95vh] max-w-7xl rounded-none md:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 border border-white/20">
            {/* Header Corporativo Premium */}
            <div className="bg-[#001529] px-6 py-4 md:px-8 md:py-6 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-blue-500/10 rounded-full -mr-32 -mt-32 md:-mr-48 md:-mt-48 blur-2xl md:blur-3xl" />

              <div className="flex items-center gap-4 md:gap-6 relative z-10">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-none md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <ServerIcon size={24} className="text-white md:hidden" />
                  <ServerIcon size={32} className="text-white hidden md:block" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-[0.3em] leading-tight">
                    Ficha Técnica
                  </h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Instancia: {viewingServer.name}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingServer(undefined)}
                className="p-2 md:p-2.5 bg-white/5 hover:bg-rose-500 rounded-none md:rounded-xl transition-all text-white/40 hover:text-white border border-white/10 hover:border-rose-500 relative z-10"
              >
                <X size={18} className="md:hidden" />
                <X size={20} className="hidden md:block" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50">
              {/* Grid Principal: Info Crítica */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {[
                  { label: 'Direccionamiento LAN', val: viewingServer.ip_address, icon: <Globe size={18} />, color: 'emerald', copy: viewingServer.ip_address },
                  { label: 'Identificador AnyDesk', val: viewingServer.anydesk_id, icon: <SiAnydesk size={18} />, color: 'red', copy: viewingServer.anydesk_id },
                  { label: 'Ubicación Física', val: viewingServer.locations?.name || 'N/A', icon: <MapPin size={18} />, color: 'slate' },
                ].map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-none border border-slate-100 shadow-sm group/card transition-all hover:shadow-lg flex items-center gap-4">
                    <div className={`p-3 rounded-none bg-${item.color}-50 text-${item.color}-600 shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{item.label}</label>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-black text-[#002855] truncate">{item.val || '—'}</p>
                        {item.copy && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(item.copy || ''); alert('Copiado: ' + item.copy); }}
                            className="text-slate-300 hover:text-blue-500 transition-colors shrink-0"
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sección de Credenciales con Diseño de "Tarjetas de Acceso" */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 ml-2">
                  <div className="w-8 h-1 bg-emerald-500 rounded-full" />
                  <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.3em]">Acceso Principal</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border-2 border-slate-100 rounded-none p-8 relative overflow-hidden group/cred transition-all hover:shadow-2xl">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Usuario Principal</label>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <p className="text-sm font-black text-[#002855]">{viewingServer.username || '—'}</p>
                          {viewingServer.username && <button onClick={() => { navigator.clipboard.writeText(viewingServer.username || ''); }} className="text-slate-300 hover:text-emerald-500 transition-all"><Copy size={16} /></button>}
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contraseña Principal</label>
                        <div className="flex items-center justify-between py-2 border-b border-slate-50">
                          <p className="text-sm font-black text-slate-300 tracking-[0.4em] select-none">••••••••••••</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(viewingServer.password || '');
                              alert('Password copiado al portapapeles');
                            }}
                            className="text-[10px] font-black text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-none transition-all uppercase"
                          >
                            Obtener
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {viewingServer.windows_credentials && viewingServer.windows_credentials.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-2">
                    <div className="w-8 h-1 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.3em]">Credenciales de Seguridad (Windows)</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {viewingServer.windows_credentials.map((cred, i) => (
                      <div key={i} className="bg-white border-2 border-slate-100 hover:border-blue-500/20 rounded-none p-8 relative overflow-hidden group/cred transition-all hover:shadow-2xl">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/cred:opacity-20 transition-opacity">
                          <ServerLucide size={64} />
                        </div>

                        <div className="flex justify-between items-start mb-6">
                          <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-none text-[9px] font-black uppercase tracking-widest">
                            {cred.description || 'ACCESO'}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Usuario</label>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                              <p className="text-sm font-black text-[#002855]">{cred.username}</p>
                              <button onClick={() => { navigator.clipboard.writeText(cred.username || ''); }} className="text-slate-300 hover:text-blue-500 transition-all"><Copy size={16} /></button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Clave de Acceso</label>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                              <p className="text-sm font-black text-slate-300 tracking-[0.4em] select-none">••••••••••••</p>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(cred.password || '');
                                  alert('Password copiado al portapapeles');
                                }}
                                className="text-[10px] font-black text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-none transition-all uppercase"
                              >
                                Obtener
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sección de Notas: Diseño Estilo Post-it Corporativo */}
              {viewingServer.notes && (
                <div className="bg-amber-50/30 rounded-none border border-amber-200/50 p-6 relative overflow-hidden group/notes">
                  <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    Observaciones
                  </h3>
                  <p className="text-sm font-medium text-amber-900/80 leading-relaxed italic border-l-2 border-amber-400 pl-4 py-1">
                    "{viewingServer.notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer Premium */}
            <div className="bg-white border-t border-slate-100 px-6 py-4 md:px-8 md:py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Última Actualización: {new Date(viewingServer.updated_at).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setViewingServer(undefined)}
                className="w-full sm:w-auto px-8 py-3 text-[10px] md:text-[11px] font-black text-white bg-[#002855] rounded-none md:rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/10 active:scale-95 uppercase tracking-widest"
              >
                Finalizar Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
