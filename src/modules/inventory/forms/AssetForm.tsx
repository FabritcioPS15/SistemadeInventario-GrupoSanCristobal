import { useState, useEffect } from 'react';
import { Package, RefreshCw } from 'lucide-react';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, Category, Subcategory, Location, Area, AssetWithDetails, Company } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect } from '../../../shared/components/forms/BaseForm';

type AssetFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAsset?: AssetWithDetails;
  initialCategoryId?: string;
  initialSubcategoryId?: string;
};

export default function AssetForm({ onClose, onSave, editAsset, initialCategoryId, initialSubcategoryId }: AssetFormProps) {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetchingSubcategories, setFetchingSubcategories] = useState(false);
  const [fetchingAreas, setFetchingAreas] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    company_id: editAsset?.company_id || '',
    codigo_unico: editAsset?.codigo_unico || '',
    category_id: editAsset?.category_id || initialCategoryId || '',
    subcategory_id: editAsset?.subcategory_id || initialSubcategoryId || '',
    location_id: editAsset?.location_id || '',
    area_id: editAsset?.area_id || '',
    brand: editAsset?.brand || '',
    model: editAsset?.model || '',
    serial_number: editAsset?.serial_number || '',
    anydesk_id: editAsset?.anydesk_id || '',
    ip_address: editAsset?.ip_address || '',
    phone_number: editAsset?.phone_number || '',
    capacity: editAsset?.capacity || '',
    status: editAsset?.status || 'active',

    // Technical fields
    processor: editAsset?.processor || '',
    ram: editAsset?.ram || '',
    operating_system: editAsset?.operating_system || '',
    bios_mode: editAsset?.bios_mode || '',
    placa: editAsset?.placa || '',

    // Inventory details
    item: editAsset?.item || '',
    descripcion: editAsset?.descripcion || '',
    unidad_medida: editAsset?.unidad_medida || 'UNIDADES',
    cantidad: editAsset?.cantidad?.toString() || '1',
    condicion: editAsset?.condicion || 'Nuevo',
    color: editAsset?.color || '',
    gama: editAsset?.gama || '',
    fecha_adquisicion: editAsset?.fecha_adquisicion || '',
    valor_estimado: editAsset?.valor_estimado?.toString() || '',
    estado_uso: editAsset?.estado_uso || 'Operativo',

    // Camera fields
    name: editAsset?.name || '',
    url: editAsset?.url || '',
    username: editAsset?.username || '',
    password: editAsset?.password || '',
    port: editAsset?.port || '',
    access_type: editAsset?.access_type || 'url',
    auth_code: editAsset?.auth_code || '',

    // Mobile fields
    imei: editAsset?.imei || '',
    operator: editAsset?.operator || '',
    data_plan: editAsset?.data_plan || '',
    physical_condition: editAsset?.physical_condition || '',
    sistema_operativo: editAsset?.sistema_operativo || '',
    version_so: editAsset?.version_so || '',
    almacenamiento: editAsset?.almacenamiento || '',
    bateria_estado: editAsset?.bateria_estado || '',
    accesorios: editAsset?.accesorios || '',

    // Printing fields
    tipo_impresion: editAsset?.tipo_impresion || '',
    tecnologia_impresion: editAsset?.tecnologia_impresion || '',
    velocidad_impresion: editAsset?.velocidad_impresion || '',
    resolucion: editAsset?.resolucion || '',

    // Monitor/Projector fields
    tamaño_pantalla: editAsset?.tamaño_pantalla || '',
    resolucion_pantalla: editAsset?.resolucion_pantalla || '',
    tipo_conexion: editAsset?.tipo_conexion || '',
    luminosidad: editAsset?.luminosidad || '',
    potencia_w: editAsset?.potencia_w?.toString() || '',
    estabilizador_w: editAsset?.estabilizador_w?.toString() || '',
    voltage_v: editAsset?.voltage_v?.toString() || '',
    frecuencia_hz: editAsset?.frecuencia_hz?.toString() || '',
    brillo_lumens: editAsset?.brillo_lumens?.toString() || '',
    mac_address: editAsset?.mac_address || '',
    velocidad_internet: editAsset?.velocidad_internet || '',
    tipo_conector: editAsset?.tipo_conector || '',
    marca_motor: editAsset?.marca_motor || '',
  });


  useEffect(() => {
    fetchInitialData();
    if (!editAsset && !formData.codigo_unico) {
      generateUniqueCode();
    }
  }, []);

  useEffect(() => {
    if (formData.category_id) {
      fetchSubcategories(formData.category_id);
    } else {
      setSubcategories([]);
    }
  }, [formData.category_id]);

  useEffect(() => {
    if (formData.location_id) {
      fetchAreas(formData.location_id);
    } else {
      setAreas([]);
    }
  }, [formData.location_id]);

  useEffect(() => {
    if (formData.company_id) {
      fetchLocations(formData.company_id);
    } else {
      setLocations([]);
    }
  }, [formData.company_id]);

  useEffect(() => {
    if (editAsset) {
      const hasFormChanges = Object.keys(formData).some(key => {
        const val1 = formData[key as keyof typeof formData]?.toString() || '';
        const val2 = (editAsset as any)[key]?.toString() || '';
        return val1 !== val2;
      });
      setHasChanges(hasFormChanges);
    }
  }, [formData, editAsset]);

  const fetchInitialData = async () => {
    try {
      const [compRes, catRes, locRes] = await Promise.all([
        supabase.from('companies').select('*').eq('is_active', true).order('name'),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('locations').select('*').eq('is_active', true).order('name')
      ]);

      if (compRes.error) {
        console.error('Error fetching companies:', compRes.error);
      }
      if (catRes.error) {
        console.error('Error fetching categories:', catRes.error);
        setErrors(prev => ({ ...prev, submit: `Error cargando categorías: ${catRes.error.message}` }));
      }
      if (locRes.error) {
        console.error('Error fetching locations:', locRes.error);
      }

      if (compRes.data) setCompanies(compRes.data);
      if (catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length === 0) {
          console.warn('No category data found in table "categories"');
        }
      }
      if (locRes.data) setLocations(locRes.data);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setErrors(prev => ({ ...prev, submit: 'Error de conexión con la base de datos' }));
    }
  };

  const fetchLocations = async (companyId: string) => {
    try {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      if (data) setLocations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      setFetchingSubcategories(true);
      const { data } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');
      if (data) setSubcategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSubcategories(false);
    }
  };

  const fetchAreas = async (locationId: string) => {
    try {
      setFetchingAreas(true);
      const { data } = await supabase
        .from('areas')
        .select('*')
        .eq('location_id', locationId)
        .order('name');
      if (data) setAreas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingAreas(false);
    }
  };

  const generateUniqueCode = () => {
    const code = 'ACT-' + Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, codigo_unico: code }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Reset dependent fields
      if (name === 'company_id') {
        newData.location_id = '';
        newData.area_id = '';
      }
      if (name === 'category_id') {
        newData.subcategory_id = '';
      }
      if (name === 'location_id') {
        newData.area_id = '';
      }

      return newData;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.company_id) throw new Error('La empresa es obligatoria');
      if (!formData.category_id) throw new Error('La categoría es obligatoria');
      if (!formData.subcategory_id) throw new Error('La subcategoría es obligatoria');

      const dataToSave = {
        // Core Identity
        brand: formData.brand,
        model: formData.model,
        serial_number: formData.serial_number,
        codigo_unico: formData.codigo_unico,

        // Relationships
        company_id: formData.company_id,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id,
        location_id: formData.location_id || null,
        area_id: formData.area_id || null,

        // General Info
        status: formData.status,
        descripcion: formData.descripcion,
        unidad_medida: formData.unidad_medida,
        condicion: formData.condicion,
        color: formData.color,
        gama: formData.gama,
        estado_uso: formData.estado_uso,
        cantidad: parseInt(formData.cantidad) || 1,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
        fecha_adquisicion: formData.fecha_adquisicion || null,

        // Technical Info (Core)
        anydesk_id: formData.anydesk_id,
        ip_address: formData.ip_address,
        capacity: formData.capacity,
        processor: formData.processor,
        ram: formData.ram,
        operating_system: formData.operating_system,
        bios_mode: formData.bios_mode,

        updated_at: new Date().toISOString()
      };

      if (editAsset) {
        const { error } = await supabase.from('assets').update(dataToSave).eq('id', editAsset.id);
        if (error) throw error;
        notifySuccess('El activo se actualizó correctamente', '¡Excelente!');
      } else {
        const { error } = await supabase.from('assets').insert([dataToSave]);
        if (error) throw error;
        notifySuccess('El activo se creó correctamente', '¡Buen trabajo!');
      }
      onSave();
    } catch (error: any) {
      setErrors({ submit: error.message });
      notifyError(error.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryName = categories.find(c => c.id === formData.category_id)?.name || '';
  const isCómputo = selectedCategoryName === 'Equipos de Cómputo y TI';
  const isBiométrico = selectedCategoryName === 'Equipos Biométricos y Control';

  return (
    <BaseForm
      title={editAsset ? 'Editar Activo' : 'Nuevo Activo'}
      subtitle="Sistema Centralizado de Inventario"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="5xl"
      icon={<Package size={24} className="text-blue-600" />}
      showChangesWarning={hasChanges}
    >
      {/* SECCIÓN 1: Datos Universales de Inventario */}
      <FormSection title="Datos Principales de Inventario" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Empresa" required error={errors.company_id}>
            <FormSelect name="company_id" value={formData.company_id} onChange={handleChange} required>
              <option value="">Seleccionar empresa...</option>
              {companies.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}
            </FormSelect>
          </FormField>

          <FormField label="Código Único">
            <div className="flex gap-2">
              <FormInput
                type="text"
                name="codigo_unico"
                value={formData.codigo_unico}
                readOnly
                className="bg-gray-50 font-mono font-bold text-blue-700"
              />
              <button
                type="button"
                onClick={generateUniqueCode}
                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 shadow-sm transition-colors"
                title="Regenerar código"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </FormField>

          <FormField label="Tipo / Categoría" required error={errors.category_id}>
            <FormSelect name="category_id" value={formData.category_id} onChange={handleChange} required>
              <option value="">Seleccionar categoría...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </FormSelect>
          </FormField>

          <FormField label="Subcategoría" required error={errors.subcategory_id}>
            <FormSelect
              name="subcategory_id"
              value={formData.subcategory_id}
              onChange={handleChange}
              required
              disabled={!formData.category_id || fetchingSubcategories}
            >
              <option value="">{fetchingSubcategories ? 'Cargando...' : 'Seleccionar subcategoría...'}</option>
              {subcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </FormSelect>
          </FormField>

          <FormField label="Ubicación del Activo" error={errors.location_id}>
            <FormSelect name="location_id" value={formData.location_id} onChange={handleChange}>
              <option value="">Sin asignar</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </FormField>

          <FormField label="Área / Ubicación del Activo" error={errors.area_id}>
            <FormSelect
              name="area_id"
              value={formData.area_id}
              onChange={handleChange}
              disabled={!formData.location_id || fetchingAreas}
            >
              <option value="">{fetchingAreas ? 'Cargando áreas...' : 'Seleccionar área...'}</option>
              {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
            </FormSelect>
          </FormField>

          <FormField label="Estado Operativo">
            <FormSelect name="status" value={formData.status} onChange={handleChange} className="font-bold text-emerald-700">
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="extracted">Extraído</option>
            </FormSelect>
          </FormField>

          <FormField label="Descripción" className="md:col-span-2">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Descripción completa del activo" />
          </FormField>

          <FormField label="Unidad de Medida">
            <FormInput name="unidad_medida" value={formData.unidad_medida} onChange={handleChange} placeholder="Ej: UNIDAD, CAJA" />
          </FormField>

          <FormField label="Marca">
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: Dell, Lenovo" />
          </FormField>

          <FormField label="Modelo">
            <FormInput name="model" value={formData.model} onChange={handleChange} placeholder="Ej: Precision 3660" />
          </FormField>

          <FormField label="Nº de Serie">
            <FormInput name="serial_number" value={formData.serial_number} onChange={handleChange} className="font-mono" placeholder="S/N" />
          </FormField>

          <FormField label="Color">
            <FormInput name="color" value={formData.color} onChange={handleChange} placeholder="Ej: Negro, Plateado" />
          </FormField>

          <FormField label="Gama">
            <FormSelect name="gama" value={formData.gama} onChange={handleChange}>
              <option value="">Seleccionar...</option>
              <option value="Alta">Gama Alta</option>
              <option value="Media">Gama Media</option>
              <option value="Baja">Gama Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Cantidad">
            <FormInput type="number" name="cantidad" value={formData.cantidad} onChange={handleChange} />
          </FormField>

          <FormField label="Condición">
            <FormSelect name="condicion" value={formData.condicion} onChange={handleChange}>
              <option value="Nuevo">Nuevo</option>
              <option value="Bueno">Bueno</option>
              <option value="Regular">Regular</option>
              <option value="Malo">Malo</option>
            </FormSelect>
          </FormField>

          <FormField label="Estado de Uso">
            <FormSelect name="estado_uso" value={formData.estado_uso} onChange={handleChange}>
              <option value="Operativo">Operativo</option>
              <option value="Inoperativo">Inoperativo</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Baja">De Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Valor Estimado (S/.)">
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" />
          </FormField>

          <FormField label="Fecha Adquisición">
            <FormInput type="date" name="fecha_adquisicion" value={formData.fecha_adquisicion} onChange={handleChange} />
          </FormField>
        </div>
      </FormSection>

      {/* SECCIÓN 2: Detalles Técnicos Especializados (Cómputo/Seguridad) */}
      {(isCómputo || isBiométrico) && (
        <FormSection title="Especificaciones Técnicas" color="emerald">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField label="AnyDesk / Acceso">
              <FormInput name="anydesk_id" value={formData.anydesk_id} onChange={handleChange} placeholder="ID Acceso" />
            </FormField>
            <FormField label="Dirección IP">
              <FormInput name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="192.168.1.X" />
            </FormField>
            {isCómputo && (
              <>
                <FormField label="Procesador">
                  <FormInput name="processor" value={formData.processor} onChange={handleChange} placeholder="Ej: i7 12th Gen" />
                </FormField>
                <FormField label="Memoria RAM">
                  <FormInput name="ram" value={formData.ram} onChange={handleChange} placeholder="Ej: 16GB" />
                </FormField>
                <FormField label="Sis. Operativo">
                  <FormSelect name="operating_system" value={formData.operating_system} onChange={handleChange}>
                    <option value="">Seleccionar...</option>
                    <option value="Windows 10">Windows 10</option>
                    <option value="Windows 11">Windows 11</option>
                    <option value="macOS">macOS</option>
                    <option value="Linux">Linux</option>
                  </FormSelect>
                </FormField>
              </>
            )}
          </div>
        </FormSection>
      )}
    </BaseForm>
  );
}
