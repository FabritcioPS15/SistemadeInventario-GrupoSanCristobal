import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Car, X, Download, LayoutGrid, List, MapPin, Star, Filter } from 'lucide-react';
import ExcelJS from 'exceljs';
import VehicleImportModal from '../components/VehicleImportModal';
import Pagination from '../components/Pagination';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useHeaderVisible } from '../hooks/useHeaderVisible';

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
  const [filterExpiration, setFilterExpiration] = useState<string | null>(null);
  const [filterSede, setFilterSede] = useState<string>('todos');
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Column Filtering State
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [columnFilters, setColumnFilters] = useState<{
    estado: string[];
    ubicacion_actual: string[];
    placa: string;
  }>({
    estado: [],
    ubicacion_actual: [],
    placa: ''
  });

  // const [exporting, setExporting] = useState(false);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => {
      const current = prev[column as keyof typeof prev] as string[];
      if (current.includes(value)) {
        return { ...prev, [column]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [column]: [...current, value] };
      }
    });
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await api.from('locations').select();
      if (error) throw error;
      if (data) setSchools(data);
    } catch (err: any) {
      console.error('Error al cargar las escuelas:', err);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const symbols = { activa: 'Activa', en_proceso: 'En proceso', inactiva: 'Inactiva' };
    const colors = { activa: 'bg-green-100 text-green-800', en_proceso: 'bg-yellow-100 text-yellow-800', inactiva: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 detail-label rounded-full ${colors[estado as keyof typeof colors]}`}>{symbols[estado as keyof typeof symbols]}</span>;
  };

  const getEscuelaNombre = (ubicacionActual: string) => {
    const school = schools.find(s => s.id === ubicacionActual);
    return school ? school.name : (ubicacionActual || 'Sin asignar');
  };

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterType = params.get('filter');
    if (filterType === 'expiring' || filterType === 'soat' || filterType === 'citv' || filterType === 'poliza') {
      // Default to 'soat' if just 'expiring' is passed, or use specific param if I update dashboard to pass specific type
      // For now, if 'expiring' is passed, maybe default to showing one? or none?
      // Since user wants specific buttons, maybe the dashboard should link to a specific one? 
      // User didn't specify, but 'expiring' generic link should probably select one or all?
      // Wait, my logic now REQUIRES a specific type.
      // Let's make 'expiring' default to 'soat' for now, or update dashboard to link to specific.
      // Actually, better: if 'expiring', maybe show all? But I removed the 'all' check logic.
      // Let's defaulting to 'soat' as it's the most critical usually, or just leave it null if I want user to must pick.
      // But for dashboard integration:
      if (filterType === 'expiring') setFilterExpiration('soat'); // Default behavior
      else setFilterExpiration(filterType);

      setFilterEstado('todos');
    }
  }, [location.search]);

  useEffect(() => { fetchSchools(); fetchVehiculos(); }, []);

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.from('vehiculos').select();
      if (error) throw error;
      setVehiculos(data || []);
    } catch (err: any) {
      console.error('Error al cargar vehículos:', err);
      alert(`Error al cargar la flota: ${err.message || 'Error de conexión'}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ placa: '', marca: '', modelo: '', color: '', año: new Date().getFullYear(), estado: 'activa', ubicacion_actual: schools[0]?.id || '', imagen_url: '', fecha_ultimo_mantenimiento: new Date().toISOString().split('T')[0], notas: '', citv_emision: '', citv_vencimiento: '', soat_emision: '', soat_vencimiento: '', poliza_emision: '', poliza_vencimiento: '', contrato_alquiler_emision: '', contrato_alquiler_vencimiento: '', image_position: 'center' });
    setEditing(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa || !form.marca || !form.modelo) {
      alert('Por favor complete los campos obligatorios (Placa, Marca, Modelo)');
      return;
    }

    // Sanitize payload: convert empty strings to null for DB columns (dates, foreign keys)
    const sanitize = (val: string) => val.trim() === '' ? null : val;

    const payload = {
      ...form,
      ubicacion_actual: sanitize(form.ubicacion_actual),
      fecha_ultimo_mantenimiento: sanitize(form.fecha_ultimo_mantenimiento),
      citv_emision: sanitize(form.citv_emision),
      citv_vencimiento: sanitize(form.citv_vencimiento),
      soat_emision: sanitize(form.soat_emision),
      soat_vencimiento: sanitize(form.soat_vencimiento),
      poliza_emision: sanitize(form.poliza_emision),
      poliza_vencimiento: sanitize(form.poliza_vencimiento),
      contrato_alquiler_emision: sanitize(form.contrato_alquiler_emision),
      contrato_alquiler_vencimiento: sanitize(form.contrato_alquiler_vencimiento),
      updated_at: new Date().toISOString()
    };

    try {
      setLoading(true);
      let result;

      if (editing) {
        result = await api.from('vehiculos').update(payload).eq('id', editing.id);
      } else {
        result = await api.from('vehiculos').insert(payload);
      }

      if (result.error) throw result.error;

      alert(editing ? 'Vehículo actualizado correctamente' : 'Vehículo creado correctamente');
      fetchVehiculos();
      setShowForm(false);
      resetForm();
    } catch (err: any) {
      console.error('Error saving:', err);
      alert(`Error al guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este vehículo? Esta acción no se puede deshacer.')) return;
    try {
      setLoading(true);
      const { error } = await api.from('vehiculos').delete().eq('id', id);
      if (error) throw error;
      alert('Vehículo eliminado correctamente');
      fetchVehiculos();
    } catch (err: any) {
      console.error('Error deleting:', err);
      alert(`Error al eliminar: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (v: Vehiculo) => {
    setEditing(v);
    setForm({ placa: v.placa, marca: v.marca, modelo: v.modelo, color: v.color || '', año: v.año, estado: v.estado, ubicacion_actual: v.ubicacion_actual, imagen_url: v.imagen_url || '', fecha_ultimo_mantenimiento: v.fecha_ultimo_mantenimiento.split('T')[0], notas: v.notas || '', citv_emision: v.citv_emision || '', citv_vencimiento: v.citv_vencimiento || '', soat_emision: v.soat_emision || '', soat_vencimiento: v.soat_vencimiento || '', poliza_emision: v.poliza_emision || '', poliza_vencimiento: v.poliza_vencimiento || '', contrato_alquiler_emision: v.contrato_alquiler_emision || '', contrato_alquiler_vencimiento: v.contrato_alquiler_vencimiento || '', image_position: v.image_position || 'center' });
    setShowForm(true);
  };

  const filteredVehiculos = vehiculos.filter(v => {
    const q = search.toLowerCase();
    const searchMatch = !search || v.placa.toLowerCase().includes(q) || v.marca.toLowerCase().includes(q) || v.modelo.toLowerCase().includes(q);
    const sedeMatch = filterSede === 'todos' || v.ubicacion_actual === filterSede;

    const checkExp = (dateStr?: string) => {
      if (!dateStr) return false;
      const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return diff <= 30; // Expired or expiring in 30 days
    };

    if (filterExpiration === 'soat') return searchMatch && sedeMatch && checkExp(v.soat_vencimiento);
    if (filterExpiration === 'citv') return searchMatch && sedeMatch && checkExp(v.citv_vencimiento);
    if (filterExpiration === 'poliza') return searchMatch && sedeMatch && checkExp(v.poliza_vencimiento);

    const estadoMatch = (filterEstado === 'todos' || v.estado === filterEstado) &&
      (columnFilters.estado.length === 0 || columnFilters.estado.includes(v.estado));

    const sedeMatchCol = columnFilters.ubicacion_actual.length === 0 || columnFilters.ubicacion_actual.includes(v.ubicacion_actual);

    return searchMatch && sedeMatch && estadoMatch && sedeMatchCol;
  });



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

  const paginatedVehiculos = useMemo(() => sortedVehiculos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [sortedVehiculos, currentPage, itemsPerPage]);

  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Flota Vehicular');

      // Define Columns with Widths
      ws.columns = [
        { header: 'PLACA', key: 'placa', width: 15 },
        { header: 'MARCA', key: 'marca', width: 20 },
        { header: 'MODELO', key: 'modelo', width: 20 },
        { header: 'COLOR', key: 'color', width: 15 },
        { header: 'AÑO', key: 'anio', width: 10 },
        { header: 'ESTADO', key: 'estado', width: 15 },
        { header: 'SEDE ACTUAL', key: 'ubicacion', width: 25 },
        { header: 'VENC. SOAT', key: 'soat', width: 15 },
        { header: 'VENC. CITV', key: 'citv', width: 15 },
        { header: 'VENC. PÓLIZA', key: 'poliza', width: 15 },
        { header: 'VENC. CONTRATO', key: 'contrato', width: 15 },
        { header: 'NOTAS', key: 'notas', width: 30 },
      ];

      // Style Header Row
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '002855' } };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // Add Data
      filteredVehiculos.forEach(v => {
        ws.addRow({
          placa: v.placa,
          marca: v.marca,
          modelo: v.modelo,
          color: v.color || '---',
          anio: v.año,
          estado: v.estado.toUpperCase().replace('_', ' '),
          ubicacion: getEscuelaNombre(v.ubicacion_actual).toUpperCase(),
          soat: formatLocalDate(v.soat_vencimiento),
          citv: formatLocalDate(v.citv_vencimiento),
          poliza: formatLocalDate(v.poliza_vencimiento),
          contrato: formatLocalDate(v.contrato_alquiler_vencimiento),
          notas: v.notas || ''
        });
      });

      // Style Data Rows (Center align mostly)
      ws.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell(1).font = { bold: true }; // Bold Placa
          row.getCell(5).alignment = { horizontal: 'center' }; // Center Year
          row.getCell(8).alignment = { horizontal: 'center' }; // Center Dates
          row.getCell(9).alignment = { horizontal: 'center' };
          row.getCell(10).alignment = { horizontal: 'center' };
          row.getCell(11).alignment = { horizontal: 'center' };
        }
      });

      // Export
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Flota_Vehicular_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    } catch (error) {
      console.error('Error exporting excel:', error);
      alert('Error al exportar a Excel');
    }
  };

  const formatLocalDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    // dateStr is expected to be YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  const getExpirationStatus = (dateStr?: string) => {
    if (!dateStr) return { label: '---', color: 'text-gray-300', bg: 'bg-gray-50' };

    // Parse YYYY-MM-DD as local midnight
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // Today at local midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'VENCIDO', color: 'text-rose-700', bg: 'bg-rose-100' };
    if (diffDays <= 30) return { label: 'VENCE PRONTO', color: 'text-amber-700', bg: 'bg-amber-100' };
    return { label: 'VIGENTE', color: 'text-emerald-700', bg: 'bg-emerald-100' };
  };

  const RenderDocBadge = ({ date }: { date?: string }) => {
    const status = getExpirationStatus(date);
    return (
      <div className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded border border-opacity-50 min-w-[70px] ${status.bg} ${status.color}`}>
        <span className="text-[10px] font-bold">{formatLocalDate(date)}</span>
      </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500" /></div>;

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] font-sans">
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]"><Car size={20} /></div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Flota Vehicular</h2>
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">{filteredVehiculos.length} Unidades</p>
          </div>
        </div>



        <div className="flex-1 max-w-md px-4">
          {/* Search Input */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar unidad..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#f1f5f9] p-1 rounded-lg border mr-2">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500'}`}><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500'}`}><List size={18} /></button>
          </div>
          {canEdit() && <button onClick={() => { resetForm(); setShowForm(true); }} className="p-2 text-gray-400 hover:text-[#002855]"><Plus size={22} /></button>}
          <button onClick={handleExportExcel} className="p-2 text-gray-400 hover:text-emerald-600"><Download size={18} /></button>
          <button className="p-2 text-gray-400"><Star size={18} /></button>
          <button className="p-2 text-gray-400 hover:text-rose-500"><X size={18} /></button>
        </div>
      </div>

      {/* Sticky Secondary Header (Filters) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 py-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sticky top-14 z-20 shadow-sm transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto items-center">
          <span className="detail-label">Filtrar por:</span>
          {/* Status Pills */}
          <div className="flex bg-[#f1f5f9] p-1 rounded-lg border w-fit overflow-x-auto">
            {['todos'].map(status => (
              <button
                key={status}
                onClick={() => { setFilterEstado(status); setFilterExpiration(null); }}
                className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap ${filterEstado === status && !filterExpiration ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Todos
              </button>
            ))}

            <div className="w-[1px] h-4 bg-gray-200 mx-1" />

            {/* Expiration Filters */}
            {[
              { id: 'soat', label: 'Vence SOAT' },
              { id: 'citv', label: 'Vence CITV' },
              { id: 'poliza', label: 'Vence Póliza' }
            ].map(exp => (
              <button
                key={exp.id}
                onClick={() => { setFilterExpiration(exp.id); setFilterEstado('todos'); }}
                className={`px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-black uppercase transition-all whitespace-nowrap flex items-center gap-1 ${filterExpiration === exp.id ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-500 hover:bg-rose-50'}`}
              >
                {filterExpiration === exp.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                {exp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Styled Filter */}
        <div className="relative w-full lg:w-64">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <Filter size={14} />
          </div>
          <select
            value={filterSede}
            onChange={e => setFilterSede(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase text-slate-600 outline-none focus:ring-2 focus:ring-[#002855]/10 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="todos">Todas las Sedes</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">

        {viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedVehiculos.map(v => (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm border hover:shadow-xl transition-all p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="mb-0.5">{v.placa}</h3>
                    <p className="detail-label">{v.marca} {v.modelo} - {v.color}</p>
                  </div>
                  {getEstadoBadge(v.estado)}
                </div>

                {/* Visual Document Status in Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 mb-0.5">SOAT</p>
                    <div className={`h-1.5 rounded-full w-full ${getExpirationStatus(v.soat_vencimiento).bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 mb-0.5">CITV</p>
                    <div className={`h-1.5 rounded-full w-full ${getExpirationStatus(v.citv_vencimiento).bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 mb-0.5">PÓLIZA</p>
                    <div className={`h-1.5 rounded-full w-full ${getExpirationStatus(v.poliza_vencimiento).bg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 detail-label mb-6"><MapPin size={14} className="text-rose-500" /> {getEscuelaNombre(v.ubicacion_actual)}</div>
                <div className="mt-auto flex gap-2 pt-4 border-t border-slate-50">
                  <button onClick={() => handleEdit(v)} className="flex-1 py-2 text-[10px] font-black uppercase border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Editar</button>
                  <button onClick={() => handleDelete(v.id)} className="p-2 text-rose-500 border border-rose-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th className="w-10 text-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  <th className="cursor-pointer group relative" onClick={() => handleSort('placa')}>
                    <div className="flex items-center gap-1">Unidad {sortConfig?.key === 'placa' && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</div>
                  </th>
                  <th className="cursor-pointer group" onClick={() => handleSort('marca')}>
                    <div className="flex items-center gap-1">Marca / Modelo</div>
                  </th>
                  <th className="px-3 py-2 text-left border-r border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-tight" onClick={() => handleSort('color')}>Color</th>

                  {/* Sede Filter Header */}
                  <th className="px-3 py-2 text-left border-r border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-tight relative">
                    <div className="flex items-center justify-between cursor-pointer group" onClick={() => setActiveFilter(activeFilter === 'sede' ? null : 'sede')}>
                      <span>Sede</span>
                      <div className={`p-1 rounded-md transition-all ${columnFilters.ubicacion_actual.length > 0 || sortConfig?.key === 'ubicacion_actual' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-slate-400'}`}>
                        <Filter size={12} className={columnFilters.ubicacion_actual.length > 0 || sortConfig?.key === 'ubicacion_actual' ? 'fill-current' : ''} />
                      </div>
                    </div>
                    {/* Sede Dropdown */}
                    {activeFilter === 'sede' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
                          <div className="flex gap-1 mb-2">
                            <button onClick={() => { handleSort('ubicacion_actual'); setSortConfig({ key: 'ubicacion_actual', direction: 'asc' }); }} className={`flex-1 flex items-center justify-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 text-[10px] uppercase font-bold text-slate-600 ${sortConfig?.key === 'ubicacion_actual' && sortConfig.direction === 'asc' ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}`}>A-Z</button>
                            <button onClick={() => { handleSort('ubicacion_actual'); setSortConfig({ key: 'ubicacion_actual', direction: 'desc' }); }} className={`flex-1 flex items-center justify-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 text-[10px] uppercase font-bold text-slate-600 ${sortConfig?.key === 'ubicacion_actual' && sortConfig.direction === 'desc' ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}`}>Z-A</button>
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase px-1">Filtrar por Sede</div>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {schools.map(school => (
                              <label key={school.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={columnFilters.ubicacion_actual.includes(school.id)}
                                  onChange={() => toggleColumnFilter('ubicacion_actual', school.id)}
                                  className="rounded border-gray-300 text-[#002855] w-3 h-3"
                                />
                                <span className="text-[11px] text-gray-700 capitalize truncate">{school.name.toLowerCase()}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </th>

                  {/* Date Columns with Sort */}
                  {['soat', 'citv', 'poliza'].map(doc => (
                    <th key={doc} className="px-3 py-2 text-center border-r border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-tight relative">
                      <div className="flex items-center justify-center gap-1 cursor-pointer group" onClick={() => setActiveFilter(activeFilter === doc ? null : doc)}>
                        <span>{doc.toUpperCase()}</span>
                        <div className={`p-1 rounded-md transition-all ${sortConfig?.key === `${doc}_vencimiento` ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-slate-400'}`}>
                          <Filter size={12} className={sortConfig?.key === `${doc}_vencimiento` ? 'fill-current' : ''} />
                        </div>
                      </div>
                      {activeFilter === doc && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                          <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 text-left">
                            <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase px-1">Ordenar por Fecha</div>
                            <div className="space-y-1">
                              <button onClick={() => handleSort(`${doc}_vencimiento`)} className={`w-full text-left p-1.5 rounded text-[11px] uppercase font-bold hover:bg-gray-50 flex items-center justify-between ${sortConfig?.key === `${doc}_vencimiento` && sortConfig.direction === 'asc' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
                                <span>Más Cercano</span>
                                {sortConfig?.key === `${doc}_vencimiento` && sortConfig.direction === 'asc' && <span>✓</span>}
                              </button>
                              <button onClick={() => { setSortConfig({ key: `${doc}_vencimiento`, direction: 'desc' }); }} className={`w-full text-left p-1.5 rounded text-[11px] uppercase font-bold hover:bg-gray-50 flex items-center justify-between ${sortConfig?.key === `${doc}_vencimiento` && sortConfig.direction === 'desc' ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}>
                                <span>Más Lejano</span>
                                {sortConfig?.key === `${doc}_vencimiento` && sortConfig.direction === 'desc' && <span>✓</span>}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </th>
                  ))}

                  {/* Estado Filter Header */}
                  <th className="relative text-center">
                    <div className="flex items-center justify-center gap-2 cursor-pointer group" onClick={() => setActiveFilter(activeFilter === 'estado' ? null : 'estado')}>
                      <span>Estado</span>
                      <div className={`p-1 rounded-md transition-all ${columnFilters.estado.length > 0 || sortConfig?.key === 'estado' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-200 text-slate-400'}`}>
                        <Filter size={12} className={columnFilters.estado.length > 0 || sortConfig?.key === 'estado' ? 'fill-current' : ''} />
                      </div>
                    </div>
                    {/* Estado Dropdown */}
                    {activeFilter === 'estado' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveFilter(null)} />
                        <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2 text-left">
                          <div className="flex gap-1 mb-2">
                            <button onClick={() => { handleSort('estado'); setSortConfig({ key: 'estado', direction: 'asc' }); }} className={`flex-1 flex items-center justify-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 text-[10px] uppercase font-bold text-slate-600 ${sortConfig?.key === 'estado' && sortConfig.direction === 'asc' ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}`}>A-Z</button>
                            <button onClick={() => { handleSort('estado'); setSortConfig({ key: 'estado', direction: 'desc' }); }} className={`flex-1 flex items-center justify-center p-1.5 rounded bg-gray-50 hover:bg-gray-100 text-[10px] uppercase font-bold text-slate-600 ${sortConfig?.key === 'estado' && sortConfig.direction === 'desc' ? 'bg-blue-50 text-blue-600 border border-blue-200' : ''}`}>Z-A</button>
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 mb-2 uppercase px-1">Filtrar Estado</div>
                          <div className="space-y-1">
                            {['activa', 'en_proceso', 'inactiva'].map(status => (
                              <label key={status} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={columnFilters.estado.includes(status)}
                                  onChange={() => toggleColumnFilter('estado', status)}
                                  className="rounded border-gray-300 text-[#002855] w-3 h-3"
                                />
                                <span className="text-[11px] text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </th>
                  <th className="w-16 px-2 py-2 text-center border-b border-gray-200"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {paginatedVehiculos.map((v, index) => (
                  <tr key={v.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="text-center border-r border-gray-100 text-slate-400">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="text-center border-r border-gray-100">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="border-r border-gray-100 text-blue-700 cursor-pointer hover:underline" onClick={() => handleEdit(v)}>
                      {v.placa}
                    </td>
                    <td className="border-r border-gray-100">
                      {v.marca} {v.modelo}
                    </td>
                    <td className="border-r border-gray-100 uppercase">
                      {v.color || '---'}
                    </td>
                    <td className="border-r border-gray-100">
                      {getEscuelaNombre(v.ubicacion_actual)}
                    </td>
                    <td className="border-r border-gray-100 text-center">
                      <RenderDocBadge date={v.soat_vencimiento} />
                    </td>
                    <td className="border-r border-gray-100 text-center">
                      <RenderDocBadge date={v.citv_vencimiento} />
                    </td>
                    <td className="border-r border-gray-100 text-center">
                      <RenderDocBadge date={v.poliza_vencimiento} />
                    </td>
                    <td className="border-r border-gray-100 text-center">
                      {getEstadoBadge(v.estado)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(v); }} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }} className="p-1 text-slate-400 hover:text-rose-600 rounded"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sortedVehiculos.length > itemsPerPage && <Pagination currentPage={currentPage} totalPages={Math.ceil(sortedVehiculos.length / itemsPerPage)} totalItems={sortedVehiculos.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-[#002855] px-8 py-5 flex items-center justify-between"><h2 className="text-lg font-black text-white uppercase">{editing ? 'Editar' : 'Nueva'} Unidad</h2><button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X size={24} /></button></div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto bg-slate-50 flex-1">
              <input placeholder="Placa" value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value.toUpperCase() })} className="w-full px-4 py-2 rounded-lg border outline-none font-bold" required />
              <div className="grid grid-cols-2 gap-4"><input placeholder="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" required /><input placeholder="Modelo" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" required />
                <input placeholder="Año" type="number" value={form.año} onChange={e => setForm({ ...form, año: parseInt(e.target.value) })} className="w-full px-4 py-2 rounded-lg border outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Vencimiento SOAT</label>
                  <input type="date" value={form.soat_vencimiento} onChange={e => setForm({ ...form, soat_vencimiento: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Vencimiento CITV</label>
                  <input type="date" value={form.citv_vencimiento} onChange={e => setForm({ ...form, citv_vencimiento: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Vencimiento Póliza</label>
                  <input type="date" value={form.poliza_vencimiento} onChange={e => setForm({ ...form, poliza_vencimiento: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Vencimiento Contrato</label>
                  <input type="date" value={form.contrato_alquiler_vencimiento} onChange={e => setForm({ ...form, contrato_alquiler_vencimiento: e.target.value })} className="w-full px-4 py-2 rounded-lg border outline-none" />
                </div>
              </div>
              <select value={form.ubicacion_actual} onChange={e => setForm({ ...form, ubicacion_actual: e.target.value })} className="w-full px-4 py-2 rounded-lg border font-bold" required>{schools.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}</select>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 text-xs font-black uppercase text-gray-400">Cancelar</button><button type="submit" className="flex-1 py-2 bg-[#002855] text-white rounded-lg text-xs font-black uppercase">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
      <VehicleImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onSuccess={fetchVehiculos} locations={schools} />
    </div>
  );
}