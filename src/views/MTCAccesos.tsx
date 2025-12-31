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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MTC Accesos</h2>
          <p className="text-gray-600">Gestión de credenciales y accesos del MTC</p>
        </div>
        <div className="flex gap-3">
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            🔍 Probar Conexión
          </button>
          <button
            onClick={() => {
              setEditingAcceso(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Plus size={20} />
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, tipo o URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:w-48">
            <select
              value={accessTypeFilter}
              onChange={(e) => setAccessTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="web">Web</option>
              <option value="api">API</option>
              <option value="database">Base de Datos</option>
              <option value="ssh">SSH</option>
              <option value="ftp">FTP</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {(searchTerm || accessTypeFilter) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>Filtros activos:</span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                "{searchTerm}"
              </span>
            )}
            {accessTypeFilter && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {accessTypeFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setAccessTypeFilter('');
              }}
              className="text-red-600 hover:text-red-800 text-xs underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAccesos.map(acceso => (
            <div key={acceso.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{acceso.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getAccessTypeColor(acceso.access_type)}`}>
                        {getAccessTypeIcon(acceso.access_type)}
                        {acceso.access_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-gray-500">URL de Acceso</label>
                      <button
                        onClick={() => copyToClipboard(acceso.url, `url-${acceso.id}`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar URL"
                      >
                        {copiedItems[`url-${acceso.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <a
                      href={acceso.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 break-all"
                    >
                      {acceso.url}
                      <ExternalLink size={14} className="flex-shrink-0" />
                    </a>
                  </div>

                  {acceso.username && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-blue-700">Usuario</label>
                          <button
                            onClick={() => copyToClipboard(acceso.username!, `username-${acceso.id}`)}
                            className="text-blue-400 hover:text-blue-600 transition-colors"
                            title="Copiar usuario"
                          >
                            {copiedItems[`username-${acceso.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <p className="text-sm text-blue-900 font-mono">{acceso.username}</p>
                      </div>
                      {acceso.password && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-blue-700">Contraseña</label>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(acceso.password!, `password-${acceso.id}`)}
                                className="text-blue-400 hover:text-blue-600 transition-colors"
                                title="Copiar contraseña"
                              >
                                {copiedItems[`password-${acceso.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                              </button>
                              <button
                                onClick={() => togglePasswordVisibility(acceso.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title={showPasswords[acceso.id] ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                              >
                                {showPasswords[acceso.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-blue-900 font-mono">
                            {showPasswords[acceso.id] ? acceso.password : '••••••••'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {acceso.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <label className="text-xs font-medium text-gray-500 block mb-1">Notas</label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{acceso.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleViewAcceso(acceso)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Eye size={16} />
                    Ver
                  </button>
                  <button
                    onClick={() => handleEditAcceso(acceso)}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteAcceso(acceso)}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Detalles de Acceso MTC</h2>
              <button
                onClick={() => setViewingAcceso(undefined)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
                <p className="text-gray-900 font-medium">{viewingAcceso.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Tipo de Acceso</label>
                <p className="text-gray-900">{viewingAcceso.access_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">URL</label>
                <a
                  href={viewingAcceso.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 break-all"
                >
                  {viewingAcceso.url}
                  <ExternalLink size={14} />
                </a>
              </div>
              {viewingAcceso.username && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Usuario</label>
                  <p className="text-gray-900 font-mono">{viewingAcceso.username}</p>
                </div>
              )}
              {viewingAcceso.password && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Contraseña</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900 font-mono">
                      {showPasswords[viewingAcceso.id] ? viewingAcceso.password : '••••••••'}
                    </p>
                    <button
                      onClick={() => togglePasswordVisibility(viewingAcceso.id)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      {showPasswords[viewingAcceso.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
              {viewingAcceso.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Notas</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingAcceso.notes}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setViewingAcceso(undefined)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setViewingAcceso(undefined);
                    handleEditAcceso(viewingAcceso);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
