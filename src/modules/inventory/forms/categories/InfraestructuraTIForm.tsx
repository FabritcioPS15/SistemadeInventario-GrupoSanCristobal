import { Server } from 'lucide-react';
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
  { value: 'VMware ESXi', label: 'VMware ESXi' },
  { value: 'Otro', label: 'Otro' },
];

const CONNECTOR_OPTIONS = [
  { value: 'UTP Cat5e', label: 'UTP Cat5e' },
  { value: 'UTP Cat6', label: 'UTP Cat6' },
  { value: 'UTP Cat6a', label: 'UTP Cat6a' },
  { value: 'Fibra óptica', label: 'Fibra óptica' },
  { value: 'COAXIAL', label: 'Coaxial' },
  { value: 'Otro', label: 'Otro' },
];

const WIFI_OPTIONS = [
  { value: 'Wi-Fi 5 (802.11ac)', label: 'Wi-Fi 5 (802.11ac)' },
  { value: 'Wi-Fi 6 (802.11ax)', label: 'Wi-Fi 6 (802.11ax)' },
  { value: 'Wi-Fi 6E', label: 'Wi-Fi 6E' },
  { value: 'Wi-Fi 7 (802.11be)', label: 'Wi-Fi 7 (802.11be)' },
];

export default function InfraestructuraTIForm({ form, editAsset, onClose }: Props) {
  const { formData, handleChange, filteredSubcategories, categories, locations, loading, errors, handleSubmit, setField } = form;
  const subSlug = form.subcategories.find(s => s.id === formData.subcategory_id)?.slug || '';
  const currentSlug = categories.find(c => c.id === formData.category_id) as any;

  const steps = [
    { title: 'Identificación', description: 'Código, tipo y marca' },
    { title: 'Especificaciones', description: 'CPU, RAM, almacenamiento' },
    { title: 'Configuración de Red', description: 'IP, MAC, puertos' },
    { title: 'Estado y Ubicación', description: 'Condición, sede, valor' },
  ];

  return (
    <MultiStepForm
      title={editAsset ? 'Editar Infraestructura TI' : 'Nueva Infraestructura TI'}
      subtitle={editAsset ? 'Actualiza la información del equipo.' : 'Registra un nuevo equipo de infraestructura de TI.'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Server size={18} className="text-white" />}
      steps={steps}
    >
      {/* Step 1: Identificación */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Información del Equipo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Código único">
            <FormInput name="codigo_unico" value={formData.codigo_unico} onChange={handleChange} placeholder="ACT-XXXXXX" className="font-mono bg-slate-100" readOnly />
          </FormField>
          <FormField label="Nombre del Equipo" required>
            <FormInput name="item" value={formData.item} onChange={handleChange} placeholder="Ej. Servidor Dell PowerEdge" required />
          </FormField>
          <FormField label="Descripción">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej. Servidor de bases de datos" />
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
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: Dell, HP, Lenovo" />
          </FormField>
          <FormField label="Modelo">
            <FormInput name="model" value={formData.model} onChange={handleChange} placeholder="Ej: PowerEdge R750" />
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

      {/* Step 2: Especificaciones */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Especificaciones Técnicas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subSlug === 'servidores' && (
            <>
              <FormField label="Procesador">
                <FormInput name="processor" value={formData.processor} onChange={handleChange} placeholder="Ej: Xeon E5-2680 v4" />
              </FormField>
              <FormField label="Memoria RAM">
                <FormInput name="ram" value={formData.ram} onChange={handleChange} placeholder="Ej: 64GB ECC DDR4" />
              </FormField>
            </>
          )}
          <FormField label="Almacenamiento / Capacidad">
            <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 4x 2TB RAID 10, 32 TB" />
          </FormField>
          {subSlug === 'servidores' && (
            <FormField label="Sistema Operativo">
              <FormSelect name="operating_system" value={formData.operating_system} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {OS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </FormSelect>
            </FormField>
          )}
          {(subSlug === 'switches-red' || subSlug === 'racks-red' || subSlug === 'patch-panels-cableado') && (
            <FormField label="Número de puertos">
              <FormInput name="port" value={formData.port} onChange={handleChange} placeholder="Ej: 24 / 48" />
            </FormField>
          )}
          {subSlug === 'ups-estabilizadores' && (
            <>
              <FormField label="Potencia (VA/W)">
                <FormInput name="potencia_w" value={formData.potencia_w} onChange={handleChange} placeholder="Ej: 3000 VA" />
              </FormField>
              <FormField label="Voltage de entrada">
                <FormInput name="voltage_v" value={formData.voltage_v} onChange={handleChange} placeholder="Ej: 220V" />
              </FormField>
              <FormField label="Autonomía">
                <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 15 min a carga completa" />
              </FormField>
            </>
          )}
          {subSlug === 'torres-telecomunicaciones' && (
            <>
              <FormField label="Altura">
                <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 30 metros" />
              </FormField>
              <FormField label="Tipo de estructura">
                <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej: Torre auto-soportada, monopolo" />
              </FormField>
            </>
          )}
        </div>
      </div>

      {/* Step 3: Configuración de Red */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Configuración de Red</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Dirección IP">
            <FormInput name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="192.168.1.X" />
          </FormField>
          <FormField label="MAC Address">
            <FormInput name="mac_address" value={formData.mac_address} onChange={handleChange} placeholder="AA:BB:CC:DD:EE:FF" className="font-mono" />
          </FormField>
          {(subSlug === 'switches-red' || subSlug === 'servidores') && (
            <>
              <FormField label="Velocidad por puerto">
                <FormInput name="velocidad_internet" value={formData.velocidad_internet} onChange={handleChange} placeholder="Ej: 1 Gbps / 10 Gbps" />
              </FormField>
              <FormField label="Tipo de conector">
                <FormSelect name="tipo_conector" value={formData.tipo_conector} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {CONNECTOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
            </>
          )}
          {subSlug === 'puntos-acceso-wifi' && (
            <FormField label="Estándar Wi-Fi">
              <FormSelect name="velocidad_internet" value={formData.velocidad_internet} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {WIFI_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </FormSelect>
            </FormField>
          )}
          {subSlug === 'patch-panels-cableado' && (
            <FormField label="Tipo de cable">
              <FormSelect name="tipo_conector" value={formData.tipo_conector} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                {CONNECTOR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </FormSelect>
            </FormField>
          )}
        </div>
      </div>

      {/* Step 4: Estado y Ubicación */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Estado y Ubicación</h3>
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
          <FormField label="Valor estimado (S/.)">
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" placeholder="Ej. 15000.00" />
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
          <FormField label="Ubicación del activo">
            <FormSelect name="location_id" value={formData.location_id} onChange={handleChange}>
              <option value="">Sin asignar</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </FormSelect>
          </FormField>
        </div>
      </div>
    </MultiStepForm>
  );
}
