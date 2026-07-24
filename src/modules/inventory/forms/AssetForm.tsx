import { useState, useEffect } from 'react';
import { Package, ClipboardList, Tag, Boxes, FileText, Cpu, Printer } from 'lucide-react';
import { useNotify } from '../../../shared/hooks/useNotify';
import { supabase, Category, Location, AssetWithDetails } from '../../../shared/services/supabase';
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
  // Company selection removed; no companies state needed
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    // company_id field removed
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


  // Company-dependent location loading removed; all locations are loaded initially

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
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      if (categoriesError) {
        setErrors(prev => ({ ...prev, submit: `Error cargando categorías: ${categoriesError.message}` }));
        return;
      }

      if (!categoriesData || categoriesData.length === 0) {
        setCategories([]);
      } else {
        setCategories(categoriesData);
      }

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (locationsError) {
      } else if (locationsData) {
        setLocations(locationsData);
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, submit: 'Error de conexión con la base de datos' }));
    }
  };

  // fetchLocations removed; locations are fetched without company filter


  const generateUniqueCode = () => {
    const code = 'ACT-' + Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, codigo_unico: code }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // Reset subcategory when category changes
      if (name === 'category_id') {
        newData.subcategory_id = '';
      }

      return newData;
    });

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Company validation removed
      if (!formData.category_id) throw new Error('La categoría es obligatoria');

      const dataToSave = {
        // Core Identity
        brand: formData.brand,
        model: formData.model,
        serial_number: formData.serial_number,
        codigo_unico: formData.codigo_unico || ('ACT-' + Math.floor(100000 + Math.random() * 900000).toString()),

        // Relationships
        // company_id omitted
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id || null,
        location_id: formData.location_id || null,
        area_id: formData.area_id || null,

        // General Info
        status: formData.status,
        item: formData.item || null,
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
        phone_number: formData.phone_number || null,
        capacity: formData.capacity,
        processor: formData.processor,
        ram: formData.ram,
        operating_system: formData.operating_system,
        bios_mode: formData.bios_mode,
        placa: formData.placa || null,
        mac_address: formData.mac_address || null,

        // Camera fields
        name: formData.name || null,
        url: formData.url || null,
        username: formData.username || null,
        password: formData.password || null,
        port: formData.port || null,
        access_type: formData.access_type || null,
        auth_code: formData.auth_code || null,

        // Mobile fields
        imei: formData.imei || null,
        operator: formData.operator || null,
        data_plan: formData.data_plan || null,
        physical_condition: formData.physical_condition || null,
        sistema_operativo: formData.sistema_operativo || null,
        version_so: formData.version_so || null,
        almacenamiento: formData.almacenamiento || null,
        bateria_estado: formData.bateria_estado || null,
        accesorios: formData.accesorios || null,

        // Printer fields
        tipo_impresion: formData.tipo_impresion || null,
        tecnologia_impresion: formData.tecnologia_impresion || null,
        velocidad_impresion: formData.velocidad_impresion || null,
        resolucion: formData.resolucion || null,

        // Monitor/Projector fields
        tamaño_pantalla: formData.tamaño_pantalla || null,
        resolucion_pantalla: formData.resolucion_pantalla || null,
        tipo_conexion: formData.tipo_conexion || null,
        luminosidad: formData.luminosidad || null,

        // Electrical/Network fields
        potencia_w: formData.potencia_w ? parseFloat(formData.potencia_w) : null,
        estabilizador_w: formData.estabilizador_w ? parseFloat(formData.estabilizador_w) : null,
        voltage_v: formData.voltage_v ? parseFloat(formData.voltage_v) : null,
        frecuencia_hz: formData.frecuencia_hz ? parseFloat(formData.frecuencia_hz) : null,
        brillo_lumens: formData.brillo_lumens ? parseFloat(formData.brillo_lumens) : null,
        velocidad_internet: formData.velocidad_internet || null,
        tipo_conector: formData.tipo_conector || null,
        marca_motor: formData.marca_motor || null,

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

  // Show tech specs for Tecnología or Seguridad y Control
  const isTecnología = selectedCategoryName === 'Tecnología';
  const isSeguridad = selectedCategoryName === 'Seguridad y Control';
  // Show specific sections based on category
  const isImpresora = selectedCategoryName.toLowerCase().includes('impresora') || selectedCategoryName.toLowerCase().includes('impresión');
  const isMóvil = selectedCategoryName.toLowerCase().includes('móvil') || selectedCategoryName.toLowerCase().includes('celular');
  // Show computing-specific fields (CPU, Laptop, Servidor)
  const isCómputo = ['cpu', 'laptop', 'servidor', 'monitor', 'cómputo', 'equipos de cómputo'].some(slug =>
    selectedCategoryName.toLowerCase().includes(slug)
  );

  /* ── Header action buttons (passed to BaseForm) ── */
  const headerActions = (
    <div className="flex items-center gap-2">

    </div>
  );

  return (
    <BaseForm
      title={editAsset ? 'Editar Activo' : 'Nuevo Activo'}
      subtitle={editAsset ? 'Actualiza la información del activo seleccionado.' : 'Completa los datos para registrar un nuevo activo.'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="6xl"
      icon={<Package size={18} className="text-white" />}
      showChangesWarning={hasChanges}
      headerActions={headerActions}
    >

      {/* ══════════════════════════════════════
          SECCIÓN 1 – Información General
          ══════════════════════════════════════ */}
      <FormSection title="Información General" icon={<ClipboardList size={15} />} columns={3}>

          {/* Código único */}
          <FormField label="Código único">
            <FormInput name="codigo_unico" value={formData.codigo_unico} onChange={handleChange} placeholder="ACT-XXXXXX" className="font-mono bg-slate-100" readOnly />
          </FormField>

          {/* Nombre del Activo */}
          <FormField label="Nombre del Activo">
            <FormInput name="item" value={formData.item} onChange={handleChange} placeholder="Ej. Laptop HP" />
          </FormField>

          {/* Descripción */}
          <FormField label="Descripción">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej. DVR 16 Canales" />
          </FormField>

          {/* Categoría */}
          <FormField label="Tipo / Categoría" required error={errors.category_id}>
            <FormSelect name="category_id" value={formData.category_id} onChange={handleChange} required>
              <option value="">Seleccionar categoría...</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </FormSelect>
          </FormField>

      </FormSection>

      {/* ══════════════════════════════════════
          SECCIÓN 2 – Detalles del Equipo
          ══════════════════════════════════════ */}
      <FormSection title="Detalles del Equipo" icon={<Tag size={15} />} columns={4}>

          <FormField label="Marca">
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: HIKVISION" />
          </FormField>

          <FormField label="Modelo">
            <FormInput name="model" value={formData.model} onChange={handleChange} placeholder="Ej: DS-7204HQHI-K1" />
          </FormField>

          <FormField label="Nº de serie">
            <FormInput name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="S/N" className="font-mono" />
          </FormField>

          <FormField label="Color">
            <FormInput name="color" value={formData.color} onChange={handleChange} placeholder="Ej: NEGRO" />
          </FormField>

      </FormSection>

      {/* ══════════════════════════════════════
          SECCIÓN 3 – Inventario
          ══════════════════════════════════════ */}
      <FormSection title="Inventario" icon={<Boxes size={15} />} columns={4}>

          <FormField label="Cantidad" required>
            <FormInput type="number" name="cantidad" value={formData.cantidad} onChange={handleChange} min="1" />
          </FormField>

          <FormField label="Condición" required>
            <FormSelect name="condicion" value={formData.condicion} onChange={handleChange}>
              <option value="Nuevo">Nuevo</option>
              <option value="Bueno">Bueno</option>
              <option value="Regular">Regular</option>
              <option value="Malo">Malo</option>
            </FormSelect>
          </FormField>

          <FormField label="Estado de uso" required>
            <FormSelect name="estado_uso" value={formData.estado_uso} onChange={handleChange}>
              <option value="Operativo">Operativo</option>
              <option value="Inoperativo">Inoperativo</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Baja">De Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Valor estimado (S/.)">
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" placeholder="Ej. 1200.00" />
          </FormField>

      </FormSection>

      {/* ══════════════════════════════════════
          SECCIÓN 4 – Información Administrativa
          ══════════════════════════════════════ */}
      <FormSection title="Información Administrativa" icon={<FileText size={15} />} columns={3}>

          <FormField label="Año de adquisición">
            <FormInput
              type="number"
              name="fecha_adquisicion"
              value={formData.fecha_adquisicion ? new Date(formData.fecha_adquisicion).getFullYear() : ''}
              onChange={(e) => {
                const year = e.target.value;
                handleChange({
                  target: {
                    name: 'fecha_adquisicion',
                    value: year ? `${year}-01-01` : ''
                  }
                } as any);
              }}
              placeholder="Ej: 2024"
              min="1990"
              max={new Date().getFullYear()}
            />
          </FormField>

          <FormField label="Ubicación del activo" error={errors.location_id}>
            <FormSelect name="location_id" value={formData.location_id} onChange={handleChange}>
              <option value="">Sin asignar</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </FormField>

      </FormSection>

      {/* ══════════════════════════════════════
          SECCIÓN 5 – Especificaciones Técnicas
          (visible solo para categorías técnicas)
          ══════════════════════════════════════ */}
      {(isTecnología || isSeguridad) && (
        <FormSection title="Especificaciones Técnicas" icon={<Cpu size={15} />}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <FormField label="AnyDesk / Acceso remoto">
              <FormInput name="anydesk_id" value={formData.anydesk_id} onChange={handleChange} placeholder="ID de acceso" />
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

                <FormField label="Sistema Operativo">
                  <FormSelect name="operating_system" value={formData.operating_system} onChange={handleChange}>
                    <option value="">Seleccionar...</option>
                    <option value="Windows 10">Windows 10</option>
                    <option value="Windows 11">Windows 11</option>
                    <option value="macOS">macOS</option>
                    <option value="Linux">Linux</option>
                  </FormSelect>
                </FormField>

                <FormField label="Almacenamiento / Capacidad">
                  <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 512 GB SSD" />
                </FormField>
              </>
            )}

          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════
          SECCIÓN 6 – Impresoras
          ══════════════════════════════════════ */}
      {isImpresora && (
        <FormSection title="Datos de Impresora" icon={<Printer size={15} />}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <FormField label="Tipo de impresión">
              <FormInput name="tipo_impresion" value={formData.tipo_impresion} onChange={handleChange} placeholder="Ej: Láser" />
            </FormField>

            <FormField label="Tecnología de impresión">
              <FormInput name="tecnologia_impresion" value={formData.tecnologia_impresion} onChange={handleChange} placeholder="Ej: Inkjet" />
            </FormField>

            <FormField label="Velocidad (ppm)">
              <FormInput name="velocidad_impresion" value={formData.velocidad_impresion} onChange={handleChange} placeholder="Ej: 30 ppm" />
            </FormField>

            <FormField label="Resolución">
              <FormInput name="resolucion" value={formData.resolucion} onChange={handleChange} placeholder="Ej: 1200 dpi" />
            </FormField>

          </div>
        </FormSection>
      )}

      {/* ══════════════════════════════════════
          SECCIÓN 7 – Equipos Móviles
          ══════════════════════════════════════ */}
      {isMóvil && (
        <FormSection title="Datos del Equipo Móvil" icon={<Package size={15} />}>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <FormField label="IMEI">
              <FormInput name="imei" value={formData.imei} onChange={handleChange} placeholder="15 dígitos" className="font-mono" />
            </FormField>

            <FormField label="Operador">
              <FormInput name="operator" value={formData.operator} onChange={handleChange} placeholder="Ej: Claro" />
            </FormField>

            <FormField label="Plan de datos">
              <FormInput name="data_plan" value={formData.data_plan} onChange={handleChange} placeholder="Ej: 10 GB" />
            </FormField>

            <FormField label="Almacenamiento">
              <FormInput name="almacenamiento" value={formData.almacenamiento} onChange={handleChange} placeholder="Ej: 128 GB" />
            </FormField>

            <FormField label="Estado de batería">
              <FormInput name="bateria_estado" value={formData.bateria_estado} onChange={handleChange} placeholder="Ej: 85%" />
            </FormField>

            <FormField label="Accesorios">
              <FormInput name="accesorios" value={formData.accesorios} onChange={handleChange} placeholder="Ej: Cargador, funda" />
            </FormField>

          </div>
        </FormSection>
      )}

    </BaseForm>
  );
}

