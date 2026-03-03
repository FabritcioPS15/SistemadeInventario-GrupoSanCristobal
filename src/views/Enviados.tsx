import { useState, useEffect } from 'react';
import { Edit, Trash2, Eye, Send, MapPin, Package, Truck, X, Calendar, FileText, Star, Plus } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';
import ShipmentForm from '../components/forms/ShipmentForm';
import { useAuth } from '../contexts/AuthContext';
import HeaderSearch from '../components/HeaderSearch';

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
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

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
          await fetchShipments();
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

    let matchesLocation = true;
    if (locationFilter) {
      if (locationFilter === 'sent-lima') {
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
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <Truck size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Control de Envíos</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Logística de Activos</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{filteredShipments.length} Registros</span>
            </div>
          </div>
        </div>

        <HeaderSearch
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Buscar por activo, guía, transportista..."
          variant="light"
        />


        <div className="flex items-center gap-2">
          {canEdit() && (
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
              <button
                onClick={() => {
                  setEditingShipment(undefined);
                  setView('form');
                }}
                className={`p-2 rounded-lg transition-all ${view === 'form' ? 'bg-[#002855] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100 hover:text-[#002855]'}`}
                title="Nuevo Envío"
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

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {view === 'list' ? (
          <>
            {/* Control Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
                    <FileText size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado:</span>
                    <select
                      className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">TODOS LOS ESTADOS</option>
                      <option value="shipped">ENVIADO</option>
                      <option value="in_transit">EN TRÁNSITO</option>
                      <option value="delivered">ENTREGADO</option>
                      <option value="returned">DEVUELTO</option>
                    </select>
                  </div>

                  <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f5f9] border border-slate-200 rounded-lg">
                    <MapPin size={14} className="text-slate-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destino:</span>
                    <select
                      className="bg-transparent text-[11px] font-bold text-[#002855] outline-none cursor-pointer"
                      value={toLocationIdFilter}
                      onChange={(e) => setToLocationIdFilter(e.target.value)}
                    >
                      <option value="">TODOS LOS DESTINOS</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(searchTerm || statusFilter || toLocationIdFilter) && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors uppercase tracking-wider"
                    >
                      <X size={14} /> Limpiar filtros
                    </button>
                  )}
                </div>

                <div className="text-[10px] font-black text-[#64748b] uppercase tracking-widest text-right">
                  {filteredShipments.length} Envíos encontrados
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#002855]"></div>
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Truck size={40} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No se encontraron envíos</h3>
                <p className="text-gray-500 max-w-xs mx-auto mt-2">Prueba ajustando los filtros o realiza un nuevo registro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredShipments.map((shipment) => (
                  <div key={shipment.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 overflow-hidden group">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusColors[shipment.status]?.split(' ')[0] || 'bg-gray-50'}`}>
                            {(() => {
                              const Icon = getStatusIcon(shipment.status);
                              return <Icon className={statusColors[shipment.status]?.split(' ')[1] || 'text-gray-500'} size={24} />;
                            })()}
                          </div>
                          <div>
                            <span className={`inline-flex px-2 ps-1 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-1 ${statusColors[shipment.status]}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 ml-1" />
                              {statusLabels[shipment.status]}
                            </span>
                            <h3 className="text-lg font-black text-slate-900 leading-none">
                              {shipment.assets?.brand} {shipment.assets?.model}
                            </h3>
                          </div>
                        </div>
                        {canEdit() && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditShipment(shipment)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteShipment(shipment)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Origen</p>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 truncate">{shipment.from_location?.name || 'STOCK CENTRAL'}</span>
                          </div>
                        </div>
                        <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Destino</p>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-blue-500" />
                            <span className="text-xs font-bold text-blue-900 truncate">{shipment.to_location?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50/30 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha Envío</p>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(shipment.shipment_date).toLocaleDateString()}
                            </div>
                          </div>
                          {shipment.tracking_number && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tracking / Guía</p>
                              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                <FileText size={14} className="text-slate-400" />
                                {shipment.tracking_number}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleViewShipment(shipment)}
                          className="flex items-center gap-2 px-4 py-2 bg-white text-[#002855] border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                        >
                          <Eye size={14} /> DETALLES
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registro de Envío</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Ingresa los datos logísticos del transporte</p>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <div className="p-6 lg:p-10">
              <ShipmentForm
                editShipment={editingShipment}
                onSave={handleSaveShipment}
                onClose={handleCloseForm}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      {viewingShipment && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`px-8 py-6 flex items-center justify-between border-b border-gray-100 ${statusColors[viewingShipment.status]?.split(' ')[0] || 'bg-gray-50'} bg-opacity-30`}>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                  {(() => {
                    const Icon = getStatusIcon(viewingShipment.status);
                    return <Icon className={statusColors[viewingShipment.status]?.split(' ')[1] || 'text-gray-500'} size={24} />;
                  })()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Ficha de Envío</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{statusLabels[viewingShipment.status]}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingShipment(undefined)}
                className="p-2 hover:bg-white/50 rounded-full transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              {/* Activo e Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Activo Trasladado</h3>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Marca y Modelo</p>
                    <p className="text-lg font-black text-[#002855] uppercase">{viewingShipment.assets?.brand} {viewingShipment.assets?.model}</p>
                    <div className="mt-4 flex items-center gap-2 font-bold text-xs text-slate-500">
                      <Package size={14} />
                      {viewingShipment.assets?.asset_types?.name}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Tiempos de Entrega</h3>
                  </div>
                  <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100/50">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-2">Fecha de Envío</p>
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-900 uppercase">
                        <Calendar size={16} />
                        {new Date(viewingShipment.shipment_date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ruta y Logística */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-rose-500 rounded-full" />
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ruta y Logística</h3>
                </div>
                <div className="relative">
                  <div className="absolute left-6 top-10 bottom-10 w-0.5 border-l-2 border-dashed border-slate-200" />
                  <div className="space-y-8 relative">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center z-10 shadow-sm group-hover:border-blue-500 transition-colors">
                        <MapPin size={20} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punto de Origen</p>
                        <p className="text-sm font-black text-slate-700 uppercase">{viewingShipment.from_location?.name || 'STOCK CENTRAL'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center z-10 shadow-lg shadow-blue-200">
                        <MapPin size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Punto de Destino</p>
                        <p className="text-sm font-black text-blue-900 uppercase">{viewingShipment.to_location?.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información del Transportista */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Guía / Tracking</p>
                  <p className="text-xs font-bold text-slate-900">{viewingShipment.tracking_number || "NO ASIGNADO"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa Carrier</p>
                  <p className="text-xs font-bold text-slate-900">{viewingShipment.carrier || "RECURSO PROPIO"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Enviado Por</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">{viewingShipment.shipped_by || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Recibido Por</p>
                  <p className="text-xs font-bold text-slate-900 uppercase">{viewingShipment.received_by || "PENDIENTE"}</p>
                </div>
              </div>

              {/* Notas */}
              {viewingShipment.notes && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-amber-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Observaciones de Logística</h3>
                  </div>
                  <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                    <p className="text-sm text-amber-950 font-medium italic leading-relaxed">{viewingShipment.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setViewingShipment(undefined)}
                className="flex-1 px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
              >
                Cerrar
              </button>
              {canEdit() && (
                <button
                  onClick={() => {
                    setViewingShipment(undefined);
                    handleEditShipment(viewingShipment);
                  }}
                  className="flex-1 px-4 py-3 text-xs font-black text-white uppercase tracking-widest bg-blue-600 rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                >
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
