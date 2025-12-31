import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, Building, Users, Package, Eye, X } from 'lucide-react';
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

  const typeLabels = {
    revision: 'Revisión',
    policlinico: 'Policlínico',
    escuela_conductores: 'Escuela de Conductores',
    central: 'Central',
  };

  const typeColors = {
    revision: 'bg-blue-50 text-blue-700 border-blue-200',
    policlinico: 'bg-green-50 text-green-700 border-green-200',
    escuela_conductores: 'bg-purple-50 text-purple-700 border-purple-200',
    central: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sedes</h2>
          <p className="text-gray-600">Gestión de ubicaciones y sedes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              console.log('🔍 Probando conexión con Supabase...');
              try {
                const { data, error } = await supabase
                  .from('locations')
                  .select('count')
                  .limit(1);

                if (error) {
                  console.error('❌ Error de conexión:', error);
                  alert(`Error de conexión: ${error.message}`);
                } else {
                  console.log('✅ Conexión exitosa:', data);
                  alert('Conexión con Supabase exitosa');
                }
              } catch (err) {
                console.error('❌ Error inesperado:', err);
                alert('Error inesperado: ' + err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            🔍 Probar Conexión
          </button>
          {canEdit() && (
            <button
              onClick={() => {
                setEditingLocation(undefined);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <Plus size={20} />
              Nueva Sede
            </button>
          )}
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sedes</p>
              <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cámaras</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(cameraCounts).reduce((sum, count) => sum + count, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Promedio por Sede</p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.length > 0 ? Math.round(Object.values(cameraCounts).reduce((sum, count) => sum + count, 0) / locations.length) : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <MapPin className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cobertura</p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.length > 0 ? Math.round((Object.keys(cameraCounts).length / locations.length) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar sedes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="revision">Revisión</option>
            <option value="policlinico">Policlínico</option>
            <option value="escuela_conductores">Escuela de Conductores</option>
            <option value="central">Central</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map(location => (
            <div key={location.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`${typeColors[location.type]} border rounded-lg p-2`}>
                      <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">{location.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[location.type]}`}>
                        {typeLabels[location.type]}
                      </span>
                    </div>
                  </div>
                </div>

                {location.address && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 block mb-1">Dirección</label>
                    <p className="text-sm text-gray-900">{location.address}</p>
                  </div>
                )}

                {location.notes && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 block mb-1">Notas</label>
                    <p className="text-sm text-gray-900">{location.notes}</p>
                  </div>
                )}

                {/* Estadísticas de la sede */}
                <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Cámaras</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {cameraCounts[location.id] || 0}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleViewLocation(location)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Eye size={16} />
                    Ver
                  </button>
                  {canEdit() && (
                    <>
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location)}
                        className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded transition-colors ${cameraCounts[location.id] > 0
                          ? 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        title={cameraCounts[location.id] > 0 ? 'Eliminar sede y sus cámaras asociadas' : 'Eliminar sede'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${typeColors[viewingLocation.type]} border rounded-lg p-2`}>
                  <MapPin className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Detalles de Sede</h2>
              </div>
              <button
                onClick={() => setViewingLocation(undefined)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nombre</label>
                    <p className="text-gray-900 font-medium text-lg">{viewingLocation.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Tipo</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${typeColors[viewingLocation.type]}`}>
                      {typeLabels[viewingLocation.type]}
                    </span>
                  </div>
                  {viewingLocation.address && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Dirección</label>
                      <p className="text-gray-900">{viewingLocation.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Estadísticas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded border text-center">
                    <div className="text-2xl font-bold text-blue-600">{cameraCounts[viewingLocation.id] || 0}</div>
                    <div className="text-sm text-gray-600">Cámaras Instaladas</div>
                  </div>
                  <div className="bg-white p-4 rounded border text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {cameraCounts[viewingLocation.id] ? '100%' : '0%'}
                    </div>
                    <div className="text-sm text-gray-600">Cobertura</div>
                  </div>
                  <div className="bg-white p-4 rounded border text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {viewingLocation.type === 'revision' ? 'Revisión' :
                        viewingLocation.type === 'policlinico' ? 'Salud' : 'Educación'}
                    </div>
                    <div className="text-sm text-gray-600">Sector</div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              {viewingLocation.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Notas
                  </h3>
                  <p className="text-gray-900">{viewingLocation.notes}</p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setViewingLocation(undefined)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
                {canEdit() && (
                  <button
                    onClick={() => {
                      setViewingLocation(undefined);
                      handleEditLocation(viewingLocation);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
