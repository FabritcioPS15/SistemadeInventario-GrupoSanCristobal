import { useEffect, useState, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, MapPin, X, Car, LayoutGrid, List, Search, ChevronDown, AlertTriangle, ArrowUpDown, Calendar, CheckCircle2 } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import VehicleImportModal from '../components/VehicleImportModal';
import FlotaVehicularForm from '../forms/FlotaVehicularForm';
import Pagination from '../../../shared/components/ui/Pagination';
import { supabase, Location } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthContext';
import { useNotify } from '../../../shared/hooks/useNotify';
import DetailModal, {
  DetailModalHeader,
  DetailModalBody,
  StandardModalFooter,
} from '../../../shared/components/ui/DetailModal';

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
  const { success: notifySuccess, error: notifyError, confirm } = useNotify();
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
  const [showDetails, setShowDetails] = useState(false);
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | undefined>();
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
      const { data, error } = await supabase.from('vehiculos').select('*').order('placa');
      if (error) throw error;
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



  // Días restantes hasta vencimiento (negativo = ya venció)
  const getDaysUntil = (fecha?: string): number => {
    if (!fecha) return Infinity;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(fecha + 'T00:00:00'); d.setHours(0, 0, 0, 0);
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
          citv: v.citv_vencimiento ? new Date(v.citv_vencimiento + 'T00:00:00').toLocaleDateString('es-PE') : '—',
          citv_estado: estadoDoc(v.citv_vencimiento),
          soat: v.soat_vencimiento ? new Date(v.soat_vencimiento + 'T00:00:00').toLocaleDateString('es-PE') : '—',
          soat_estado: estadoDoc(v.soat_vencimiento),
          poliza: v.poliza_vencimiento ? new Date(v.poliza_vencimiento + 'T00:00:00').toLocaleDateString('es-PE') : '—',
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
        const fmtDate = (f?: string) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-PE') : '—';
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

  const renderDocumentStatus = (fecha?: string) => {
    if (!fecha) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-400 border border-slate-200">
          <Calendar size={11} className="shrink-0" />
          Sin fecha
        </span>
      );
    }

    const daysLeft = getDaysUntil(fecha);
    const dateStr = new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE');

    if (daysLeft <= 0) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
            <AlertTriangle size={11} className="text-rose-500 shrink-0" />
            Vencido ({Math.abs(daysLeft)}d)
          </span>
          <span className="text-[10px] font-black text-rose-600/80 ml-1">{dateStr}</span>
        </div>
      );
    }

    if (daysLeft <= 30) {
      return (
        <div className="flex flex-col items-start gap-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
            <AlertTriangle size={11} className="text-amber-500 shrink-0" />
            Vence {daysLeft}d
          </span>
          <span className="text-[10px] font-black text-amber-600/80 ml-1">{dateStr}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
          <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
          Vigente ({daysLeft}d)
        </span>
        <span className="text-[10px] font-bold text-slate-500 ml-1">{dateStr}</span>
      </div>
    );
  };

  const renderPlacaBadge = (placa: string) => {
    return (
      <div className="inline-flex flex-col items-center bg-white border-2 border-slate-800 rounded-md shadow-sm overflow-hidden min-w-[90px]">
        <div className="w-full h-1.5 bg-[#002855]" />
        <span className="px-2 py-0.5 font-mono text-[14px] font-black text-slate-800 tracking-wider uppercase leading-none my-1">
          {placa}
        </span>
      </div>
    );
  };

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isSorted = sortConfig?.key === sortKey;
    const isAsc = sortConfig?.direction === 'asc';

    return (
      <div
        onClick={() => handleSort(sortKey)}
        className="group/header inline-flex items-center gap-2 cursor-pointer select-none text-[11px] font-black text-[#002855] uppercase tracking-[0.15em] hover:text-blue-700 transition-colors"
      >
        <span>{label}</span>
        <ArrowUpDown
          size={13}
          className={`text-slate-300 group-hover/header:text-blue-500 transition-all ${isSorted ? (isAsc ? 'rotate-180 text-blue-600' : 'text-blue-600') : ''
            }`}
        />
      </div>
    );
  };

  const handleView = (v: Vehiculo) => {
    setSelectedVehiculo(v);
    setShowDetails(true);
  };

  const handleEdit = (v: Vehiculo) => {
    setEditing(v);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm('¿Está seguro de eliminar esta unidad de la flota?', 'Eliminar Vehículo');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('vehiculos').delete().eq('id', id);
      if (error) throw error;
      await fetchVehiculos();
      notifySuccess('Unidad eliminada correctamente');
    } catch (e) {
      notifyError('Error al eliminar la unidad');
    }
  };

  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Flota Completa');

      // Ordenar por Sede/Ubicación
      const sortedData = [...filteredVehiculos].sort((a, b) => {
        const sedeA = getEscuelaNombre(a.ubicacion_actual).toLowerCase();
        const sedeB = getEscuelaNombre(b.ubicacion_actual).toLowerCase();
        return sedeA.localeCompare(sedeB);
      });

      // 1. Título y Cabecera del Reporte
      ws.mergeCells('A1:M1');
      const titleCell = ws.getCell('A1');
      titleCell.value = 'REPORTE GENERAL DE FLOTA VEHICULAR — GRUPO SAN CRISTÓBAL';
      titleCell.font = { name: 'Arial', family: 2, size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002855' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 40;

      // 2. Información General
      ws.mergeCells('A2:M2');
      const subtitleCell = ws.getCell('A2');
      subtitleCell.value = `Generado el: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')} | Total de unidades: ${sortedData.length} | Ordenado por Sede`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
      subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      ws.getRow(2).height = 24;

      // Espacio vacío
      ws.addRow([]);

      // 3. Configuración de Columnas
      const columns = [
        { header: 'PLACA', key: 'placa', width: 14 },
        { header: 'MARCA', key: 'marca', width: 15 },
        { header: 'MODELO', key: 'modelo', width: 15 },
        { header: 'COLOR', key: 'color', width: 12 },
        { header: 'AÑO', key: 'año', width: 9 },
        { header: 'ESTADO', key: 'estado', width: 14 },
        { header: 'SEDE / UBICACIÓN', key: 'sede', width: 28 },
        { header: 'CITV VENCE', key: 'citv', width: 15 },
        { header: 'SOAT VENCE', key: 'soat', width: 15 },
        { header: 'PÓLIZA VENCE', key: 'poliza', width: 15 },
        { header: 'ALQUILER VENCE', key: 'alquiler', width: 15 },
        { header: 'ÚLT. MANT.', key: 'mantenimiento', width: 15 },
        { header: 'NOTAS / OBSERVACIONES', key: 'notas', width: 35 }
      ];

      const headerRowIndex = 4;
      ws.getRow(headerRowIndex).values = columns.map(c => c.header);
      ws.getRow(headerRowIndex).font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      ws.getRow(headerRowIndex).height = 28;

      columns.forEach((_, i) => {
        const cell = ws.getRow(headerRowIndex).getCell(i + 1);

        // Colores de encabezados por grupo para hacerlo hiper-visual
        let headerColor = 'FF0F172A'; // Default dark slate
        if (i < 5) {
          headerColor = 'FF002855'; // Azul marino para Datos Básicos
        } else if (i >= 5 && i < 7) {
          headerColor = 'FF334155'; // Gris pizarra para Estado y Sede
        } else if (i >= 7 && i < 11) {
          headerColor = 'FF9A3412'; // Óxido / Naranja quemado para Fechas de Vencimiento de documentos
        } else {
          headerColor = 'FF1E293B'; // Slate oscuro para Mant y Notas
        }

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } }
        };
      });

      // Formato fecha
      const fmtDate = (f?: string) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-PE') : '—';

      // 4. Agregar Datos
      sortedData.forEach((v, index) => {
        const row = ws.addRow([
          v.placa,
          v.marca,
          v.modelo,
          v.color || '—',
          v.año,
          v.estado === 'activa' ? 'ACTIVA' : v.estado === 'inactiva' ? 'INACTIVA' : 'EN PROCESO',
          getEscuelaNombre(v.ubicacion_actual),
          fmtDate(v.citv_vencimiento),
          fmtDate(v.soat_vencimiento),
          fmtDate(v.poliza_vencimiento),
          fmtDate(v.contrato_alquiler_vencimiento),
          fmtDate(v.fecha_ultimo_mantenimiento),
          v.notas || '—'
        ]);

        row.height = 24;

        // Cebrado (Zebra striping)
        const isEven = index % 2 === 0;
        const bgRowColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

        row.eachCell((cell, colIndex) => {
          // Borde delgado general
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
          cell.font = { name: 'Arial', size: 9 };
          cell.alignment = { vertical: 'middle' };

          // Por defecto, fondo cebrado
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgRowColor } };

          // Alinear placa, año, fechas y estado al centro
          if ([1, 5, 6, 8, 9, 10, 11, 12].includes(colIndex)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });

        // Estilos específicos para Estado (Celda 6)
        const statusCell = row.getCell(6);
        if (v.estado === 'activa') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Verde
          statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
        } else if (v.estado === 'inactiva') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Rojo
          statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };
        } else {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amarillo
          statusCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF92400E' } };
        }

        // Resaltar vencimientos de documentos importantes (CITV: 8, SOAT: 9, Póliza: 10, Contrato: 11)
        const dateColumns = [
          { colIdx: 8, val: v.citv_vencimiento },
          { colIdx: 9, val: v.soat_vencimiento },
          { colIdx: 10, val: v.poliza_vencimiento },
          { colIdx: 11, val: v.contrato_alquiler_vencimiento }
        ];

        dateColumns.forEach(dCol => {
          if (dCol.val) {
            const daysLeft = getDaysUntil(dCol.val);
            const cell = row.getCell(dCol.colIdx);
            if (daysLeft <= 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } }; // Rojo intenso para vencidos
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF990000' } };
            } else if (daysLeft <= 30) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE047' } }; // Amarillo para vencer pronto
              cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF854D0E' } };
            }
          }
        });
      });

      // Ancho automático de columnas (con un límite mínimo)
      columns.forEach((col, i) => {
        const column = ws.getColumn(i + 1);
        column.width = col.width;
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_General_Flota_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');

      // Ordenar por Sede/Ubicación
      const sortedData = [...filteredVehiculos].sort((a, b) => {
        const sedeA = getEscuelaNombre(a.ubicacion_actual).toLowerCase();
        const sedeB = getEscuelaNombre(b.ubicacion_actual).toLowerCase();
        return sedeA.localeCompare(sedeB);
      });

      // 1. Encabezado Premium con branding
      doc.setFillColor(0, 40, 85); // Azul Marino Principal
      doc.rect(0, 0, 297, 24, 'F');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('REPORTE GENERAL DE FLOTA VEHICULAR', 14, 15);

      // Línea de acento rojo (Branding)
      doc.setFillColor(220, 38, 38);
      doc.rect(0, 24, 297, 2, 'F');

      // Fecha y conteo de unidades
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Generado por: Sistema de Inventario GSC | Fecha: ${new Date().toLocaleString('es-PE')} | Ordenado por Sede`, 14, 32);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Total de Unidades: ${sortedData.length}`, 245, 32);

      // 2. Preparar Datos de la Tabla
      const tableData = sortedData.map(v => {
        const fmtDate = (f?: string) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-PE') : '—';
        return [
          v.placa,
          `${v.marca} ${v.modelo} ${v.año ? `(${v.año})` : ''} ${v.color ? `[${v.color}]` : ''}`,
          v.estado === 'activa' ? 'ACTIVA' : v.estado === 'inactiva' ? 'INACTIVA' : 'EN PROCESO',
          getEscuelaNombre(v.ubicacion_actual),
          fmtDate(v.citv_vencimiento),
          fmtDate(v.soat_vencimiento),
          fmtDate(v.poliza_vencimiento),
          fmtDate(v.contrato_alquiler_vencimiento),
          fmtDate(v.fecha_ultimo_mantenimiento)
        ];
      });

      // 3. Renderizar la tabla con estilos avanzados
      autoTable(doc, {
        startY: 36,
        head: [['Placa', 'Vehículo (Datos Generales)', 'Estado', 'Sede / Ubicación', 'CITV Vence', 'SOAT Vence', 'Póliza Vence', 'Contrato Vence', 'Últ. Mant.']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 23, 42], // Pizarra oscuro por defecto
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 3
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          valign: 'middle'
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold', cellWidth: 22 }, // Placa
          1: { halign: 'left', cellWidth: 55 }, // Vehículo
          2: { halign: 'center', fontStyle: 'bold', cellWidth: 24 }, // Estado
          3: { halign: 'left', cellWidth: 42 }, // Ubicación
          4: { halign: 'center', cellWidth: 26 }, // CITV
          5: { halign: 'center', cellWidth: 26 }, // SOAT
          6: { halign: 'center', cellWidth: 26 }, // Póliza
          7: { halign: 'center', cellWidth: 26 }, // Contrato
          8: { halign: 'center', cellWidth: 26 }  // Últ. Mant.
        },
        didParseCell: (data) => {
          // Fila de encabezado: colorear según grupo
          if (data.section === 'head') {
            const colIdx = data.column.index;
            if (colIdx < 2) {
              data.cell.styles.fillColor = [0, 40, 85]; // Azul Marino para placa y vehículo
            } else if (colIdx >= 2 && colIdx < 4) {
              data.cell.styles.fillColor = [51, 65, 85]; // Gris pizarra para Estado y Ubicación
            } else if (colIdx >= 4 && colIdx < 8) {
              data.cell.styles.fillColor = [154, 52, 18]; // Naranja óxido para documentos de vencimiento
            } else {
              data.cell.styles.fillColor = [30, 41, 59]; // Slate oscuro para último mant.
            }
          }

          if (data.section === 'body') {
            const v = sortedData[data.row.index];
            const colIndex = data.column.index;

            // 1. Colorear la columna "Estado" (Índice 2)
            if (colIndex === 2) {
              if (v.estado === 'activa') {
                data.cell.styles.fillColor = [209, 250, 229]; // Verde claro
                data.cell.styles.textColor = [6, 95, 70]; // Verde oscuro
              } else if (v.estado === 'inactiva') {
                data.cell.styles.fillColor = [254, 226, 226]; // Rojo claro
                data.cell.styles.textColor = [153, 27, 27]; // Rojo oscuro
              } else {
                data.cell.styles.fillColor = [254, 243, 199]; // Amarillo claro
                data.cell.styles.textColor = [146, 64, 14]; // Amarillo oscuro
              }
            }

            // 2. Colorear alertas de vencimientos de documentos importantes
            // CITV (4), SOAT (5), Póliza (6), Contrato (7)
            const dateFieldsMap: Record<number, string | undefined> = {
              4: v.citv_vencimiento,
              5: v.soat_vencimiento,
              6: v.poliza_vencimiento,
              7: v.contrato_alquiler_vencimiento
            };

            if (colIndex in dateFieldsMap) {
              const val = dateFieldsMap[colIndex];
              if (val) {
                const daysLeft = getDaysUntil(val);
                if (daysLeft <= 0) {
                  data.cell.styles.fillColor = [254, 202, 202]; // Rojo intenso
                  data.cell.styles.textColor = [153, 0, 0];
                  data.cell.styles.fontStyle = 'bold';
                } else if (daysLeft <= 30) {
                  data.cell.styles.fillColor = [253, 224, 71]; // Amarillo intenso
                  data.cell.styles.textColor = [133, 77, 14];
                  data.cell.styles.fontStyle = 'bold';
                }
              }
            }
          }
        }
      });

      doc.save(`Reporte_General_Flota_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
    }
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
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
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
                      <tr className="bg-slate-50/70 border-b border-slate-200/80 backdrop-blur-sm">
                        <th className="px-6 py-4 text-left">{renderSortableHeader('Unidad / Placa', 'placa')}</th>
                        <th className="px-4 py-4 text-left">{renderSortableHeader('Estado', 'estado')}</th>
                        <th className="px-4 py-4 text-left">{renderSortableHeader('Sede de Asignación', 'ubicacion_actual')}</th>
                        <th className="px-4 py-4 text-left">{renderSortableHeader('CITV (Vence)', 'citv_vencimiento')}</th>
                        <th className="px-4 py-4 text-left">{renderSortableHeader('SOAT (Vence)', 'soat_vencimiento')}</th>
                        <th className="px-4 py-4 text-left">{renderSortableHeader('Póliza (Vence)', 'poliza_vencimiento')}</th>
                        <th className="px-6 py-4 text-center"><span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Acciones</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedVehiculos.map((v) => (
                        <tr
                          key={v.id}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group relative border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/20"
                          onClick={() => handleView(v)}
                        >
                          <td className="px-6 py-4 font-bold text-left">
                            <div className="flex items-center gap-4">
                              {renderPlacaBadge(v.placa)}
                              <div className="flex flex-col">
                                <span className="text-[13px] font-black text-slate-800 uppercase leading-none">{v.marca}</span>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{v.modelo} {v.año ? `(${v.año})` : ''}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded-full ${statusColors[v.estado]}`}>
                              {v.estado === 'en_proceso' ? 'En Proceso' : v.estado === 'activa' ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-left">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <MapPin size={14} className="text-rose-500 shrink-0" />
                              <span className="text-[12px] font-bold uppercase truncate max-w-xs block">{getEscuelaNombre(v.ubicacion_actual)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-left">
                            {renderDocumentStatus(v.citv_vencimiento)}
                          </td>
                          <td className="px-4 py-4 text-left">
                            {renderDocumentStatus(v.soat_vencimiento)}
                          </td>
                          <td className="px-4 py-4 text-left">
                            {renderDocumentStatus(v.poliza_vencimiento)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                              {canEdit() && (
                                <>
                                  <button
                                    onClick={() => handleEdit(v)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                    title="Editar Unidad"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(v.id)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white rounded-lg border border-slate-200 transition-all shadow-sm"
                                    title="Eliminar Unidad"
                                  >
                                    <Trash2 size={14} />
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
            ) : (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
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
                    <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-xl transition-all p-6 flex flex-col group overflow-hidden hover:-translate-y-0.5 duration-200">
                      <div className="flex justify-between items-center mb-5">
                        {renderPlacaBadge(v.placa)}
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded-full ${statusColors[v.estado]}`}>
                          {v.estado === 'en_proceso' ? 'En Proceso' : v.estado === 'activa' ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h4 className="text-[14px] font-black text-slate-800 uppercase leading-none">{v.marca}</h4>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{v.modelo} {v.año ? `(${v.año})` : ''}</p>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase">
                          <MapPin size={14} className="text-rose-500 shrink-0" />
                          <span className="truncate">{getEscuelaNombre(v.ubicacion_actual)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">CITV</label>
                            {renderDocumentStatus(v.citv_vencimiento)}
                          </div>
                          <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">SOAT</label>
                            {renderDocumentStatus(v.soat_vencimiento)}
                          </div>
                          <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col gap-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">PÓLIZA</label>
                            {renderDocumentStatus(v.poliza_vencimiento)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex gap-2 pt-4 border-t border-slate-50">
                        {canEdit() && (
                          <>
                            <button onClick={() => handleEdit(v)} className="p-2 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-800 hover:text-white transition-all shadow-sm"><Edit size={16} /></button>
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
      {showDetails && selectedVehiculo && (() => {
        const fmtLocal = (f?: string) => f ? new Date(f + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
        const docCard = (title: string, vencimiento?: string) => {
          const daysLeft = vencimiento ? getDaysUntil(vencimiento) : null;
          const borderColor = daysLeft === null ? 'border-slate-200' : daysLeft <= 0 ? 'border-rose-300' : daysLeft <= 30 ? 'border-amber-300' : 'border-emerald-200';
          const headerBg = daysLeft === null ? 'bg-slate-100' : daysLeft <= 0 ? 'bg-rose-50' : daysLeft <= 30 ? 'bg-amber-50' : 'bg-emerald-50';
          return (
            <div className={`border ${borderColor} bg-white overflow-hidden`}>
              <div className={`${headerBg} px-3 py-2 flex items-center justify-between border-b ${borderColor}`}>
                <span className="text-[9px] sm:text-[10px] font-black text-[#002855] uppercase tracking-widest">{title}</span>
                {daysLeft !== null && renderDocumentStatus(vencimiento)}
              </div>
              <div className="px-3 py-2.5">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vencimiento</span>
                  <span className="text-[10px] sm:text-[11px] font-black text-slate-700">{fmtLocal(vencimiento) || '—'}</span>
                </div>
              </div>
            </div>
          );
        };
        return (
          <DetailModal maxWidth="5xl" onClose={() => setShowDetails(false)} closeOnBackdrop>
            <DetailModalHeader>
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
                <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Car size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs sm:text-base md:text-[18px] font-black text-white uppercase tracking-tight leading-snug line-clamp-2 sm:line-clamp-1">
                    {selectedVehiculo.marca} {selectedVehiculo.modelo} {selectedVehiculo.año ? `(${selectedVehiculo.año})` : ''}
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase tracking-wide mt-1 flex items-start sm:items-center gap-1.5">
                    <MapPin size={10} className="shrink-0 mt-0.5 sm:mt-0" />
                    <span className="line-clamp-2 sm:truncate">{getEscuelaNombre(selectedVehiculo.ubicacion_actual)}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {renderPlacaBadge(selectedVehiculo.placa)}
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all -mr-1"
                aria-label="Cerrar detalle"
              >
                <X size={22} />
              </button>
            </DetailModalHeader>

            <DetailModalBody>
              {/* Quick info strip */}
              <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
                <div className="bg-white p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</span>
                  <span className={`inline-block px-2.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border rounded-full ${statusColors[selectedVehiculo.estado]}`}>
                    {selectedVehiculo.estado === 'en_proceso' ? 'En Proceso' : selectedVehiculo.estado === 'activa' ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className="bg-white p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Marca / Modelo</span>
                  <span className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase leading-tight">{selectedVehiculo.marca} {selectedVehiculo.modelo}</span>
                </div>
                <div className="bg-white p-3 sm:p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Color / Año</span>
                  <span className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase">{selectedVehiculo.color || '—'} / {selectedVehiculo.año || '—'}</span>
                </div>
              </div>

              {/* Documents section */}
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} className="text-[#002855]" />
                  <span className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Documentación Vehicular</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docCard('CITV', selectedVehiculo.citv_vencimiento)}
                  {docCard('SOAT', selectedVehiculo.soat_vencimiento)}
                  {docCard('Póliza de Seguros', selectedVehiculo.poliza_vencimiento)}
                  {docCard('Contrato de Alquiler', selectedVehiculo.contrato_alquiler_vencimiento)}
                </div>

                {selectedVehiculo.notas && (
                  <div className="p-3 sm:p-4 bg-amber-50 border border-amber-100 mt-2">
                    <span className="text-[8px] sm:text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      📝 Notas / Observaciones
                    </span>
                    <p className="text-[10px] sm:text-[11px] font-medium text-amber-900 leading-relaxed">
                      {selectedVehiculo.notas}
                    </p>
                  </div>
                )}
              </div>
            </DetailModalBody>

            <StandardModalFooter
              onClose={() => setShowDetails(false)}
              onEdit={canEdit() ? () => { setShowDetails(false); handleEdit(selectedVehiculo); } : undefined}
              editLabel="Editar"
            />
          </DetailModal>
        );
      })()}

      <VehicleImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={fetchVehiculos} locations={schools} />
    </div>
  );
}
