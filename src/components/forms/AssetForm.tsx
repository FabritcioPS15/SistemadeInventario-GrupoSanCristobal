import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, AssetType, Location, AssetWithDetails } from '../../lib/supabase';

type AssetFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAsset?: AssetWithDetails;
  preselectedAssetTypeId?: string;
};

export default function AssetForm({ onClose, onSave, editAsset, preselectedAssetTypeId }: AssetFormProps) {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    asset_type_id: editAsset?.asset_type_id || preselectedAssetTypeId || '',
    location_id: editAsset?.location_id || '',
    brand: editAsset?.brand || '',
    model: editAsset?.model || '',
    serial_number: editAsset?.serial_number || '',
    anydesk_id: editAsset?.anydesk_id || '',
    ip_address: editAsset?.ip_address || '',
    phone_number: editAsset?.phone_number || '',
    capacity: editAsset?.capacity || '',
    status: editAsset?.status || 'active',
    notes: editAsset?.notes || '',
    image_url: editAsset?.image_url || '',
  });

  const [tinteTipo, setTinteTipo] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  useEffect(() => {
    fetchAssetTypes();
    fetchLocations();
  }, []);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editAsset) {
      const originalData = {
        asset_type_id: editAsset.asset_type_id,
        location_id: editAsset.location_id || '',
        brand: editAsset.brand || '',
        model: editAsset.model || '',
        serial_number: editAsset.serial_number || '',
        anydesk_id: editAsset.anydesk_id || '',
        ip_address: editAsset.ip_address || '',
        phone_number: editAsset.phone_number || '',
        capacity: editAsset.capacity || '',
        status: editAsset.status,
        notes: editAsset.notes || '',
      };

      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editAsset]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `assets/${editAsset?.id || 'new'}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('assets-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setUploadingImage(false);
        return;
      }
      const { data } = supabase.storage.from('assets-images').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const fetchAssetTypes = async () => {
    const { data } = await supabase
      .from('asset_types')
      .select('*')
      .order('name');
    if (data) setAssetTypes(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  // Funciones de validación
  const validateIPAddress = (ip: string): boolean => {
    if (!ip) return true; // Campo opcional
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Campo opcional
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone);
  };

  const validateAnyDeskId = (anydesk: string): boolean => {
    if (!anydesk) return true; // Campo opcional
    const anydeskRegex = /^[0-9]{9}$/;
    return anydeskRegex.test(anydesk);
  };

  const checkDuplicateSerialNumber = async (serialNumber: string, currentAssetId?: string): Promise<boolean> => {
    if (!serialNumber) return true; // Campo opcional

    const { data, error } = await supabase
      .from('assets')
      .select('id')
      .eq('serial_number', serialNumber);

    if (error) return false;

    // Si estamos editando, excluir el activo actual
    if (currentAssetId && data) {
      return !data.some(asset => asset.id !== currentAssetId);
    }

    return data?.length === 0;
  };

  const checkDuplicateAnyDeskId = async (anydeskId: string, currentAssetId?: string): Promise<boolean> => {
    if (!anydeskId) return true; // Campo opcional

    const { data, error } = await supabase
      .from('assets')
      .select('id')
      .eq('anydesk_id', anydeskId);

    if (error) return false;

    // Si estamos editando, excluir el activo actual
    if (currentAssetId && data) {
      return !data.some(asset => asset.id !== currentAssetId);
    }

    return data?.length === 0;
  };

  const validateField = async (fieldName: string, value: string) => {
    setValidationStatus(prev => ({ ...prev, [fieldName]: 'checking' }));

    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'ip_address':
        if (value && !validateIPAddress(value)) {
          isValid = false;
          errorMessage = 'Formato de IP inválido (ej: 192.168.1.1)';
        }
        break;

      case 'phone_number':
        if (value && !validatePhoneNumber(value)) {
          isValid = false;
          errorMessage = 'Formato de teléfono inválido';
        }
        break;

      case 'anydesk_id':
        if (value && !validateAnyDeskId(value)) {
          isValid = false;
          errorMessage = 'AnyDesk ID debe tener 9 dígitos';
        } else if (value) {
          const isUnique = await checkDuplicateAnyDeskId(value, editAsset?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este AnyDesk ID ya está en uso';
          }
        }
        break;

      case 'serial_number':
        if (value) {
          const isUnique = await checkDuplicateSerialNumber(value, editAsset?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este número de serie ya está en uso';
          }
        }
        break;


    }

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos requeridos
    const requiredFields = ['asset_type_id', 'status'];
    const newErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Validar campos con formato específico
    if (formData.ip_address && !validateIPAddress(formData.ip_address)) {
      newErrors.ip_address = 'Formato de IP inválido';
    }

    if (formData.phone_number && !validatePhoneNumber(formData.phone_number)) {
      newErrors.phone_number = 'Formato de teléfono inválido';
    }

    if (formData.anydesk_id && !validateAnyDeskId(formData.anydesk_id)) {
      newErrors.anydesk_id = 'AnyDesk ID debe tener 9 dígitos';
    }



    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Confirmar cambios si estamos editando
    if (editAsset && hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres guardar los cambios realizados?'
      );
      if (!confirmed) return;
    }

    setLoading(true);

    console.log('Enviando formulario:', { editAsset, formData });

    let mergedNotes = formData.notes;
    if ((assetTypes.find(t => t.id === formData.asset_type_id)?.name || '') === 'Tinte') {
      if (tinteTipo && !mergedNotes.includes('Tipo:')) {
        mergedNotes = (mergedNotes ? mergedNotes + '\n' : '') + `Tipo: ${tinteTipo}`;
      }
    }

    const dataToSave = {
      ...formData,
      location_id: formData.location_id || null,
      notes: mergedNotes,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editAsset) {
        console.log('Actualizando activo:', editAsset.id, dataToSave);
        const { error } = await supabase
          .from('assets')
          .update(dataToSave)
          .eq('id', editAsset.id);

        if (error) {
          // Fallback si la columna image_url no existe
          if (error.message && error.message.toLowerCase().includes('image_url')) {
            const { image_url, ...rest } = dataToSave as any;
            const fallbackNotes = image_url ? (rest.notes ? rest.notes + `\nImage: ${image_url}` : `Image: ${image_url}`) : rest.notes;
            const { error: retryError } = await supabase
              .from('assets')
              .update({ ...rest, notes: fallbackNotes })
              .eq('id', editAsset.id);
            if (retryError) {
              console.error('Error de reintento (sin image_url):', retryError);
              setErrors({ submit: 'Error al actualizar el activo: ' + retryError.message });
              setLoading(false);
              return;
            }
          } else {
            console.error('Error al actualizar activo:', error);
            setErrors({ submit: 'Error al actualizar el activo: ' + error.message });
            setLoading(false);
            return;
          }
        }
        console.log('Activo actualizado correctamente');
      } else {
        console.log('Creando nuevo activo:', dataToSave);
        const { error } = await supabase
          .from('assets')
          .insert([dataToSave]);

        if (error) {
          // Fallback si la columna image_url no existe
          if (error.message && error.message.toLowerCase().includes('image_url')) {
            const { image_url, ...rest } = dataToSave as any;
            const fallbackNotes = image_url ? (rest.notes ? rest.notes + `\nImage: ${image_url}` : `Image: ${image_url}`) : rest.notes;
            const { error: retryError } = await supabase
              .from('assets')
              .insert([{ ...rest, notes: fallbackNotes }]);
            if (retryError) {
              console.error('Error de reintento (sin image_url):', retryError);
              setErrors({ submit: 'Error al crear el activo: ' + retryError.message });
              setLoading(false);
              return;
            }
          } else {
            console.error('Error al crear activo:', error);
            setErrors({ submit: 'Error al crear el activo: ' + error.message });
            setLoading(false);
            return;
          }
        }
        console.log('Activo creado correctamente');
      }

      setLoading(false);
      onSave();
    } catch (err) {
      console.error('Error:', err);
      setErrors({ submit: 'Error inesperado: ' + err });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validar campos específicos en tiempo real (con debounce)
    const fieldsToValidate = ['ip_address', 'phone_number', 'anydesk_id', 'serial_number'];
    if (fieldsToValidate.includes(name)) {
      // Debounce para evitar muchas validaciones
      setTimeout(() => {
        validateField(name, value);
      }, 500);
    }
  };

  // Función helper para renderizar el estado de validación
  const renderValidationIcon = (fieldName: string) => {
    const status = validationStatus[fieldName];
    if (status === 'checking') {
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    } else if (status === 'valid') {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (status === 'invalid') {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    return null;
  };

  // Función helper para obtener clases CSS del campo
  const getFieldClasses = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2";
    const status = validationStatus[fieldName];

    if (status === 'invalid' || errors[fieldName]) {
      return `${baseClasses} border-red-300 focus:ring-red-500`;
    } else if (status === 'valid') {
      return `${baseClasses} border-green-300 focus:ring-green-500`;
    }

    return `${baseClasses} border-gray-300 focus:ring-blue-500`;
  };

  const selectedTypeName = assetTypes.find(t => t.id === formData.asset_type_id)?.name || '';
  const isPCOrLaptop = selectedTypeName === 'PC' || selectedTypeName === 'Laptop';
  const isChip = selectedTypeName === 'Chip de Celular';
  const isRam = selectedTypeName === 'Memoria RAM';
  const isDisk = selectedTypeName === 'Disco de Almacenamiento' || selectedTypeName === 'Disco Extraído';
  const isTinte = selectedTypeName === 'Tinte';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editAsset ? 'Editar Activo' : preselectedAssetTypeId ? `Nuevo ${assetTypes.find(type => type.id === preselectedAssetTypeId)?.name || 'Activo'}` : 'Nuevo Activo'}
            </h2>
            {editAsset && hasChanges && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Tienes cambios sin guardar
              </p>
            )}
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mensaje de error general */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-red-500 mr-2" />
                <p className="text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Activo *
              </label>
              <select
                name="asset_type_id"
                value={formData.asset_type_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar...</option>
                {assetTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <select
                name="location_id"
                value={formData.location_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sin asignar</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border file:border-gray-300 file:text-sm file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                />
              </div>
              {formData.image_url && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={formData.image_url} alt="preview" className="h-16 w-16 object-cover rounded border" />
                  <button type="button" onClick={handleRemoveImage} className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded border border-red-200">
                    Quitar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="extracted">Extraído</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {isTinte && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <input
                    type="text"
                    value={tinteTipo}
                    onChange={(e) => setTinteTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Tinta, Tóner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={0}
                  />
                </div>
              </>
            )}

            {!isTinte && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {!isTinte && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Serie
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleChange}
                    placeholder="ABC123456789"
                    className={getFieldClasses('serial_number')}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('serial_number')}
                  </div>
                </div>
                {errors.serial_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.serial_number}</p>
                )}
              </div>
            )}

            {isPCOrLaptop && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AnyDesk ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="anydesk_id"
                    value={formData.anydesk_id}
                    onChange={handleChange}
                    placeholder="123456789"
                    maxLength={9}
                    className={getFieldClasses('anydesk_id')}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('anydesk_id')}
                  </div>
                </div>
                {errors.anydesk_id && (
                  <p className="text-red-500 text-sm mt-1">{errors.anydesk_id}</p>
                )}
              </div>
            )}

            {!isTinte && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección IP
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleChange}
                    placeholder="192.168.1.1"
                    className={getFieldClasses('ip_address')}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('ip_address')}
                  </div>
                </div>
                {errors.ip_address && (
                  <p className="text-red-500 text-sm mt-1">{errors.ip_address}</p>
                )}
              </div>
            )}

            {isChip && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Teléfono/Chip
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="+51 999 999 999"
                    className={getFieldClasses('phone_number')}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('phone_number')}
                  </div>
                </div>
                {errors.phone_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
                )}
              </div>
            )}

            {(isRam || isDisk) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacidad
                </label>
                <input
                  type="text"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="ej: 8GB, 500GB, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
              className="bg-slate-800 text-white py-3 px-4 rounded-lg hover:bg-slate-900 disabled:opacity-50 font-bold text-[10px] uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  {editAsset ? 'Actualizar' : 'Crear'} Activo
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="bg-white text-slate-700 py-3 px-4 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 font-bold text-[10px] uppercase tracking-widest shadow-sm order-2 sm:order-1"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
