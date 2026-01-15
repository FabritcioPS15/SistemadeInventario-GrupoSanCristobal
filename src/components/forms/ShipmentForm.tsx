import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, Package, MapPin, Calendar, User, Truck, Search } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../../lib/supabase';

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
};

type ShipmentFormProps = {
  onClose: () => void;
  onSave: () => void;
  editShipment?: Shipment;
};

export default function ShipmentForm({ onClose, onSave, editShipment }: ShipmentFormProps) {
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [hasChanges, setHasChanges] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('');
  const [assetSearchTerm, setAssetSearchTerm] = useState<string>('');
  const [centralLocation, setCentralLocation] = useState<Location | null>(null);
  const [tinteQuantity, setTinteQuantity] = useState<string>('');

  const [formData, setFormData] = useState({
    asset_id: editShipment?.asset_id || '',
    from_location_id: editShipment?.from_location_id || '',
    to_location_id: editShipment?.to_location_id || '',
    shipment_date: editShipment?.shipment_date ? editShipment.shipment_date.split('T')[0] : '',
    shipped_by: editShipment?.shipped_by || '',
    received_by: editShipment?.received_by || '',
    tracking_number: editShipment?.tracking_number || '',
    carrier: editShipment?.carrier || '',
    status: editShipment?.status || 'shipped',
    notes: editShipment?.notes || '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editShipment) {
      const originalData = {
        asset_id: editShipment.asset_id,
        from_location_id: editShipment.from_location_id || '',
        to_location_id: editShipment.to_location_id,
        shipment_date: editShipment.shipment_date ? editShipment.shipment_date.split('T')[0] : '',
        shipped_by: editShipment.shipped_by || '',
        received_by: editShipment.received_by || '',
        tracking_number: editShipment.tracking_number || '',
        carrier: editShipment.carrier || '',
        status: editShipment.status,
        notes: editShipment.notes || '',
      };

      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editShipment]);

  // Filtrar activos cuando cambia el tipo seleccionado o el término de búsqueda
  useEffect(() => {
    let filtered = assets;

    // Filtrar por tipo de activo
    if (selectedAssetType) {
      filtered = filtered.filter(asset => asset.asset_types?.id === selectedAssetType);
    }

    // Filtrar por término de búsqueda
    if (assetSearchTerm) {
      const searchLower = assetSearchTerm.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.brand?.toLowerCase().includes(searchLower) ||
        asset.model?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower) ||
        asset.asset_types?.name?.toLowerCase().includes(searchLower) ||
        asset.locations?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAssets(filtered);
  }, [selectedAssetType, assetSearchTerm, assets]);

  const fetchData = async () => {
    await Promise.all([fetchAssets(), fetchAssetTypes(), fetchLocations()]);
  };

  const fetchAssets = async () => {
    console.log('🔄 Cargando activos...');
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*, asset_types(*), locations(*)')
        .order('brand');

      if (error) {
        console.error('❌ Error al cargar activos:', error);
        throw error;
      }

      if (data) {
        console.log(`✅ ${data.length} activos cargados`);
        setAssets(data as AssetWithDetails[]);
        setFilteredAssets(data as AssetWithDetails[]);
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar activos:', err);
    }
  };

  const fetchAssetTypes = async () => {
    console.log('🔄 Cargando tipos de activos...');
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error al cargar tipos de activos:', error);
        throw error;
      }

      if (data) {
        console.log(`✅ ${data.length} tipos de activos cargados`);
        setAssetTypes(data);
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar tipos de activos:', err);
    }
  };

  const fetchLocations = async () => {
    console.log('🔄 Cargando ubicaciones...');
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ Error al cargar ubicaciones:', error);
        throw error;
      }

      if (data) {
        console.log(`✅ ${data.length} ubicaciones cargadas`);
        setLocations(data);

        // Buscar sede central (por tipo "central" o por nombre que contenga "central", "principal" o "lima")
        const central = data.find(loc =>
          loc.type === 'central' ||
          loc.name.toLowerCase().includes('central') ||
          loc.name.toLowerCase().includes('principal') ||
          loc.name.toLowerCase().includes('lima')
        );

        if (central) {
          console.log('🏢 Sede central identificada:', central.name);
          setCentralLocation(central);

          // Si no hay envío en edición, establecer la sede central como origen por defecto
          if (!editShipment) {
            setFormData(prev => ({ ...prev, from_location_id: central.id }));
          }
        }
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar ubicaciones:', err);
    }
  };

  // Funciones de validación
  const validateDate = (date: string): boolean => {
    if (!date) return false; // Campo requerido
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  };

  const validateTrackingNumber = (tracking: string): boolean => {
    if (!tracking) return true; // Campo opcional
    // Validar que tenga al menos 5 caracteres y contenga letras y números
    return tracking.length >= 5 && /^[A-Za-z0-9]+$/.test(tracking);
  };

  const validateField = async (fieldName: string, value: string) => {


    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'asset_id':
        if (!value) {
          isValid = false;
          errorMessage = 'Debe seleccionar un activo';
        }
        break;

      case 'to_location_id':
        if (!value) {
          isValid = false;
          errorMessage = 'Debe seleccionar una ubicación de destino';
        }
        break;

      case 'shipment_date':
        if (!value) {
          isValid = false;
          errorMessage = 'La fecha de envío es requerida';
        } else if (!validateDate(value)) {
          isValid = false;
          errorMessage = 'Fecha de envío inválida';
        }
        break;

      case 'tracking_number':
        if (value && !validateTrackingNumber(value)) {
          isValid = false;
          errorMessage = 'Número de seguimiento inválido (mínimo 5 caracteres alfanuméricos)';
        }
        break;

      case 'shipped_by':
        if (value && value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre debe tener al menos 2 caracteres';
        }
        break;

      case 'received_by':
        if (value && value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre debe tener al menos 2 caracteres';
        }
        break;

      case 'carrier':
        if (value && value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre de la empresa debe tener al menos 2 caracteres';
        }
        break;
    }


    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Validar campo después de un pequeño delay
    setTimeout(() => {
      validateField(field, value);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      console.log('📦 Guardando envío:', { editShipment, formData });

      // Validar campos requeridos
      const requiredFields = ['asset_id', 'to_location_id', 'shipment_date'];
      let hasErrors = false;

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          setErrors(prev => ({ ...prev, [field]: 'Este campo es requerido' }));
          hasErrors = true;
        }
      }

      if (hasErrors) {
        setLoading(false);
        return;
      }

      const selectedAsset = assets.find(a => a.id === formData.asset_id);
      const isTinte = selectedAsset?.asset_types?.name === 'Tinte';

      // Validaciones específicas para Tinte
      if (isTinte) {
        if (!centralLocation || formData.from_location_id !== centralLocation.id) {
          setLoading(false);
          alert('Los envíos de Tinte deben salir desde la Sede Central.');
          return;
        }
        const qty = Number(tinteQuantity);
        if (!tinteQuantity || Number.isNaN(qty) || qty <= 0) {
          setLoading(false);
          alert('Ingrese una cantidad válida para el envío de Tinte.');
          return;
        }
        const available = Number(selectedAsset?.capacity || '0');
        if (Number.isNaN(available) || qty > available) {
          setLoading(false);
          alert(`Cantidad insuficiente. Disponible: ${available}`);
          return;
        }
      }

      const shipmentData = {
        ...formData,
        from_location_id: formData.from_location_id || null
      };

      if (editShipment) {
        console.log('✏️ Actualizando envío existente:', editShipment.id);
        const { data, error } = await supabase
          .from('shipments')
          .update(shipmentData)
          .eq('id', editShipment.id)
          .select('*');

        console.log('📋 Resultado de actualización:', { data, error });

        if (error) {
          console.error('❌ Error al actualizar envío:', error);
          throw error;
        }

        console.log('✅ Envío actualizado correctamente');
      } else {
        console.log('➕ Creando nuevo envío');
        const { data, error } = await supabase
          .from('shipments')
          .insert([shipmentData])
          .select('*');

        console.log('📋 Resultado de inserción:', { data, error });

        if (error) {
          console.error('❌ Error al crear envío:', error);
          throw error;
        }

        console.log('✅ Envío creado correctamente');

        const selectedAsset = assets.find(a => a.id === formData.asset_id);
        const isTinte = selectedAsset?.asset_types?.name === 'Tinte';
        if (isTinte) {
          const current = Number(selectedAsset?.capacity || '0');
          const qty = Number(tinteQuantity || '0');
          const newQty = Math.max(0, current - qty);
          console.log('🟡 Deduciendo stock de Tinte:', { actual: current, envio: qty, nuevo: newQty });
          const { error: assetError } = await supabase
            .from('assets')
            .update({
              capacity: String(newQty),
              updated_at: new Date().toISOString(),
              // Mantener ubicación en Central
              location_id: centralLocation ? centralLocation.id : selectedAsset?.location_id || null
            })
            .eq('id', formData.asset_id);
          if (assetError) {
            console.error('❌ Error al deducir stock de Tinte:', assetError);
          } else {
            console.log('✅ Stock de Tinte actualizado');
          }
        } else {
          // Flujo original para otros activos: marcar enviado y despegar ubicación
          console.log('📦 Actualizando estado del activo a enviado...');
          const { error: assetError } = await supabase
            .from('assets')
            .update({
              status: 'shipped',
              location_id: null
            })
            .eq('id', formData.asset_id);
          if (assetError) {
            console.error('❌ Error al actualizar estado del activo:', assetError);
          } else {
            console.log('✅ Estado del activo actualizado a enviado');
          }
        }
      }

      onSave();
    } catch (error: any) {
      console.error('❌ Error inesperado al guardar envío:', error);

      let errorMessage = 'Error al guardar el envío';
      if (error?.message) {
        errorMessage += `: ${error.message}`;
      }
      if (error?.code) {
        errorMessage += `\n\nCódigo: ${error.code}`;
      }
      if (error?.details) {
        errorMessage += `\nDetalles: ${error.details}`;
      }
      if (error?.hint) {
        errorMessage += `\nSugerencia: ${error.hint}`;
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };



  const selectedAsset = assets.find(a => a.id === formData.asset_id);
  const isTinte = selectedAsset?.asset_types?.name === 'Tinte';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
            {editShipment ? 'Editar Envío de Activo' : 'Nuevo Envío de Activo'}
          </h2>
          {hasChanges && (
            <p className="text-xs text-orange-600 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={12} />
              Cambios sin guardar
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Información del Activo */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            <Package size={16} className="text-blue-500" />
            Información del Activo
          </h3>

          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Tipo de Activo
                </label>
                <select
                  value={selectedAssetType}
                  onChange={(e) => {
                    setSelectedAssetType(e.target.value);
                    setFormData(prev => ({ ...prev, asset_id: '' })); // Limpiar selección de activo
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                >
                  <option value="">Todos los tipos</option>
                  {assetTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Buscar Activo
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={assetSearchTerm}
                    onChange={(e) => {
                      setAssetSearchTerm(e.target.value);
                      setFormData(prev => ({ ...prev, asset_id: '' })); // Limpiar selección al buscar
                    }}
                    placeholder="Buscar por marca, modelo, serie..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Seleccionar Activo *
              </label>
              <select
                required
                value={formData.asset_id}
                onChange={(e) => handleInputChange('asset_id', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white ${errors.asset_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                  }`}
              >
                <option value="">Seleccionar activo del inventario...</option>
                {filteredAssets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.brand} {asset.model} - {asset.serial_number}
                    {asset.locations && ` (${asset.locations.name})`}
                    {asset.status && ` [${asset.status}]`}
                  </option>
                ))}
              </select>
              {errors.asset_id && (
                <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.asset_id}</p>
              )}
              <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>
                  {selectedAssetType || assetSearchTerm
                    ? `Mostrando ${filteredAssets.length} activos`
                    : `Total: ${assets.length} activos`
                  }
                </span>
                {(selectedAssetType || assetSearchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssetType('');
                      setAssetSearchTerm('');
                      setFormData(prev => ({ ...prev, asset_id: '' }));
                    }}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {isTinte && (
              <div className="mt-4 bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">
                  Cantidad a enviar (Galones) *
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <input
                      type="number"
                      value={tinteQuantity}
                      onChange={(e) => setTinteQuantity(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-32 px-4 py-2.5 border border-blue-200 rounded-lg text-sm text-blue-900 focus:ring-2 focus:ring-blue-500 bg-white placeholder-blue-200 font-bold"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-300">GAL</span>
                  </div>
                  <div className="text-xs text-blue-600 bg-blue-100/50 px-3 py-2 rounded-lg border border-blue-200/50">
                    <span className="font-bold uppercase tracking-wider text-[10px] mr-1">Disponible:</span>
                    <span className="font-mono text-sm font-bold">{selectedAsset?.capacity || '0'}</span> Galones
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-blue-500 flex items-center gap-1.5 font-medium">
                  <AlertCircle size={12} />
                  El stock se descontará del inventario de la sede central al guardar.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Ubicaciones */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span>
            <MapPin size={16} className="text-green-500" />
            Ruta de Envío
          </h3>

          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Ubicación de Origen
                  {centralLocation && (
                    <span className="ml-2 text-green-600 font-black">(Sede Central)</span>
                  )}
                </label>
                <select
                  value={formData.from_location_id}
                  onChange={(e) => handleInputChange('from_location_id', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                >
                  <option value="">Sin ubicación específica</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {centralLocation && location.id === centralLocation.id && ' (Central)'}
                    </option>
                  ))}
                </select>
                {centralLocation && formData.from_location_id === centralLocation.id && (
                  <p className="mt-1.5 text-[10px] font-bold text-green-600 uppercase tracking-wide flex items-center gap-1">
                    <CheckCircle size={12} />
                    Envío desde Sede Central
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Ubicación de Destino *
                </label>
                <select
                  required
                  value={formData.to_location_id}
                  onChange={(e) => handleInputChange('to_location_id', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white ${errors.to_location_id ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                    }`}
                >
                  <option value="">Seleccionar destino...</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                {errors.to_location_id && (
                  <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.to_location_id}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Información del Envío */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
            <Calendar size={16} className="text-purple-500" />
            Detalles Logísticos
          </h3>

          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Fecha de Envío *
                </label>
                <input
                  type="date"
                  required
                  value={formData.shipment_date}
                  onChange={(e) => handleInputChange('shipment_date', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white ${errors.shipment_date ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                    }`}
                />
                {errors.shipment_date && (
                  <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.shipment_date}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Estado Actual
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                >
                  <option value="shipped">ENVIADO</option>
                  <option value="in_transit">EN TRÁNSITO</option>
                  <option value="delivered">ENTREGADO</option>
                  <option value="returned">DEVUELTO</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Información de Seguimiento */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
            <Truck size={16} className="text-orange-500" />
            Transporte y Seguimiento
          </h3>

          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Número de Guía / Tracking
                </label>
                <input
                  type="text"
                  value={formData.tracking_number}
                  onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                  placeholder="Ej: TRK123456789"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 ${errors.tracking_number ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                    }`}
                />
                {errors.tracking_number && (
                  <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.tracking_number}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Empresa de Transporte
                </label>
                <input
                  type="text"
                  value={formData.carrier}
                  onChange={(e) => handleInputChange('carrier', e.target.value)}
                  placeholder="Ej: Serpost, Olva, Shalom..."
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 ${errors.carrier ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                    }`}
                />
                {errors.carrier && (
                  <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.carrier}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Información de Personas */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
            <User size={16} className="text-indigo-500" />
            Responsables
          </h3>

          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Enviado por
                </label>
                <input
                  type="text"
                  value={formData.shipped_by}
                  onChange={(e) => handleInputChange('shipped_by', e.target.value)}
                  placeholder="Nombre del remitente"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 ${errors.shipped_by ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                    }`}
                />
                {errors.shipped_by && (
                  <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.shipped_by}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Recibido por (Si ya se entregó)
                </label>
                <input
                  type="text"
                  value={formData.received_by}
                  onChange={(e) => handleInputChange('received_by', e.target.value)}
                  placeholder="Nombre del receptor"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 ${errors.received_by ? 'border-red-300 focus:ring-red-200' : 'border-gray-200'
                    }`}
                />
                {errors.received_by && (
                  <p className="mt-1 text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.received_by}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-500 rounded-full"></span>
            <AlertCircle size={16} className="text-gray-500" />
            Observaciones
          </h3>

          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              placeholder="Información adicional relevante sobre el estado del paquete o instrucciones..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 resize-none"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="pt-6 border-t border-gray-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Guardando...
              </>
            ) : (
              editShipment ? 'Actualizar Envío' : 'Registrar Envío'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}