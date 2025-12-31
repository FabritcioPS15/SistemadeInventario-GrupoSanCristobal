import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Send, MapPin, Package, Truck, X } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';
import ShipmentForm from '../components/forms/ShipmentForm';
import { useAuth } from '../contexts/AuthContext';

type Shipment = {
  id: string;
  asset_id: string;
  from_location_id?: string;
  to_location_id: string;
  shipment_date: string;
  shipped_by?: string;
  received_by?: string;
  tracking_number?: string;
  carrier?: string;
  status: 'shipped' | 'in_transit' | 'delivered' | 'returned';
  notes?: string;
  created_at: string;
  updated_at: string;
  assets?: AssetWithDetails;
  from_location?: Location;
  to_location?: Location;
};

type EnviadosProps = {
  locationFilter?: string;
};

export default function Enviados({ locationFilter }: EnviadosProps) {
  const { canEdit } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | undefined>();
  const [viewingShipment, setViewingShipment] = useState<Shipment | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchShipments(), fetchAssets(), fetchLocations()]);
    setLoading(false);
  };

  const fetchShipments = async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*, assets(*, asset_types(*), locations(*)), from_location:locations!from_location_id(*), to_location:locations!to_location_id(*)')
      .order('created_at', { ascending: false });
    if (data) setShipments(data as Shipment[]);
  };

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, asset_types(*), locations(*)')
      .order('created_at', { ascending: false });
    if (data) setAssets(data as AssetWithDetails[]);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const handleEditShipment = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setShowForm(true);
  };

  const handleViewShipment = (shipment: Shipment) => {
    setViewingShipment(shipment);
  };

  const handleDeleteShipment = async (shipment: Shipment) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el envío del activo "${shipment.assets?.brand} ${shipment.assets?.model}"?`)) {
      try {
        const { error } = await supabase
          .from('shipments')
          .delete()
          .eq('id', shipment.id);

        if (error) {
          console.error('Error al eliminar envío:', error);
          alert('Error al eliminar el envío');
        } else {
          await fetchShipments(); // Recargar datos
          alert('Envío eliminado correctamente');
        }
      } catch (err) {
        console.error('Error al eliminar envío:', err);
        alert('Error al eliminar el envío');
      }
    }
  };

  const handleSaveShipment = () => {
    setShowForm(false);
    setEditingShipment(undefined);
    fetchShipments();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingShipment(undefined);
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch =
      shipment.assets?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.assets?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.carrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.shipped_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.received_by?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || shipment.status === statusFilter;

    // Filtro por ubicación
    let matchesLocation = true;
    if (locationFilter) {
      if (locationFilter === 'sent-lima') {
        // Filtrar envíos hacia Lima
        matchesLocation = shipment.to_location?.name?.toLowerCase().includes('lima') || false;
      } else if (locationFilter === 'sent-provincias') {
        // Filtrar envíos hacia provincias (no Lima)
        matchesLocation = !!(shipment.to_location?.name && !shipment.to_location.name.toLowerCase().includes('lima'));
      }
    }

    return matchesSearch && matchesStatus && matchesLocation;
  });

  const statusColors = {
    shipped: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-green-100 text-green-800',
    returned: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    shipped: 'Enviado',
    in_transit: 'En Tránsito',
    delivered: 'Entregado',
    returned: 'Devuelto',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'shipped': return Send;
      case 'in_transit': return Truck;
      case 'delivered': return Package;
      case 'returned': return Package;
      default: return Send;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-2">
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Enviados
                {locationFilter === 'sent-lima' && (
                  <span className="ml-2 text-sm font-normal text-orange-600">(Lima)</span>
                )}
                {locationFilter === 'sent-provincias' && (
                  <span className="ml-2 text-sm font-normal text-orange-600">(Provincias)</span>
                )}
              </h1>
              <p className="text-gray-600">Gestión de activos enviados entre sedes</p>
            </div>
          </div>
          {canEdit() && (
            <button
              onClick={() => {
                setEditingShipment(undefined);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
            >
              <Plus size={20} />
              Nuevo Envío
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar envíos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="shipped">Enviado</option>
              <option value="in_transit">En Tránsito</option>
              <option value="delivered">Entregado</option>
              <option value="returned">Devuelto</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShipments.map(shipment => {
              const StatusIcon = getStatusIcon(shipment.status);

              return (
                <div key={shipment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`${statusColors[shipment.status]} border rounded-lg p-2`}>
                          <StatusIcon size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {shipment.assets?.asset_types.name} - {shipment.assets?.brand} {shipment.assets?.model}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {shipment.from_location?.name || 'Origen no especificado'} → {shipment.to_location?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[shipment.status]}`}>
                              {statusLabels[shipment.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-xs font-medium text-gray-500 block mb-1">Fecha de Envío</label>
                        <p className="text-sm text-gray-900">
                          {new Date(shipment.shipment_date).toLocaleDateString('es-ES')}
                        </p>
                      </div>

                      {shipment.tracking_number && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-gray-500 block mb-1">Número de Seguimiento</label>
                          <p className="text-sm text-gray-900 font-mono">{shipment.tracking_number}</p>
                        </div>
                      )}

                      {shipment.carrier && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-gray-500 block mb-1">Transportista</label>
                          <p className="text-sm text-gray-900">{shipment.carrier}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {shipment.shipped_by && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-blue-700 block mb-1">Enviado por</label>
                          <p className="text-sm text-blue-900">{shipment.shipped_by}</p>
                        </div>
                      )}

                      {shipment.received_by && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <label className="text-xs font-medium text-green-700 block mb-1">Recibido por</label>
                          <p className="text-sm text-green-900">{shipment.received_by}</p>
                        </div>
                      )}
                    </div>

                    {shipment.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <label className="text-xs font-medium text-yellow-700 block mb-1">Notas</label>
                        <p className="text-sm text-yellow-900">{shipment.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleViewShipment(shipment)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Eye size={16} />
                        Ver
                      </button>
                      {canEdit() && (
                        <>
                          <button
                            onClick={() => handleEditShipment(shipment)}
                            className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteShipment(shipment)}
                            className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredShipments.length === 0 && (
          <div className="text-left py-12">
            <p className="text-gray-500">No se encontraron registros de envío</p>
          </div>
        )}

        {showForm && (
          <ShipmentForm
            editShipment={editingShipment}
            onClose={handleCloseForm}
            onSave={handleSaveShipment}
          />
        )}

        {viewingShipment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Detalles de Envío</h2>
                <button
                  onClick={() => setViewingShipment(undefined)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Activo</label>
                  <p className="text-gray-900 font-medium">
                    {viewingShipment.assets?.brand} {viewingShipment.assets?.model} - {viewingShipment.assets?.asset_types?.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Origen</label>
                    <p className="text-gray-900">{viewingShipment.from_location?.name || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Destino</label>
                    <p className="text-gray-900">{viewingShipment.to_location?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Fecha de Envío</label>
                    <p className="text-gray-900">{new Date(viewingShipment.shipment_date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                    <p className="text-gray-900">{statusLabels[viewingShipment.status]}</p>
                  </div>
                </div>
                {viewingShipment.tracking_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Número de Seguimiento</label>
                    <p className="text-gray-900 font-mono">{viewingShipment.tracking_number}</p>
                  </div>
                )}
                {viewingShipment.carrier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Transportista</label>
                    <p className="text-gray-900">{viewingShipment.carrier}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {viewingShipment.shipped_by && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Enviado por</label>
                      <p className="text-gray-900">{viewingShipment.shipped_by}</p>
                    </div>
                  )}
                  {viewingShipment.received_by && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Recibido por</label>
                      <p className="text-gray-900">{viewingShipment.received_by}</p>
                    </div>
                  )}
                </div>
                {viewingShipment.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Notas</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{viewingShipment.notes}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setViewingShipment(undefined)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cerrar
                  </button>
                  {canEdit() && (
                    <button
                      onClick={() => {
                        setViewingShipment(undefined);
                        handleEditShipment(viewingShipment);
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
    </div>
  );
}
