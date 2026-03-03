import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, MapPin, Building, Users, Package, Eye, X, FileText, LayoutGrid, List, ChevronUp, ChevronDown, Star } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { supabase, Location } from '../lib/supabase';
import LocationForm from '../components/forms/LocationForm';
import { useAuth } from '../contexts/AuthContext';

export default function Sedes() {
  const { canEdit } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | undefined>();
  const [viewingLocation, setViewingLocation] = useState<Location | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [cameraCounts, setCameraCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchLocations();
    await fetchCameraCounts();
    setLoading(false);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const fetchCameraCounts = async () => {
    const { data } = await supabase
      .from('cameras')
      .select('location_id');

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(camera => {
        if (camera.location_id) {
          counts[camera.location_id] = (counts[camera.location_id] || 0) + 1;
        }
      });
      setCameraCounts(counts);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleViewLocation = (location: Location) => {
    setViewingLocation(location);
  };

  const handleDeleteLocation = async (location: Location) => {
    const cameraCount = cameraCounts[location.id] || 0;

    // Verificar assets asociados
    let assetsCount = 0;
    try {
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id')
        .eq('location_id', location.id);
      assetsCount = assetsData?.length || 0;
    } catch (err) {
      console.log('⚠️ No se pudo verificar assets:', err);
    }

    // Verificar usuarios asociados
    let usersCount = 0;
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id')
        .eq('location_id', location.id);
      usersCount = usersData?.length || 0;
    } catch (err) {
      console.log('⚠️ No se pudo verificar usuarios:', err);
    }

    const totalAssociated = cameraCount + assetsCount + usersCount;

    const message = totalAssociated > 0
      ? `⚠️ Esta sede tiene elementos asociados (${cameraCount} cámaras, ${assetsCount} assets, ${usersCount} usuarios).\n\n¿Estás seguro de que quieres eliminar la ubicación "${location.name}"? Los elementos quedarán con ubicación no definida.`
      : `¿Estás seguro de que quieres eliminar la ubicación "${location.name}"?`;

    if (!window.confirm(message)) return;

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id);

      if (error) throw error;

      await fetchData();
      alert(`Sede "${location.name}" eliminada.`);
    } catch (err: any) {
      alert('Error al eliminar la sede: ' + err.message);
    }
  };

  const handleSaveLocation = async () => {
    setShowForm(false);
    setEditingLocation(undefined);
    await fetchData();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLocation(undefined);
  };

  const typeLabels: Record<string, string> = {
    revision: 'Revisión',
    policlinico: 'Policlínico',
    escuela_conductores: 'Escuela de Conductores',
    central: 'Central',
    circuito: 'Circuito',
  };

  const typeColors: Record<string, string> = {
    revision: 'bg-blue-50 text-blue-700 border-blue-200',
    policlinico: 'bg-green-50 text-green-700 border-green-200',
    escuela_conductores: 'bg-purple-50 text-purple-700 border-purple-200',
    central: 'bg-orange-50 text-orange-700 border-orange-200',
    circuito: 'bg-red-50 text-red-700 border-red-200',
  };

  const sortedLocations = useMemo(() => {
    const filtered = locations.filter(location => {
      const matchesSearch =
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = !typeFilter || location.type === typeFilter;

      return matchesSearch && matchesType;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'type':
          aValue = typeLabels[a.type as keyof typeof typeLabels] || a.type;
          bValue = typeLabels[b.type as keyof typeof typeLabels] || b.type;
          break;
        case 'cameras':
          aValue = cameraCounts[a.id] || 0;
          bValue = cameraCounts[b.id] || 0;
          break;
        default:
          aValue = (a as any)[sortConfig.key];
          bValue = (b as any)[sortConfig.key];
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [locations, searchTerm, typeFilter, sortConfig, cameraCounts]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <Building size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Gestión de Sedes</h2>
          </div>
        </div>



        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
            <div className="flex bg-[#f1f5f9] p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista Cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                title="Vista Lista"
              >
                <List size={16} />
              </button>
            </div>
            {canEdit() && (
              <button
                onClick={() => {
                  setEditingLocation(undefined);
                  setShowForm(true);
                }}
                className="p-2 ml-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"
                title="Nueva Sede"
              >
                <Plus size={18} />
              </button>
            )}
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Statistics Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Sedes', value: locations.filter(loc => loc.type !== 'circuito').length, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Circuitos', value: locations.filter(loc => loc.type === 'circuito').length, icon: MapPin, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Cámaras', value: Object.values(cameraCounts).reduce((sum, count) => sum + count, 0), icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Promedio Cam.', value: locations.filter(loc => loc.type !== 'circuito').length > 0 ? Math.round(Object.values(cameraCounts).reduce((sum, count) => sum + count, 0) / locations.filter(loc => loc.type !== 'circuito').length) : 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Cobertura', value: `${locations.filter(loc => loc.type !== 'circuito').length > 0 ? Math.round((Object.keys(cameraCounts).length / locations.filter(loc => loc.type !== 'circuito').length) * 100) : 0}%`, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
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

        {/* Control Bar */}
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
                <FileText size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                >
                  <option value="">TODOS LOS TIPOS</option>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
                <ChevronDown size={14} className="text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Orden:</span>
                <select
                  value={sortConfig ? `${sortConfig.key}-${sortConfig.direction}` : ''}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('-');
                    if (key) {
                      setSortConfig({ key, direction: direction as 'asc' | 'desc' });
                    } else {
                      setSortConfig(null);
                    }
                  }}
                  className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                >
                  <option value="">ORDENAR POR...</option>
                  <option value="name-asc">NOMBRE (A-Z)</option>
                  <option value="name-desc">NOMBRE (Z-A)</option>
                  <option value="type-asc">TIPO (A-Z)</option>
                  <option value="type-desc">TIPO (Z-A)</option>
                  <option value="cameras-desc">N° CÁMARAS (MAYOR)</option>
                  <option value="cameras-asc">N° CÁMARAS (MENOR)</option>
                </select>
              </div>

              {(searchTerm || typeFilter) && (
                <button
                  onClick={() => { setSearchTerm(''); setTypeFilter(''); setSortConfig(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors uppercase tracking-wider"
                >
                  <X size={14} /> Limpiar filtros
                </button>
              )}
            </div>

            <div className="text-[10px] font-black text-[#64748b] uppercase tracking-widest text-right">
              {sortedLocations.length} Ubicaciones encontradas
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : sortedLocations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <Building size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">No se encontraron sedes</h3>
            <p className="text-sm text-slate-400 mt-2">Prueba con otro término de búsqueda o filtro</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedLocations.map(location => (
              <div key={location.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 flex flex-col group overflow-hidden">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <div className="bg-gray-50 rounded-xl p-2.5 group-hover:bg-blue-50 transition-colors duration-300">
                      <MapPin className={`h-6 w-6 ${location.type === 'circuito' ? 'text-rose-500' : 'text-blue-500'}`} />
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${typeColors[location.type as keyof typeof typeColors] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                      {typeLabels[location.type as keyof typeof typeLabels] || location.type}
                    </span>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                      {location.name}
                    </h3>
                    {location.address && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2.5rem]">
                        {location.address}
                      </p>
                    )}
                  </div>

                  {location.notes && (
                    <div className="mb-6 px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <p className="text-xs text-amber-800 line-clamp-2 italic">
                        {location.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100/50">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Cámaras</span>
                    </div>
                    <span className="text-lg font-black text-gray-900">
                      {cameraCounts[location.id] || 0}
                    </span>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                  <button
                    onClick={() => handleViewLocation(location)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                  >
                    <Eye size={14} />
                    DETALLES
                  </button>
                  {canEdit() && (
                    <>
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                        title="Editar sede"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location)}
                        className={`p-2 bg-white rounded-lg transition-all active:scale-95 shadow-sm border ${cameraCounts[location.id] > 0
                          ? 'text-orange-500 border-orange-100 hover:bg-orange-500 hover:text-white'
                          : 'text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white'
                          }`}
                        title={cameraCounts[location.id] > 0 ? 'Eliminar sede y sus cámaras asociadas' : 'Eliminar sede'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
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
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Nombre
                        {sortConfig?.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : null}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-1">
                        Tipo
                        {sortConfig?.key === 'type' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : null}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('address')}
                    >
                      <div className="flex items-center gap-1">
                        Dirección
                        {sortConfig?.key === 'address' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : null}
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors"
                      onClick={() => handleSort('cameras')}
                    >
                      <div className="flex items-center gap-1">
                        Cámaras
                        {sortConfig?.key === 'cameras' ? (
                          sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : null}
                      </div>
                    </th>
                    <th scope="col" className="relative px-6 py-4">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedLocations.map(location => (
                    <tr key={location.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 rounded-lg p-2">
                            <MapPin className={`h-5 w-5 ${location.type === 'circuito' ? 'text-rose-500' : 'text-blue-500'}`} />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900 leading-tight">{location.name}</div>
                            {location.notes && (
                              <div className="text-xs text-gray-500 line-clamp-1 mt-0.5 italic">{location.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${typeColors[location.type as keyof typeof typeColors] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {typeLabels[location.type as keyof typeof typeLabels] || location.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {location.address ? (
                          <div className="text-sm text-gray-700 max-w-xs truncate">{location.address}</div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-bold text-gray-900">{cameraCounts[location.id] || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewLocation(location)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="Ver detalles"
                          >
                            <Eye size={16} />
                          </button>
                          {canEdit() && (
                            <>
                              <button
                                onClick={() => handleEditLocation(location)}
                                className="p-2 text-slate-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteLocation(location)}
                                className={`p-2 rounded-lg transition-all border ${cameraCounts[location.id] > 0
                                  ? 'text-orange-500 border-orange-100 hover:bg-orange-500 hover:text-white'
                                  : 'text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white'
                                  }`}
                                title={cameraCounts[location.id] > 0 ? 'Eliminar sede y sus cámaras asociadas' : 'Eliminar sede'}
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
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <LocationForm
          editLocation={editingLocation}
          onClose={handleCloseForm}
          onSave={handleSaveLocation}
        />
      )}

      {viewingLocation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`px-8 py-6 flex items-center justify-between border-b border-gray-100 ${typeColors[viewingLocation.type as keyof typeof typeColors]?.split(' ')[0] || 'bg-gray-50'} bg-opacity-30`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-white shadow-sm border border-gray-100`}>
                  <MapPin className={`h-6 w-6 ${viewingLocation.type === 'circuito' ? 'text-rose-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Detalles de Sede</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{typeLabels[viewingLocation.type as keyof typeof typeLabels] || viewingLocation.type}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingLocation(undefined)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Información básica */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Información General</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre de la Sede</label>
                    <p className="text-gray-900 font-bold text-lg leading-tight uppercase">{viewingLocation.name}</p>
                  </div>

                  {viewingLocation.address && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Dirección Fiscal / Operativa</label>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed italic">"{viewingLocation.address}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas Detalladas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Recursos Instalados</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center group hover:border-blue-200 transition-colors">
                    <div className="text-3xl font-black text-blue-600 mb-1">{cameraCounts[viewingLocation.id] || 0}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Cámaras</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center group hover:border-emerald-200 transition-colors">
                    <div className="text-3xl font-black text-emerald-600 mb-1">
                      {cameraCounts[viewingLocation.id] ? '100%' : '0%'}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Operatividad</div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center group hover:border-purple-200 transition-colors col-span-2 lg:col-span-1">
                    <div className="text-lg font-black text-purple-600 mb-1 leading-none pt-2 uppercase truncate">
                      {viewingLocation.type === 'revision' ? 'Automotriz' :
                        viewingLocation.type === 'policlinico' ? 'Salud' : 'Educación'}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Sector</div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {viewingLocation.notes && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Observaciones Técnicas</h3>
                  </div>
                  <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                    <p className="text-sm text-amber-950 font-medium italic leading-relaxed">{viewingLocation.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingLocation(undefined)}
                className="flex-1 px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              >
                Cerrar
              </button>
              {canEdit() && (
                <button
                  onClick={() => {
                    setViewingLocation(undefined);
                    handleEditLocation(viewingLocation);
                  }}
                  className="flex-1 px-4 py-3 text-xs font-black text-white uppercase tracking-widest bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                >
                  Editar Sede
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
