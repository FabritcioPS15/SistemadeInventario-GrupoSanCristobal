import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, X, Activity, Server as ServerLucide, LayoutGrid, List, MapPin, Star, Globe, Eye } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { api } from '../lib/api';
import { GrServerCluster as ServerIcon } from 'react-icons/gr';
import { Server, Location, supabase, ResourceCredential } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ViewHeader from '../components/ViewHeader';

export default function Servers() {
  const { canEdit } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Server | undefined>();
  const [form, setForm] = useState({ name: '', location_id: '', ip_address: '', anydesk_id: '', anydesk_password: '', username: '', password: '', notes: '', resource_credentials: [] as any[] }
  );
  const [stats, setStats] = useState({ total: 0, withIp: 0, withAnydesk: 0, recentlyUpdated: 0 });

  const [viewingServer, setViewingServer] = useState<Server | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchServers(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

  const fetchServers = async () => {
    const { data, error } = await supabase
      .from('servers')
      .select('*, locations(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching servers:', error);
      return;
    }

    // Fetch credentials separately
    const { data: credentials, error: credError } = await supabase
      .from('resource_credentials')
      .select('*')
      .eq('resource_type', 'server');

    if (credError) {
      console.error('Error fetching server credentials:', credError);
    }

    if (data) {
      const serversWithCreds = data.map((server: any) => ({
        ...server,
        resource_credentials: credentials?.filter((c: ResourceCredential) => c.resource_id === server.id) || []
      }));
      setServers(serversWithCreds as Server[]);
      calculateStats(serversWithCreds as Server[]);
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
    setStats({ total: srvData.length, withIp, withAnydesk, recentlyUpdated });
  };

  const fetchLocations = async () => {
    const { data } = await api.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const resetForm = () => { setForm({ name: '', location_id: '', ip_address: '', anydesk_id: '', anydesk_password: '', username: '', password: '', notes: '', resource_credentials: [] }); };
  const openCreate = () => { setEditing(undefined); resetForm(); setShowForm(true); };
  const openEdit = (s: Server) => { setEditing(s); setForm({ name: s.name || '', location_id: s.location_id || '', ip_address: s.ip_address || '', anydesk_id: s.anydesk_id || '', anydesk_password: s.anydesk_password || '', username: s.username || '', password: s.password || '', notes: s.notes || '', resource_credentials: s.resource_credentials || [] }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const { resource_credentials, ...serverData } = form;
    const payload = { ...serverData, updated_at: new Date().toISOString() };

    let serverId = editing?.id;
    if (editing) {
      await api.from('servers').update(payload).eq('id', editing.id);
    } else {
      const { data } = await api.from('servers').insert(payload as any).select().single();
      if (data) serverId = data.id;
    }

    if (serverId) {
      await api.from('resource_credentials').delete().eq('resource_id', serverId).eq('resource_type', 'server');
      if (resource_credentials.length > 0) {
        await api.from('resource_credentials').insert(
          resource_credentials.map(c => ({ ...c, resource_id: serverId, resource_type: 'server' }))
        );
      }
    }

    setShowForm(false); await fetchServers();
  };

  const del = async (s: Server) => {
    if (confirm(`¿Eliminar servidor "${s.name}"?`)) { await api.from('servers').delete().eq('id', s.id); await fetchServers(); }
  };

  const filtered = servers.filter(s => {
    const q = search.toLowerCase();
    const matchMain = s.name?.toLowerCase().includes(q) || s.ip_address?.toLowerCase().includes(q) || s.anydesk_id?.toLowerCase().includes(q) || s.locations?.name?.toLowerCase().includes(q) || s.username?.toLowerCase().includes(q);
    const matchExtras = s.resource_credentials?.some(c => c.label?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q)) || false;
    return matchMain || matchExtras;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] font-sans">
      <ViewHeader
        icon={<ServerLucide size={20} />}
        title="Infraestructura"
        subtitle="Data Center y Recursos"
        isHeaderVisible={isHeaderVisible}
        searchTerm={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, IP, AnyDesk o sede..."
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Con IP', value: stats.withIp, color: 'text-emerald-600' },
          { label: 'AnyDesk', value: stats.withAnydesk, color: 'text-rose-600' },
          { label: 'Actualizados', value: stats.recentlyUpdated, color: 'text-amber-600' }
        ]}
      >
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
      </ViewHeader>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">


        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#002855]"></div></div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(srv => (
              <div key={srv.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden">
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors"><ServerIcon size={20} className="text-slate-600 group-hover:text-blue-600" /></div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-[#002855] uppercase tracking-tight truncate">{srv.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 mt-0.5 uppercase"><MapPin size={12} className="text-blue-500" /> {srv.locations?.name || 'Sede N/A'}</div>
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
                  <button onClick={() => setViewingServer(srv)} className="flex-1 py-2 text-[9px] font-black uppercase text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Detalles</button>
                  {canEdit() && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(srv)} className="p-2 text-blue-600 bg-white border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit size={14} /></button>
                      <button onClick={() => del(srv)} className="p-2 text-rose-500 bg-white border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e2e8f0]">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Servidor / Hostname</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Sede</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Red (IP / AnyDesk)</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] bg-white">
                  {filtered.map(srv => (
                    <tr key={srv.id} className="hover:bg-gray-50/50 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#002855] group-hover:text-white transition-colors"><ServerIcon size={14} /></div>
                          <span className="text-sm font-bold text-gray-900 uppercase">{srv.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{srv.locations?.name || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5"><Globe size={12} className="text-blue-400" /><span className="text-xs font-mono text-[#002855]">{srv.ip_address || '—'}</span></div>
                          <div className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-400" /><span className="text-xs font-mono text-[#002855]">{srv.anydesk_id || '—'}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setViewingServer(srv)} className="p-2 text-slate-400 hover:text-[#002855]"><Eye size={16} /></button>
                          {canEdit() && (
                            <>
                              <button onClick={() => openEdit(srv)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                              <button onClick={() => del(srv)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
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

      {
        showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
              <div className="bg-[#002855] px-8 py-5 flex items-center justify-between">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">{editing ? 'Editar Recurso' : 'Nuevo Recurso'}</h2>
                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={save} className="p-8 space-y-4 flex-1 bg-slate-50">
                <input placeholder="Nombre del Host *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-blue-500 font-bold" required />
                <select value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-blue-500">{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Host IP" value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} className="px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="AnyDesk ID" value={form.anydesk_id} onChange={e => setForm({ ...form, anydesk_id: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 font-mono text-xs" />
                    <input type="password" placeholder="Clave AnyDesk" value={form.anydesk_password} onChange={e => setForm({ ...form, anydesk_password: e.target.value })} className="px-3 py-2.5 rounded-xl border border-gray-200 font-mono text-xs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Usuario" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs" />
                  <input type="password" placeholder="Contraseña" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs" />
                </div>

                {/* Additional Credentials Section */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accesos Adicionales</h3>
                    <button type="button" onClick={() => setForm({ ...form, resource_credentials: [...form.resource_credentials, { label: '', username: '', password: '' }] })} className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:text-blue-800"><Plus size={12} /> Agregar</button>
                  </div>
                  {form.resource_credentials.map((c, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 relative group">
                      <button type="button" onClick={() => setForm({ ...form, resource_credentials: form.resource_credentials.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 p-1 bg-white border shadow-sm rounded-full text-rose-500 hover:bg-rose-50"><X size={12} /></button>
                      <input placeholder="Etiqueta (ej. SSH, DB, Root)" value={c.label} onChange={e => { const nc = [...form.resource_credentials]; nc[idx].label = e.target.value; setForm({ ...form, resource_credentials: nc }); }} className="w-full px-3 py-1.5 text-[11px] font-bold border-b border-gray-100 outline-none" inputMode="text" />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Usuario" value={c.username} onChange={e => { const nc = [...form.resource_credentials]; nc[idx].username = e.target.value; setForm({ ...form, resource_credentials: nc }); }} className="px-3 py-1.5 text-[11px] bg-slate-50 rounded border-none outline-none" />
                        <input type="password" placeholder="Contraseña" value={c.password} onChange={e => { const nc = [...form.resource_credentials]; nc[idx].password = e.target.value; setForm({ ...form, resource_credentials: nc }); }} className="px-3 py-1.5 text-[11px] bg-slate-50 rounded border-none outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
                <textarea placeholder="Notas técnicas..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs resize-none" />
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-xs font-black uppercase text-gray-400">Cancelar</button><button type="submit" className="flex-1 py-2.5 bg-[#002855] text-white rounded-lg text-xs font-black uppercase shadow-lg shadow-blue-900/10">Guardar</button></div>
              </form>
            </div>
          </div>
        )
      }

      {
        viewingServer && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-8 py-6 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm"><ServerIcon size={24} className="text-slate-600" /></div>
                  <div><h3 className="text-xl font-black text-[#002855] uppercase tracking-tight">Ficha Técnica</h3><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Host: {viewingServer.name}</p></div>
                </div>
                <button onClick={() => setViewingServer(undefined)} className="text-gray-400 p-2"><X size={24} /></button>
              </div>
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Sede / Ubicación</label>
                  <p className="text-lg font-black text-[#002855] uppercase">{viewingServer.locations?.name || 'No especificada'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border shadow-sm"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">IP LAN</label><p className="font-mono font-bold text-[#002855]">{viewingServer.ip_address || '—'}</p></div>
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">AnyDesk</label>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-bold text-[#002855]">{viewingServer.anydesk_id || '—'}</p>
                      {viewingServer.anydesk_password && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">CLAVE:</span>
                          <span className="text-xs font-mono font-bold text-[#002855]">
                            {showPasswords['anydesk'] ? viewingServer.anydesk_password : '••••••••'}
                          </span>
                          <button onClick={() => setShowPasswords(p => ({ ...p, anydesk: !p.anydesk }))} className="text-blue-500 hover:text-blue-700">
                            <Eye size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Credentials */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Acceso Principal</label>
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-bold"><span className="text-gray-400 uppercase mr-1">User:</span> {viewingServer.username || '—'}</div>
                      <div className="text-xs font-bold flex items-center gap-2">
                        <span className="text-gray-400 uppercase">Pass:</span>
                        <span>{showPasswords['main'] ? (viewingServer.password || '—') : '••••••••'}</span>
                        <button onClick={() => setShowPasswords(p => ({ ...p, main: !p.main }))} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Credentials */}
                {viewingServer.resource_credentials && viewingServer.resource_credentials.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accesos Adicionales</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {viewingServer.resource_credentials.map(c => (
                        <div key={c.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-slate-50 rounded-lg text-slate-400"><Globe size={16} /></div>
                            <div>
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-0.5">{c.label}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <div className="text-[11px] font-bold"><span className="text-gray-400 uppercase mr-1">User:</span> {c.username || '—'}</div>
                                <div className="text-[11px] font-bold flex items-center gap-2">
                                  <span className="text-gray-400 uppercase">Pass:</span>
                                  <span>{showPasswords[c.id] ? (c.password || '—') : '••••••••'}</span>
                                  <button onClick={() => setShowPasswords(p => ({ ...p, [c.id]: !p[c.id] }))} className="text-blue-500 hover:text-blue-700"><Eye size={12} /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewingServer.notes && <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100"><p className="text-sm font-medium italic text-amber-950 leading-relaxed">"{viewingServer.notes}"</p></div>}
              </div>
              <div className="p-6 bg-slate-50 border-t flex gap-3"><button onClick={() => setViewingServer(undefined)} className="flex-1 py-3 text-xs font-black uppercase text-gray-400 bg-white border border-gray-200 rounded-xl">Cerrar</button></div>
            </div>
          </div>
        )
      }
    </div >
  );
}
