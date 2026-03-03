import { useState, useEffect } from 'react';
import { Package, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, AssetType, Location, AssetWithDetails } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

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

    // Campos adicionales para maquinarias
    item: editAsset?.item || '',
    descripcion: editAsset?.descripcion || '',
    unidad_medida: editAsset?.unidad_medida || '',
    cantidad: editAsset?.cantidad?.toString() || '1',
    condicion: editAsset?.condicion || '',
    color: editAsset?.color || '',
    gama: editAsset?.gama || '',
    fecha_adquisicion: editAsset?.fecha_adquisicion || '',
    valor_estimado: editAsset?.valor_estimado?.toString() || '',
    estado_uso: editAsset?.estado_uso || '',

    // Campos adicionales para PC/Laptop
    processor: editAsset?.processor || '',
    ram: editAsset?.ram || '',
    operating_system: editAsset?.operating_system || '',
    bios_mode: editAsset?.bios_mode || '',
    area: editAsset?.area || '',
    placa: editAsset?.placa || '',

    // Campos adicionales para Cámaras
    name: editAsset?.name || '',
    url: editAsset?.url || '',
    username: editAsset?.username || '',
    password: editAsset?.password || '',
    port: editAsset?.port || '',
    access_type: editAsset?.access_type || 'url',
    auth_code: editAsset?.auth_code || '',

    // Campos adicionales para Celulares
    imei: editAsset?.imei || '',
    operator: editAsset?.operator || '',
    data_plan: editAsset?.data_plan || '',
    physical_condition: editAsset?.physical_condition || '',
    sistema_operativo: editAsset?.sistema_operativo || '',
    version_so: editAsset?.version_so || '',
    almacenamiento: editAsset?.almacenamiento || '',
    bateria_estado: editAsset?.bateria_estado || '',
    accesorios: editAsset?.accesorios || '',

    // Campos adicionales para Impresoras/Escáneres
    tipo_impresion: editAsset?.tipo_impresion || '',
    tecnologia_impresion: editAsset?.tecnologia_impresion || '',
    velocidad_impresion: editAsset?.velocidad_impresion || '',
    resolucion: editAsset?.resolucion || '',

    // Campos adicionales para Monitores/Proyectores
    tamaño_pantalla: editAsset?.tamaño_pantalla || '',
    resolucion_pantalla: editAsset?.resolucion_pantalla || '',
    tipo_conexion: editAsset?.tipo_conexion || '',
    luminosidad: editAsset?.luminosidad || '',
  });

  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  useEffect(() => {
    fetchAssetTypes();
    fetchLocations();
  }, []);

  useEffect(() => {
    if (editAsset) {
      // Logic to detect changes
      const hasFormChanges = Object.keys(formData).some(key => {
        const val1 = formData[key as keyof typeof formData]?.toString() || '';
        const val2 = editAsset[key as keyof AssetWithDetails]?.toString() || '';
        return val1 !== val2;
      });
      setHasChanges(hasFormChanges);
    }
  }, [formData, editAsset]);

  const fetchAssetTypes = async () => {
    const { data } = await supabase.from('asset_types').select('*').order('name');
    if (data) setAssetTypes(data);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

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

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('assets-images').getPublicUrl(path);
      setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));

    // Quick validation for specific fields
    if (['ip_address', 'phone_number', 'anydesk_id', 'serial_number'].includes(name)) {
      validateField(name, value);
    }
  };

  const validateField = async (name: string, value: string) => {
    setValidationStatus(prev => ({ ...prev, [name]: 'checking' }));
    // Simplified validation for overwrite
    let isValid = true;
    if (name === 'ip_address' && value && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value)) isValid = false;
    if (name === 'anydesk_id' && value && !/^[0-9]{9}$/.test(value)) isValid = false;

    setValidationStatus(prev => ({ ...prev, [name]: isValid ? 'valid' : 'invalid' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        location_id: formData.location_id || null,
        updated_at: new Date().toISOString()
      };

      if (editAsset) {
        const { error } = await supabase.from('assets').update(dataToSave).eq('id', editAsset.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('assets').insert([dataToSave]);
        if (error) throw error;
      }
      onSave();
    } catch (error: any) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderValidationIcon = (fieldName: string) => {
    const status = validationStatus[fieldName];
    if (status === 'checking') return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    if (status === 'valid') return <CheckCircle size={14} className="text-emerald-500" />;
    if (status === 'invalid') return <AlertCircle size={14} className="text-rose-500" />;
    return null;
  };

  const selectedTypeName = assetTypes.find(t => t.id === formData.asset_type_id)?.name || '';
  const isPCOrLaptop = selectedTypeName === 'PC' || selectedTypeName === 'Laptop';
  const isCelular = selectedTypeName === 'Celular';
  const isCamera = selectedTypeName === 'Cámara' || selectedTypeName === 'DVR';
  const isTinte = selectedTypeName === 'Tinte';
  const isRam = selectedTypeName === 'Memoria RAM';
  const isDisk = selectedTypeName === 'Disco de Almacenamiento';

  return (
    <BaseForm
      title={editAsset ? 'Editar Activo' : preselectedAssetTypeId ? `Nuevo ${selectedTypeName || 'Activo'}` : 'Nuevo Activo'}
      subtitle="Gestión de Activos Tecnológicos"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="5xl"
      icon={<Package size={24} className="text-blue-600" />}
      showChangesWarning={hasChanges}
    >
      {/* SECTION 1: IDENTIFICACIÓN BÁSICA */}
      <FormSection title="Identificación Básica" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Tipo de Activo" required error={errors.asset_type_id}>
            <FormSelect 
              name="asset_type_id" 
              value={formData.asset_type_id} 
              onChange={handleChange} 
              required
              error={errors.asset_type_id}
            >
              <option value="">Seleccionar...</option>
              {assetTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
            </FormSelect>
          </FormField>
          
          <FormField label="Ubicación / Sede" error={errors.location_id}>
            <FormSelect 
              name="location_id" 
              value={formData.location_id} 
              onChange={handleChange}
              error={errors.location_id}
            >
              <option value="">Sin asignar</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </FormField>
          
          <FormField label="Estado Operativo">
            <FormSelect 
              name="status" 
              value={formData.status} 
              onChange={handleChange}
              className="text-emerald-700 font-bold"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
            </FormSelect>
          </FormField>
          
          <FormField label="Marca">
            <FormInput 
              type="text" 
              name="brand" 
              value={formData.brand} 
              onChange={handleChange} 
              placeholder="Ej: Dell, Lenovo"
              error={errors.brand}
            />
          </FormField>
          
          <FormField label={isTinte ? 'Color' : 'Modelo'}>
            <FormInput 
              type="text" 
              name="model" 
              value={formData.model} 
              onChange={handleChange} 
              placeholder="Ej: Latitude 5420"
              error={errors.model}
            />
          </FormField>
          
          <FormField label="Nº de Serie">
            <div className="relative">
              <FormInput 
                type="text" 
                name="serial_number" 
                value={formData.serial_number} 
                onChange={handleChange} 
                placeholder="S/N"
                className="font-mono pr-10"
                error={errors.serial_number}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">{renderValidationIcon('serial_number')}</div>
            </div>
          </FormField>
          
          <FormField label="Imagen del Activo" className="lg:col-span-3">
            <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                disabled={uploadingImage} 
                className="text-sm" 
              />
              {formData.image_url && (
                <div className="relative group">
                  <img 
                    src={formData.image_url} 
                    alt="asset" 
                    className="h-20 w-20 object-cover rounded-xl border border-white shadow-md" 
                  />
                  <button 
                    type="button" 
                    onClick={handleRemoveImage} 
                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </FormField>
        </div>
      </FormSection>

      
      {/* SECTION 2: ESPECIFICACIONES TÉCNICAS */}
      <FormSection title="Especificaciones Técnicas" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isPCOrLaptop || isCelular || isCamera) && (
            <FormField label="AnyDesk / ID Acceso">
              <div className="relative">
                <FormInput 
                  type="text" 
                  name="anydesk_id" 
                  value={formData.anydesk_id} 
                  onChange={handleChange} 
                  placeholder="123 456 789"
                  className="pr-10"
                  error={errors.anydesk_id}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">{renderValidationIcon('anydesk_id')}</div>
              </div>
            </FormField>
          )}
          
          {!isTinte && (
            <FormField label="Dirección IP">
              <div className="relative">
                <FormInput 
                  type="text" 
                  name="ip_address" 
                  value={formData.ip_address} 
                  onChange={handleChange} 
                  placeholder="192.168.x.x"
                  className="pr-10"
                  error={errors.ip_address}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">{renderValidationIcon('ip_address')}</div>
              </div>
            </FormField>
          )}
          
          {(isRam || isDisk || isCelular) && (
            <FormField label="Capacidad / Tamaño">
              <FormInput 
                type="text" 
                name="capacity" 
                value={formData.capacity} 
                onChange={handleChange} 
                placeholder="Ej: 16GB, 1TB"
                error={errors.capacity}
              />
            </FormField>
          )}
          
          {isPCOrLaptop && (
            <>
              <FormField label="Procesador">
                <FormInput 
                  type="text" 
                  name="processor" 
                  value={formData.processor} 
                  onChange={handleChange} 
                  placeholder="Intel Core i7"
                  error={errors.processor}
                />
              </FormField>
              
              <FormField label="Memoria RAM">
                <FormInput 
                  type="text" 
                  name="ram" 
                  value={formData.ram} 
                  onChange={handleChange} 
                  placeholder="8GB DDR4"
                  error={errors.ram}
                />
              </FormField>
              
              <FormField label="Sis. Operativo">
                <FormSelect 
                  name="operating_system" 
                  value={formData.operating_system} 
                  onChange={handleChange}
                  error={errors.operating_system}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Windows 10">Windows 10</option>
                  <option value="Windows 11">Windows 11</option>
                  <option value="macOS">macOS</option>
                  <option value="Linux">Linux</option>
                </FormSelect>
              </FormField>
            </>
          )}
          
          {isCelular && (
            <>
              <FormField label="IMEI">
                <FormInput 
                  type="text" 
                  name="imei" 
                  value={formData.imei} 
                  onChange={handleChange}
                  error={errors.imei}
                />
              </FormField>
              
              <FormField label="Operador">
                <FormSelect 
                  name="operator" 
                  value={formData.operator} 
                  onChange={handleChange}
                  error={errors.operator}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Claro">Claro</option>
                  <option value="Movistar">Movistar</option>
                  <option value="Entel">Entel</option>
                </FormSelect>
              </FormField>
            </>
          )}
        </div>
      </FormSection>

      {/* SECTION 3: DATOS DE INVENTARIO */}
      <FormSection title="Información de Inventario" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="ITEM">
            <FormInput 
              type="text" 
              name="item" 
              value={formData.item} 
              onChange={handleChange}
              error={errors.item}
            />
          </FormField>
          
          <FormField label="Descripción" className="md:col-span-2">
            <FormInput 
              type="text" 
              name="descripcion" 
              value={formData.descripcion} 
              onChange={handleChange}
              error={errors.descripcion}
            />
          </FormField>
          
          <FormField label="U. Medida">
            <FormInput 
              type="text" 
              name="unidad_medida" 
              value={formData.unidad_medida} 
              onChange={handleChange} 
              placeholder="UNID"
              error={errors.unidad_medida}
            />
          </FormField>
          
          <FormField label="Cant.">
            <FormInput 
              type="number" 
              name="cantidad" 
              value={formData.cantidad} 
              onChange={handleChange}
              error={errors.cantidad}
            />
          </FormField>
          
          <FormField label="Condición">
            <FormSelect 
              name="condicion" 
              value={formData.condicion} 
              onChange={handleChange}
              error={errors.condicion}
            >
              <option value="">Seleccionar...</option>
              <option value="Nuevo">Nuevo</option>
              <option value="Usado - Excelente">Usado - Excelente</option>
              <option value="Usado - Bueno">Usado - Bueno</option>
              <option value="Malo">Malo</option>
            </FormSelect>
          </FormField>
          
          <FormField label="Gama">
            <FormInput 
              type="text" 
              name="gama" 
              value={formData.gama} 
              onChange={handleChange}
              error={errors.gama}
            />
          </FormField>
        </div>
      </FormSection>

      {/* SECTION 4: ADQUISICIÓN Y VALOR */}
      <FormSection title="Adquisición y Valor" color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Fecha Adquisición">
            <FormInput 
              type="date" 
              name="fecha_adquisicion" 
              value={formData.fecha_adquisicion} 
              onChange={handleChange}
              error={errors.fecha_adquisicion}
            />
          </FormField>
          
          <FormField label="Valor Estimado ($)">
            <FormInput 
              type="number" 
              name="valor_estimado" 
              value={formData.valor_estimado} 
              onChange={handleChange} 
              step="0.01" 
              placeholder="0.00"
              error={errors.valor_estimado}
            />
          </FormField>
          
          <FormField label="Estado uso">
            <FormSelect 
              name="estado_uso" 
              value={formData.estado_uso} 
              onChange={handleChange}
              error={errors.estado_uso}
            >
              <option value="">Seleccionar...</option>
              <option value="Operativo">Operativo</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Fuera de Servicio">F. Servicio</option>
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* SECTION 5: NOTAS */}
      <FormSection title="Notas / Observaciones" color="blue">
        <FormField label="">
          <FormTextarea 
            name="notes" 
            value={formData.notes} 
            onChange={handleChange} 
            rows={3} 
            placeholder="Detalles adicionales..."
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
