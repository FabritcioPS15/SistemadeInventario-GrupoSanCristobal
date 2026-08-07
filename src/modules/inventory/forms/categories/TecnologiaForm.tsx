import { Monitor } from 'lucide-react';
import MultiStepForm from '../../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect } from '../../../../shared/components/forms/BaseForm';
import CategoryRecommendation from '../../components/CategoryRecommendation';
import { UseAssetFormReturn } from '../../hooks/useAssetForm';

type Props = {
  form: UseAssetFormReturn;
  editAsset?: any;
  onClose: () => void;
};

const OS_OPTIONS = [
  { value: 'Windows 10', label: 'Windows 10' },
  { value: 'Windows 11', label: 'Windows 11' },
  { value: 'Windows Server 2019', label: 'Windows Server 2019' },
  { value: 'Windows Server 2022', label: 'Windows Server 2022' },
  { value: 'macOS', label: 'macOS' },
  { value: 'Linux', label: 'Linux' },
  { value: 'Android', label: 'Android' },
  { value: 'iOS', label: 'iOS' },
  { value: 'Otro', label: 'Otro' },
];

const PRINTER_TECH_OPTIONS = [
  { value: 'Láser', label: 'Láser' },
  { value: 'Inkjet', label: 'Inkjet' },
  { value: 'Matricial', label: 'Matricial' },
  { value: 'Sublimación', label: 'Sublimación' },
  { value: 'Térmica', label: 'Térmica' },
  { value: 'Otra', label: 'Otra' },
];

const CONNECTION_OPTIONS = [
  { value: 'USB', label: 'USB' },
  { value: 'Bluetooth', label: 'Bluetooth' },
  { value: 'Inalámbrico', label: 'Inalámbrico (dongle)' },
  { value: 'PS/2', label: 'PS/2' },
  { value: 'WiFi', label: 'WiFi' },
  { value: 'Ethernet', label: 'Ethernet' },
];

const CONNECTOR_OPTIONS = [
  { value: 'UTP Cat5e', label: 'UTP Cat5e' },
  { value: 'UTP Cat6', label: 'UTP Cat6' },
  { value: 'UTP Cat6a', label: 'UTP Cat6a' },
  { value: 'Fibra óptica', label: 'Fibra óptica' },
  { value: 'COAXIAL', label: 'Coaxial' },
  { value: 'Otro', label: 'Otro' },
];

export default function TecnologiaForm({ form, editAsset, onClose }: Props) {
  const { formData, handleChange, filteredSubcategories, categories, locations, loading, errors, handleSubmit, setField } = form;
  const subSlug = form.subcategories.find(s => s.id === formData.subcategory_id)?.slug || '';
  const currentSlug = categories.find(c => c.id === formData.category_id) as any;

  const steps = [
    { title: 'Identificación', description: 'Código, nombre y subcategoría' },
    { title: 'Especificaciones', description: 'Procesador, memoria, storage' },
    { title: 'Estado y Valor', description: 'Condición, cantidad, valor' },
    { title: 'Ubicación', description: 'Sede y área' },
  ];

  if (['cpu', 'laptop', 'servidor', 'router', 'switch'].includes(subSlug)) {
    steps.push({ title: 'Acceso Remoto', description: 'IP, URL, credenciales' });
  }

  return (
    <MultiStepForm
      title={editAsset ? 'Editar Activo de Tecnología' : 'Nuevo Activo de Tecnología'}
      subtitle={editAsset ? 'Actualiza la información del equipo.' : 'Registra un nuevo equipo de tecnología.'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Monitor size={18} className="text-white" />}
      steps={steps}
    >
      {/* Step 1: Identificación */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Información General</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Código único">
            <FormInput name="codigo_unico" value={formData.codigo_unico} onChange={handleChange} placeholder="ACT-XXXXXX" className="font-mono bg-slate-100" readOnly />
          </FormField>
          <FormField label="Nombre del Equipo" required>
            <FormInput name="item" value={formData.item} onChange={handleChange} placeholder="Ej. Laptop HP ProBook" required />
          </FormField>
          <FormField label="Descripción">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej. Laptop para contabilidad" />
          </FormField>
        </div>

        <div className="border border-slate-200 bg-slate-50/50 p-3 rounded-md space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 shrink-0" />
            <h4 className="text-[10px] font-normal text-[#002855] uppercase tracking-wider">Clasificación del Activo</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Tipo / Categoría" required error={errors.category_id}>
              <FormSelect name="category_id" value={formData.category_id} onChange={handleChange} required>
                <option value="">Seleccionar categoría...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </FormSelect>
            </FormField>
            {filteredSubcategories.length > 0 && (
              <FormField label="Subcategoría" required>
                <FormSelect name="subcategory_id" value={formData.subcategory_id} onChange={handleChange} required>
                  <option value="">Seleccionar subcategoría...</option>
                  {filteredSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </FormSelect>
              </FormField>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Marca">
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: HP, Dell, Lenovo" />
          </FormField>
          <FormField label="Modelo">
            <FormInput name="model" value={formData.model} onChange={handleChange} placeholder="Ej: ProBook 450 G9" />
          </FormField>
          <FormField label="Nº de serie">
            <FormInput name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="S/N" className="font-mono" />
          </FormField>
        </div>
        <CategoryRecommendation
          itemName={formData.item}
          currentCategorySlug={currentSlug?.slug || ''}
          categories={categories}
          onApplyCategory={(slug) => {
            const cat = categories.find(c => (c as any).slug === slug);
            if (cat) setField('category_id', cat.id);
          }}
        />
      </div>

      {/* Step 2: Especificaciones Técnicas */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Especificaciones Técnicas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(subSlug === 'cpu' || subSlug === 'laptop' || subSlug === 'servidor') && (
            <>
              <FormField label="Procesador">
                <FormInput name="processor" value={formData.processor} onChange={handleChange} placeholder="Ej: Intel i7 12th Gen" />
              </FormField>
              <FormField label="Memoria RAM">
                <FormInput name="ram" value={formData.ram} onChange={handleChange} placeholder="Ej: 16GB DDR5" />
              </FormField>
              <FormField label="Almacenamiento">
                <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 512 GB SSD" />
              </FormField>
              <FormField label="Sistema Operativo">
                <FormSelect name="operating_system" value={formData.operating_system} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {OS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="MAC Address">
                <FormInput name="mac_address" value={formData.mac_address} onChange={handleChange} placeholder="AA:BB:CC:DD:EE:FF" className="font-mono" />
              </FormField>
            </>
          )}
          {subSlug === 'monitor' && (
            <>
              <FormField label="Tamaño de pantalla">
                <FormInput name="tamaño_pantalla" value={formData.tamaño_pantalla} onChange={handleChange} placeholder="Ej: 24 pulgadas" />
              </FormField>
              <FormField label="Resolución">
                <FormInput name="resolucion_pantalla" value={formData.resolucion_pantalla} onChange={handleChange} placeholder="Ej: 1920x1080" />
              </FormField>
              <FormField label="Tipo de conexión">
                <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  <option value="HDMI">HDMI</option>
                  <option value="DisplayPort">DisplayPort</option>
                  <option value="VGA">VGA</option>
                  <option value="DVI">DVI</option>
                  <option value="USB-C">USB-C</option>
                </FormSelect>
              </FormField>
            </>
          )}
          {subSlug === 'impresora' && (
            <>
              <FormField label="Tipo de impresión">
                <FormInput name="tipo_impresion" value={formData.tipo_impresion} onChange={handleChange} placeholder="Ej: Monocromática, Color" />
              </FormField>
              <FormField label="Tecnología">
                <FormSelect name="tecnologia_impresion" value={formData.tecnologia_impresion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {PRINTER_TECH_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="Velocidad (ppm)">
                <FormInput name="velocidad_impresion" value={formData.velocidad_impresion} onChange={handleChange} placeholder="Ej: 30 ppm" />
              </FormField>
              <FormField label="Resolución">
                <FormInput name="resolucion" value={formData.resolucion} onChange={handleChange} placeholder="Ej: 1200 dpi" />
              </FormField>
            </>
          )}
          {subSlug === 'celular' && (
            <>
              <FormField label="IMEI">
                <FormInput name="imei" value={formData.imei} onChange={handleChange} placeholder="15 dígitos" className="font-mono" />
              </FormField>
              <FormField label="Operador">
                <FormInput name="operator" value={formData.operator} onChange={handleChange} placeholder="Ej: Claro, Movistar" />
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
              <FormField label="SO del dispositivo">
                <FormInput name="sistema_operativo" value={formData.sistema_operativo} onChange={handleChange} placeholder="Ej: Android 14" />
              </FormField>
              <FormField label="Accesorios">
                <FormInput name="accesorios" value={formData.accesorios} onChange={handleChange} placeholder="Ej: Cargador, funda" />
              </FormField>
            </>
          )}
          {subSlug === 'proyector' && (
            <>
              <FormField label="Lúmenes">
                <FormInput name="luminosidad" value={formData.luminosidad} onChange={handleChange} placeholder="Ej: 3500 lúmenes" />
              </FormField>
              <FormField label="Resolución">
                <FormInput name="resolucion_pantalla" value={formData.resolucion_pantalla} onChange={handleChange} placeholder="Ej: 1920x1080" />
              </FormField>
              <FormField label="Conexión">
                <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  <option value="HDMI">HDMI</option>
                  <option value="VGA">VGA</option>
                  <option value="USB-C">USB-C</option>
                  <option value="WiFi">WiFi</option>
                </FormSelect>
              </FormField>
            </>
          )}
          {subSlug === 'tv' && (
            <>
              <FormField label="Tamaño de pantalla">
                <FormInput name="tamaño_pantalla" value={formData.tamaño_pantalla} onChange={handleChange} placeholder="Ej: 55 pulgadas" />
              </FormField>
              <FormField label="Resolución">
                <FormSelect name="resolucion_pantalla" value={formData.resolucion_pantalla} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  <option value="HD">HD (720p)</option>
                  <option value="Full HD">Full HD (1080p)</option>
                  <option value="4K">4K UHD</option>
                  <option value="8K">8K</option>
                </FormSelect>
              </FormField>
              <FormField label="Conexión principal">
                <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  <option value="HDMI">HDMI</option>
                  <option value="WiFi">WiFi</option>
                  <option value="Ethernet">Ethernet</option>
                </FormSelect>
              </FormField>
            </>
          )}
          {subSlug === 'teclado' && (
            <FormField label="Conexión">
              <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {CONNECTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </FormSelect>
            </FormField>
          )}
          {subSlug === 'mouse' && (
            <FormField label="Conexión">
              <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="USB">USB</option>
                <option value="Bluetooth">Bluetooth</option>
                <option value="Inalámbrico">Inalámbrico (dongle)</option>
              </FormSelect>
            </FormField>
          )}
          {subSlug === 'telefono' && (
            <>
              <FormField label="Número telefónico">
                <FormInput name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="Ej: 01 123 4567" />
              </FormField>
              <FormField label="IP (si es VoIP)">
                <FormInput name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="192.168.1.X" />
              </FormField>
            </>
          )}
          {subSlug === 'escaner' && (
            <>
              <FormField label="Tipo de escaneo">
                <FormInput name="tipo_impresion" value={formData.tipo_impresion} onChange={handleChange} placeholder="Ej: Plano, Alimentador" />
              </FormField>
              <FormField label="Velocidad (ppm)">
                <FormInput name="velocidad_impresion" value={formData.velocidad_impresion} onChange={handleChange} placeholder="Ej: 40 ppm" />
              </FormField>
              <FormField label="Resolución óptica">
                <FormInput name="resolucion" value={formData.resolucion} onChange={handleChange} placeholder="Ej: 1200 dpi" />
              </FormField>
            </>
          )}
          {subSlug === 'tablet' && (
            <>
              <FormField label="IMEI (si aplica)">
                <FormInput name="imei" value={formData.imei} onChange={handleChange} placeholder="15 dígitos" className="font-mono" />
              </FormField>
              <FormField label="Almacenamiento">
                <FormInput name="almacenamiento" value={formData.almacenamiento} onChange={handleChange} placeholder="Ej: 64 GB" />
              </FormField>
              <FormField label="Estado de batería">
                <FormInput name="bateria_estado" value={formData.bateria_estado} onChange={handleChange} placeholder="Ej: 90%" />
              </FormField>
              <FormField label="SO del dispositivo">
                <FormInput name="sistema_operativo" value={formData.sistema_operativo} onChange={handleChange} placeholder="Ej: iPadOS 17" />
              </FormField>
              <FormField label="Accesorios">
                <FormInput name="accesorios" value={formData.accesorios} onChange={handleChange} placeholder="Ej: Teclado, stylus" />
              </FormField>
            </>
          )}
          {!['cpu', 'laptop', 'servidor', 'monitor', 'impresora', 'celular', 'proyector', 'tv', 'teclado', 'mouse', 'telefono', 'escaner', 'tablet'].includes(subSlug) && (
            <>
              <FormField label="Capacidad">
                <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 1TB" />
              </FormField>
              <FormField label="Color">
                <FormInput name="color" value={formData.color} onChange={handleChange} placeholder="Ej: Negro" />
              </FormField>
            </>
          )}
        </div>
      </div>

      {/* Step 3: Estado y Valor */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Estado y Valor</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <FormField label="Cantidad" required>
            <FormInput type="number" name="cantidad" value={formData.cantidad} onChange={handleChange} min="1" />
          </FormField>
          <FormField label="Valor estimado (S/.)">
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" placeholder="Ej. 2500.00" />
          </FormField>
          <FormField label="Año de adquisición">
            <FormInput
              type="number"
              name="fecha_adquisicion"
              value={formData.fecha_adquisicion ? new Date(formData.fecha_adquisicion).getFullYear() : ''}
              onChange={(e) => {
                const year = e.target.value;
                handleChange({ target: { name: 'fecha_adquisicion', value: year ? `${year}-01-01` : '' } } as any);
              }}
              placeholder="Ej: 2024"
              min="1990"
              max={new Date().getFullYear()}
            />
          </FormField>
        </div>
      </div>

      {/* Step 4: Ubicación */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Ubicación</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Ubicación del activo">
            <FormSelect name="location_id" value={formData.location_id} onChange={handleChange}>
              <option value="">Sin asignar</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </FormField>
        </div>
      </div>

      {/* Step 5: Acceso Remoto (conditional) */}
      {['cpu', 'laptop', 'servidor', 'router', 'switch'].includes(subSlug) && (
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 shrink-0" />
            <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Acceso Remoto y Red</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Dirección IP">
              <FormInput name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="192.168.1.X" />
            </FormField>
            <FormField label="AnyDesk ID">
              <FormInput name="anydesk_id" value={formData.anydesk_id} onChange={handleChange} placeholder="ID de acceso remoto" />
            </FormField>
            <FormField label="URL de acceso">
              <FormInput name="url" value={formData.url} onChange={handleChange} placeholder="Ej: http://192.168.1.100" />
            </FormField>
            <FormField label="Puerto">
              <FormInput name="port" value={formData.port} onChange={handleChange} placeholder="Ej: 8080" />
            </FormField>
            {(subSlug === 'router' || subSlug === 'switch') && (
              <>
                <FormField label="Velocidad">
                  <FormInput name="velocidad_internet" value={formData.velocidad_internet} onChange={handleChange} placeholder="Ej: 1000 Mbps" />
                </FormField>
                <FormField label="Tipo de conector">
                  <FormSelect name="tipo_conector" value={formData.tipo_conector} onChange={handleChange}>
                    <option value="">Seleccionar...</option>
                    {CONNECTOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </FormSelect>
                </FormField>
              </>
            )}
          </div>
        </div>
      )}
    </MultiStepForm>
  );
}
