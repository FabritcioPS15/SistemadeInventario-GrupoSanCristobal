import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Send, MapPin, Package, Truck, X, Calendar } from 'lucide-react';
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
  const [toLocationIdFilter, setToLocationIdFilter] = useState('');

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

    // Filtro por ubicación (Lima vs Provincias)
    let matchesLocation = true;
    if (locationFilter) {
      if (locationFilter === 'sent-lima') {
        // Preferir campo region si existe, sino usar nombre de la sede
        if (shipment.to_location?.region) {
          matchesLocation = shipment.to_location.region === 'lima';
        } else {
          matchesLocation = shipment.to_location?.name?.toLowerCase().includes('lima') || false;
        }
      } else if (locationFilter === 'sent-provincias') {
        if (shipment.to_location?.region) {
          matchesLocation = shipment.to_location.region === 'provincia';
        } else {
          matchesLocation = !!(shipment.to_location?.name && !shipment.to_location.name.toLowerCase().includes('lima'));
        }
      }
    }

    const matchesToLocation = !toLocationIdFilter || shipment.to_location_id === toLocationIdFilter;

    return matchesSearch && matchesStatus && matchesLocation && matchesToLocation;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setToLocationIdFilter('');
  };

  const hasActiveFilters = searchTerm || statusFilter || toLocationIdFilter;

  const statusColors: Record<Shipment['status'], string> = {
    shipped: 'bg-blue-100 text-blue-800 border-blue-200',
    in_transit: 'bg-amber-100 text-amber-800 border-amber-200',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    returned: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const statusLabels: Record<Shipment['status'], string> = {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Enviados
            {!locationFilter && <span className="ml-2 text-sm font-normal text-gray-500">(Gestión General)</span>}
            {locationFilter === 'sent-lima' && (
              <span className="ml-2 text-sm font-normal text-orange-600">(Lima)</span>
            )}
            {locationFilter === 'sent-provincias' && (
              <span className="ml-2 text-sm font-normal text-orange-600">(Provincias)</span>
            )}
          </h2>
          <p className="text-gray-600">Gestión de activos enviados entre sedes</p>
        </div>

        <div className="flex items-center gap-3">
          {canEdit() && (
            <button
              onClick={() => {
                setEditingShipment(undefined);
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Nuevo Envío
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Buscar activo, tracking, transportista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro Estado */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="shipped">Enviado</option>
                <option value="in_transit">En Tránsito</option>
                <option value="delivered">Entregado</option>
                <option value="returned">Devuelto</option>
              </select>
            </div>

            {/* Filtro Sede Destino */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={toLocationIdFilter}
                onChange={(e) => setToLocationIdFilter(e.target.value)}
              >
                <option value="">Destino: Todos</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                    "{searchTerm}"
                  </span>
                )}
                {statusFilter && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">
                    {statusLabels[statusFilter as Shipment['status']]}
                  </span>
                )}
                {toLocationIdFilter && (
                  <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-[10px] font-bold border border-orange-100">
                    Sede: {locations.find(l => l.id === toLocationIdFilter)?.name}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors"
              >
                <X size={14} /> Limpiar filtros
              </button>
            </div>
          )}
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
              <div key={shipment.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-lg hover:border-orange-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`${statusColors[shipment.status]} border rounded-lg p-2.5 shadow-sm transition-transform group-hover:scale-110`}>
                        <StatusIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-orange-700 transition-colors">
                            {shipment.assets?.asset_types.name} - {shipment.assets?.brand} {shipment.assets?.model}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                          <span className="bg-gray-100 px-2 py-0.5 rounded border text-[11px] uppercase tracking-wider text-gray-500">
                            {shipment.from_location?.name || 'VIRTUAL'}
                          </span>
                          <Send size={12} className="text-orange-400" />
                          <span className="bg-orange-50 px-2 py-0.5 rounded border border-orange-100 text-[11px] uppercase tracking-wider text-orange-700">
                            {shipment.to_location?.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm border ${statusColors[shipment.status]}`}>
                            {statusLabels[shipment.status]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 py-3 border-t border-b border-gray-100 my-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                      <Truck size={14} className="text-orange-500" />
                      <span className="text-gray-400">Transporte:</span>
                      <span>{shipment.carrier || 'No especificado'}</span>
                    </div>
                    {shipment.tracking_number && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium border-l border-gray-200 pl-4">
                        <Package size={14} className="text-blue-500" />
                        <span className="text-gray-400">Guía:</span>
                        <span className="font-mono">{shipment.tracking_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Fecha de Envío</label>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={14} className="text-orange-500" />
                        <p className="text-sm font-bold">
                          {new Date(shipment.shipment_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {shipment.shipped_by && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 font-bold uppercase text-[9px]">Enviado:</span>
                          <span className="text-gray-700 font-medium">{shipment.shipped_by}</span>
                        </div>
                      )}
                      {shipment.received_by && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 font-bold uppercase text-[9px]">Recibido:</span>
                          <span className="text-gray-700 font-medium">{shipment.received_by}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {shipment.notes && (
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4">
                      <label className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block mb-1">Observaciones</label>
                      <p className="text-sm text-orange-900 leading-relaxed italic">{shipment.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleViewShipment(shipment)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
                    >
                      <Eye size={16} /> Ver
                    </button>
                    {canEdit() && (
                      <>
                        <button
                          onClick={() => handleEditShipment(shipment)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteShipment(shipment)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gray-100 text-gray-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors font-medium border border-gray-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalles de Envío</h2>
                <p className="text-xs text-gray-500 mt-0.5">ID: {viewingShipment.id}</p>
              </div>
              <button
                onClick={() => setViewingShipment(undefined)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Encabezado del Activo */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className={`${statusColors[viewingShipment.status]} p-3 rounded-lg border shadow-sm`}>
                  {(() => {
                    const Icon = getStatusIcon(viewingShipment.status);
                    return <Icon size={24} />;
                  })()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">
                    {viewingShipment.assets?.asset_types?.name}
                  </h3>
                  <p className="text-sm text-gray-600">{viewingShipment.assets?.brand} {viewingShipment.assets?.model}</p>
                  <div className="mt-2 flex gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors[viewingShipment.status]}`}>
                      {statusLabels[viewingShipment.status]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Origen</label>
                      <p className="text-gray-900 text-sm font-bold bg-gray-50 p-2 rounded border border-gray-100 text-center">
                        {viewingShipment.from_location?.name || 'VIRTUAL'}
                      </p>
                    </div>
                    <Send size={16} className="text-orange-400 mt-4" />
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Destino</label>
                      <p className="text-gray-900 text-sm font-bold bg-orange-50 p-2 rounded border border-orange-100 text-center">
                        {viewingShipment.to_location?.name}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Información de Seguimiento</label>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Truck size={14} className="text-orange-500" />
                        <span className="font-medium">{viewingShipment.carrier || 'Transportista no especificado'}</span>
                      </p>
                      {viewingShipment.tracking_number && (
                        <p className="text-sm text-gray-700 flex items-center gap-2">
                          <Package size={14} className="text-blue-500" />
                          <span className="font-mono font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-800">{viewingShipment.tracking_number}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Personal Responsable</label>
                    <div className="space-y-2">
                      {viewingShipment.shipped_by && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                          <p className="text-sm text-gray-900 font-medium">Enviado: {viewingShipment.shipped_by}</p>
                        </div>
                      )}
                      {viewingShipment.received_by && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <p className="text-sm text-gray-900 font-medium">Recibido: {viewingShipment.received_by}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha Programada</label>
                    <p className="text-gray-900 text-sm font-bold flex items-center gap-1.5">
                      <Calendar size={14} className="text-orange-500" />
                      {new Date(viewingShipment.shipment_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {viewingShipment.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <label className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Notas y Observaciones</label>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed italic">
                    "{viewingShipment.notes}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingShipment(undefined)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Cerrar
              </button>
              {canEdit() && (
                <button
                  onClick={() => {
                    setViewingShipment(undefined);
                    handleEditShipment(viewingShipment);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Editar Envío
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
