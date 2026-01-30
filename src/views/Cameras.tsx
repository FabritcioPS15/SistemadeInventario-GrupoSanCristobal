import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, Eye, X, Copy, ChevronDown, ChevronUp, EyeOff, LayoutGrid, List, ExternalLink, Star, Video } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { GiCctvCamera } from 'react-icons/gi';
import ExcelJS from 'exceljs';
import { supabase, Camera, Location } from '../lib/supabase';
import CameraForm from '../components/forms/CameraForm';
import { useAuth } from '../contexts/AuthContext';
import { RiFileExcel2Line } from "react-icons/ri";

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
  const [filterLocation, setFilterLocation] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterStorage, setFilterStorage] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

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
    const { data } = await api.from('locations').select('*').order('name');
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
    const { error } = await api.from('cameras').delete().eq('id', cam.id);
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
    const matchesSearch =
      c.name?.toLowerCase().includes(q) ||
      c.brand?.toLowerCase().includes(q) ||
      c.model?.toLowerCase().includes(q) ||
      c.ip_address?.toLowerCase().includes(q) ||
      (c as any).locations?.name?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Filtro por Sede
    if (filterLocation !== 'todos' && (c as any).locations?.id !== filterLocation) {
      return false;
    }

    // Filtro por Estado
    if (filterStatus !== 'todos' && c.status !== filterStatus) {
      return false;
    }

    // Filtro por Almacenamiento Crítico (algún disco > 75%)
    if (filterStorage) {
      const hasCriticalDisk = c.camera_disks?.some(d => {
        const total = Number(d.total_capacity_gb) || 0;
        const used = Number(d.used_space_gb) || 0;
        const percent = total > 0 ? (used / total) * 100 : 0;
        return percent > 75;
      });
      if (!hasCriticalDisk) return false;
    }

    return true;
  });

  const handleExportExcel = async () => {
    // Crear un nuevo libro de trabajo
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cámaras');

    // Definir columnas con anchos apropiados
    worksheet.columns = [
      { header: 'Nombre', key: 'name', width: 25 },
      { header: 'Marca', key: 'brand', width: 15 },
      { header: 'Modelo', key: 'model', width: 20 },
      { header: 'Sede', key: 'location', width: 25 },
      { header: 'IP', key: 'ip', width: 15 },
      { header: 'Puerto', key: 'port', width: 10 },
      { header: 'Usuario', key: 'username', width: 20 },
      { header: 'Contraseña', key: 'password', width: 20 },
      { header: 'URL', key: 'url', width: 40 },
      { header: 'Tipo Acceso', key: 'access_type', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Notas', key: 'notes', width: 30 }
    ];

    // Estilizar la fila de encabezados
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // Agregar bordes a los encabezados
    worksheet.getRow(1).eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Agregar datos
    filtered.forEach((camera) => {
      const locationName = (camera as any).locations?.name || '';
      const statusLabel = camera.status === 'active' ? 'Activo' :
        camera.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo';

      const row = worksheet.addRow({
        name: camera.name || '',
        brand: camera.brand || '',
        model: camera.model || '',
        location: locationName,
        ip: camera.ip_address || '',
        port: camera.port || '',
        username: camera.username || '',
        password: camera.password || '',
        url: camera.url || '',
        access_type: humanAccess(camera.access_type),
        status: statusLabel,
        notes: camera.notes || ''
      });

      // Agregar bordes a cada celda de datos
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // Generar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Crear enlace de descarga
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `camaras_${subview ? subview.replace('cameras-', '') : 'general'}_${dateStr}.xlsx`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar
    URL.revokeObjectURL(url);
  };


  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl border border-[#e2e8f0]">
            <Video className="text-[#002855]" size={20} />
          </div>
          <div>
            <h1 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">SISTEMA CCTV</h1>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span className="flex items-center gap-1"><GiCctvCamera size={12} /> {subview ? getSubtitleFromSubview(subview).toUpperCase() : 'MONITOREO Y VIGILANCIA'}</span>
              <span className="text-[#cbd5e1]">|</span>
              <span className="bg-[#f1f5f9] px-2 py-0.5 rounded text-[#002855]">{cameras.length} Cámaras</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-[#002855]'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-[#002855]'}`}
              title="Vista Listado"
            >
              <List size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {canEdit() && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors text-[10px] font-bold uppercase tracking-widest shadow-sm h-9"
                title="Exportar Excel"
              >
                <RiFileExcel2Line size={14} />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={openCreate}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#002855] text-white rounded-lg hover:bg-[#002855]/90 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm h-9"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Nueva</span>
              </button>
            </>
          )}

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 text-sm"
                placeholder="Buscar cámara, modelo, IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filtro Sede */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 rounded-lg bg-white"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                <option value="todos">Todas las Sedes</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Estado */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 rounded-lg bg-white"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todos">Todos los Estados</option>
                <option value="active">Activo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>

            {/* Filtro Crítico */}
            <div className="flex items-center justify-between sm:justify-start px-2 py-2 sm:py-0 border sm:border-0 border-gray-100 rounded-lg">
              <span className="text-sm font-medium text-gray-700 sm:hidden">Espacio Crítico</span>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={filterStorage}
                  onChange={(e) => setFilterStorage(e.target.checked)}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                <span className="ms-3 text-sm font-medium text-gray-700 hidden sm:inline">Espacio Crítico</span>
              </label>
            </div>
          </div>
        </div>

        {
          loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {filtered.map((cam) => (
                <div key={cam.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200 overflow-hidden">
                  {/* Header con diseño minimalista */}
                  <div className="relative bg-gray-50 px-5 pt-4 pb-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`${cam.status === 'active' ? 'bg-green-500 text-white' :
                          cam.status === 'maintenance' ? 'bg-yellow-500 text-white' :
                            'bg-gray-400 text-white'} rounded-lg p-2.5 shadow-sm`}>
                          <GiCctvCamera size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-base leading-tight group-hover:text-blue-700 transition-colors">{cam.name}</h3>
                            {typeof cam.display_count !== 'undefined' && cam.display_count !== null && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-200 text-gray-700 shadow-sm border border-gray-300">{cam.display_count}</span>
                            )}
                            {cam.access_type && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold shadow-sm bg-gray-100 text-gray-600 border border-gray-200">
                                {humanAccess(cam.access_type)}
                              </span>
                            )}
                          </div>
                          {(cam as any).locations && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                              <MapPin size={14} className="text-red-500" />
                              <span>{(cam as any).locations.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Status badge */}
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1.5 text-xs rounded-full font-bold shadow-sm ${cam.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          cam.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                          {cam.status === 'active' ? '✓ Activo' : cam.status === 'maintenance' ? '⚠ Mantenimiento' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body con mejor espaciado y diseño */}
                  <div className="px-5 pb-4 space-y-4">
                    {/* Información técnica compacta */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {(cam.brand || cam.model) && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs font-medium">MODELO:</span>
                            <span className="font-mono text-xs font-bold text-gray-800">{cam.brand || ''} {cam.model || ''}</span>
                          </div>
                        )}
                        {cam.ip_address && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-xs font-medium">IP:</span>
                            <span className="font-mono text-xs font-bold text-blue-600">{cam.ip_address}</span>
                          </div>
                        )}
                      </div>
                    </div>


                    {/* Credenciales y acceso */}
                    <div className="space-y-3">
                      {cam.url && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 text-xs font-bold">URL:</span>
                              <span className="font-mono text-xs text-gray-800 break-all flex-1">{cam.url}</span>
                            </div>
                            <button
                              onClick={() => window.open(cam.url, '_blank', 'noopener')}
                              className="px-3 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-black transition-colors font-medium shadow-sm"
                              title="Abrir URL"
                            >
                              Abrir
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs font-medium">Usuario:</span>
                            <span className="font-mono text-xs text-gray-800 break-all flex-1">{cam.username || '—'}</span>
                          </div>
                          {cam.username && (
                            <button onClick={() => copyToClipboard(cam.username)} className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" title="Copiar">
                              <Copy size={12} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-xs font-medium">Contraseña:</span>
                            <span className="font-mono text-xs text-gray-800 break-all flex-1">{visiblePasswords.has(cam.id) ? (cam.password || '—') : (cam.password ? '••••••••' : '—')}</span>
                          </div>
                          {cam.password && (
                            <div className="flex gap-1">
                              <button onClick={() => togglePasswordVisible(cam.id)} className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" title={visiblePasswords.has(cam.id) ? 'Ocultar' : 'Mostrar'}>
                                {visiblePasswords.has(cam.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                              <button onClick={() => copyToClipboard(cam.password)} className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors" title="Copiar">
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {cam.auth_code && (
                        <div className="flex items-center justify-between bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-700 text-xs font-medium">Código:</span>
                            <span className="font-mono text-xs text-yellow-800 break-all flex-1">{cam.auth_code}</span>
                          </div>
                          <button onClick={() => copyToClipboard(cam.auth_code)} className="p-1.5 bg-yellow-200 hover:bg-yellow-300 rounded-lg transition-colors" title="Copiar">
                            <Copy size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Almacenamiento mejorado */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-700">💾 Almacenamiento</span>
                        {(cam.camera_disks && cam.camera_disks.length > 0) && (
                          <button
                            onClick={() => toggleStorage(cam.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                          >
                            {expandedStorage.has(cam.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {cam.camera_disks.length} disco{cam.camera_disks.length > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>

                      {(cam.camera_disks && cam.camera_disks.length > 0) ? (
                        <div>
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
                            const remaining = Math.max(0, totals.total - totals.used);
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 font-medium">Uso total:</span>
                                  <span className="font-bold text-gray-800">{totals.used}GB / {totals.total}GB</span>
                                </div>
                                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${percentUsed > 75 ? 'bg-red-500' : percentUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{ width: `${percentUsed}%` }}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                                    {percentUsed}%
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>Libre: {remaining}GB</span>
                                  <span className={percentUsed > 75 ? 'text-red-600 font-bold' : percentUsed > 50 ? 'text-yellow-600 font-bold' : 'text-green-600 font-bold'}>
                                    {percentUsed > 75 ? '⚠️ Crítico (<25%)' : percentUsed > 50 ? '⚠️ Precaución (<50%)' : '✓ Normal (>50%)'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <div className="text-gray-400 text-sm">Sin discos configurados</div>
                        </div>
                      )}
                    </div>

                    {/* Detalles expandidos de almacenamiento */}
                    {cam.camera_disks && cam.camera_disks.length > 0 && expandedStorage.has(cam.id) && (
                      <div className="space-y-2">
                        {cam.camera_disks.map((d) => {
                          const total = Number(d.total_capacity_gb) || 0;
                          const used = Number(d.used_space_gb) || 0;
                          const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((used / total) * 100))) : 0;
                          const remaining = Math.max(0, total - used);
                          return (
                            <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-bold text-gray-700">Disco #{d.disk_number} • {d.disk_type || 'Sin tipo'}</div>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${d.status === 'active' ? 'bg-green-100 text-green-800' :
                                  d.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                    d.status === 'full' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                  }`}>
                                  {d.status === 'active' ? 'Activo' : d.status === 'maintenance' ? 'Mantenimiento' : d.status === 'full' ? 'Lleno' : 'Desconocido'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                <span>Usado: {used}GB</span>
                                <span>Libre: {remaining}GB</span>
                                <span>Total: {total}GB</span>
                              </div>
                              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-300 ${percent > 75 ? 'bg-red-500' : percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Acciones mejoradas */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleView(cam)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        title="Ver detalles"
                      >
                        <Eye size={16} /> Ver
                      </button>
                      {canEdit() && (
                        <>
                          <button
                            onClick={() => openEdit(cam)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
                          >
                            <Edit size={16} /> Editar
                          </button>
                          <button
                            onClick={() => del(cam)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors font-medium border border-gray-200"
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
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Sede</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Modelo</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">IP</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Acceso</th>
                      <th scope="col" className="relative px-6 py-4">
                        <span className="sr-only">Acceso Rápido</span>
                      </th>
                      <th scope="col" className="relative px-6 py-4">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filtered.map((cam) => (
                      <tr key={cam.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`${cam.status === 'active' ? 'bg-green-500 text-white' :
                              cam.status === 'maintenance' ? 'bg-yellow-500 text-white' :
                                'bg-gray-400 text-white'} rounded-lg p-2`}>
                              <GiCctvCamera size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900 leading-tight">{cam.name}</div>
                              {typeof cam.display_count !== 'undefined' && cam.display_count !== null && (
                                <span className="text-xs text-gray-500">Cámaras: {cam.display_count}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(cam as any).locations ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <MapPin size={14} className="text-red-500" />
                              <span>{(cam as any).locations.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(cam.brand || cam.model) ? (
                            <span className="text-sm font-mono font-bold text-gray-800">{cam.brand || ''} {cam.model || ''}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cam.ip_address ? (
                            <span className="text-sm font-mono font-bold text-blue-600">{cam.ip_address}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 text-xs rounded-full font-bold shadow-sm ${cam.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            cam.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                            {cam.status === 'active' ? '✓ Activo' : cam.status === 'maintenance' ? '⚠ Mantenimiento' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {cam.access_type && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold shadow-sm bg-gray-100 text-gray-600 border border-gray-200">
                              {humanAccess(cam.access_type)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {cam.url ? (
                            <button
                              onClick={() => window.open(cam.url, '_blank', 'noopener')}
                              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all shadow-sm border border-slate-100"
                              title="Abrir enlace externo"
                            >
                              <ExternalLink size={18} />
                            </button>
                          ) : (
                            <span className="text-sm text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleView(cam)}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                              title="Ver detalles"
                            >
                              <Eye size={16} />
                            </button>
                            {canEdit() && (
                              <>
                                <button
                                  onClick={() => openEdit(cam)}
                                  className="p-2 text-slate-600 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                                  title="Editar"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => del(cam)}
                                  className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all"
                                  title="Eliminar"
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
          )
        }

        {
          showDetails && selectedCamera && (
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
                            <span className={`px-2 py-1 text-xs rounded-full font-medium shadow-sm border ${selectedCamera.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              selectedCamera.status === 'maintenance' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                'bg-slate-100 text-slate-800 border-slate-200'
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

                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Acceso y Credenciales</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Tipo de acceso:</span>
                            <span className={`px-2 py-1 text-xs rounded-full font-medium shadow-sm border ${selectedCamera.access_type === 'url' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              selectedCamera.access_type === 'ivms' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                selectedCamera.access_type === 'esviz' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                  'bg-gray-100 text-gray-800 border-gray-200'
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
                                  className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-black transition-colors"
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
                                      className={`h-full ${percentUsed > 75 ? 'bg-red-500' : percentUsed > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
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
                                      <div className={`h-full ${percent > 75 ? 'bg-red-500' : percent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${percent}%` }} />
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
          )
        }

        {
          showForm && (
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
          )
        }
      </div >
    </div>
  );
}






