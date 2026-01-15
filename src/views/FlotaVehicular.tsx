import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Car, X, Download, Upload, CheckSquare } from 'lucide-react';
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
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [filterDashboard, setFilterDashboard] = useState<'all' | 'expired' | 'expiring'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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
      const docs = [v.citv_vencimiento, v.soat_vencimiento, v.poliza_vencimiento, v.contrato_alquiler_vencimiento];
      const today = new Date();

      let hasExpired = false;
      let hasExpiring = false;

      docs.forEach(d => {
        if (!d) return;
        const date = new Date(d);
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) hasExpired = true;
        if (diffDays >= 0 && diffDays <= 30) hasExpiring = true;
      });

      return { hasExpired, hasExpiring };
    };

    if (filterDashboard === 'expired') {
      vencimientoMatch = checkDocuments(vehiculo).hasExpired;
    } else if (filterDashboard === 'expiring') {
      vencimientoMatch = checkDocuments(vehiculo).hasExpiring;
    } else if (filterVencimiento) {
      // Keep legacy checkbox logic if dashboard filter is not active but checkbox is (optional fallback)
      vencimientoMatch = checkDocuments(vehiculo).hasExpiring || checkDocuments(vehiculo).hasExpired;
    }

    return searchMatch && sedeMatch && estadoMatch && vencimientoMatch;
  });

  // Calculate statistics for Dashboard
  const stats = useMemo(() => {
    let expired = 0;
    let expiring = 0;
    const today = new Date();

    vehiculos.forEach(v => {
      const docs = [v.citv_vencimiento, v.soat_vencimiento, v.poliza_vencimiento, v.contrato_alquiler_vencimiento];
      let hasExpired = false;
      let hasExpiring = false;

      docs.forEach(d => {
        if (!d) return;
        const date = new Date(d);
        const diffTime = date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) hasExpired = true;
        if (diffDays >= 0 && diffDays <= 30) hasExpiring = true;
      });

      if (hasExpired) expired++;
      if (hasExpiring) expiring++;
    });

    return { expired, expiring };
  }, [vehiculos]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredVehiculos.length / itemsPerPage);
  const paginatedVehiculos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredVehiculos.slice(startIndex, endIndex);
  }, [filteredVehiculos, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterSede, filterEstado, filterVencimiento, filterDashboard]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.size} vehículos seleccionados? Esta acción no se puede deshacer.`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('vehiculos')
          .delete()
          .in('id', Array.from(selectedIds));

        if (error) throw error;

        setSelectedIds(new Set());
        fetchVehiculos();
      } catch (error: any) {
        console.error('Error al eliminar vehículos:', error);
        alert('Error al eliminar vehículos: ' + error.message);
        setLoading(false); // Only set loading false on error, fetchVehiculos handles it otherwise
      }
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
    <div className="w-full px-4 py-8">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">Flota Vehicular</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión y control de unidades motorizadas de la empresa</p>
        </div>

        {/* Central Alerts */}
        <div className="flex-1 flex items-center justify-center gap-3">
          {stats.expired > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                {stats.expired} Doc{stats.expired > 1 ? 's' : ''} Vencido{stats.expired > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {stats.expiring > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">
                {stats.expiring} Por Vencer (30d)
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
              title="Descargar en Excel"
            >
              <Download size={14} />
              {exporting ? '...' : 'Exportar'}
            </button>

            {canEdit() && (
              <>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                    title="Eliminar seleccionados"
                  >
                    <Trash2 size={14} />
                    Eliminar ({selectedIds.size})
                  </button>
                )}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                  title="Importar desde Excel"
                >
                  <Upload size={14} />
                  Importar
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                >
                  <Plus size={14} />
                  Agregar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div
          onClick={() => setFilterDashboard(prev => prev === 'expired' ? 'all' : 'expired')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all ${filterDashboard === 'expired' ? 'ring-2 ring-red-500 border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Documentos Vencidos</p>
              <h3 className="text-2xl font-bold text-red-600">{stats.expired}</h3>
              <p className="text-xs text-gray-400 mt-1">Vehículos con documentación caducada</p>
            </div>
            <div className={`p-3 rounded-lg ${filterDashboard === 'expired' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'}`}>
              <CheckSquare size={24} />
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterDashboard(prev => prev === 'expiring' ? 'all' : 'expiring')}
          className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer transition-all ${filterDashboard === 'expiring' ? ' ring-2 ring-yellow-500 border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-300'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Por Vencer (30 días)</p>
              <h3 className="text-2xl font-bold text-yellow-600">{stats.expiring}</h3>
              <p className="text-xs text-gray-400 mt-1">Vehículos que requieren atención pronto</p>
            </div>
            <div className={`p-3 rounded-lg ${filterDashboard === 'expiring' ? 'bg-white text-yellow-600' : 'bg-yellow-100 text-yellow-600'}`}>
              <CheckSquare size={24} />
            </div>
          </div>
        </div>
      </div>

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
              placeholder="Buscar placa, marca, modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro Sede */}
          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 rounded-lg bg-white"
              value={filterSede}
              onChange={(e) => setFilterSede(e.target.value)}
            >
              <option value="todos">Todas las Sedes</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 rounded-lg bg-white"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="todos">Todos los Estados</option>
              <option value="activa">Activa</option>
              <option value="en_proceso">En proceso</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </div>

          {/* Filtro Vencimiento */}
          {/* Filtro Vencimiento */}
          <div className="flex items-center justify-between sm:justify-start px-2 py-2 sm:py-0 border sm:border-0 border-gray-100 rounded-lg">
            <span className="text-sm font-medium text-gray-700 sm:hidden">Por vencer (30 días)</span>
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={filterVencimiento}
                onChange={(e) => setFilterVencimiento(e.target.checked)}
              />
              <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
              <span className="ms-3 text-sm font-medium text-gray-700 hidden sm:inline">Por vencer (30 días)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 w-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                    onChange={handleSelectAll}
                    checked={filteredVehiculos.length > 0 && selectedIds.size === filteredVehiculos.length}
                  />
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Vehículo
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Estado
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Sede
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Documentación (Vencimiento)
                </th>
                <th scope="col" className="relative px-6 py-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paginatedVehiculos.length > 0 ? (
                paginatedVehiculos.map((vehiculo) => {
                  const isSelected = selectedIds.has(vehiculo.id);
                  return (
                    <tr
                      key={vehiculo.id}
                      onClick={() => handleToggleSelect(vehiculo.id)}
                      className={`
                      cursor-pointer transition-colors group
                      ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'}
                    `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(vehiculo.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors overflow-hidden cursor-pointer"
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
                              <Car className="h-5 w-5 text-slate-600" />
                            )}
                            {/* Fallback icon if image fails */}
                            <Car className="h-5 w-5 text-slate-600 hidden fallback-icon:block" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-slate-900 uppercase tracking-tight">{vehiculo.placa}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                              {vehiculo.marca} {vehiculo.modelo}
                              {vehiculo.color && <span className="text-slate-500 ml-1">• {vehiculo.color}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEstadoBadge(vehiculo.estado)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getEscuelaColor(vehiculo.ubicacion_actual)}`}></div>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{getEscuelaNombre(vehiculo.ubicacion_actual)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {/* CITV */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold w-12 uppercase">CITV:</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold border ${getDocumentStatus(vehiculo.citv_vencimiento).color}`}>
                              {vehiculo.citv_vencimiento || 'No reg.'}
                            </span>
                          </div>
                          {/* SOAT */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold w-12 uppercase">SOAT:</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold border ${getDocumentStatus(vehiculo.soat_vencimiento).color}`}>
                              {vehiculo.soat_vencimiento || 'No reg.'}
                            </span>
                          </div>
                          {/* Poliza */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold w-12 uppercase">Póliza:</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold border ${getDocumentStatus(vehiculo.poliza_vencimiento).color}`}>
                              {vehiculo.poliza_vencimiento || 'No reg.'}
                            </span>
                          </div>
                          {/* Contrato Alquiler */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400 font-bold w-12 uppercase text-nowrap">Alquiler:</span>
                            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold border ${getDocumentStatus(vehiculo.contrato_alquiler_vencimiento).color}`}>
                              {vehiculo.contrato_alquiler_vencimiento || 'No reg.'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(vehiculo)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(vehiculo.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
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
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 font-medium italic">
                    No se encontraron vehículos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List Cards */}
        <div className="lg:hidden divide-y divide-gray-100">
          {paginatedVehiculos.length > 0 ? (
            paginatedVehiculos.map((vehiculo) => (
              <div key={vehiculo.id} className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden cursor-pointer"
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
                          className="h-full w-full object-cover transition-all duration-300"
                          style={{ objectPosition: vehiculo.image_position || 'center' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                          }}
                        />
                      ) : (
                        <Car className="h-5 w-5 text-slate-600" />
                      )}
                      <Car className="h-5 w-5 text-slate-600 hidden fallback-icon:block" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 uppercase tracking-tight">{vehiculo.placa}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{vehiculo.marca} {vehiculo.modelo}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getEstadoBadge(vehiculo.estado)}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${getEscuelaColor(vehiculo.ubicacion_actual)}`}></div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{getEscuelaNombre(vehiculo.ubicacion_actual)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">CITV</span>
                    <div className={`inline-block px-2 py-0.5 text-[9px] rounded-full font-bold border ${getDocumentStatus(vehiculo.citv_vencimiento).color}`}>
                      {vehiculo.citv_vencimiento || 'N/R'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">SOAT</span>
                    <div className={`inline-block px-2 py-0.5 text-[9px] rounded-full font-bold border ${getDocumentStatus(vehiculo.soat_vencimiento).color}`}>
                      {vehiculo.soat_vencimiento || 'N/R'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block">PÓLIZA</span>
                    <div className={`inline-block px-2 py-0.5 text-[9px] rounded-full font-bold border ${getDocumentStatus(vehiculo.poliza_vencimiento).color}`}>
                      {vehiculo.poliza_vencimiento || 'N/R'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest block text-nowrap">ALQUILER</span>
                    <div className={`inline-block px-2 py-0.5 text-[9px] rounded-full font-bold border ${getDocumentStatus(vehiculo.contrato_alquiler_vencimiento).color}`}>
                      {vehiculo.contrato_alquiler_vencimiento || 'N/R'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(vehiculo)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg uppercase tracking-widest"
                  >
                    <Edit size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(vehiculo.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg uppercase tracking-widest"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-sm text-slate-400 font-medium italic">
              No se encontraron vehículos registrados.
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

      {/* Formulario para agregar/editar vehículos */}
      {
        showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  {editing ? 'Editar Vehículo' : 'Agregar Vehículo'}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Placa *</label>
                    <input
                      type="text"
                      value={form.placa}
                      onChange={(e) => setForm({ ...form, placa: e.target.value })}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 ${errors.placa ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.placa && <p className="text-red-500 text-xs mt-1">{errors.placa}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marca *</label>
                    <input
                      type="text"
                      value={form.marca}
                      onChange={(e) => setForm({ ...form, marca: e.target.value })}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 ${errors.marca ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.marca && <p className="text-red-500 text-xs mt-1">{errors.marca}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Modelo *</label>
                    <input
                      type="text"
                      value={form.modelo}
                      onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                      className={`mt-1 block w-full border rounded-md px-3 py-2 ${errors.modelo ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {errors.modelo && <p className="text-red-500 text-xs mt-1">{errors.modelo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Color</label>
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="Ej. Blanco, Rojo, Plata..."
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Año</label>
                    <input
                      type="number"
                      value={form.año}
                      onChange={(e) => setForm({ ...form, año: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                    <select
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value as any })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="activa">Activa</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="inactiva">Inactiva</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Escuela</label>
                    <select
                      value={form.ubicacion_actual}
                      onChange={(e) => setForm({ ...form, ubicacion_actual: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha Último Mantenimiento</label>
                    <input
                      type="date"
                      value={form.fecha_ultimo_mantenimiento}
                      onChange={(e) => setForm({ ...form, fecha_ultimo_mantenimiento: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  {/* CITV Section */}
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">CITV (Revisión Técnica)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                        <input
                          type="date"
                          value={form.citv_emision}
                          onChange={(e) => setForm({ ...form, citv_emision: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                        <input
                          type="date"
                          value={form.citv_vencimiento}
                          onChange={(e) => setForm({ ...form, citv_vencimiento: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SOAT Section */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">SOAT</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                        <input
                          type="date"
                          value={form.soat_emision}
                          onChange={(e) => setForm({ ...form, soat_emision: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                        <input
                          type="date"
                          value={form.soat_vencimiento}
                          onChange={(e) => setForm({ ...form, soat_vencimiento: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Policy Section */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Póliza de Seguro</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                        <input
                          type="date"
                          value={form.poliza_emision}
                          onChange={(e) => setForm({ ...form, poliza_emision: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                        <input
                          type="date"
                          value={form.poliza_vencimiento}
                          onChange={(e) => setForm({ ...form, poliza_vencimiento: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contrato de Alquiler Section */}
                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Contrato de Alquiler</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Emisión</label>
                        <input
                          type="date"
                          value={form.contrato_alquiler_emision}
                          onChange={(e) => setForm({ ...form, contrato_alquiler_emision: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Vencimiento</label>
                        <input
                          type="date"
                          value={form.contrato_alquiler_vencimiento}
                          onChange={(e) => setForm({ ...form, contrato_alquiler_vencimiento: e.target.value })}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">URL de la imagen (Google Drive)</label>
                      <input
                        type="url"
                        value={form.imagen_url || ''}
                        onChange={handleImageUrlChange}
                        placeholder="https://drive.google.com/..."
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        * Pega el enlace directo de la imagen.
                      </p>
                    </div>

                    {form.imagen_url && (
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ajuste de Posición (Clic en la imagen)
                        </label>
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-slate-200 shadow-md group">
                            <img
                              src={form.imagen_url}
                              alt="Vista previa"
                              className="absolute inset-0 w-full h-full object-cover cursor-crosshair transition-all"
                              style={{ objectPosition: form.image_position || 'center' }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                setForm({ ...form, image_position: `${Math.round(x)}% ${Math.round(y)}%` });
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 pointer-events-none transition-colors" />
                          </div>
                          <p className="text-xs text-center text-slate-500">
                            Haz clic en la parte importante de la foto para centrarla en el círculo.
                          </p>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, image_position: 'center' })}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Restablecer al centro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notas</label>
                    <textarea
                      value={form.notas}
                      onChange={(e) => setForm({ ...form, notas: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editing ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div >
        )
      }
      {/* Modal de Importación */}
      <VehicleImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchVehiculos();
          alert('Importación de vehículos completada exitosamente.');
        }}
        locations={schools}
      />
    </div >
  );
}