import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Car, X, Download, Upload, ChevronUp, ChevronDown, LayoutGrid, List, Check, Copy, MapPin, FileText, Calendar, Shield, Activity, Info, Hash, Star } from 'lucide-react';
import ExcelJS from 'exceljs';
import VehicleImportModal from '../components/VehicleImportModal';
import Pagination from '../components/Pagination';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehiculo | undefined>();
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    color: '',
    año: new Date().getFullYear(),
    estado: 'activa',
    ubicacion_actual: '',
    imagen_url: '',
    fecha_ultimo_mantenimiento: new Date().toISOString().split('T')[0],
    notas: '',
    citv_emision: '',
    citv_vencimiento: '',
    soat_emision: '',
    soat_vencimiento: '',
    poliza_emision: '',
    poliza_vencimiento: '',
    contrato_alquiler_emision: '',
    contrato_alquiler_vencimiento: '',
    image_position: 'center'
  });
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterSede, setFilterSede] = useState<string>('todos');
  const [filterVencimiento, setFilterVencimiento] = useState<boolean>(false);
  const [filterVencimientoTipo, setFilterVencimientoTipo] = useState<'all' | 'soat' | 'citv' | 'poliza'>('all');
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [filterDashboard] = useState<'all' | 'expired' | 'expiring'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('type', 'escuela_conductores');

      if (error) throw error;

      if (data) {
        setSchools(data);
      }
    } catch (error) {
      console.error('Error al cargar las escuelas:', error);
    }
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
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

  const getEstadoBadge = (estado: string) => {
    const estados = {
      activa: 'bg-green-100 text-green-800',
      en_proceso: 'bg-yellow-100 text-yellow-800',
      inactiva: 'bg-gray-100 text-gray-800'
    };

    const estadoText = {
      activa: 'Activa',
      en_proceso: 'En proceso',
      inactiva: 'Inactiva'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estados[estado as keyof typeof estados]}`}>
        {estadoText[estado as keyof typeof estadoText]}
      </span>
    );
  };

  const getDocumentStatus = (dateString?: string) => {
    if (!dateString) return { color: 'bg-gray-100 text-gray-800', label: 'No reg.' };

    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'bg-red-100 text-red-800', label: 'Vencido' };
    if (diffDays <= 30) return { color: 'bg-yellow-100 text-yellow-800', label: 'Por vencer' };
    return { color: 'bg-green-100 text-green-800', label: 'Vigente' };
  };

  const getEscuelaColor = (ubicacionActual: string) => {
    const palette = ['bg-blue-600', 'bg-green-600', 'bg-red-600', 'bg-yellow-600', 'bg-purple-600'];
    const index = schools.findIndex(s => s.id === ubicacionActual);
    if (index >= 0) {
      return palette[index % palette.length];
    }
    return 'bg-gray-200';
  };

  const getEscuelaNombre = (ubicacionActual: string) => {
    const school = schools.find(s => s.id === ubicacionActual);
    return school ? school.name : (ubicacionActual || 'Sin asignar');
  };


  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (schools.length > 0) {
      setForm(prev => ({
        ...prev,
        ubicacion_actual: prev.ubicacion_actual || schools[0].id,
      }));
    }
  }, [schools]);

  useEffect(() => {
    fetchVehiculos();
  }, []);

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .order('placa')
        .limit(1000);

      if (error) throw error;

      setVehiculos(data || []);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
      alert('No se pudieron cargar los vehículos. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!form.placa) newErrors.placa = 'La placa es requerida';
    if (!form.marca) newErrors.marca = 'La marca es requerida';
    if (!form.modelo) newErrors.modelo = 'El modelo es requerido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const dateFields: Array<keyof typeof form> = [
      'citv_emision',
      'citv_vencimiento',
      'soat_emision',
      'soat_vencimiento',
      'poliza_emision',
      'poliza_vencimiento',
      'contrato_alquiler_emision',
      'contrato_alquiler_vencimiento',
    ];

    const payload: typeof form & { updated_at?: string } = {
      ...form,
    };

    dateFields.forEach((field) => {
      if (payload[field] === '') {
        (payload as any)[field] = null;
      }
    });

    try {
      if (editing) {
        const { error } = await supabase
          .from('vehiculos')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vehiculos')
          .insert([payload]);

        if (error) throw error;
      }

      fetchVehiculos();
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error al guardar el vehículo:', error);
      alert('Ocurrió un error al guardar el vehículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este vehículo?')) return;

    try {
      const { error } = await supabase
        .from('vehiculos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchVehiculos();
    } catch (error) {
      console.error('Error al eliminar el vehículo:', error);
      alert('No se pudo eliminar el vehículo');
    }
  };

  const handleEdit = (vehiculo: Vehiculo) => {
    setEditing(vehiculo);
    setForm({
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color || '',
      año: vehiculo.año,
      estado: vehiculo.estado,
      ubicacion_actual: vehiculo.ubicacion_actual,
      imagen_url: vehiculo.imagen_url || '',
      fecha_ultimo_mantenimiento: vehiculo.fecha_ultimo_mantenimiento.split('T')[0],
      notas: vehiculo.notas || '',
      citv_emision: vehiculo.citv_emision || '',
      citv_vencimiento: vehiculo.citv_vencimiento || '',
      soat_emision: vehiculo.soat_emision || '',
      soat_vencimiento: vehiculo.soat_vencimiento || '',
      poliza_emision: vehiculo.poliza_emision || '',
      poliza_vencimiento: vehiculo.poliza_vencimiento || '',
      contrato_alquiler_emision: vehiculo.contrato_alquiler_emision || '',
      contrato_alquiler_vencimiento: vehiculo.contrato_alquiler_vencimiento || '',
      image_position: vehiculo.image_position || 'center'
    });
    setShowForm(true);
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setForm(prev => ({ ...prev, imagen_url: url }));
  };

  const openImageModal = (imageUrl: string) => {
    setCurrentImage(imageUrl);
    setShowImageModal(true);
  };

  const resetForm = () => {
    setForm({
      placa: '',
      marca: '',
      modelo: '',
      color: '',
      año: new Date().getFullYear(),
      estado: 'activa',
      ubicacion_actual: schools[0]?.id || '',
      imagen_url: '',
      fecha_ultimo_mantenimiento: new Date().toISOString().split('T')[0],
      notas: '',
      citv_emision: '',
      citv_vencimiento: '',
      soat_emision: '',
      soat_vencimiento: '',
      poliza_emision: '',
      poliza_vencimiento: '',
      contrato_alquiler_emision: '',
      contrato_alquiler_vencimiento: '',
      image_position: 'center'
    });
    setEditing(undefined);
    setErrors({});
  };

  const filteredVehiculos = vehiculos.filter(vehiculo => {
    const searchTerm = search.toLowerCase();
    const searchMatch = !search ||
      vehiculo.placa.toLowerCase().includes(searchTerm) ||
      vehiculo.marca.toLowerCase().includes(searchTerm) ||
      vehiculo.modelo.toLowerCase().includes(searchTerm) ||
      (vehiculo.notas || '').toLowerCase().includes(searchTerm);

    const sedeMatch = filterSede === 'todos' || vehiculo.ubicacion_actual === filterSede;

    const estadoMatch = filterEstado === 'todos' || vehiculo.estado === filterEstado;

    let vencimientoMatch = true;

    // Logic for dashboard filters
    const checkDocuments = (v: Vehiculo) => {
      const today = new Date();

      const checkDoc = (d?: string) => {
        if (!d) return { expired: false, expiring: false };
        const date = new Date(d);
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          expired: diffDays < 0,
          expiring: diffDays >= 0 && diffDays <= 30
        };
      };

      const soat = checkDoc(v.soat_vencimiento);
      const citv = checkDoc(v.citv_vencimiento);
      const poliza = checkDoc(v.poliza_vencimiento);
      const alquiler = checkDoc(v.contrato_alquiler_vencimiento);

      const hasExpired = soat.expired || citv.expired || poliza.expired || alquiler.expired;
      const hasExpiring = soat.expiring || citv.expiring || poliza.expiring || alquiler.expiring;

      return {
        hasExpired,
        hasExpiring,
        soat,
        citv,
        poliza,
        alquiler
      };
    };

    if (filterDashboard === 'expired') {
      vencimientoMatch = checkDocuments(vehiculo).hasExpired;
    } else if (filterDashboard === 'expiring') {
      vencimientoMatch = checkDocuments(vehiculo).hasExpiring;
    } else if (filterVencimiento) {
      const docs = checkDocuments(vehiculo);
      if (filterVencimientoTipo === 'all') {
        vencimientoMatch = docs.hasExpired || docs.hasExpiring;
      } else if (filterVencimientoTipo === 'soat') {
        vencimientoMatch = docs.soat.expired || docs.soat.expiring;
      } else if (filterVencimientoTipo === 'citv') {
        vencimientoMatch = docs.citv.expired || docs.citv.expiring;
      } else if (filterVencimientoTipo === 'poliza') {
        vencimientoMatch = docs.poliza.expired || docs.poliza.expiring;
      }
    }

    return searchMatch && sedeMatch && estadoMatch && vencimientoMatch;
  });

  // Calculate statistics for Dashboard
  const stats = useMemo(() => {
    const today = new Date();
    const counts = {
      soat: { expired: 0, expiring: 0 },
      citv: { expired: 0, expiring: 0 },
      poliza: { expired: 0, expiring: 0 },
      alquiler: { expired: 0, expiring: 0 },
      vencimientos: { expired: 0, expiring: 0 },
      total: vehiculos.length,
      active: 0,
      inactive: 0,
      en_proceso: 0
    };

    vehiculos.forEach(v => {
      // Status counts
      if (v.estado === 'activa') counts.active++;
      else if (v.estado === 'inactiva') counts.inactive++;
      else if (v.estado === 'en_proceso') counts.en_proceso++;

      const checkDoc = (d?: string) => {
        if (!d) return { expired: false, expiring: false };
        const date = new Date(d);
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          expired: diffDays < 0,
          expiring: diffDays >= 0 && diffDays <= 30
        };
      };

      const soat = checkDoc(v.soat_vencimiento);
      const citv = checkDoc(v.citv_vencimiento);
      const poliza = checkDoc(v.poliza_vencimiento);
      const alquiler = checkDoc(v.contrato_alquiler_vencimiento);

      if (soat.expired) counts.soat.expired++;
      if (soat.expiring) counts.soat.expiring++;

      if (citv.expired) counts.citv.expired++;
      if (citv.expiring) counts.citv.expiring++;

      if (poliza.expired) counts.poliza.expired++;
      if (poliza.expiring) counts.poliza.expiring++;

      if (alquiler.expired) counts.alquiler.expired++;
      if (alquiler.expiring) counts.alquiler.expiring++;

      if (soat.expired || citv.expired || poliza.expired || alquiler.expired) counts.vencimientos.expired++;
      if (soat.expiring || citv.expiring || poliza.expiring || alquiler.expiring) counts.vencimientos.expiring++;
    });

    return counts;
  }, [vehiculos]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVehiculos.length / itemsPerPage);
  const sortedVehiculos = useMemo(() => {
    if (!sortConfig) return filteredVehiculos;

    return [...filteredVehiculos].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Vehiculo];
      let bValue: any = b[sortConfig.key as keyof Vehiculo];

      if (sortConfig.key === 'sede') {
        aValue = getEscuelaNombre(a.ubicacion_actual);
        bValue = getEscuelaNombre(b.ubicacion_actual);
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [filteredVehiculos, sortConfig]);

  const paginatedVehiculos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedVehiculos.slice(startIndex, endIndex);
  }, [sortedVehiculos, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterSede, filterEstado, filterVencimiento, filterVencimientoTipo, filterDashboard]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };






  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }





  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredVehiculos.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };



  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Flota Vehicular');

      worksheet.columns = [
        { header: 'PLACA', key: 'placa', width: 12 },
        { header: 'MARCA', key: 'marca', width: 15 },
        { header: 'MODELO', key: 'modelo', width: 15 },
        { header: 'COLOR', key: 'color', width: 12 },
        { header: 'AÑO', key: 'año', width: 8 },
        { header: 'ESTADO', key: 'estado', width: 12 },
        { header: 'SEDE', key: 'sede', width: 20 },
        { header: 'CITV VENCIMIENTO', key: 'citv', width: 18 },
        { header: 'SOAT VENCIMIENTO', key: 'soat', width: 18 },
        { header: 'POLIZA VENCIMIENTO', key: 'poliza', width: 18 },
        { header: 'ALQUILER VENCIMIENTO', key: 'alquiler', width: 18 },
      ];

      // Styling Header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' }
      };
      worksheet.getRow(1).eachCell(cell => {
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });

      filteredVehiculos.forEach(v => {
        worksheet.addRow({
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          color: v.color || '',
          año: v.año,
          estado: v.estado,
          sede: getEscuelaNombre(v.ubicacion_actual),
          citv: v.citv_vencimiento || '',
          soat: v.soat_vencimiento || '',
          poliza: v.poliza_vencimiento || '',
          alquiler: v.contrato_alquiler_vencimiento || ''
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Flota_Vehicular_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting excel', error);
      alert('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Image Preview Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img
              src={currentImage}
              alt="Vista previa"
              className="max-w-full max-h-[80vh] mx-auto object-contain"
            />
          </div>
        </div>
      )}
      {/* Title / Tab Bar - Minimalist Executive Style */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <Car size={20} />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Flota Vehicular</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Unidades y Documentación</span>
              <>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <span>{filteredVehiculos.length} Vehículos</span>
              </>

              {/* Header Alerts */}
              {(stats.soat.expired > 0 || stats.soat.expiring > 0) && (
                <button
                  onClick={() => {
                    setFilterVencimiento(true);
                    setFilterVencimientoTipo('soat');
                  }}
                  className={`flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-lg border transition-all hover:scale-105 ${filterVencimiento && filterVencimientoTipo === 'soat' ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                    } ${stats.soat.expired > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats.soat.expired > 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-black uppercase">SOAT: {stats.soat.expired > 0 ? stats.soat.expired : stats.soat.expiring}</span>
                </button>
              )}

              {(stats.citv.expired > 0 || stats.citv.expiring > 0) && (
                <button
                  onClick={() => {
                    setFilterVencimiento(true);
                    setFilterVencimientoTipo('citv');
                  }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all hover:scale-105 ${filterVencimiento && filterVencimientoTipo === 'citv' ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                    } ${stats.citv.expired > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats.citv.expired > 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-black uppercase">CITV: {stats.citv.expired > 0 ? stats.citv.expired : stats.citv.expiring}</span>
                </button>
              )}

              {(stats.poliza.expired > 0 || stats.poliza.expiring > 0) && (
                <button
                  onClick={() => {
                    setFilterVencimiento(true);
                    setFilterVencimientoTipo('poliza');
                  }}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all hover:scale-105 ${filterVencimiento && filterVencimientoTipo === 'poliza' ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                    } ${stats.poliza.expired > 0 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats.poliza.expired > 0 ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <span className="text-[9px] font-black uppercase">PÓLIZA: {stats.poliza.expired > 0 ? stats.poliza.expired : stats.poliza.expiring}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all font-bold text-[9px] uppercase tracking-widest mr-2"
          >
            <Download size={12} />
            {exporting ? '...' : 'Excel'}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all font-bold text-[9px] uppercase tracking-widest mr-2"
          >
            <Upload size={12} />
            Importar
          </button>

          {canEdit() && (
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="p-2 ml-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"
                title="Agregar Unidad"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Alertas Rápidas (Restyled for Light BG) */}


        <div className="flex flex-col gap-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            {[
              { label: 'Unidades Totales', value: stats.total, icon: Car, bg: 'bg-blue-50', color: 'text-blue-600' },
              { label: 'Unidades Activas', value: stats.active, icon: Activity, bg: 'bg-emerald-50', color: 'text-emerald-600' },
              { label: 'Fuera de Servicio', value: stats.inactive, icon: Info, bg: 'bg-rose-50', color: 'text-rose-600' },
              { label: 'Garantía / Proceso', value: stats.total - stats.active - stats.inactive, icon: Shield, bg: 'bg-amber-50', color: 'text-amber-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-2xl font-black text-[#002855]">{stat.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon size={18} />
                  </div>
                </div>
                <div className={`absolute -right-2 -bottom-2 w-16 h-16 ${stat.bg} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
              </div>
            ))}
          </div>

          {/* Control Bar Estilo ERP */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              {/* Buscador Moderno */}
              <div className="relative group min-w-[280px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-[#002855]">
                  <Search size={16} className="text-gray-400 group-focus-within:text-[#002855]" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por placa, marca o modelo..."
                  className="block w-full pl-10 pr-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-medium placeholder-gray-400 focus:ring-2 focus:ring-[#002855]/10 focus:border-[#002855] focus:bg-white transition-all outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Vista Lista"
                >
                  <List size={18} />
                </button>
              </div>

              <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block" />

              <div className="flex items-center gap-2">
                <select
                  className="px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#002855]/10 focus:border-[#002855] transition-all outline-none min-w-[130px]"
                  value={filterSede}
                  onChange={(e) => setFilterSede(e.target.value)}
                >
                  <option value="todos">Sedes (Todas)</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>

                <select
                  className="px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-[#002855]/10 focus:border-[#002855] transition-all outline-none min-w-[130px]"
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="todos">Estados (Todos)</option>
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                  <option value="en_proceso">En Proceso</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 pr-4 md:border-r border-gray-200">
                <label className="inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={filterVencimiento}
                    onChange={(e) => setFilterVencimiento(e.target.checked)}
                  />
                  <div className="relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#002855]"></div>
                  <span className="ms-3 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#002855] transition-colors">Vencimientos</span>
                </label>

                {filterVencimiento && (
                  <select
                    className="ml-2 px-2 py-1 bg-[#f8fafc] border border-[#e2e8f0] rounded text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-[#002855] focus:outline-none"
                    value={filterVencimientoTipo}
                    onChange={(e) => setFilterVencimientoTipo(e.target.value as any)}
                  >
                    <option value="all">Todas</option>
                    <option value="soat">SOAT</option>
                    <option value="citv">CITV</option>
                    <option value="poliza">Póliza</option>
                  </select>
                )}
              </div>

              <div className="hidden md:block text-right">
                <span className="text-[10px] font-black text-[#64748b] uppercase tracking-widest block leading-none mb-1 text-right">Encontrados</span>
                <span className="text-sm font-black text-[#002855]">{filteredVehiculos.length} unidades</span>
              </div>
            </div>
          </div>


          {/* Pagination - Top */}
          {filteredVehiculos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredVehiculos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-[#e2e8f0] overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-[#f1f5f9]">
                <thead className="bg-[#f8fafc]">
                  <tr>
                    <th scope="col" className="px-6 py-5 w-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded-lg border-gray-200 text-[#002855] focus:ring-[#002855]/20 transition-all cursor-pointer"
                        onChange={handleSelectAll}
                        checked={filteredVehiculos.length > 0 && selectedIds.size === filteredVehiculos.length}
                      />
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-5 text-left text-[10px] font-black text-[#64748b] uppercase tracking-widest cursor-pointer hover:text-[#002855] transition-colors"
                      onClick={() => handleSort('placa')}
                    >
                      <div className="flex items-center gap-2">
                        Vehículo / Identificación
                        {sortConfig?.key === 'placa' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-[#002855]" /> : <ChevronDown size={14} className="text-[#002855]" />
                        ) : <Activity size={12} className="opacity-0 group-hover:opacity-100" />}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-5 text-left text-[10px] font-black text-[#64748b] uppercase tracking-widest cursor-pointer hover:text-[#002855] transition-colors"
                      onClick={() => handleSort('estado')}
                    >
                      <div className="flex items-center gap-2">
                        Estado
                        {sortConfig?.key === 'estado' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-[#002855]" /> : <ChevronDown size={14} className="text-[#002855]" />
                        ) : null}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-5 text-left text-[10px] font-black text-[#64748b] uppercase tracking-widest cursor-pointer hover:text-[#002855] transition-colors"
                      onClick={() => handleSort('sede')}
                    >
                      <div className="flex items-center gap-2">
                        Asignación (Sede)
                        {sortConfig?.key === 'sede' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-[#002855]" /> : <ChevronDown size={14} className="text-[#002855]" />
                        ) : null}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-[#64748b] uppercase tracking-widest">
                      Vencimiento de Documentación
                    </th>
                    <th scope="col" className="px-6 py-5 text-right text-[10px] font-black text-[#64748b] uppercase tracking-widest">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#f1f5f9]">
                  {paginatedVehiculos.length > 0 ? (
                    paginatedVehiculos.map((vehiculo) => {
                      const isSelected = selectedIds.has(vehiculo.id);
                      return (
                        <tr
                          key={vehiculo.id}
                          onClick={() => handleToggleSelect(vehiculo.id)}
                          className={`
                          group border-l-4 transition-all duration-300 cursor-pointer
                          ${isSelected ? 'bg-blue-50/50 border-[#002855]' : 'border-transparent hover:bg-slate-50 hover:border-blue-200'}
                        `}
                        >
                          <td className="px-6 py-5 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded-lg border-gray-200 text-[#002855] focus:ring-[#002855]/20 transition-all cursor-pointer"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(vehiculo.id)}
                            />
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="flex-shrink-0 h-11 w-11 flex items-center justify-center bg-white border border-gray-100 rounded-xl group-hover:shadow-md transition-all overflow-hidden cursor-pointer"
                                onClick={(e) => {
                                  if (vehiculo.imagen_url) {
                                    e.stopPropagation();
                                    openImageModal(vehiculo.imagen_url);
                                  }
                                }}
                              >
                                {vehiculo.imagen_url ? (
                                  <img
                                    src={vehiculo.imagen_url}
                                    alt={vehiculo.placa}
                                    className={`h-full w-full object-cover object-${vehiculo.image_position || 'center'}`}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                                    }}
                                  />
                                ) : (
                                  <Car className="h-5 w-5 text-slate-400" />
                                )}
                                <Car className="h-5 w-5 text-slate-400 hidden fallback-icon:block" />
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-black text-[#002855] uppercase tracking-tight leading-none">{vehiculo.placa}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(vehiculo.placa, vehiculo.id);
                                    }}
                                    className={`p-1 rounded-md transition-all ${copiedItems[vehiculo.id] ? 'bg-emerald-100 text-emerald-600' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-600'}`}
                                  >
                                    {copiedItems[vehiculo.id] ? <Check size={10} /> : <Copy size={10} />}
                                  </button>
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                  <span>{vehiculo.marca} {vehiculo.modelo}</span>
                                  {vehiculo.color && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                                      <span>{vehiculo.color}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex">
                              {getEstadoBadge(vehiculo.estado)}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${getEscuelaColor(vehiculo.ubicacion_actual)} animate-pulse`}></div>
                                <span className="text-xs font-black text-[#002855] uppercase tracking-tight">{getEscuelaNombre(vehiculo.ubicacion_actual)}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 font-medium tracking-wide">Operación asignada</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-wrap gap-2 group-hover:translate-x-1 transition-transform duration-500">
                              {/* CITV */}
                              {(!filterVencimiento || filterVencimientoTipo === 'all' || filterVencimientoTipo === 'citv') && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">CITV</span>
                                  <span className={`px-2 py-0.5 text-[10px] rounded-lg font-black border tracking-tighter ${getDocumentStatus(vehiculo.citv_vencimiento).color.replace('bg-', 'bg-transparent border-')}`}>
                                    {vehiculo.citv_vencimiento || 'No reg.'}
                                  </span>
                                </div>
                              )}
                              {/* SOAT */}
                              {(!filterVencimiento || filterVencimientoTipo === 'all' || filterVencimientoTipo === 'soat') && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">SOAT</span>
                                  <span className={`px-2 py-0.5 text-[10px] rounded-lg font-black border tracking-tighter ${getDocumentStatus(vehiculo.soat_vencimiento).color.replace('bg-', 'bg-transparent border-')}`}>
                                    {vehiculo.soat_vencimiento || 'No reg.'}
                                  </span>
                                </div>
                              )}
                              {/* Poliza */}
                              {(!filterVencimiento || filterVencimientoTipo === 'all' || filterVencimientoTipo === 'poliza') && (
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 ml-1">PÓLIZA</span>
                                  <span className={`px-2 py-0.5 text-[10px] rounded-lg font-black border tracking-tighter ${getDocumentStatus(vehiculo.poliza_vencimiento).color.replace('bg-', 'bg-transparent border-')}`}>
                                    {vehiculo.poliza_vencimiento || 'No reg.'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                              <button
                                onClick={() => handleEdit(vehiculo)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar Unidad"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(vehiculo.id)}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar Unidad"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                          <Car size={48} className="text-gray-300 mb-3" />
                          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No se encontraron unidades</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile List Cards - Executive ERP Style */}
            <div className="lg:hidden space-y-4">
              {paginatedVehiculos.length > 0 ? (
                paginatedVehiculos.map((vehiculo) => (
                  <div key={vehiculo.id} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    {/* Selection Indicator on left edge */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1 ${selectedIds.has(vehiculo.id) ? 'bg-[#002855]' : 'bg-transparent group-hover:bg-blue-200'} transition-colors duration-300`} />

                    <div className="flex items-start gap-4 mb-5 pl-2">
                      {/* Image */}
                      <div
                        className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-xl overflow-hidden cursor-pointer border border-slate-100 shadow-sm group-hover:border-blue-200 transition-colors"
                        onClick={(e) => {
                          if (vehiculo.imagen_url) {
                            e.stopPropagation();
                            openImageModal(vehiculo.imagen_url);
                          }
                        }}
                      >
                        {vehiculo.imagen_url ? (
                          <img
                            src={vehiculo.imagen_url}
                            alt={vehiculo.placa}
                            className="h-full w-full object-cover"
                            style={{ objectPosition: vehiculo.image_position || 'center' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                            }}
                          />
                        ) : (
                          <Car className="h-7 w-7 text-slate-300" />
                        )}
                        <Car className="h-7 w-7 text-slate-300 hidden fallback-icon:block" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">{vehiculo.placa}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(vehiculo.placa, vehiculo.id);
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                              {copiedItems[vehiculo.id] ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                          {getEstadoBadge(vehiculo.estado)}
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-600 uppercase tracking-tight">
                            {vehiculo.marca} <span className="text-slate-400 font-medium">|</span> {vehiculo.modelo}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{getEscuelaNombre(vehiculo.ubicacion_actual)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Documents Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5 pl-2">
                      {(!filterVencimiento || filterVencimientoTipo === 'all' || filterVencimientoTipo === 'citv') && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">CITV</span>
                          <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-center ${getDocumentStatus(vehiculo.citv_vencimiento).color}`}>
                            {vehiculo.citv_vencimiento || 'N/R'}
                          </div>
                        </div>
                      )}

                      {(!filterVencimiento || filterVencimientoTipo === 'all' || filterVencimientoTipo === 'soat') && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">SOAT</span>
                          <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-center ${getDocumentStatus(vehiculo.soat_vencimiento).color}`}>
                            {vehiculo.soat_vencimiento || 'N/R'}
                          </div>
                        </div>
                      )}

                      {(!filterVencimiento || filterVencimientoTipo === 'all' || filterVencimientoTipo === 'poliza') && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">PÓLIZA</span>
                          <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-center ${getDocumentStatus(vehiculo.poliza_vencimiento).color}`}>
                            {vehiculo.poliza_vencimiento || 'N/R'}
                          </div>
                        </div>
                      )}

                      {(!filterVencimiento || filterVencimientoTipo === 'all') && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">ALQUILER</span>
                          <div className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border text-center ${getDocumentStatus(vehiculo.contrato_alquiler_vencimiento).color}`}>
                            {vehiculo.contrato_alquiler_vencimiento || 'N/R'}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 pl-2">
                      <button
                        onClick={() => handleEdit(vehiculo)}
                        className="flex-1 py-2.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                      >
                        <Edit size={14} className="group-hover/btn:scale-110 transition-transform" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(vehiculo.id)}
                        className="flex-1 py-2.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2 group/btn"
                      >
                        <Trash2 size={14} className="group-hover/btn:scale-110 transition-transform" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4 shadow-sm animate-pulse">
                    <Car size={24} className="text-slate-400" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">No se encontraron vehículos</h3>
                  <p className="text-[11px] font-medium text-slate-500">Intenta ajustar los filtros de búsqueda</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {filteredVehiculos.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredVehiculos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}

          {/* Formulario para agregar/editar vehículos - Estilo ERP */}
          {showForm && (
            <div className="fixed inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">

                {/* Header Modal */}
                <div className="bg-[#002855] px-8 py-5 flex items-center justify-between shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />

                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                      <Car size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">
                        {editing ? 'Editar Expediente de Unidad' : 'Alta de Nueva Unidad'}
                      </h2>
                      <p className="text-blue-200/80 text-xs font-medium tracking-wide">
                        {editing ? `Gestionando unidad: ${editing.placa}` : 'Complete la ficha técnica para registrar el vehículo'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Body Scrollable */}
                <div className="overflow-y-auto p-8 custom-scrollbar">
                  <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Sección 1: Datos de Identificación */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <span className="text-blue-600 font-black text-sm">1</span>
                        </div>
                        <h3 className="text-sm font-black text-[#002855] uppercase tracking-widest">Identificación y Estado</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Placa de Rodaje *</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Hash size={16} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input
                              type="text"
                              value={form.placa}
                              onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                              className={`block w-full pl-10 pr-3 py-2.5 bg-slate-50 border ${errors.placa ? 'border-red-300 bg-red-50' : 'border-slate-200'} rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none uppercase placeholder:normal-case`}
                              placeholder="ABC-123"
                            />
                          </div>
                          {errors.placa && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.placa}</p>}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marca *</label>
                          <input
                            type="text"
                            value={form.marca}
                            onChange={(e) => setForm({ ...form, marca: e.target.value })}
                            className={`block w-full px-4 py-2.5 bg-slate-50 border ${errors.marca ? 'border-red-300' : 'border-slate-200'} rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none`}
                            placeholder="Toyota, Nissan..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modelo *</label>
                          <input
                            type="text"
                            value={form.modelo}
                            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                            className={`block w-full px-4 py-2.5 bg-slate-50 border ${errors.modelo ? 'border-red-300' : 'border-slate-200'} rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none`}
                            placeholder="Corolla, Sentra..."
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Año de Fabricación</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Calendar size={16} className="text-slate-400" />
                            </div>
                            <input
                              type="number"
                              value={form.año}
                              onChange={(e) => setForm({ ...form, año: parseInt(e.target.value) })}
                              className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Color</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <div className="w-4 h-4 rounded-full border border-gray-300 bg-current text-slate-400" style={{ color: form.color || 'transparent' }} />
                            </div>
                            <input
                              type="text"
                              value={form.color}
                              onChange={(e) => setForm({ ...form, color: e.target.value })}
                              className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                              placeholder="Blanco, Gris..."
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Operativo</label>
                          <select
                            value={form.estado}
                            onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
                            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                          >
                            <option value="activa">Activa</option>
                            <option value="en_proceso">En Mantenimiento/Garantía</option>
                            <option value="inactiva">Fuera de Servicio</option>
                          </select>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sede Asignada</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <MapPin size={16} className="text-slate-400" />
                            </div>
                            <select
                              value={form.ubicacion_actual}
                              onChange={(e) => setForm({ ...form, ubicacion_actual: e.target.value })}
                              className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                            >
                              {schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                  {school.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ult. Mantenimiento</label>
                          <input
                            type="date"
                            value={form.fecha_ultimo_mantenimiento}
                            onChange={(e) => setForm({ ...form, fecha_ultimo_mantenimiento: e.target.value })}
                            className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección 2: Documentación */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <span className="text-blue-600 font-black text-sm">2</span>
                        </div>
                        <h3 className="text-sm font-black text-[#002855] uppercase tracking-widest">Documentación Regulatoria</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* CITV */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
                            <FileText size={14} className="text-blue-500" /> CITV
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Emisión</label>
                              <input
                                type="date"
                                value={form.citv_emision}
                                onChange={(e) => setForm({ ...form, citv_emision: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Vencimiento</label>
                              <input
                                type="date"
                                value={form.citv_vencimiento}
                                onChange={(e) => setForm({ ...form, citv_vencimiento: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* SOAT */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
                            <Shield size={14} className="text-emerald-500" /> SOAT
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Emisión</label>
                              <input
                                type="date"
                                value={form.soat_emision}
                                onChange={(e) => setForm({ ...form, soat_emision: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Vencimiento</label>
                              <input
                                type="date"
                                value={form.soat_vencimiento}
                                onChange={(e) => setForm({ ...form, soat_vencimiento: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* POLIZA */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
                            <Shield size={14} className="text-purple-500" /> Póliza
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Emisión</label>
                              <input
                                type="date"
                                value={form.poliza_emision}
                                onChange={(e) => setForm({ ...form, poliza_emision: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Vencimiento</label>
                              <input
                                type="date"
                                value={form.poliza_vencimiento}
                                onChange={(e) => setForm({ ...form, poliza_vencimiento: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* ALQUILER */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h4 className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest mb-4">
                            <FileText size={14} className="text-amber-500" /> Contrato Alquiler
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Emisión</label>
                              <input
                                type="date"
                                value={form.contrato_alquiler_emision}
                                onChange={(e) => setForm({ ...form, contrato_alquiler_emision: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase">Vencimiento</label>
                              <input
                                type="date"
                                value={form.contrato_alquiler_vencimiento}
                                onChange={(e) => setForm({ ...form, contrato_alquiler_vencimiento: e.target.value })}
                                className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sección 3: Multimedia y Notas */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <span className="text-blue-600 font-black text-sm">3</span>
                        </div>
                        <h3 className="text-sm font-black text-[#002855] uppercase tracking-widest">Multimedia y Detalles</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">URL Fotografía</label>
                            <input
                              type="url"
                              value={form.imagen_url || ''}
                              onChange={handleImageUrlChange}
                              placeholder="https://drive.google.com/..."
                              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notas Adicionales</label>
                            <textarea
                              value={form.notas}
                              onChange={(e) => setForm({ ...form, notas: e.target.value })}
                              rows={4}
                              className="block w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"
                              placeholder="Observaciones, detalles de estado, etc."
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                          {form.imagen_url ? (
                            <div className="space-y-3 w-full max-w-xs">
                              <label className="block text-xs font-bold text-slate-500 text-center uppercase">Ajuste de Miniatura</label>
                              <div className="relative aspect-square w-48 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-200 group">
                                <img
                                  src={form.imagen_url}
                                  alt="Preview"
                                  className="absolute inset-0 w-full h-full object-cover cursor-crosshair transition-transform duration-500 group-hover:scale-110"
                                  style={{ objectPosition: form.image_position || 'center' }}
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    setForm({ ...form, image_position: `${Math.round(x)}% ${Math.round(y)}%` });
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                              </div>
                              <p className="text-[10px] text-center text-slate-400">
                                Click en la imagen para ajustar el centro del recorte circular.
                              </p>
                            </div>
                          ) : (
                            <div className="text-center text-slate-400">
                              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <Car size={24} />
                              </div>
                              <p className="text-sm font-medium">Sin imagen disponible</p>
                              <p className="text-xs">Ingrese una URL para visualizar</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </form>
                </div>

                {/* Footer Fijo */}
                <div className="bg-white px-8 py-5 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-6 py-2.5 border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-8 py-2.5 bg-[#002855] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#003366] shadow-lg shadow-blue-900/10 transition-all active:scale-95"
                  >
                    {editing ? 'Guardar Cambios' : 'Registrar Unidad'}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Modal de Importación */}
          <VehicleImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={fetchVehiculos}
            locations={schools}
          />
        </div>
      </div>
    </div>
  );
}