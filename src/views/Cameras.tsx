import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, MapPin, Eye, X, Copy, ChevronDown, ChevronUp, EyeOff, LayoutGrid, List, Star, Video, ArrowRight } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { GiCctvCamera } from 'react-icons/gi';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase, Camera as CameraType, Location } from '../lib/supabase';
import CameraForm from '../components/forms/CameraForm';
import { useAuth } from '../contexts/AuthContext';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import Pagination from '../components/Pagination';

type Camera = CameraType;

type CamerasProps = {
  subview?: string;
};

export default function Cameras({ subview }: CamerasProps) {
  const { canEdit, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editing, setEditing] = useState<Camera | undefined>();
  const [selectedCamera, setSelectedCamera] = useState<Camera | undefined>();
  const [expandedStorage, setExpandedStorage] = useState<Set<string>>(new Set());
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [filterLocation, setFilterLocation] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterStorage, setFilterStorage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  useEffect(() => {
    // Show welcome popup only once per session or on first entry
    const hasSeenWelcome = sessionStorage.getItem('cameras_welcome_seen');
    if (!hasSeenWelcome) {
      setTimeout(() => setShowWelcomePopup(true), 800);
      sessionStorage.setItem('cameras_welcome_seen', 'true');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchCameras(), fetchLocations()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const handleNewCamera = () => openCreate();
    const handleExport = () => handleExportExcel();
    const handleExportPdf = () => handleExportPDF();
    const handleToggleView = () => setViewMode(prev => prev === 'grid' ? 'table' : 'grid');

    window.addEventListener('cameras:new', handleNewCamera);
    window.addEventListener('cameras:export', handleExport);
    window.addEventListener('cameras:export-pdf', handleExportPdf);
    window.addEventListener('cameras:toggle-view', handleToggleView);

    return () => {
      window.removeEventListener('cameras:new', handleNewCamera);
      window.removeEventListener('cameras:export', handleExport);
      window.removeEventListener('cameras:export-pdf', handleExportPdf);
      window.removeEventListener('cameras:toggle-view', handleToggleView);
    };
  }, [cameras, filterLocation, filterStatus, filterStorage, viewMode]);

  const fetchCameras = async () => {
    let query = supabase
      .from('cameras')
      .select('*, locations(*), camera_disks(*)');

    // Si el usuario es administrador, filtrar por su sede
    if (user?.role === 'administradores' && user?.location_id) {
      query = query.eq('location_id', user.location_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
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

  const filteredCameras = cameras.filter((c) => {
    // Filtro por subview (tipo de ubicación)
    const locationType = getLocationTypeFromSubview(subview);
    if (locationType && (c as any).locations?.type !== locationType) {
      return false;
    }

    // Filtro por búsqueda
    const matchesSearch = !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.model?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const totalPages = Math.ceil(filteredCameras.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredCameras.slice(startIndex, startIndex + itemsPerPage);

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const title = `Reporte Detallado de Cámaras - ${new Date().toLocaleDateString()}`;

      doc.setFontSize(18);
      doc.setTextColor(0, 40, 85);
      doc.text(title, 14, 20);

      const tableData = filteredCameras.map(c => [
        c.name,
        (c as any).locations?.name || '—',
        c.brand || '—',
        c.model || '—',
        c.ip_address || '—',
        c.display_count || '0', // Capacidad
        c.camera_disks?.map(d => `D${d.disk_number}: ${d.total_capacity_gb}GB (${d.disk_type})`).join('\n') || 'Sin discos',
        c.camera_disks?.map(d => `D${d.disk_number}: ${d.remaining_capacity_gb || 0}GB`).join('\n') || '—'
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['Cámara', 'Ubicación', 'Marca', 'Modelo', 'IP', 'Cap.', 'Discos Duros', 'Espacio Libre']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 40, 85], textColor: 255, fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          5: { halign: 'center', cellWidth: 15 }, // Capacidad
          6: { fontSize: 7, cellWidth: 35 }, // Discos
          7: { fontSize: 7, cellWidth: 25 } // Espacio Libre
        }
      });

      doc.save(`Reporte_Camaras_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

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
      { header: 'Capacidad', key: 'capacity', width: 15 },
      { header: 'Discos Duros', key: 'disks', width: 35 },
      { header: 'Espacio Libre', key: 'free_space', width: 25 },
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
    filteredCameras.forEach((camera) => {
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
        capacity: camera.display_count || '0',
        disks: camera.camera_disks?.map(d => `D${d.disk_number}: ${d.total_capacity_gb}GB (${d.disk_type})`).join('\n') || 'Sin discos',
        free_space: camera.camera_disks?.map(d => `D${d.disk_number}: ${d.remaining_capacity_gb || 0}GB`).join('\n') || '—',
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
          <div className="hidden lg:block">
            <h1 className="text-[13px] font-black text-[#002855] uppercase tracking-wider leading-none">Cámaras</h1>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5 block leading-none">{subview ? getSubtitleFromSubview(subview).toUpperCase() : 'MONITOREO INTEGRAL'}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Plus size={14} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="BUSCAR CÁMARA POR NOMBRE, IP, MARCA..."
              className="block w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-none text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {canEdit() && (
            <>
              <button
                onClick={handleExportPDF}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-none transition-all"
                title="Exportar PDF"
              >
                <FaFilePdf size={18} />
              </button>
              <button
                onClick={handleExportExcel}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-none transition-all"
                title="Exportar Excel"
              >
                <RiFileExcel2Fill size={18} />
              </button>
            </>
          )}

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setShowWelcomePopup(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm"
          >
            <Star size={14} />
            Indicaciones
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1" />
          <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-none transition-colors" onClick={() => window.location.href = '#'}><X size={18} /></button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">

        <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
          <div className="absolute -top-3 -left-3">
            <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
              {filteredCameras.length} Equipos
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
              <MapPin size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sede:</span>
              <select
                className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                <option value="todos">TODAS LAS SEDES</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
              <Plus size={14} className="text-slate-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado:</span>
              <select
                className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="todos">TODOS LOS ESTADOS</option>
                <option value="active">ACTIVO</option>
                <option value="maintenance">MANTENIMIENTO</option>
                <option value="inactive">INACTIVO</option>
              </select>
            </div>

            <div className="flex items-center gap-3 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Star size={12} /> Crítico:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={filterStorage}
                  onChange={(e) => setFilterStorage(e.target.checked)}
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {canEdit() && (
            <button
              onClick={openCreate}
              className="bg-[#002855] text-white px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2 group"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              Agregar Equipo
            </button>
          )}
        </div>

        {
          loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {paginatedData.map((cam) => (
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
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium hidden sm:block">
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
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-50/50 border-b border-slate-100 relative z-20">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCameras.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Cámara</span></th>
                      <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span></th>
                      <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">IP / Puerto</span></th>
                      <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                      <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Almacenamiento</span></th>
                      <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tecnología</span></th>
                      <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((cam) => (
                      <tr key={cam.id} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0" onClick={() => handleView(cam)}>
                        <td className="px-6 py-5 font-bold text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white">
                              <GiCctvCamera size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{cam.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{cam.brand || ''} {cam.model || ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className="text-sm font-extrabold text-slate-600 truncate max-w-xs block">{(cam as any).locations?.name || 'Sede N/A'}</span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className="text-[12px] font-mono font-black text-blue-600">{cam.ip_address || '—'}:{cam.port || '—'}</span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${cam.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                            {cam.status === 'active' ? 'ACTIVO' : cam.status === 'maintenance' ? 'MANTENIMIENTO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-left">
                          {cam.camera_disks && cam.camera_disks.length > 0 ? (
                            <div className="flex flex-col gap-1 min-w-[120px]">
                              {(() => {
                                const totals = cam.camera_disks!.reduce(
                                  (acc, d) => ({
                                    total: acc.total + (Number(d.total_capacity_gb) || 0),
                                    used: acc.used + (Number(d.used_space_gb) || 0)
                                  }),
                                  { total: 0, used: 0 }
                                );
                                const percent = totals.total > 0 ? Math.min(100, Math.round((totals.used / totals.total) * 100)) : 0;
                                return (
                                  <>
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                                      <span>{totals.used}/{totals.total}GB</span>
                                      <span>{percent}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                                      <div
                                        className={`h-full ${percent > 75 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">SIN DISCOS</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-left">
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">{humanAccess(cam.access_type)}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); handleView(cam); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm" title="Ver Detalles"><Eye size={14} /></button>
                            {canEdit() && (
                              <>
                                <button onClick={e => { e.stopPropagation(); openEdit(cam); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Edit size={14} /></button>
                                <button onClick={e => { e.stopPropagation(); del(cam); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Trash2 size={14} /></button>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white border border-slate-200 shadow-2xl w-full max-w-5xl relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header Enterprise */}
                <div className="bg-[#002855] px-8 py-6 flex items-center justify-between relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <GiCctvCamera size={24} />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-black text-white uppercase tracking-tight leading-none">
                        {selectedCamera.name}
                      </h2>
                      <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                        <MapPin size={10} />
                        {(selectedCamera as any).locations?.name || 'SEDE INTEGRAL'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Columna 1: Especificaciones */}
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600" />
                        <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-widest">Especificaciones</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado Operativo</span>
                            <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${selectedCamera.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              selectedCamera.status === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                              {selectedCamera.status === 'active' ? 'Activo' : selectedCamera.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marca / Modelo</span>
                            <span className="text-[11px] font-black text-[#002855] uppercase">
                              {selectedCamera.brand || 'GENÉRICA'} {selectedCamera.model || ''}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Flujos de Video</span>
                            <span className="text-[11px] font-black text-[#002855]">{selectedCamera.display_count || '0'} CÁMARAS</span>
                          </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registro de Alta</span>
                            <span className="text-[11px] font-black text-slate-600 italic">
                              {new Date(selectedCamera.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Último Cambio</span>
                            <span className="text-[11px] font-black text-slate-600 italic">
                              {new Date(selectedCamera.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Seguridad y Red */}
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600" />
                        <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-widest">Accesos y Red</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 border border-slate-100">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Conexión</span>
                            <span className="px-3 py-1 bg-white border border-slate-200 text-[10px] font-black text-blue-600 uppercase tracking-tighter shadow-sm">
                              {humanAccess(selectedCamera.access_type)}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-white border border-slate-200 p-2 group relative">
                              <span className="text-[9px] font-black text-slate-400 uppercase absolute -top-2 left-2 bg-white px-1">Dirección IPv4</span>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-mono text-xs font-black text-blue-600">{selectedCamera.ip_address || '0.0.0.0'}</span>
                                <span className="font-mono text-[10px] font-bold text-slate-400">PORT: {selectedCamera.port || '—'}</span>
                              </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-2 group relative">
                              <span className="text-[9px] font-black text-slate-400 uppercase absolute -top-2 left-2 bg-white px-1">Usuario GS</span>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[11px] font-black text-[#002855]">{selectedCamera.username || '—'}</span>
                                <button onClick={() => copyToClipboard(selectedCamera.username)} className="p-1 hover:text-blue-600 transition-colors">
                                  <Copy size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="bg-white border border-slate-200 p-2 group relative">
                              <span className="text-[9px] font-black text-slate-400 uppercase absolute -top-2 left-2 bg-white px-1">Credenciales</span>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-mono text-xs font-bold text-slate-600 tracking-widest">
                                  {visiblePasswords.has(selectedCamera.id) ? (selectedCamera.password || '—') : (selectedCamera.password ? '••••••••' : '—')}
                                </span>
                                <div className="flex gap-1">
                                  <button onClick={() => togglePasswordVisible(selectedCamera.id)} className="p-1 hover:text-blue-600 transition-colors">
                                    {visiblePasswords.has(selectedCamera.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                  <button onClick={() => copyToClipboard(selectedCamera.password)} className="p-1 hover:text-blue-600 transition-colors">
                                    <Copy size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {selectedCamera.auth_code && (
                              <div className="bg-blue-50 border border-blue-100 p-3 flex items-center justify-between">
                                <div>
                                  <span className="block text-[8px] font-black text-blue-400 uppercase tracking-widest">CÓDIGO DE VERIFICACIÓN</span>
                                  <span className="font-mono text-sm font-black text-blue-700 uppercase tracking-widest">{selectedCamera.auth_code}</span>
                                </div>
                                <button onClick={() => copyToClipboard(selectedCamera.auth_code)} className="p-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                  <Copy size={14} />
                                </button>
                              </div>
                            )}

                            {selectedCamera.url && (
                              <div className="pt-2">
                                <button
                                  onClick={() => window.open(selectedCamera.url, '_blank', 'noopener')}
                                  className="w-full py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-2 group"
                                >
                                  Visualizar Cámaras
                                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <span className="block text-[9px] text-slate-400 font-bold mt-2 truncate italic">{selectedCamera.url}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Columna 3: Almacenamiento */}
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600" />
                        <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-widest">Almacenamiento</h3>
                      </div>

                      <div className="space-y-4">
                        {selectedCamera.camera_disks && selectedCamera.camera_disks.length > 0 ? (
                          <div className="space-y-4">
                            {/* Resumen Total */}
                            {(() => {
                              const totals = selectedCamera.camera_disks!.reduce(
                                (acc, d) => ({
                                  total: acc.total + (Number(d.total_capacity_gb) || 0),
                                  used: acc.used + (Number(d.used_space_gb) || 0)
                                }),
                                { total: 0, used: 0 }
                              );
                              const percent = totals.total > 0 ? Math.min(100, Math.round((totals.used / totals.total) * 100)) : 0;
                              return (
                                <div className="p-4 bg-slate-900 text-white relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl" />
                                  <div className="relative z-10">
                                    <div className="flex justify-between items-end mb-4">
                                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Capacidad Global</span>
                                      <span className="text-[20px] font-black tracking-tighter">{percent}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2 rounded-none mb-3">
                                      <div
                                        className={`h-full transition-all duration-1000 ${percent > 75 ? 'bg-rose-500' : percent > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter">
                                      <span>Ocupado: {totals.used}GB</span>
                                      <span className="text-blue-400">Total: {totals.total}GB</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Desglose de Discos */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {selectedCamera.camera_disks.map((d) => {
                                const total = Number(d.total_capacity_gb) || 0;
                                const used = Number(d.used_space_gb) || 0;
                                const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
                                return (
                                  <div key={d.id} className="p-3 bg-white border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest">Disco #{d.disk_number}</span>
                                      <span className={`text-[8px] font-black px-2 py-0.5 border ${d.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        d.status === 'full' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                        {d.status?.toUpperCase() || 'OFFLINE'}
                                      </span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-1 mb-2">
                                      <div className={`h-full ${percent > 75 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                      <span>TIPO: {d.disk_type || 'GS-SATA'}</span>
                                      <span>{used}/{total}GB</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 border-2 border-dashed border-slate-200 text-center">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin registro de almacenamiento</span>
                          </div>
                        )}

                        {selectedCamera.notes && (
                          <div className="p-4 bg-amber-50 border border-amber-100 mt-4">
                            <span className="block text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Star size={10} /> Notas Técnicas
                            </span>
                            <p className="text-[11px] font-medium text-amber-900 leading-relaxed italic">
                              "{selectedCamera.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Footer Enterprise */}
                <div className="bg-slate-50 border-t border-slate-200 px-8 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistema GS Autenticado</span>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-6 py-2 bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                  >
                    Cerrar Detalle
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {showForm && (
          <CameraForm
            onClose={() => setShowForm(false)}
            onSave={onSave}
            editCamera={editing}
          />
        )}
      </div >
      {showWelcomePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001529]/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 shadow-2xl w-full max-w-lg relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
            <div className="p-8">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-inner">
                  <Video size={32} />
                </div>
                <h3 className="text-[20px] font-black text-[#002855] uppercase tracking-tight mb-2">Protocolo de Monitoreo</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">SISTEMA INTEGRAL DE VIDEOVIGILANCIA GS</p>
                <div className="w-12 h-1 bg-blue-600 rounded-none mb-6" />
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex gap-4 p-4 bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 shrink-0 bg-white border border-slate-200 flex items-center justify-center text-[12px] font-black text-blue-600 italic">01</div>
                  <div>
                    <h4 className="text-[11px] font-black text-[#002855] uppercase tracking-widest mb-1">Verificación de IP</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Asegúrese de estar conectado a la red local de la sede para acceder a las cámaras por IP directa.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 shrink-0 bg-white border border-slate-200 flex items-center justify-center text-[12px] font-black text-blue-600 italic">02</div>
                  <div>
                    <h4 className="text-[11px] font-black text-[#002855] uppercase tracking-widest mb-1">Acceso IVMS/ESVIZ</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Utilice los códigos de verificación proporcionados para los equipos con tecnología cloud P2P.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 shrink-0 bg-white border border-slate-200 flex items-center justify-center text-[12px] font-black text-blue-600 italic">03</div>
                  <div>
                    <h4 className="text-[11px] font-black text-[#002855] uppercase tracking-widest mb-1">Reporte de Fallas</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Cualquier inconsistencia en el almacenamiento debe ser reportada inmediatamente en la sección de mantenimiento.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowWelcomePopup(false)}
                className="w-full py-4 bg-[#002855] text-white text-[12px] font-black uppercase tracking-[0.2em] hover:bg-blue-800 transition-all shadow-lg flex items-center justify-center gap-3 group"
              >
                ENTENDIDO, CONTINUAR
                <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



