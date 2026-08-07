import { Shield } from 'lucide-react';
import MultiStepForm from '../../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect } from '../../../../shared/components/forms/BaseForm';
import CategoryRecommendation from '../../components/CategoryRecommendation';
import { UseAssetFormReturn } from '../../hooks/useAssetForm';

type Props = {
  form: UseAssetFormReturn;
  editAsset?: any;
  onClose: () => void;
};

const RESOLUTION_OPTIONS = [
  { value: '720p', label: '720p HD' },
  { value: '1080p', label: '1080p Full HD' },
  { value: '1440p', label: '1440p QHD' },
  { value: '2160p', label: '2160p 4K' },
];

const CHANNEL_OPTIONS = [
  { value: '4', label: '4 Canales' },
  { value: '8', label: '8 Canales' },
  { value: '16', label: '16 Canales' },
  { value: '32', label: '32 Canales' },
  { value: '64', label: '64 Canales' },
  { value: '128', label: '128 Canales' },
];

const ACCESS_TYPE_OPTIONS = [
  { value: 'url', label: 'URL directa' },
  { value: 'ivms', label: 'iVMS' },
  { value: 'esviz', label: 'Esviz' },
];

const READER_TYPE_OPTIONS = [
  { value: 'Huella', label: 'Huella dactilar' },
  { value: 'Facial', label: 'Reconocimiento facial' },
  { value: 'Iris', label: 'Iris' },
  { value: 'Tarjeta', label: 'Tarjeta RFID' },
  { value: 'Mixto', label: 'Mixto' },
];

const POWER_OPTIONS = [
  { value: 'PoE', label: 'PoE (Power over Ethernet)' },
  { value: 'DC', label: 'Adaptador DC' },
  { value: 'Batería', label: 'Batería / Solar' },
];

export default function SeguridadControlForm({ form, editAsset, onClose }: Props) {
  const { formData, handleChange, filteredSubcategories, categories, locations, loading, errors, handleSubmit, setField } = form;
  const subSlug = form.subcategories.find(s => s.id === formData.subcategory_id)?.slug || '';
  const currentSlug = categories.find(c => c.id === formData.category_id) as any;

  const steps = [
    { title: 'Identificación', description: 'Código, tipo y categoría' },
    { title: 'Especificaciones', description: 'Canales, resolución, marca' },
    { title: 'Conectividad', description: 'IP, acceso, credenciales' },
    { title: 'Estado y Ubicación', description: 'Condición, sede, valor' },
  ];

  return (
    <MultiStepForm
      title={editAsset ? 'Editar Equipo de Seguridad' : 'Nuevo Equipo de Seguridad'}
      subtitle={editAsset ? 'Actualiza la información del equipo.' : 'Registra un nuevo equipo de seguridad y control.'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Shield size={18} className="text-white" />}
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
            <FormInput name="item" value={formData.item} onChange={handleChange} placeholder="Ej. DVR 16 Canales" required />
          </FormField>
          <FormField label="Descripción">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej. DVR HIKVISION para sede central" />
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
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Especificaciones del Equipo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Marca">
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: HIKVISION, DAHUA" />
          </FormField>
          <FormField label="Modelo">
            <FormInput name="model" value={formData.model} onChange={handleChange} placeholder="Ej: DS-7216HQHI-K1" />
          </FormField>
          <FormField label="Nº de serie">
            <FormInput name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="S/N" className="font-mono" />
          </FormField>
          {(subSlug === 'dvr' || subSlug === 'nvr') && (
            <>
              <FormField label="Canales">
                <FormSelect name="capacity" value={formData.capacity} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {CHANNEL_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="Resolución máxima">
                <FormSelect name="resolucion" value={formData.resolucion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {RESOLUTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="Almacenamiento total">
                <FormInput name="almacenamiento" value={formData.almacenamiento} onChange={handleChange} placeholder="Ej: 4 TB" />
              </FormField>
            </>
          )}
          {subSlug === 'camaras' && (
            <>
              <FormField label="Resolución">
                <FormSelect name="resolucion" value={formData.resolucion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {RESOLUTION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="Alimentación">
                <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {POWER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
              <FormField label="Velocidad de stream">
                <FormInput name="velocidad_internet" value={formData.velocidad_internet} onChange={handleChange} placeholder="Ej: 8 Mbps" />
              </FormField>
            </>
          )}
          {subSlug === 'biometricos' && (
            <>
              <FormField label="Capacidad de usuarios">
                <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 3000 usuarios" />
              </FormField>
              <FormField label="Tipo de lector">
                <FormSelect name="tipo_conexion" value={formData.tipo_conexion} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {READER_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </FormSelect>
              </FormField>
            </>
          )}
          {subSlug === 'lectores-huella' && (
            <FormField label="Capacidad de huellas">
              <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 5000 huellas" />
            </FormField>
          )}
        </div>
      </div>

      {/* Step 3: Conectividad */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Conectividad y Acceso</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Dirección IP">
            <FormInput name="ip_address" value={formData.ip_address} onChange={handleChange} placeholder="192.168.1.X" />
          </FormField>
          <FormField label="Puerto">
            <FormInput name="port" value={formData.port} onChange={handleChange} placeholder="Ej: 80, 37777" />
          </FormField>
          <FormField label="URL de acceso">
            <FormInput name="url" value={formData.url} onChange={handleChange} placeholder="Ej: http://192.168.1.50" />
          </FormField>
          <FormField label="Tipo de acceso">
            <FormSelect name="access_type" value={formData.access_type} onChange={handleChange}>
              {ACCESS_TYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Usuario">
            <FormInput name="username" value={formData.username} onChange={handleChange} placeholder="Usuario de acceso" />
          </FormField>
          <FormField label="Contraseña">
            <FormInput name="password" value={formData.password} onChange={handleChange} placeholder="Contraseña de acceso" type="password" />
          </FormField>
          <FormField label="Código de autenticación">
            <FormInput name="auth_code" value={formData.auth_code} onChange={handleChange} placeholder="Ej: 1234" />
          </FormField>
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
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" placeholder="Ej. 3500.00" />
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
