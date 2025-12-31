import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, Eye, X, Copy, Link as LinkIcon, ChevronDown, ChevronUp, EyeOff, Camera as CameraIcon } from 'lucide-react';
import { GiCctvCamera } from 'react-icons/gi';
import { supabase, Camera, Location } from '../lib/supabase';
import CameraForm from '../components/forms/CameraForm';
import { useAuth } from '../contexts/AuthContext';

type CamerasProps = {
  subview?: string;
};

export default function Cameras({ subview }: CamerasProps) {
  const { canEdit } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState<Camera | undefined>();
  const [selectedCamera, setSelectedCamera] = useState<Camera | undefined>();
  const [expandedStorage, setExpandedStorage] = useState<Set<string>>(new Set());
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchCameras(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

  const fetchCameras = async () => {
    const { data, error } = await supabase
      .from('cameras')
      .select('*, locations(*), camera_disks(*)')
      .order('created_at', { ascending: false });
    if (!error && data) setCameras(data as Camera[]);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const openCreate = () => {
    setEditing(undefined);
    setShowForm(true);
  };

  const openEdit = (cam: Camera) => {
    setEditing(cam);
    setShowForm(true);
  };

  const del = async (cam: Camera) => {
    if (!confirm(`¿Eliminar cámara "${cam.name}"?`)) return;
    const { error } = await supabase.from('cameras').delete().eq('id', cam.id);
    if (error) return alert('Error al eliminar: ' + error.message);
    await fetchCameras();
  };

  const onSave = async () => {
    setShowForm(false);
    setEditing(undefined);
    await fetchCameras();
  };

  const handleView = (cam: Camera) => {
    setSelectedCamera(cam);
    setShowDetails(true);
  };

  const toggleStorage = (id: string) => {
    const next = new Set(expandedStorage);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedStorage(next);
  };

  const togglePasswordVisible = (id: string) => {
    const next = new Set(visiblePasswords);
    if (next.has(id)) next.delete(id); else next.add(id);
    setVisiblePasswords(next);
  };

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch { }
  };

  // Función para obtener el tipo de ubicación basado en el subview
  const getLocationTypeFromSubview = (subview?: string) => {
    if (!subview) return null;

    const typeMap: Record<string, string> = {
      'cameras-revision': 'revision',
      'cameras-escuela': 'escuela_conductores',
      'cameras-policlinico': 'policlinico',
      'cameras-circuito': 'circuito',
    };

    return typeMap[subview] || null;
  };


  const humanAccess = (t?: string) => {
    if (!t) return '—';
    if (t === 'url') return 'URL';
    if (t === 'ivms') return 'IVMS';
    if (t === 'esviz') return 'ESVIZ';
    return t.toUpperCase();
  };

  // Función para obtener el subtítulo basado en el subview
  const getSubtitleFromSubview = (subview?: string) => {
    if (!subview) return '';
    const map: Record<string, string> = {
      'cameras-revision': 'Revisión',
      'cameras-escuela': 'Escuela',
      'cameras-policlinico': 'Policlínico',
      'cameras-circuito': 'Circuito',
    };
    return map[subview] || '';
  };

  const filtered = cameras.filter((c) => {
    // Filtro por subview (tipo de ubicación)
    const locationType = getLocationTypeFromSubview(subview);
    if (locationType && (c as any).locations?.type !== locationType) {
      return false;
    }

    // Filtro por búsqueda
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.brand?.toLowerCase().includes(q) ||
      c.model?.toLowerCase().includes(q) ||
      c.ip_address?.toLowerCase().includes(q) ||
      (c as any).locations?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 border border-orange-200 rounded-lg p-2">
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Cámaras
              {subview && (
                <span className="ml-2 text-sm font-normal text-orange-600">({getSubtitleFromSubview(subview)})</span>
              )}
            </h2>
            <p className="text-gray-600">Gestión de cámaras con formulario exclusivo</p>
          </div>
        </div>
        {canEdit() && (
          <button onClick={openCreate} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            <Plus size={20} /> Nueva Cámara
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por nombre, modelo, IP o sede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((cam) => (
            <div key={cam.id} className="bg-white rounded-xl shadow border border-gray-200 hover:shadow-md transition-shadow overflow-hidden max-w-md">
              {/* Header */}
              <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-50 text-green-700 border border-green-200 rounded-md p-2">
                    <GiCctvCamera size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-base leading-tight">{cam.name}</h3>
                      {typeof cam.display_count !== 'undefined' && cam.display_count !== null && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{cam.display_count}</span>
                      )}
                      {cam.access_type && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cam.access_type === 'url' ? 'bg-blue-100 text-blue-800' :
                          cam.access_type === 'ivms' ? 'bg-purple-100 text-purple-800' :
                            cam.access_type === 'esviz' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>{humanAccess(cam.access_type)}</span>
                      )}
                    </div>
                    {(cam as any).locations && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                        <MapPin size={12} />
                        <span>{(cam as any).locations.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Status badge */}
                <div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${cam.status === 'active' ? 'bg-green-100 text-green-800' :
                    cam.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                    {cam.status === 'active' ? 'Activo' : cam.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                  </span>
                </div>
              </div>

              {/* Preview / body */}
              <div className="px-5 pb-4">
                {/* Última modificación */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs">Última modificación:</span>
                    <span className="font-mono text-xs text-gray-600">
                      {new Date(cam.updated_at).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 h-36 flex items-center justify-center text-gray-400 mb-4">
                  {/* Placeholder for preview; could embed image/iframe if available */}
                  <GiCctvCamera size={28} />
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  {(cam.brand || cam.model) && (
                    <div>
                      <span className="text-gray-500">Modelo: </span>
                      <span className="font-mono">{cam.brand || ''} {cam.model || ''}</span>
                    </div>
                  )}
                  {cam.url && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">URL:</span>
                      <span className="font-mono break-all text-blue-600">{cam.url}</span>
                      <button
                        onClick={() => window.open(cam.url, '_blank', 'noopener')}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        title="Abrir URL"
                      >
                        Abrir
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Usuario:</span>
                    <span className="font-mono break-all">{cam.username || '—'}</span>
                    {cam.username && (
                      <button onClick={() => copyToClipboard(cam.username)} className="p-1 hover:bg-gray-100 rounded" title="Copiar">
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Contraseña:</span>
                    <span className="font-mono break-all">{visiblePasswords.has(cam.id) ? (cam.password || '—') : (cam.password ? '••••••••' : '—')}</span>
                    {cam.password && (
                      <>
                        <button onClick={() => togglePasswordVisible(cam.id)} className="p-1 hover:bg-gray-100 rounded" title={visiblePasswords.has(cam.id) ? 'Ocultar' : 'Mostrar'}>
                          {visiblePasswords.has(cam.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => copyToClipboard(cam.password)} className="p-1 hover:bg-gray-100 rounded" title="Copiar">
                          <Copy size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {cam.auth_code && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Código verificación:</span>
                      <span className="font-mono break-all">{cam.auth_code}</span>
                      <button onClick={() => copyToClipboard(cam.auth_code)} className="p-1 hover:bg-gray-100 rounded" title="Copiar">
                        <Copy size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {(cam.camera_disks && cam.camera_disks.length > 0) ? (
                  <div className="mt-3">
                    {(() => {
                      const totals = cam.camera_disks!.reduce(
                        (acc, d) => {
                          const total = Number(d.total_capacity_gb) || 0;
                          const used = Number(d.used_space_gb) || 0;
                          return { total: acc.total + total, used: acc.used + used };
                        },
                        { total: 0, used: 0 }
                      );
                      const percentUsed = totals.total > 0 ? Math.min(100, Math.max(0, Math.round((totals.used / totals.total) * 100))) : 0;
                      const percentFree = 100 - percentUsed;
                      const remaining = Math.max(0, totals.total - totals.used);
                      return (
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-700 whitespace-nowrap">Uso total</div>
                          <div className="text-sm text-gray-700 whitespace-nowrap">{totals.used} / {totals.total} GB</div>
                          <div className="ml-auto w-32 sm:w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`${percentUsed > 85 ? 'bg-red-500' : percentUsed > 65 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${percentUsed}%`, height: '100%' }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-700 whitespace-nowrap">Uso total</div>
                      <div className="text-sm text-gray-700 whitespace-nowrap">0 / 0 GB</div>
                      <div className="ml-auto w-32 sm:w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-300" style={{ width: '0%' }} />
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Sin discos configurados</div>
                  </div>
                )}
                {cam.camera_disks && cam.camera_disks.length > 0 && (
                  <div className="lg:col-span-2 mt-2">
                    <button
                      onClick={() => toggleStorage(cam.id)}
                      className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900"
                    >
                      {expandedStorage.has(cam.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      Almacenamiento ({cam.camera_disks.length} discos)
                    </button>

                    {/* Collapsible storage details */}
                    {expandedStorage.has(cam.id) && (
                      <div className="mt-2 space-y-2">
                        {cam.camera_disks.map((d) => {
                          const total = Number(d.total_capacity_gb) || 0;
                          const used = Number(d.used_space_gb) || 0;
                          const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;
                          return (
                            <div key={d.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="text-gray-700">Disco #{d.disk_number} • {d.disk_type || '—'}</div>
                                <div className="text-gray-500">{used} / {total} GB</div>
                              </div>
                              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${percent > 85 ? 'bg-red-500' : percent > 65 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }} />
                              </div>
                              <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full ${d.status === 'active' ? 'bg-green-100 text-green-800' :
                                  d.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                    d.status === 'full' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                  }`}>{d.status || '—'}</span>
                                {typeof d.remaining_capacity_gb !== 'undefined' && (
                                  <span>Libre: {Number(d.remaining_capacity_gb) || (total - used)} GB</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => handleView(cam)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                    title="Ver detalles"
                  >
                    <Eye size={16} /> Ver
                  </button>
                  {canEdit() && (
                    <>
                      <button
                        onClick={() => openEdit(cam)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        <Edit size={16} /> Editar
                      </button>
                      <button
                        onClick={() => del(cam)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetails && selectedCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Detalles de {selectedCamera.name}</h2>
              <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column - Basic info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Información General</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Estado:</span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${selectedCamera.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedCamera.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {selectedCamera.status === 'active' ? 'Activo' : selectedCamera.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ubicación:</span>
                        <span>{(selectedCamera as any).locations?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Marca:</span>
                        <span>{selectedCamera.brand || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Modelo:</span>
                        <span>{selectedCamera.model || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cámaras:</span>
                        <span>{selectedCamera.display_count || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Acceso y Credenciales</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Tipo de acceso:</span>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${selectedCamera.access_type === 'url' ? 'bg-blue-100 text-blue-800' :
                          selectedCamera.access_type === 'ivms' ? 'bg-purple-100 text-purple-800' :
                            selectedCamera.access_type === 'esviz' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {humanAccess(selectedCamera.access_type)}
                        </span>
                      </div>
                      {selectedCamera.url && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">URL:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs break-all max-w-48">{selectedCamera.url}</span>
                            <button
                              onClick={() => window.open(selectedCamera.url, '_blank', 'noopener')}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Usuario:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{selectedCamera.username || '—'}</span>
                          {selectedCamera.username && (
                            <button onClick={() => copyToClipboard(selectedCamera.username)} className="p-1 hover:bg-gray-100 rounded">
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Contraseña:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {visiblePasswords.has(selectedCamera.id) ? (selectedCamera.password || '—') : (selectedCamera.password ? '••••••••' : '—')}
                          </span>
                          {selectedCamera.password && (
                            <>
                              <button onClick={() => togglePasswordVisible(selectedCamera.id)} className="p-1 hover:bg-gray-100 rounded">
                                {visiblePasswords.has(selectedCamera.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button onClick={() => copyToClipboard(selectedCamera.password)} className="p-1 hover:bg-gray-100 rounded">
                                <Copy size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedCamera.auth_code && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Código verificación:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{selectedCamera.auth_code}</span>
                            <button onClick={() => copyToClipboard(selectedCamera.auth_code)} className="p-1 hover:bg-gray-100 rounded">
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column - Technical details and storage */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Detalles Técnicos</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">IP:</span>
                        <span className="font-mono">{selectedCamera.ip_address || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Puerto:</span>
                        <span className="font-mono">{selectedCamera.port || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Creado:</span>
                        <span>{new Date(selectedCamera.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Actualizado:</span>
                        <span>{new Date(selectedCamera.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Storage section */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Almacenamiento</h3>
                    {selectedCamera.camera_disks && selectedCamera.camera_disks.length > 0 ? (
                      <div className="space-y-3">
                        {(() => {
                          const totals = selectedCamera.camera_disks!.reduce(
                            (acc, d) => {
                              const total = Number(d.total_capacity_gb) || 0;
                              const used = Number(d.used_space_gb) || 0;
                              return { total: acc.total + total, used: acc.used + used };
                            },
                            { total: 0, used: 0 }
                          );
                          const percentUsed = totals.total > 0 ? Math.min(100, Math.max(0, Math.round((totals.used / totals.total) * 100))) : 0;
                          const remaining = Math.max(0, totals.total - totals.used);
                          return (
                            <div>
                              <div className="flex justify-between text-sm mb-2">
                                <span>Uso total ({selectedCamera.camera_disks.length} discos)</span>
                                <span>{totals.used} / {totals.total} GB</span>
                              </div>
                              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${percentUsed > 85 ? 'bg-red-500' : percentUsed > 65 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${percentUsed}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">Libre: {remaining} GB ({100 - percentUsed}%)</div>
                            </div>
                          );
                        })()}

                        <div className="space-y-2">
                          {selectedCamera.camera_disks.map((d) => {
                            const total = Number(d.total_capacity_gb) || 0;
                            const used = Number(d.used_space_gb) || 0;
                            const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;
                            return (
                              <div key={d.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="font-medium">Disco #{d.disk_number} • {d.disk_type || '—'}</span>
                                  <span className="text-gray-500">{used} / {total} GB</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${percent > 85 ? 'bg-red-500' : percent > 65 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }} />
                                </div>
                                <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full ${d.status === 'active' ? 'bg-green-100 text-green-800' :
                                    d.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                      d.status === 'full' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>{d.status || '—'}</span>
                                  <span>Libre: {Number(d.remaining_capacity_gb) || (total - used)} GB</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <GiCctvCamera size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>Sin discos configurados</p>
                      </div>
                    )}
                  </div>

                  {selectedCamera.notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Notas</h3>
                      <p className="text-sm text-gray-700">{selectedCamera.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{editing ? 'Editar Cámara' : 'Nueva Cámara'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <CameraForm
                onClose={() => setShowForm(false)}
                onSave={onSave}
                editCamera={editing}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



