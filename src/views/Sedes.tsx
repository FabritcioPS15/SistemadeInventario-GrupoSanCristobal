import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, Building, Users, Package, Eye, X, FileText, ExternalLink, LayoutGrid, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
    console.log('✏️ Editando sede:', location);
    setEditingLocation(location);
    setShowForm(true);
  };

  const handleViewLocation = (location: Location) => {
    setViewingLocation(location);
  };

  const handleDeleteLocation = async (location: Location) => {
    console.log('🗑️ Iniciando eliminación de sede:', location);

    // Verificar si hay cámaras asociadas a esta sede
    const cameraCount = cameraCounts[location.id] || 0;
    console.log('📊 Cámaras asociadas:', cameraCount);

    // Verificar assets asociados
    let assetsCount = 0;
    try {
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id')
        .eq('location_id', location.id);
      assetsCount = assetsData?.length || 0;
      console.log('📊 Assets asociados:', assetsCount);
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
      console.log('📊 Usuarios asociados:', usersCount);
    } catch (err) {
      console.log('⚠️ No se pudo verificar usuarios:', err);
    }

    // Verificar shipments asociados
    let shipmentsCount = 0;
    try {
      const { data: shipmentsData } = await supabase
        .from('shipments')
        .select('id')
        .or(`from_location_id.eq.${location.id},to_location_id.eq.${location.id}`);
      shipmentsCount = shipmentsData?.length || 0;
      console.log('📊 Shipments asociados:', shipmentsCount);
    } catch (err) {
      console.log('⚠️ No se pudo verificar shipments:', err);
    }

    const totalAssociated = cameraCount + assetsCount + usersCount + shipmentsCount;

    const message = totalAssociated > 0
      ? `⚠️ Esta sede tiene elementos asociados:\n`
      + `${cameraCount > 0 ? `• ${cameraCount} cámara${cameraCount > 1 ? 's' : ''}\n` : ''}`
      + `${assetsCount > 0 ? `• ${assetsCount} asset${assetsCount > 1 ? 's' : ''}\n` : ''}`
      + `${usersCount > 0 ? `• ${usersCount} usuario${usersCount > 1 ? 's' : ''}\n` : ''}`
      + `${shipmentsCount > 0 ? `• ${shipmentsCount} envío${shipmentsCount > 1 ? 's' : ''}\n` : ''}`
      + `\nAl eliminar la sede "${location.name}", los elementos quedarán con ubicación no definida.`
      : `¿Estás seguro de que quieres eliminar la ubicación "${location.name}"?`;

    if (!window.confirm(message)) return;

    try {
      // Eliminar solo la sede; los FKs con ON DELETE SET NULL preservarán los elementos
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', location.id);

      if (error) {
        console.error('❌ Error al eliminar sede:', error);
        alert('Error al eliminar la sede: ' + error.message);
        return;
      }

      await fetchData();
      alert(`Sede "${location.name}" eliminada. Los elementos asociados ahora tienen ubicación no definida.`);
    } catch (err) {
      console.error('❌ Error inesperado al eliminar sede:', err);
      alert('Error inesperado al eliminar la sede: ' + err);
    }
  };

  const handleSaveLocation = async () => {
    console.log('💾 Guardando sede...');
    setShowForm(false);
    setEditingLocation(undefined);
    await fetchLocations();
    await fetchCameraCounts();
    console.log('✅ Sede guardada y datos actualizados');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLocation(undefined);
  };

  const filteredLocations = locations.filter(location => {
    const matchesSearch =
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !typeFilter || location.type === typeFilter;

    return matchesSearch && matchesType;
  });

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

  return (
    <div className="w-full px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">Sedes</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de ubicaciones y sedes operativas del Grupo San Cristóbal</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={async () => {
              try {
                const { error } = await supabase.from('locations').select('id').limit(1);
                if (error) throw error;
                alert('Conexión con Supabase exitosa');
              } catch (err: any) {
                alert(`Error de conexión: ${err.message}`);
              }
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
          >
            <Building size={14} />
            Probar Conexión
          </button>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista Listado"
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
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Plus size={14} />
              Nueva Sede
            </button>
          )}
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Sedes</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {locations.filter(loc => loc.type !== 'circuito').length}
            </div>
            <Building className="h-5 w-5 text-blue-300" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Circuitos</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {locations.filter(loc => loc.type === 'circuito').length}
            </div>
            <MapPin className="h-5 w-5 text-rose-300" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cámaras</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {Object.values(cameraCounts).reduce((sum, count) => sum + count, 0)}
            </div>
            <Package className="h-5 w-5 text-emerald-300" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Promedio</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">
              {locations.filter(loc => loc.type !== 'circuito').length > 0
                ? Math.round(Object.values(cameraCounts).reduce((sum, count) => sum + count, 0) / locations.filter(loc => loc.type !== 'circuito').length)
                : 0}
            </div>
            <Users className="h-5 w-5 text-purple-300" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-full col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cobertura</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-orange-500">
              {locations.filter(loc => loc.type !== 'circuito').length > 0
                ? Math.round((Object.keys(cameraCounts).length / locations.filter(loc => loc.type !== 'circuito').length) * 100)
                : 0}%
            </div>
            <MapPin className="h-5 w-5 text-orange-500/20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar sedes por nombre, dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Todos los tipos</option>
            <option value="revision">Revisión</option>
            <option value="policlinico">Policlínico</option>
            <option value="escuela_conductores">Escuela de Conductores</option>
            <option value="central">Central</option>
            <option value="circuito">Circuito</option>
          </select>
        </div>

        {(searchTerm || typeFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">"{searchTerm}"</span>
              )}
              {typeFilter && (
                <span className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-[10px] font-bold border border-gray-100">{typeLabels[typeFilter]}</span>
              )}
            </div>
            <button
              onClick={() => { setSearchTerm(''); setTypeFilter(''); }}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors"
            >
              <X size={14} /> Limpiar filtros
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map(location => (
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
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Dirección</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Cámaras</th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredLocations.map(location => (
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
                              className={`p-2 rounded-lg transition-all border ${
                                cameraCounts[location.id] > 0
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

      {!loading && filteredLocations.length === 0 && (
        <div className="text-left py-12">
          <p className="text-gray-500">No se encontraron sedes</p>
        </div>
      )}

      {showForm && (
        <LocationForm
          editLocation={editingLocation}
          onClose={handleCloseForm}
          onSave={handleSaveLocation}
        />
      )}

      {viewingLocation && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`px-8 py-6 flex items-center justify-between border-b border-gray-100 ${typeColors[viewingLocation.type].split(' ')[0]} bg-opacity-30`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-white shadow-sm border border-gray-100`}>
                  <MapPin className={`h-6 w-6 ${viewingLocation.type === 'circuito' ? 'text-rose-500' : 'text-blue-500'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Detalles de Sede</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{typeLabels[viewingLocation.type]}</p>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center group hover:border-purple-200 transition-colors col-span-2 md:col-span-1">
                    <div className="text-lg font-black text-purple-600 mb-1 leading-none pt-2 uppercase truncate">
                      {viewingLocation.type === 'revision' ? 'Automotriz' :
                        viewingLocation.type === 'policlinico' ? 'Salud' : 'Educación'}
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Sector</div>
                  </div>
                </div>
              </div>

              {/* Links de Checklist */}
              {(viewingLocation.checklist_url || viewingLocation.history_url) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-orange-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Gestión de Checklist</h3>
                  </div>
                  <div className="space-y-3">
                    {viewingLocation.checklist_url && (
                      <a
                        href={viewingLocation.checklist_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group/link"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover/link:bg-blue-600 group-hover/link:text-white transition-colors">
                            <FileText size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Link de Checklist</p>
                            <p className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{viewingLocation.checklist_url}</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-gray-300 group-hover/link:text-blue-500" />
                      </a>
                    )}
                    {viewingLocation.history_url && (
                      <a
                        href={viewingLocation.history_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group/link"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover/link:bg-emerald-600 group-hover/link:text-white transition-colors">
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Link de Historial</p>
                            <p className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{viewingLocation.history_url}</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-gray-300 group-hover/link:text-emerald-500" />
                      </a>
                    )}
                  </div>
                </div>
              )}

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
