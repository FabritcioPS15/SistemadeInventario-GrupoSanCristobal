import { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Car, LayoutGrid, List, MapPin, Search, ChevronDown, AlertTriangle } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import VehicleImportModal from '../components/VehicleImportModal';
import FlotaVehicularForm from '../components/forms/FlotaVehicularForm';
import Pagination from '../components/Pagination';
import { supabase, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { vehicleService } from '../services/vehicleService';

type Vehiculo = {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  año: number;
  estado: 'activa' | 'inactiva' | 'en_proceso';
  ubicacion_actual: string;
  imagen_url?: string;
  fecha_ultimo_mantenimiento: string;
  notas: string;
  citv_emision?: string;
  citv_vencimiento?: string;
  soat_emision?: string;
  soat_vencimiento?: string;
  poliza_emision?: string;
  poliza_vencimiento?: string;
  contrato_alquiler_emision?: string;
  contrato_alquiler_vencimiento?: string;
  color?: string;
  image_position?: string;
};

export default function FlotaVehicular() {
  const { canEdit } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<Vehiculo | undefined>();
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [schools, setSchools] = useState<Location[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showVencimientoMenu, setShowVencimientoMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const vencimientoMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
      if (vencimientoMenuRef.current && !vencimientoMenuRef.current.contains(event.target as Node)) {
        setShowVencimientoMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSchools();
    fetchVehiculos();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase.from('locations').select('*').order('name');
      if (!error && data) setSchools(data as Location[]);
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getAll();
      setVehiculos(data || []);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getEscuelaNombre = (ubicacionActual: string) => {
    const school = schools.find(s => s.id === ubicacionActual);
    return school ? school.name : (ubicacionActual || 'Sin asignar');
  };

  const getDateColor = (vencimiento: string | undefined) => {
    if (!vencimiento) return 'text-slate-400';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const vencDate = new Date(vencimiento); vencDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((vencDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 0) return 'text-rose-600 font-black';
    if (daysUntil <= 15) return 'text-amber-600 font-black';
    return 'text-slate-600 font-bold';
  };

  // Días restantes hasta vencimiento (negativo = ya venció)
  const getDaysUntil = (fecha?: string): number => {
    if (!fecha) return Infinity;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(fecha); d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / 86400000);
  };

  // Vehículos con algún documento vencido o por vencer en <= 30 días
  const getVencimientoReport = () => {
    const DIAS_ALERTA = 30;
    return vehiculos
      .filter(v => {
        const dias = [
          getDaysUntil(v.citv_vencimiento),
          getDaysUntil(v.soat_vencimiento),
          getDaysUntil(v.poliza_vencimiento),
        ];
        return dias.some(d => d <= DIAS_ALERTA);
      })
      .sort((a, b) => {
        // Ordenar por el documento más urgente primero
        const minA = Math.min(
          getDaysUntil(a.citv_vencimiento),
          getDaysUntil(a.soat_vencimiento),
          getDaysUntil(a.poliza_vencimiento),
        );
        const minB = Math.min(
          getDaysUntil(b.citv_vencimiento),
          getDaysUntil(b.soat_vencimiento),
          getDaysUntil(b.poliza_vencimiento),
        );
        return minA - minB;
      });
  };


  const handleExportVencimientosExcel = async () => {
    try {
      const reporte = getVencimientoReport();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Vencimientos');

      ws.columns = [
        { header: 'PLACA', key: 'placa', width: 14 },
        { header: 'MARCA / MODELO', key: 'vehiculo', width: 25 },
        { header: 'SEDE', key: 'sede', width: 28 },
        { header: 'CITV VENCE', key: 'citv', width: 16 },
        { header: 'CITV ESTADO', key: 'citv_estado', width: 20 },
        { header: 'SOAT VENCE', key: 'soat', width: 16 },
        { header: 'SOAT ESTADO', key: 'soat_estado', width: 20 },
        { header: 'PÓLIZA VENCE', key: 'poliza', width: 16 },
        { header: 'PÓLIZA ESTADO', key: 'poliza_estado', width: 20 },
      ];

      // Estilo encabezado
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002855' } };
      ws.getRow(1).height = 24;

      const estadoDoc = (fecha?: string) => {
        if (!fecha) return 'Sin fecha';
        const d = getDaysUntil(fecha);
        if (d <= 0) return `VENCIDO (${Math.abs(d)} días)`;
        if (d <= 7) return `CRÍTICO (${d} días)`;
        if (d <= 30) return `POR VENCER (${d} días)`;
        if (d >= 270) return `VIGENTE (${d} días)`;
        return `OK (${d} días)`;
      };

      // Color de fila por documento más urgente
      const fillColor = (minDias: number) => {
        if (minDias <= 7) return { argb: 'FFFDE8E8' }; // rojo claro
        if (minDias <= 30) return { argb: 'FFFFF3CD' }; // amarillo
        if (minDias >= 270) return { argb: 'FFD1FAE5' }; // verde claro
        return null; // sin color
      };

      reporte.forEach(v => {
        const row = ws.addRow({
          placa: v.placa,
          vehiculo: `${v.marca} ${v.modelo}`,
          sede: getEscuelaNombre(v.ubicacion_actual),
          citv: v.citv_vencimiento ? new Date(v.citv_vencimiento).toLocaleDateString('es-PE') : '—',
          citv_estado: estadoDoc(v.citv_vencimiento),
          soat: v.soat_vencimiento ? new Date(v.soat_vencimiento).toLocaleDateString('es-PE') : '—',
          soat_estado: estadoDoc(v.soat_vencimiento),
          poliza: v.poliza_vencimiento ? new Date(v.poliza_vencimiento).toLocaleDateString('es-PE') : '—',
          poliza_estado: estadoDoc(v.poliza_vencimiento),
        });

        // Colorear fila según urgencia
        const minDias = Math.min(
          getDaysUntil(v.citv_vencimiento),
          getDaysUntil(v.soat_vencimiento),
          getDaysUntil(v.poliza_vencimiento),
        );
        const color = fillColor(minDias);
        if (color) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: color };
        }

        row.eachCell(cell => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle' };
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vencimientos_Flota_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setShowVencimientoMenu(false);
    } catch (e) { console.error(e); }
  };

  const handleExportVencimientosPdf = () => {
    try {
      const reporte = getVencimientoReport();
      const doc = new jsPDF('l', 'mm', 'a4');

      doc.setFontSize(16);
      doc.setTextColor(0, 40, 85);
      doc.text('Reporte de Vencimientos — Flota Vehicular', 14, 18);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')} | Vehículos con documentos vencidos o por vencer en 30 días`, 14, 25);

      const tableData = reporte.map(v => {
        const fmtDate = (f?: string) => f ? new Date(f).toLocaleDateString('es-PE') : '—';
        const fmtDias = (f?: string) => {
          if (!f) return '—';
          const d = getDaysUntil(f);
          if (d <= 0) return `VENCIDO (${Math.abs(d)}d)`;
          return `${d} días`;
        };
        return [
          v.placa,
          `${v.marca} ${v.modelo}`,
          getEscuelaNombre(v.ubicacion_actual),
          fmtDate(v.citv_vencimiento),
          fmtDias(v.citv_vencimiento),
          fmtDate(v.soat_vencimiento),
          fmtDias(v.soat_vencimiento),
          fmtDate(v.poliza_vencimiento),
          fmtDias(v.poliza_vencimiento),
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: [['Placa', 'Vehículo', 'Sede', 'CITV Vence', 'CITV Estado', 'SOAT Vence', 'SOAT Estado', 'Póliza Vence', 'Póliza Estado']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 40, 85], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 7.5, cellPadding: 2 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const v = reporte[data.row.index];
            const minDias = Math.min(
              getDaysUntil(v.citv_vencimiento),
              getDaysUntil(v.soat_vencimiento),
              getDaysUntil(v.poliza_vencimiento),
            );
            if (minDias <= 7) data.cell.styles.fillColor = [253, 232, 232]; // rojo claro
            else if (minDias <= 30) data.cell.styles.fillColor = [255, 243, 205]; // amarillo
            else if (minDias >= 270) data.cell.styles.fillColor = [209, 250, 229]; // verde claro
            // else: sin color
          }
        }
      });

      doc.save(`Vencimientos_Flota_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowVencimientoMenu(false);
    } catch (e) { console.error(e); }
  };

  const filteredVehiculos = useMemo(() => {
    return vehiculos.filter(v => {
      const q = search.toLowerCase();
      const searchMatch = !search || v.placa.toLowerCase().includes(q) || v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q);
      const sedeMatch = selectedLocations.length === 0 || selectedLocations.length === schools.length || selectedLocations.includes(v.ubicacion_actual);
      const estadoMatch = filterEstado === 'todos' || v.estado === filterEstado;
      return searchMatch && sedeMatch && estadoMatch;
    });
  }, [vehiculos, search, selectedLocations, filterEstado, schools.length]);

  const sortedVehiculos = useMemo(() => {
    if (!sortConfig) return filteredVehiculos;
    return [...filteredVehiculos].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Vehiculo];
      const bVal = b[sortConfig.key as keyof Vehiculo];
      if (aVal === bVal) return 0;
      const res = aVal! < bVal! ? -1 : 1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }, [filteredVehiculos, sortConfig]);

  const totalPages = Math.ceil(sortedVehiculos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehiculos = sortedVehiculos.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (v: Vehiculo) => {
    setEditing(v);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta unidad de la flota?')) return;
    try {
      await vehicleService.delete(id);
      await fetchVehiculos();
      alert('Unidad eliminada correctamente');
    } catch (e) {
      alert('Error al eliminar la unidad');
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Flota');
      ws.columns = [
        { header: 'PLACA', key: 'placa', width: 15 },
        { header: 'MARCA', key: 'marca', width: 20 },
        { header: 'MODELO', key: 'modelo', width: 20 },
        { header: 'AÑO', key: 'año', width: 10 },
        { header: 'ESTADO', key: 'estado', width: 15 },
        { header: 'UBICACIÓN', key: 'ubicacion_actual', width: 30 }
      ];
      filteredVehiculos.forEach(v => ws.addRow({
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        año: v.año,
        estado: v.estado,
        ubicacion_actual: getEscuelaNombre(v.ubicacion_actual)
      }));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Flota_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
    } catch (e) { console.error(e) }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const tableData = filteredVehiculos.map(v => [
      v.placa,
      v.marca,
      v.modelo,
      v.año.toString(),
      v.estado,
      getEscuelaNombre(v.ubicacion_actual)
    ]);

    autoTable(doc, {
      head: [['PLACA', 'MARCA', 'MODELO', 'AÑO', 'ESTADO', 'UBICACIÓN']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 40, 85] }
    });

    doc.save(`Flota_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const statusColors: Record<string, string> = {
    activa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactiva: 'bg-rose-50 text-rose-700 border-rose-200',
    en_proceso: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Action Bar — Standardized */}
        <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
          <div className="absolute -top-3 -left-3">
            <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
              {filteredVehiculos.length} Unidades
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 relative group/search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
            <input
              type="text"
              placeholder="BUSCAR POR PLACA, MARCA O MODELO..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 uppercase tracking-[0.1em]"
            />
          </div>

          {/* Filters + Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[220px]"
              >
                <MapPin size={14} className="text-rose-500" />
                <span className="truncate">{selectedLocations.length === 0 || selectedLocations.length === schools.length ? 'Todas las sedes' : `${selectedLocations.length} Sedes`}</span>
                <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showLocationDropdown && (
                <div className="absolute top-full right-0 z-[70] mt-2 bg-white border border-slate-200 shadow-2xl min-w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 max-h-[300px] overflow-y-auto">
                    <label className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer group/loc">
                      <input
                        type="checkbox"
                        checked={selectedLocations.length === schools.length}
                        onChange={() => { setSelectedLocations(selectedLocations.length === schools.length ? [] : schools.map(l => l.id)); setCurrentPage(1); }}
                        className="w-4 h-4 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                      />
                      <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest">Todas las sedes</span>
                    </label>
                    <div className="h-px bg-slate-100 my-1" />
                    {schools.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer group/loc">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(loc.id)}
                          onChange={() => {
                            setSelectedLocations(prev => prev.includes(loc.id) ? prev.filter(id => id !== loc.id) : [...prev, loc.id]);
                            setCurrentPage(1);
                          }}
                          className="w-4 h-4 rounded-none border-slate-300 text-[#002855] focus:ring-[#002855]"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-none group-hover/loc:text-[#002855] transition-colors">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <select
              value={filterEstado}
              onChange={e => { setFilterEstado(e.target.value); setCurrentPage(1); }}
              className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
              <option value="en_proceso">En Proceso</option>
            </select>

            <div className="flex bg-slate-100 p-1 border border-slate-200">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400'}`} title="Vista Cuadrícula"><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 transition-all ${viewMode === 'table' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400'}`} title="Vista Tabla"><List size={16} /></button>
            </div>

            {canEdit() && (
              <button
                onClick={() => { setEditing(undefined); setView(view === 'form' ? 'list' : 'form'); }}
                className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${view === 'form' ? 'bg-slate-800 text-white' : 'bg-[#002855] text-white hover:bg-blue-800'}`}
              >
                {view === 'form' ? <List size={14} /> : <Plus size={14} />}
                {view === 'form' ? 'Ver Lista' : 'Nueva Unidad'}
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
              title="Exportar flota completa a Excel"
            >
              <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              onClick={handleExportPdf}
              className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
              title="Exportar flota completa a PDF"
            >
              <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
            </button>

            {/* Reporte de Vencimientos */}
            <div className="relative" ref={vencimientoMenuRef}>
              <button
                onClick={() => setShowVencimientoMenu(v => !v)}
                className={`flex items-center gap-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${getVencimientoReport().length > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                title="Reporte de vencimientos CITV / SOAT / Póliza"
              >
                <AlertTriangle size={20} className={getVencimientoReport().length > 0 ? 'text-slate-500' : 'text-slate-300 group-hover:text-slate-500 group-hover:border-slate-500 group-hover:bg-slate-50 group-hover:text-slate-500 transition-colors'} />
                {getVencimientoReport().length > 0 && (
                  <span className="bg-slate-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {getVencimientoReport().length}
                  </span>
                )}
                <ChevronDown size={16} className={`transition-transform ${showVencimientoMenu ? 'rotate-180' : ''}`} />
              </button>

              {showVencimientoMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl z-50 min-w-[230px]">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descargar Reporte</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">CITV / SOAT / Póliza vencidos o próximos a vencer (30 días)</p>
                  </div>
                  <button
                    onClick={handleExportVencimientosExcel}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <RiFileExcel2Fill size={16} className="text-emerald-600" />
                    Exportar a Excel
                  </button>
                  <button
                    onClick={handleExportVencimientosPdf}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-50"
                  >
                    <FaFilePdf size={16} className="text-rose-500" />
                    Exportar a PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {view === 'form' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-8">
              <div className="mb-8 border-b border-gray-100 pb-6">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                  {editing ? 'Actualización de Unidad' : 'Registro de Nueva Unidad'}
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium italic">Gestione los detalles técnicos y administrativos de la flota vehicular.</p>
              </div>
              <FlotaVehicularForm
                onClose={() => setView('list')}
                onSave={() => { fetchVehiculos(); setView('list'); setEditing(undefined); }}
                editVehicle={editing}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
              </div>
            ) : viewMode === 'table' ? (
              <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50/50 border-b border-slate-100 shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedVehiculos.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-6 py-5 text-left cursor-pointer" onClick={() => handleSort('placa')}><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Unidad</span></th>
                        <th className="px-4 py-5 text-left cursor-pointer" onClick={() => handleSort('estado')}><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                        <th className="px-4 py-5 text-left cursor-pointer" onClick={() => handleSort('ubicacion_actual')}><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span></th>
                        <th className="px-4 py-5 text-left cursor-pointer" onClick={() => handleSort('citv_vencimiento')}><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">CITV (Vence)</span></th>
                        <th className="px-4 py-5 text-left cursor-pointer" onClick={() => handleSort('soat_vencimiento')}><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">SOAT (Vence)</span></th>
                        <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedVehiculos.map(v => (
                        <tr key={v.id} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0" onDoubleClick={() => handleEdit(v)}>
                          <td className="px-6 py-5 font-bold text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                <Car size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{v.placa}</span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{v.marca} {v.modelo}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-left">
                            <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${statusColors[v.estado]}`}>
                              {v.estado === 'en_proceso' ? 'En Proceso' : v.estado}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-left">
                            <span className="text-sm font-extrabold text-[#002855] uppercase truncate max-w-xs block">{getEscuelaNombre(v.ubicacion_actual)}</span>
                          </td>
                          <td className="px-4 py-5 text-left">
                            <span className={getDateColor(v.citv_vencimiento)}>
                              {v.citv_vencimiento ? new Date(v.citv_vencimiento).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-left">
                            <span className={getDateColor(v.soat_vencimiento)}>
                              {v.soat_vencimiento ? new Date(v.soat_vencimiento).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {canEdit() && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(v); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-none border border-slate-100 transition-all shadow-sm"><Trash2 size={14} /></button>
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
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedVehiculos.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {paginatedVehiculos.map(v => (
                    <div key={v.id} className="bg-white rounded-2xl shadow-sm border hover:shadow-xl transition-all p-6 flex flex-col group overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-black text-[#002855] uppercase leading-none mb-1">{v.placa}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{v.marca} {v.modelo}</p>
                        </div>
                        <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${statusColors[v.estado]}`}>
                          {v.estado === 'en_proceso' ? 'En Proceso' : v.estado}
                        </span>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase">
                          <MapPin size={14} className="text-rose-500" />
                          <span className="truncate">{getEscuelaNombre(v.ubicacion_actual)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">CITV</label>
                            <span className={`text-[11px] ${getDateColor(v.citv_vencimiento)}`}>
                              {v.citv_vencimiento ? new Date(v.citv_vencimiento).toLocaleDateString() : '—'}
                            </span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">SOAT</label>
                            <span className={`text-[11px] ${getDateColor(v.soat_vencimiento)}`}>
                              {v.soat_vencimiento ? new Date(v.soat_vencimiento).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex gap-2 pt-4 border-t border-slate-50">
                        {canEdit() && (
                          <>
                            <button onClick={() => handleEdit(v)} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm">Editar</button>
                            <button onClick={() => handleDelete(v.id)} className="p-2 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && sortedVehiculos.length === 0 && (
              <div className="text-left py-12">
                <p className="text-gray-500 font-medium">No se encontraron unidades registradas.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <VehicleImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={fetchVehiculos} locations={schools} />
    </div>
  );
}