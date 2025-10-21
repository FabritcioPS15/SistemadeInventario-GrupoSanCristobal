import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Package, MapPin, Calendar, User, Truck, Filter, Search } from 'lucide-react';
import { supabase, AssetWithDetails, Location } from '../lib/supabase';

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
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
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
    setValidationStatus(prev => ({ ...prev, [fieldName]: 'checking' }));
    
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

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'shipped': return 'Enviado';
      case 'in_transit': return 'En Tránsito';
      case 'delivered': return 'Entregado';
      case 'returned': return 'Devuelto';
      default: return 'Desconocido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'shipped': return 'text-blue-600';
      case 'in_transit': return 'text-yellow-600';
      case 'delivered': return 'text-green-600';
      case 'returned': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editShipment ? 'Editar Envío' : 'Nuevo Envío'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información del Activo */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                Información del Activo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Activo
                  </label>
                  <select
                    value={selectedAssetType}
                    onChange={(e) => {
                      setSelectedAssetType(e.target.value);
                      setFormData(prev => ({ ...prev, asset_id: '' })); // Limpiar selección de activo
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar Activo
                  </label>
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={assetSearchTerm}
                      onChange={(e) => {
                        setAssetSearchTerm(e.target.value);
                        setFormData(prev => ({ ...prev, asset_id: '' })); // Limpiar selección al buscar
                      }}
                      placeholder="Buscar por marca, modelo, serie..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activo *
                </label>
                <select
                  required
                  value={formData.asset_id}
                  onChange={(e) => handleInputChange('asset_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.asset_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar activo...</option>
                  {filteredAssets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.brand} {asset.model} - {asset.serial_number} 
                      {asset.locations && ` (${asset.locations.name})`}
                      {asset.status && ` [${asset.status}]`}
                    </option>
                  ))}
                </select>
                {errors.asset_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.asset_id}</p>
                )}
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {selectedAssetType || assetSearchTerm 
                      ? `Mostrando ${filteredAssets.length} activos filtrados`
                      : `Total: ${assets.length} activos disponibles`
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
            </div>

            {/* Ubicaciones */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-green-600" />
                Ubicaciones
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación de Origen
                    {centralLocation && (
                      <span className="ml-2 text-sm text-green-600">(Sede Central)</span>
                    )}
                  </label>
                  <select
                    value={formData.from_location_id}
                    onChange={(e) => handleInputChange('from_location_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <p className="mt-1 text-sm text-green-600">
                      ✅ Envío desde sede central
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación de Destino *
                  </label>
                  <select
                    required
                    value={formData.to_location_id}
                    onChange={(e) => handleInputChange('to_location_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.to_location_id ? 'border-red-300' : 'border-gray-300'
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
                    <p className="mt-1 text-sm text-red-600">{errors.to_location_id}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información del Envío */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-purple-600" />
                Información del Envío
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Envío *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.shipment_date}
                    onChange={(e) => handleInputChange('shipment_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.shipment_date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.shipment_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.shipment_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="shipped">Enviado</option>
                    <option value="in_transit">En Tránsito</option>
                    <option value="delivered">Entregado</option>
                    <option value="returned">Devuelto</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Información de Seguimiento */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck size={20} className="text-orange-600" />
                Información de Seguimiento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Seguimiento
                  </label>
                  <input
                    type="text"
                    value={formData.tracking_number}
                    onChange={(e) => handleInputChange('tracking_number', e.target.value)}
                    placeholder="Ej: TRK123456789"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.tracking_number ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.tracking_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.tracking_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Empresa de Transporte
                  </label>
                  <input
                    type="text"
                    value={formData.carrier}
                    onChange={(e) => handleInputChange('carrier', e.target.value)}
                    placeholder="Ej: Serpost, Olva, etc."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.carrier ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.carrier && (
                    <p className="mt-1 text-sm text-red-600">{errors.carrier}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Información de Personas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                Información de Personas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enviado por
                  </label>
                  <input
                    type="text"
                    value={formData.shipped_by}
                    onChange={(e) => handleInputChange('shipped_by', e.target.value)}
                    placeholder="Nombre de quien envía"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.shipped_by ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.shipped_by && (
                    <p className="mt-1 text-sm text-red-600">{errors.shipped_by}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recibido por
                  </label>
                  <input
                    type="text"
                    value={formData.received_by}
                    onChange={(e) => handleInputChange('received_by', e.target.value)}
                    placeholder="Nombre de quien recibe"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.received_by ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.received_by && (
                    <p className="mt-1 text-sm text-red-600">{errors.received_by}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-gray-600" />
                Notas Adicionales
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Información adicional sobre el envío..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editShipment ? 'Actualizar Envío' : 'Crear Envío'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}