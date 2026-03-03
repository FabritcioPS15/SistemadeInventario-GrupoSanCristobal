import { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Car, X, Download, LayoutGrid, List, MapPin, Shield, Activity, Info, Star } from 'lucide-react';
import ExcelJS from 'exceljs';
import VehicleImportModal from '../components/VehicleImportModal';
import Pagination from '../components/Pagination';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import HeaderSearch from '../components/HeaderSearch';

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
  const [schools, setSchools] = useState<Array<{ id: string, name: string }>>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase.from('locations').select('id, name').eq('type', 'escuela_conductores');
      if (!error && data) setSchools(data);
    } catch (error) { console.error('Error al cargar las escuelas:', error); }
  };

  const getEstadoBadge = (estado: string) => {
    const symbols = { activa: 'Activa', en_proceso: 'En proceso', inactiva: 'Inactiva' };
    const colors = { activa: 'bg-green-100 text-green-800', en_proceso: 'bg-yellow-100 text-yellow-800', inactiva: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-tight rounded-full ${colors[estado as keyof typeof colors]}`}>{symbols[estado as keyof typeof symbols]}</span>;
  };

  const getEscuelaNombre = (ubicacionActual: string) => {
    const school = schools.find(s => s.id === ubicacionActual);
    return school ? school.name : (ubicacionActual || 'Sin asignar');
  };

  useEffect(() => { fetchSchools(); fetchVehiculos(); }, []);

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('vehiculos').select('*').order('placa').limit(1000);
      if (error) throw error;
      setVehiculos(data || []);
    } catch (error) { console.error('Error al cargar vehículos:', error); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ placa: '', marca: '', modelo: '', color: '', año: new Date().getFullYear(), estado: 'activa', ubicacion_actual: schools[0]?.id || '', imagen_url: '', fecha_ultimo_mantenimiento: new Date().toISOString().split('T')[0], notas: '', citv_emision: '', citv_vencimiento: '', soat_emision: '', soat_vencimiento: '', poliza_emision: '', poliza_vencimiento: '', contrato_alquiler_emision: '', contrato_alquiler_vencimiento: '', image_position: 'center' });
    setEditing(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa || !form.marca || !form.modelo) return;
    const payload = { ...form, updated_at: new Date().toISOString() };
    try {
      if (editing) await supabase.from('vehiculos').update(payload).eq('id', editing.id);
      else await supabase.from('vehiculos').insert([form]);
      fetchVehiculos(); setShowForm(false); resetForm();
    } catch (error) { console.error('Error saving:', error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar vehículo?')) return;
    await supabase.from('vehiculos').delete().eq('id', id);
    fetchVehiculos();
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
    const estadoMatch = filterEstado === 'todos' || v.estado === filterEstado;
    return searchMatch && sedeMatch && estadoMatch;
  });

  const stats = useMemo(() => {
    const counts = { total: vehiculos.length, active: 0, inactive: 0, en_proceso: 0 };
    vehiculos.forEach(v => { if (v.estado === 'activa') counts.active++; else if (v.estado === 'inactiva') counts.inactive++; else counts.en_proceso++; });
    return counts;
  }, [vehiculos]);

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
    setExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Flota');
      ws.columns = [{ header: 'PLACA', key: 'placa' }, { header: 'MARCA', key: 'marca' }];
      filteredVehiculos.forEach(v => ws.addRow({ placa: v.placa, marca: v.marca }));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'Flota.xlsx'; a.click();
    } finally { setExporting(false); }
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
        <HeaderSearch
          searchTerm={search}
          setSearchTerm={setSearch}
          placeholder="Buscar unidad..."
          variant="light"
        />

        <div className="flex items-center gap-2">
          {canEdit() && <button onClick={() => { resetForm(); setShowForm(true); }} className="p-2 text-gray-400 hover:text-[#002855]"><Plus size={22} /></button>}
          <button onClick={handleExportExcel} className="p-2 text-gray-400 hover:text-emerald-600"><Download size={18} /></button>
          <button className="p-2 text-gray-400"><Star size={18} /></button>
          <button className="p-2 text-gray-400 hover:text-rose-500"><X size={18} /></button>
        </div>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Car, bg: 'bg-blue-50', color: 'text-blue-600' },
            { label: 'Activas', value: stats.active, icon: Activity, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Inactivas', value: stats.inactive, icon: Info, bg: 'bg-rose-50', color: 'text-rose-600' },
            { label: 'Proceso', value: stats.en_proceso, icon: Shield, bg: 'bg-amber-50', color: 'text-amber-600' }
          ].map((s, i) => (
            <div key={i} className="bg-white border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p><p className="text-2xl font-black text-[#002855]">{s.value}</p></div>
              <div className={`p-2.5 rounded-lg ${s.bg} ${s.color}`}><s.icon size={18} /></div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex bg-[#f1f5f9] p-1 rounded-lg border w-fit">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500'}`}><LayoutGrid size={18} /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500'}`}><List size={18} /></button>
            </div>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold uppercase text-slate-500">
              <option value="todos">ESTADOS (TODOS)</option>
              <option value="activa">ACTIVA</option>
              <option value="inactiva">INACTIVA</option>
            </select>
            <select value={filterSede} onChange={e => setFilterSede(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-xs font-bold uppercase text-slate-500">
              <option value="todos">SEDES (TODAS)</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedVehiculos.map(v => (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm border hover:shadow-xl transition-all p-6 flex flex-col group">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="text-sm font-black text-[#002855] uppercase">{v.placa}</h3><p className="text-[10px] text-slate-400 font-bold">{v.marca} {v.modelo}</p></div>
                  {getEstadoBadge(v.estado)}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mb-6"><MapPin size={14} className="text-rose-500" /> {getEscuelaNombre(v.ubicacion_actual)}</div>
                <div className="mt-auto flex gap-2 pt-4 border-t">
                  <button onClick={() => handleEdit(v)} className="flex-1 py-2 text-[9px] font-black uppercase border rounded-lg">Editar</button>
                  <button onClick={() => handleDelete(v.id)} className="p-2 text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead className="bg-[#f8fafc]">
                <tr>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('placa')}>Unidad</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('estado')}>Estado</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('ubicacion_actual')}>Sede</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('citv_vencimiento')}>CITV (Vence)</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('soat_vencimiento')}>SOAT (Vence)</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('poliza_vencimiento')}>Póliza (Vence)</th>
                  <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => handleSort('contrato_alquiler_vencimiento')}>Contrato (Vence)</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {paginatedVehiculos.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-bold">{v.placa}</span><span className="text-[10px] text-slate-400">{v.marca} {v.modelo}</span></div></td>
                    <td className="px-6 py-4">{getEstadoBadge(v.estado)}</td>
                    <td className="px-6 py-4 text-[10px] font-bold uppercase">{getEscuelaNombre(v.ubicacion_actual)}</td>
                    <td className="px-6 py-4 text-[11px] font-medium">{v.citv_vencimiento ? new Date(v.citv_vencimiento).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-[11px] font-medium">{v.soat_vencimiento ? new Date(v.soat_vencimiento).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-[11px] font-medium">{v.poliza_vencimiento ? new Date(v.poliza_vencimiento).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-[11px] font-medium">{v.contrato_alquiler_vencimiento ? new Date(v.contrato_alquiler_vencimiento).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(v)} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
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