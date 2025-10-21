import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, ExternalLink, Eye, X } from 'lucide-react';
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
    if (!error && data) setServers(data as Server[]);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Servidores</h2>
          <p className="text-gray-600">Gestión de servidores, accesos y AnyDesk</p>
        </div>
        {canEdit() && (
          <button onClick={openCreate} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            <Plus size={20} /> Nuevo Servidor
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por nombre, IP, AnyDesk o sede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-left py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(srv => (
            <div key={srv.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 text-slate-700 border border-slate-200 rounded p-2">
                      <ServerIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-base">{srv.name}</h3>
                      {srv.locations && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <MapPin size={12} />
                          <span>{srv.locations.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit() && (
                      <>
                        <button onClick={() => openEdit(srv)} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => del(srv)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  {srv.ip_address && (
                    <div>
                      <span className="text-gray-500">IP: </span>
                      <span className="font-mono">{srv.ip_address}</span>
                    </div>
                  )}
                  {srv.anydesk_id && (
                    <div>
                      <span className="text-gray-500">AnyDesk: </span>
                      <span className="font-mono">{srv.anydesk_id}</span>
                    </div>
                  )}
                  {srv.username && (
                    <div>
                      <span className="text-gray-500">Usuario: </span>
                      <span className="font-mono">{srv.username}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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


