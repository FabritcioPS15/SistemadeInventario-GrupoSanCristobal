import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, MapPin, X, Eye, Globe, Copy, Activity, Server as ServerLucide, LayoutGrid, List, Star } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { GrServerCluster as ServerIcon } from 'react-icons/gr';
import { supabase, Server, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ServerForm from '../components/forms/ServerForm';

export default function Servers() {
  const { canEdit } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Server | undefined>();
  const [viewingServer, setViewingServer] = useState<Server | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchServers(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

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
    if (confirm(`¿Eliminar servidor "${s.name}"?`)) { await supabase.from('servers').delete().eq('id', s.id); await fetchServers(); }
  };

  const filtered = servers.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = s.name?.toLowerCase().includes(q) || 
                        s.ip_address?.toLowerCase().includes(q) || 
                        s.anydesk_id?.toLowerCase().includes(q) || 
                        s.locations?.name?.toLowerCase().includes(q);
    
    const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(s.location_id || '');
    
    return matchesSearch && matchesLocation;
  });

  // Paginación
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filtered.slice(startIndex, startIndex + itemsPerPage);

  const resetPagination = () => {
    setCurrentPage(1);
  };

  
  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] font-sans min-h-screen">
      {/* Standard Executive Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <ServerLucide size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Infraestructura</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0] w-fit">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><List size={18} /></button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

          {canEdit() && (
            <button onClick={openCreate} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors" title="Nuevo Servidor"><Plus size={22} /></button>
          )}

          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"><Star size={18} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Bloque Unificado: Filtros + Estadísticas */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sección de Filtros */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-[#002855] uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Filtros de Búsqueda
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Búsqueda</label>
                  <input
                    type="text"
                    placeholder="Buscar servidores..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); resetPagination(); }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sedes</label>
                  <div className="relative">
                    <button
                      onClick={() => {
                        const dropdown = document.getElementById('location-dropdown');
                        dropdown?.classList.toggle('hidden');
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between bg-white"
                    >
                      <span className="text-sm">
                        {selectedLocations.length === 0 ? 'Todas las sedes' : `${selectedLocations.length} seleccionada(s)`}
                      </span>
                      <span className="text-gray-400 text-xs">▼</span>
                    </button>
                    <div id="location-dropdown" className="hidden absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                      <div className="p-2">
                        <label className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLocations.length === 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLocations([]);
                              }
                              resetPagination();
                            }}
                            className="rounded text-blue-600 w-4 h-4"
                          />
                          <span className="text-sm">Todas las sedes</span>
                        </label>
                        {locations.map((loc) => (
                          <label key={loc.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedLocations.includes(loc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLocations([...selectedLocations, loc.id]);
                                } else {
                                  setSelectedLocations(selectedLocations.filter(id => id !== loc.id));
                                }
                                resetPagination();
                              }}
                              className="rounded text-blue-600 w-4 h-4"
                            />
                            <span className="text-sm">{loc.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección de Estadísticas */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-[#002855] uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                Estadísticas
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total</p>
                      <p className="text-lg font-bold text-gray-900">{servers.length}</p>
                    </div>
                    <ServerLucide size={16} className="text-gray-400" />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Con IP</p>
                      <p className="text-lg font-bold text-blue-600">{servers.filter(s => s.ip_address).length}</p>
                    </div>
                    <Globe size={16} className="text-blue-400" />
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">AnyDesk</p>
                      <p className="text-lg font-bold text-emerald-600">{servers.filter(s => s.anydesk_id).length}</p>
                    </div>
                    <Activity size={16} className="text-emerald-400" />
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-2 border border-orange-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Filtrados</p>
                      <p className="text-lg font-bold text-orange-600">{filtered.length}</p>
                    </div>
                    <Star size={16} className="text-orange-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#002855]"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedData.map(srv => (
              <div key={srv.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden">
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                      <ServerIcon size={20} className="text-slate-600 group-hover:text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-[#002855] uppercase tracking-tight truncate">{srv.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 mt-0.5 uppercase">
                        <MapPin size={12} className="text-blue-500" /> {srv.locations?.name || 'Sede N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dirección IP</label>
                      <p className="text-xs text-[#002855] font-black font-mono">{srv.ip_address || '—'}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">AnyDesk ID</label>
                      <p className="text-xs text-[#002855] font-black font-mono">{srv.anydesk_id || '—'}</p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t flex gap-2">
                  <button 
                    onClick={() => setViewingServer(srv)} 
                    className="flex-1 py-2 text-[9px] font-black uppercase text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                  >
                    Detalles
                  </button>
                  {canEdit() && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEdit(srv)} 
                        className="p-2 text-blue-600 bg-white border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => del(srv)} 
                        className="p-2 text-rose-500 bg-white border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Paginación arriba de la tabla */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm mb-4">
                <div className="text-xs text-gray-600">
                  {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrentPage = pageNum === currentPage;
                      const showPage = pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                      
                      if (!showPage) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-6 h-6 text-xs font-medium rounded transition-colors ${
                            isCurrentPage 
                              ? 'bg-blue-600 text-white' 
                              : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60">
                      <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Servidor</th>
                      <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                      <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">IP LAN</th>
                      <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">AnyDesk</th>
                      <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedData.map(srv => (
                      <tr 
                        key={srv.id} 
                        className="hover:bg-blue-50/10 cursor-pointer transition-all group"
                        onDoubleClick={() => setViewingServer(srv)}
                      >
                        <td className="px-7 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                              <ServerIcon size={14} />
                            </div>
                            <div>
                              <p className="text-[12px] font-black text-slate-700 uppercase line-clamp-1">{srv.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{srv.locations?.name || 'S/D'}</p>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <Globe size={12} className="text-blue-400" />
                            <span className="text-[11px] font-mono font-black text-[#002855]">{srv.ip_address || '—'}</span>
                            {srv.ip_address && (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(srv.ip_address || ''); alert('IP copiada: ' + (srv.ip_address || '')); }}
                                className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                                title="Copiar IP"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <Activity size={12} className="text-emerald-400" />
                            <span className="text-[11px] font-mono font-black text-[#002855]">{srv.anydesk_id || '—'}</span>
                            {srv.anydesk_id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(srv.anydesk_id || ''); alert('AnyDesk copiado: ' + (srv.anydesk_id || '')); }}
                                className="p-1 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                                title="Copiar AnyDesk"
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setViewingServer(srv); }} 
                              className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg hover:bg-blue-50 transition-all" 
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </button>
                            {canEdit() && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openEdit(srv); }} 
                                  className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg hover:bg-blue-50 transition-all" 
                                  title="Editar servidor"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); del(srv); }} 
                                  className="p-2 text-slate-400 hover:text-rose-600 bg-red-50 rounded-lg hover:bg-red-50 transition-all" 
                                  title="Eliminar servidor"
                                >
                                  <Trash2 size={16} />
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

            {/* Paginación abajo de la tabla (solo si hay más de 5 páginas) */}
            {totalPages > 5 && (
              <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-6">
                <div className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filtered.length)} de {filtered.length} servidores
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      const isCurrentPage = pageNum === currentPage;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 text-sm font-medium rounded-lg transition-all ${
                            isCurrentPage 
                              ? 'bg-blue-600 text-white' 
                              : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
        <div className="fixed inset-0 bg-[#001529]/85 backdrop-blur-md flex items-center justify-center p-0 md:p-8 z-[100] animate-in fade-in duration-300">
          <div className="bg-white w-full h-full md:h-[85vh] max-w-6xl rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            {/* Header Corporativo (Cuadrado) */}
            <div className="bg-[#001529] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-500/10 rounded-none flex items-center justify-center border border-blue-500/20">
                  <ServerIcon size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] leading-tight">
                    Ficha Técnica del Servidor
                  </h2>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">
                    Host: {viewingServer.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.readText().then(text => {
                      alert('Portapapeles:\n\n' + text);
                    }).catch(() => {
                      alert('No se pudo acceder al portapapeles o está vacío');
                    });
                  }}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Pegar desde portapapeles"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => setViewingServer(undefined)} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-gray-50/50">
              {/* Section: Información General */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Información General
                  </h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nombre del Servidor</label>
                      <p className="text-lg font-black text-[#002855] uppercase">{viewingServer.name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ubicación</label>
                      <p className="text-lg font-black text-[#002855] uppercase">{viewingServer.locations?.name || 'No especificada'}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">IP LAN</label>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-mono font-black text-[#002855]">{viewingServer.ip_address || '—'}</p>
                        {viewingServer.ip_address && (
                          <button 
                            onClick={() => { 
                              navigator.clipboard.writeText(viewingServer.ip_address || ''); 
                              alert('IP copiada: ' + viewingServer.ip_address); 
                            }}
                            className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Copiar IP"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">AnyDesk</label>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-mono font-black text-[#002855]">{viewingServer.anydesk_id || '—'}</p>
                        {viewingServer.anydesk_id && (
                          <button 
                            onClick={() => { 
                              navigator.clipboard.writeText(viewingServer.anydesk_id || ''); 
                              alert('AnyDesk copiado: ' + viewingServer.anydesk_id); 
                            }}
                            className="p-1 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                            title="Copiar AnyDesk"
                          >
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Credenciales Windows */}
              {viewingServer.windows_credentials && viewingServer.windows_credentials.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100">
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      Credenciales Windows
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {viewingServer.windows_credentials.map((cred, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 group">
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{cred.description || 'Usuario'}</span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => { navigator.clipboard.writeText(cred.username || ''); }} 
                                className="text-gray-300 hover:text-blue-500 transition-colors" 
                                title="Copiar usuario"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm font-black text-[#002855] break-all mb-3">{cred.username}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] font-bold text-gray-400">Contraseña protegida</span>
                            </div>
                            <button 
                              onClick={() => {
                                const passInput = document.createElement('input');
                                passInput.value = cred.password || '';
                                document.body.appendChild(passInput);
                                passInput.select();
                                document.execCommand('copy');
                                document.body.removeChild(passInput);
                                alert('Contraseña copiada');
                              }} 
                              className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-tighter transition-all" 
                              title="Copiar contraseña"
                            >
                              Copiar Pass
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section: Notas */}
              {viewingServer.notes && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full" />
                      Notas del Servidor
                    </h3>
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-medium italic text-amber-950 leading-relaxed">"{viewingServer.notes}"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0">
              <button
                onClick={() => setViewingServer(undefined)}
                className="flex-1 py-3 text-sm font-bold text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
