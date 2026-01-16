import { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Eye, Send, MapPin, Package, Truck, X, Calendar, LayoutList, FileText, ArrowRight } from 'lucide-react';
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
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
    await Promise.all([fetchShipments(), fetchLocations()]);
    setLoading(false);
  };

  const fetchShipments = async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*, assets(*, asset_types(*), locations(*)), from_location:locations!from_location_id(*), to_location:locations!to_location_id(*)')
      .order('created_at', { ascending: false });
    if (data) setShipments(data as Shipment[]);
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
    setView('form');
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
    setView('list');
    setEditingShipment(undefined);
    fetchShipments();
  };

  const handleCloseForm = () => {
    setView('list');
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
    shipped: 'bg-blue-50 text-blue-700 border-blue-200',
    in_transit: 'bg-amber-50 text-amber-700 border-amber-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    returned: 'bg-rose-50 text-rose-700 border-rose-200',
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
    <div className="w-full px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">Gestión de Envíos</h2>
          <p className="text-slate-500 text-sm font-medium">Control y seguimiento de activos entre sedes</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={() => {
              setView('list');
              setEditingShipment(undefined);
            }}
            className={`flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm ${view === 'list'
              ? 'bg-slate-800 text-white hover:bg-slate-900'
              : ''
              }`}
          >
            <LayoutList size={14} />
            Listado
          </button>

          {canEdit() && (
            <button
              onClick={() => {
                setView('form');
                setEditingShipment(undefined);
              }}
              className={`flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm ${view === 'form'
                ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                : ''
                }`}
            >
              <FileText size={14} />
              {editingShipment ? 'EDICIÓN' : 'NUEVO ENVÍO'}
            </button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <>
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl mb-8 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                <Search size={16} className="text-slate-400" />
                Filtros de Búsqueda
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Búsqueda */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Buscar por activo, tracking, transportista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filtro Estado */}
                <div>
                  <select
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Estado: Todos</option>
                    <option value="shipped">Enviado</option>
                    <option value="in_transit">En Tránsito</option>
                    <option value="delivered">Entregado</option>
                    <option value="returned">Devuelto</option>
                  </select>
                </div>

                {/* Filtro Sede Destino */}
                <div>
                  <select
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100 uppercase tracking-wide">
                        Búsqueda: {searchTerm}
                      </span>
                    )}
                    {statusFilter && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold border border-amber-100 uppercase tracking-wide">
                        Estado: {statusLabels[statusFilter as Shipment['status']]}
                      </span>
                    )}
                    {toLocationIdFilter && (
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-md text-[10px] font-bold border border-orange-100 uppercase tracking-wide">
                        Sede: {locations.find(l => l.id === toLocationIdFilter)?.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors uppercase tracking-wider"
                  >
                    <X size={14} /> Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[400px] bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600"></div>
                <p className="text-slate-400 font-medium text-sm">Cargando envíos...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredShipments.map(shipment => {
                const StatusIcon = getStatusIcon(shipment.status);

                return (
                  <div key={shipment.id} className="group bg-white rounded-xl shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md hover:border-blue-300 overflow-hidden">
                    <div className="p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        {/* Left Side: Icon & Main Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-3 rounded-xl border shadow-sm transition-transform group-hover:scale-105 ${statusColors[shipment.status].replace('bg-', 'bg-opacity-50 ')}`}>
                            <StatusIcon size={24} className={statusColors[shipment.status].match(/text-[\w\d]+-[\d]+/)?.[0]} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${statusColors[shipment.status]}`}>
                                {statusLabels[shipment.status]}
                              </span>
                              <span className="text-xs text-slate-400 font-bold tracking-wide">
                                {new Date(shipment.shipment_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>

                            <h3 className="font-bold text-slate-900 text-lg leading-tight mb-2 group-hover:text-blue-700 transition-colors truncate">
                              {shipment.assets?.asset_types.name} <span className="text-slate-400 mx-1">|</span> {shipment.assets?.brand} {shipment.assets?.model}
                            </h3>

                            <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 self-start inline-flex">
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                <MapPin size={12} />
                                {shipment.from_location?.name || 'VIRTUAL'}
                              </span>
                              <ArrowRight size={14} className="text-slate-300" />
                              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                                <MapPin size={12} className="text-blue-500" />
                                {shipment.to_location?.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Tracking & Actions */}
                        <div className="flex flex-col md:items-end gap-4 min-w-[200px]">
                          <div className="text-right space-y-1">
                            {shipment.carrier && (
                              <div className="flex items-center justify-end gap-2 text-xs font-medium text-slate-600">
                                <Truck size={14} className="text-slate-400" />
                                {shipment.carrier}
                              </div>
                            )}
                            {shipment.tracking_number ? (
                              <div className="flex items-center justify-end gap-2 text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                <Package size={14} className="text-slate-500" />
                                TRK: <span className="font-mono">{shipment.tracking_number}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 italic flex items-center justify-end gap-1">
                                <Package size={14} /> Sin tracking
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-auto md:w-auto w-full">
                            <button
                              onClick={() => handleViewShipment(shipment)}
                              className="flex-1 md:flex-none px-3 py-2 text-[10px] font-bold text-slate-600 bg-white border border-gray-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
                            >
                              <Eye size={14} /> Detalles
                            </button>
                            {canEdit() && (
                              <>
                                <button
                                  onClick={() => handleEditShipment(shipment)}
                                  className="px-3 py-2 text-slate-400 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                                  title="Editar envío"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteShipment(shipment)}
                                  className="px-3 py-2 text-slate-400 bg-white border border-gray-200 rounded-lg hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                                  title="Eliminar envío"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {shipment.notes && (
                        <div className="mt-4 pt-3 border-t border-gray-50">
                          <p className="text-xs text-slate-500 italic flex items-start gap-2">
                            <div className="mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 block"></span></div>
                            "{shipment.notes}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && filteredShipments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-gray-200 rounded-xl shadow-sm text-center">
              <div className="p-4 bg-slate-50 rounded-full mb-4">
                <Package size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-900 font-bold text-lg mb-1">No se encontraron envíos</p>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">
                No hay registros que coincidan con los filtros seleccionados o la base de datos está vacía.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-blue-600 text-sm font-bold hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <ShipmentForm
          editShipment={editingShipment}
          onClose={handleCloseForm}
          onSave={handleSaveShipment}
        />
      )}

      {viewingShipment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Detalles de Envío</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">ID: {viewingShipment.id}</p>
              </div>
              <button
                onClick={() => setViewingShipment(undefined)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                title="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Encabezado del Activo */}
              <div className="flex items-start gap-5 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className={`${statusColors[viewingShipment.status].replace('text-', 'bg-')} text-white p-4 rounded-xl shadow-sm`}>
                  {(() => {
                    const Icon = getStatusIcon(viewingShipment.status);
                    return <Icon size={28} />;
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[viewingShipment.status]}`}>
                      {statusLabels[viewingShipment.status]}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-xl leading-tight mb-1">
                    {viewingShipment.assets?.asset_types?.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500">{viewingShipment.assets?.brand} {viewingShipment.assets?.model}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Ruta de Envío</h4>
                    <div className="flex flex-col gap-4 relative">
                      <div className="absolute left-[15px] top-[24px] bottom-[24px] w-0.5 bg-gradient-to-b from-blue-200 to-orange-200 -z-10"></div>

                      <div className="flex items-start gap-4">
                        <div className="bg-white p-1 rounded-full border-2 border-blue-400 z-10">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Origen</label>
                          <p className="text-slate-900 text-sm font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block">
                            {viewingShipment.from_location?.name || 'VIRTUAL'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="bg-white p-1 rounded-full border-2 border-orange-400 z-10">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Destino</label>
                          <p className="text-slate-900 text-sm font-bold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 inline-block">
                            {viewingShipment.to_location?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Seguimiento</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                          <Truck size={16} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Transportista</label>
                          <span className="font-bold text-slate-700 text-sm">{viewingShipment.carrier || 'No especificado'}</span>
                        </div>
                      </div>

                      {viewingShipment.tracking_number && (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                            <Package size={16} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-blue-400 uppercase">Tracking Number</label>
                            <span className="font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-sm">{viewingShipment.tracking_number}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Responsables</h4>
                    <div className="space-y-3">
                      {viewingShipment.shipped_by && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                            {viewingShipment.shipped_by.substring(0, 2)}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enviado por</label>
                            <p className="text-sm font-bold text-slate-700">{viewingShipment.shipped_by}</p>
                          </div>
                        </div>
                      )}
                      {viewingShipment.received_by && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs uppercase">
                            {viewingShipment.received_by.substring(0, 2)}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recibido por</label>
                            <p className="text-sm font-bold text-slate-700">{viewingShipment.received_by}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Fecha</h4>
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-slate-400" />
                      <span className="text-lg font-bold text-slate-800">
                        {new Date(viewingShipment.shipment_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingShipment.notes && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5 mt-4">
                  <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                    Notas y Observaciones
                  </label>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed italic border-l-2 border-amber-200 pl-3">
                    {viewingShipment.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingShipment(undefined)}
                className="flex-1 px-4 py-3 text-[10px] font-bold text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm uppercase tracking-widest"
              >
                Cerrar
              </button>
              {canEdit() && (
                <button
                  onClick={() => {
                    setViewingShipment(undefined);
                    handleEditShipment(viewingShipment);
                  }}
                  className="flex-1 px-4 py-3 text-[10px] font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  <Edit size={14} />
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
