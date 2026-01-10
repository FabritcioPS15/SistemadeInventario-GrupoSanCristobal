import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ExternalLink, Eye, EyeOff, X, Copy, Check, Globe, Database, Terminal, Server, Shield, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MTCAccesoForm from '../components/forms/MTCAccesoForm';

type MTCAcceso = {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  access_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export default function MTCAccesos() {
  const [accesos, setAccesos] = useState<MTCAcceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAcceso, setEditingAcceso] = useState<MTCAcceso | undefined>();
  const [viewingAcceso, setViewingAcceso] = useState<MTCAcceso | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [accessTypeFilter, setAccessTypeFilter] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    withCredentials: 0,
    recentlyAdded: 0
  });

  useEffect(() => {
    fetchAccesos();
  }, []);

  const fetchAccesos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mtc_accesos')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      setAccesos(data);
      calculateStats(data);
    }
    setLoading(false);
  };

  const calculateStats = (accesosData: MTCAcceso[]) => {
    const byType: Record<string, number> = {};
    let withCredentials = 0;
    let recentlyAdded = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    accesosData.forEach(acceso => {
      // Contar por tipo
      byType[acceso.access_type] = (byType[acceso.access_type] || 0) + 1;

      // Contar con credenciales
      if (acceso.username && acceso.password) {
        withCredentials++;
      }

      // Contar recientes
      if (new Date(acceso.created_at) > oneWeekAgo) {
        recentlyAdded++;
      }
    });

    setStats({
      total: accesosData.length,
      byType,
      withCredentials,
      recentlyAdded
    });
  };

  const handleEditAcceso = (acceso: MTCAcceso) => {
    console.log('✏️ Editando acceso MTC:', acceso);
    setEditingAcceso(acceso);
    setShowForm(true);
  };

  const handleViewAcceso = (acceso: MTCAcceso) => {
    setViewingAcceso(acceso);
  };

  const handleDeleteAcceso = async (acceso: MTCAcceso) => {
    console.log('🗑️ Iniciando eliminación de acceso MTC:', acceso);

    if (window.confirm(`¿Estás seguro de que quieres eliminar el acceso "${acceso.name}"?`)) {
      try {
        console.log(`🗑️ Eliminando acceso: ${acceso.name} (ID: ${acceso.id})`);
        const { data, error } = await supabase
          .from('mtc_accesos')
          .delete()
          .eq('id', acceso.id)
          .select();

        console.log('📋 Resultado de eliminación:', { data, error });

        if (error) {
          console.error('❌ Error al eliminar acceso MTC:', error);
          alert(`Error al eliminar el acceso MTC: ${error.message}\n\nCódigo: ${error.code}\nDetalles: ${error.details}`);
        } else {
          console.log('✅ Acceso MTC eliminado correctamente');
          await fetchAccesos();
          alert('Acceso MTC eliminado correctamente');
        }
      } catch (err) {
        console.error('❌ Error inesperado al eliminar acceso MTC:', err);
        alert('Error inesperado al eliminar el acceso MTC: ' + err);
      }
    }
  };

  const handleSaveAcceso = async () => {
    console.log('💾 Guardando acceso MTC...');
    setShowForm(false);
    setEditingAcceso(undefined);
    await fetchAccesos();
    console.log('✅ Acceso MTC guardado y datos actualizados');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAcceso(undefined);
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    }
  };

  const getAccessTypeIcon = (type: string) => {
    switch (type) {
      case 'web': return <Globe className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'ssh': return <Terminal className="h-4 w-4" />;
      case 'ftp': return <Server className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getAccessTypeColor = (type: string) => {
    switch (type) {
      case 'web': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'api': return 'bg-green-50 text-green-700 border-green-200';
      case 'database': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ssh': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ftp': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredAccesos = accesos.filter(acceso => {
    const matchesSearch = acceso.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acceso.access_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acceso.url.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !accessTypeFilter || acceso.access_type === accessTypeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MTC Accesos</h2>
          <p className="text-gray-600">Gestión de credenciales y accesos operativos del MTC</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              console.log('🔍 Probando conexión con Supabase...');
              try {
                const { data, error } = await supabase
                  .from('mtc_accesos')
                  .select('count')
                  .limit(1);

                if (error) {
                  console.error('❌ Error de conexión:', error);
                  alert(`Error de conexión: ${error.message}`);
                } else {
                  console.log('✅ Conexión exitosa:', data);
                  alert('Conexión con Supabase exitosa');
                }
              } catch (err) {
                console.error('❌ Error inesperado:', err);
                alert('Error inesperado: ' + err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm active:transform active:scale-95"
          >
            Probar Conexión
          </button>
          <button
            onClick={() => {
              setEditingAcceso(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-md shadow-blue-100 active:transform active:scale-95"
          >
            <Plus size={18} />
            Nuevo Acceso
          </button>
        </div>
      </div>

      {/* Dashboard de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Accesos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Con Credenciales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withCredentials}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Accesos Web</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byType.web || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Plus className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recientes (7 días)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentlyAdded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros avanzados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, tipo o URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-blue-100/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <select
              value={accessTypeFilter}
              onChange={(e) => setAccessTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Todos los tipos de acceso</option>
              <option value="web">Web Services</option>
              <option value="api">APIs & Endpoints</option>
              <option value="database">Bases de Datos</option>
              <option value="ssh">Terminal SSH</option>
              <option value="ftp">Servidores FTP</option>
              <option value="other">Otros Accesos</option>
            </select>
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {(searchTerm || accessTypeFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
              {searchTerm && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  "{searchTerm}"
                </span>
              )}
              {accessTypeFilter && (
                <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded border border-gray-100">
                  {accessTypeFilter}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setAccessTypeFilter('');
              }}
              className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-rose-600 transition-colors uppercase tracking-widest"
            >
              <X size={14} /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAccesos.map(acceso => (
            <div key={acceso.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 flex flex-col group overflow-hidden">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight mb-2">
                      {acceso.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${getAccessTypeColor(acceso.access_type)}`}>
                        {getAccessTypeIcon(acceso.access_type)}
                        {acceso.access_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enlace Directo</label>
                      <button
                        onClick={() => copyToClipboard(acceso.url, `url-${acceso.id}`)}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-blue-600 active:scale-90"
                        title="Copiar URL"
                      >
                        {copiedItems[`url-${acceso.id}`] ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <a
                      href={acceso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 font-bold hover:text-blue-800 flex items-center gap-2 break-all group/link"
                    >
                      <span className="truncate">{acceso.url}</span>
                      <ExternalLink size={14} className="flex-shrink-0 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>

                  {acceso.username && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/30">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-blue-700/50 uppercase tracking-widest">Identidad</label>
                          <button
                            onClick={() => copyToClipboard(acceso.username!, `username-${acceso.id}`)}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-400 hover:text-blue-600 active:scale-90"
                            title="Copiar usuario"
                          >
                            {copiedItems[`username-${acceso.id}`] ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <p className="text-sm text-blue-900 font-black tracking-tight font-mono">{acceso.username}</p>
                      </div>
                      {acceso.password && (
                        <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/30">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black text-blue-700/50 uppercase tracking-widest">Token / Pass</label>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(acceso.password!, `password-${acceso.id}`)}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-400 hover:text-blue-600 active:scale-90"
                                title="Copiar contraseña"
                              >
                                {copiedItems[`password-${acceso.id}`] ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                              <button
                                onClick={() => togglePasswordVisibility(acceso.id)}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors text-blue-600 hover:text-blue-800 active:scale-90"
                                title={showPasswords[acceso.id] ? 'Ocultar' : 'Mostrar'}
                              >
                                {showPasswords[acceso.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-blue-900 font-black tracking-widest font-mono">
                            {showPasswords[acceso.id] ? acceso.password : '••••••••'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {acceso.notes && (
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Observaciones de Acceso</label>
                      <p className="text-xs text-gray-600 italic leading-relaxed whitespace-pre-wrap">{acceso.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                <button
                  onClick={() => handleViewAcceso(acceso)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  <Eye size={14} />
                  DETALLES
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAcceso(acceso)}
                    className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                    title="Modificar acceso"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteAcceso(acceso)}
                    className="p-2 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                    title="Eliminar acceso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredAccesos.length === 0 && (
        <div className="text-left py-12">
          <p className="text-gray-500">No se encontraron accesos</p>
        </div>
      )}

      {showForm && (
        <MTCAccesoForm
          editAcceso={editingAcceso}
          onClose={handleCloseForm}
          onSave={handleSaveAcceso}
        />
      )}

      {viewingAcceso && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`px-8 py-6 flex items-center justify-between border-b border-gray-100 ${getAccessTypeColor(viewingAcceso.access_type).split(' ')[0]} bg-opacity-30`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                  {getAccessTypeIcon(viewingAcceso.access_type)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Acceso Detallado</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">{viewingAcceso.access_type}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingAcceso(undefined)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Información básica */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Identificación del Recurso</h3>
                </div>
                <div className="grid grid-cols-1 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre del Acceso</label>
                    <p className="text-gray-900 font-bold text-lg leading-tight uppercase">{viewingAcceso.name}</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">URL / Endpoint</label>
                    <a
                      href={viewingAcceso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-2 break-all italic underline decoration-blue-200"
                    >
                      {viewingAcceso.url}
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Credenciales */}
              {(viewingAcceso.username || viewingAcceso.password) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Seguridad & Credenciales</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingAcceso.username && (
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Usuario</label>
                        <p className="text-gray-900 font-black font-mono break-all">{viewingAcceso.username}</p>
                      </div>
                    )}
                    {viewingAcceso.password && (
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contraseña</label>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-black font-mono tracking-widest">
                            {showPasswords[viewingAcceso.id] ? viewingAcceso.password : '••••••••'}
                          </p>
                          <button
                            onClick={() => togglePasswordVisibility(viewingAcceso.id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 ml-auto"
                          >
                            {showPasswords[viewingAcceso.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              {viewingAcceso.notes && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Observaciones Técnicas</h3>
                  </div>
                  <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                    <p className="text-sm text-amber-950 font-medium italic leading-relaxed whitespace-pre-wrap">{viewingAcceso.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingAcceso(undefined)}
                className="flex-1 px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setViewingAcceso(undefined);
                  handleEditAcceso(viewingAcceso);
                }}
                className="flex-1 px-4 py-3 text-xs font-black text-white uppercase tracking-widest bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
              >
                Editar Acceso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
