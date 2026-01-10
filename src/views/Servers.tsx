import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, X, Eye, EyeOff, Globe, Activity, Database, Server as ServerLucide } from 'lucide-react';
import { GrServerCluster as ServerIcon } from 'react-icons/gr';
import { supabase, Server, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Servers() {
  const { canEdit } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Server | undefined>();
  const [form, setForm] = useState({
    name: '',
    location_id: '',
    ip_address: '',
    anydesk_id: '',
    username: '',
    password: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({
    total: 0,
    withIp: 0,
    withAnydesk: 0,
    recentlyUpdated: 0
  });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [viewingServer, setViewingServer] = useState<Server | undefined>();
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
    if (!error && data) {
      setServers(data as Server[]);
      calculateStats(data as Server[]);
    }
  };

  const calculateStats = (srvData: Server[]) => {
    let withIp = 0;
    let withAnydesk = 0;
    let recentlyUpdated = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    srvData.forEach(s => {
      if (s.ip_address) withIp++;
      if (s.anydesk_id) withAnydesk++;
      if (new Date(s.updated_at) > oneWeekAgo) recentlyUpdated++;
    });

    setStats({
      total: srvData.length,
      withIp,
      withAnydesk,
      recentlyUpdated
    });
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const resetForm = () => {
    setForm({ name: '', location_id: '', ip_address: '', anydesk_id: '', username: '', password: '', notes: '' });
    setErrors({});
  };

  const openCreate = () => {
    setEditing(undefined);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (srv: Server) => {
    setEditing(srv);
    setForm({
      name: srv.name || '',
      location_id: srv.location_id || '',
      ip_address: srv.ip_address || '',
      anydesk_id: srv.anydesk_id || '',
      username: srv.username || '',
      password: srv.password || '',
      notes: srv.notes || '',
    });
    setShowForm(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Requerido';
    if (form.ip_address && !/^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(form.ip_address)) errs.ip_address = 'IP inválida';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      name: form.name.trim(),
      location_id: form.location_id || null,
      ip_address: form.ip_address || null,
      anydesk_id: form.anydesk_id || null,
      username: form.username || null,
      password: form.password || null,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from('servers').update(payload).eq('id', editing.id);
      if (error) return alert('Error al actualizar: ' + error.message);
    } else {
      const { error } = await supabase.from('servers').insert(payload as any);
      if (error) return alert('Error al crear: ' + error.message);
    }
    setShowForm(false);
    setEditing(undefined);
    await fetchServers();
  };

  const del = async (srv: Server) => {
    if (!confirm(`¿Eliminar servidor "${srv.name}"?`)) return;
    const { error } = await supabase.from('servers').delete().eq('id', srv.id);
    if (error) return alert('Error al eliminar: ' + error.message);
    await fetchServers();
  };

  const filtered = servers.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.ip_address?.toLowerCase().includes(q) ||
      s.anydesk_id?.toLowerCase().includes(q) ||
      s.locations?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Servidores</h2>
          <p className="text-gray-600">Gestión de infraestructura, accesos remotos y servicios centrales</p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit() && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md shadow-blue-100 active:transform active:scale-95"
            >
              <Plus size={18} />
              Nuevo Servidor
            </button>
          )}
        </div>
      </div>

      {/* Dashboard de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Servidores</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <ServerLucide className="h-5 w-5 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Conectividad IP</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.withIp}</div>
            <Globe className="h-5 w-5 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Acceso AnyDesk</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.withAnydesk}</div>
            <Activity className="h-5 w-5 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actualizados (7d)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-blue-500">{stats.recentlyUpdated}</div>
            <Database size={20} className="text-blue-500/20" />
          </div>
        </div>
      </div>

      {/* Filtros compactos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-blue-100/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Buscar por nombre, IP, AnyDesk o sede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-end">
            {search && (
              <button
                onClick={() => setSearch('')}
                className="flex items-center gap-1 text-[10px] font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest"
              >
                <X size={14} /> Limpiar búsqueda
              </button>
            )}
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(srv => (
            <div key={srv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-50 rounded-xl p-2.5 group-hover:bg-blue-50 transition-colors duration-300 ring-1 ring-gray-100 group-hover:ring-blue-100">
                      <ServerIcon size={20} className="text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight mb-1">
                        {srv.name}
                      </h3>
                      {srv.locations && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest">
                          <MapPin size={12} className="text-blue-500" />
                          <span>{srv.locations.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {srv.ip_address && (
                    <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-100/30">
                      <label className="text-[10px] font-black text-blue-700/50 uppercase tracking-widest block mb-1">Dirección IP</label>
                      <p className="text-sm text-blue-900 font-black font-mono tracking-tight">{srv.ip_address}</p>
                    </div>
                  )}
                  {srv.anydesk_id && (
                    <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/30">
                      <label className="text-[10px] font-black text-emerald-700/50 uppercase tracking-widest block mb-1">AnyDesk ID</label>
                      <p className="text-sm text-emerald-900 font-black font-mono tracking-tight">{srv.anydesk_id}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                <button
                  onClick={() => setViewingServer(srv)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  <Eye size={14} />
                  DETALLES
                </button>
                {canEdit() && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(srv)}
                      className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                      title="Modificar servidor"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => del(srv)}
                      className="p-2 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                      title="Eliminar servidor"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalles */}
      {viewingServer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                  <ServerIcon size={24} className="text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Infraestructura Central</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">Servidor de Red</p>
                </div>
              </div>
              <button
                onClick={() => setViewingServer(undefined)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Información básica */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-slate-500 rounded-full" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Identificación del Equipo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre del Host</label>
                    <p className="text-gray-900 font-bold text-lg leading-tight uppercase">{viewingServer.name}</p>
                  </div>

                  {viewingServer.locations && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ubicación Física / Sede</label>
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-bold uppercase">
                        <MapPin size={14} className="text-blue-500" />
                        {viewingServer.locations.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Conectividad */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Direccionamiento y Acceso</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dirección IP (LAN/WAN)</label>
                    <p className="text-gray-900 font-black font-mono tracking-tight">{viewingServer.ip_address || 'Sin IP asignada'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Identificador AnyDesk</label>
                    <p className="text-gray-900 font-black font-mono tracking-tight">{viewingServer.anydesk_id || 'Sin AnyDesk'}</p>
                  </div>
                </div>
              </div>

              {/* Credenciales */}
              {(viewingServer.username || viewingServer.password) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Autenticación de Sistema</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingServer.username && (
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuario</label>
                        <p className="text-gray-900 font-black font-mono">{viewingServer.username}</p>
                      </div>
                    )}
                    {viewingServer.password && (
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contraseña</label>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-black font-mono tracking-widest">
                            {showPasswords[viewingServer.id] ? viewingServer.password : '••••••••'}
                          </p>
                          <button
                            onClick={() => setShowPasswords(prev => ({ ...prev, [viewingServer.id]: !prev[viewingServer.id] }))}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 ml-auto"
                          >
                            {showPasswords[viewingServer.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              {viewingServer.notes && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Especificaciones / Otros</h3>
                  </div>
                  <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                    <p className="text-sm text-amber-950 font-medium italic leading-relaxed whitespace-pre-wrap">{viewingServer.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingServer(undefined)}
                className="flex-1 px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              >
                Cerrar
              </button>
              {canEdit() && (
                <button
                  onClick={() => {
                    const srv = viewingServer;
                    setViewingServer(undefined);
                    openEdit(srv);
                  }}
                  className="flex-1 px-4 py-3 text-xs font-black text-white uppercase tracking-widest bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                >
                  Editar Servidor
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{editing ? 'Editar Servidor' : 'Nuevo Servidor'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.location_id}
                  onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                >
                  <option value="">Sin ubicación específica</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="192.168.1.10"
                    value={form.ip_address}
                    onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                  />
                  {errors.ip_address && <p className="text-red-500 text-sm mt-1">{errors.ip_address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AnyDesk</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="123 456 789"
                    value={form.anydesk_id}
                    onChange={(e) => setForm({ ...form, anydesk_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Detalles, accesos, observaciones..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium">Guardar</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


