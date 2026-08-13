import { Package, Monitor, Shield, Wrench, Home, Briefcase, ClipboardCheck, Stethoscope, Paperclip, Server, Box, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import MultiStepForm from '../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect, FormTextarea, FormSection, FormGrid } from '../../../shared/components/forms/BaseForm';
import DateTimePicker from '../../../shared/components/forms/DateTimePicker';
import { useDynamicAssetForm, UseDynamicAssetFormProps } from '../hooks/useDynamicAssetForm';
import { CATEGORIAS_CONFIG, CampoConfig } from '../config/inventarioConfig';

type DynamicAssetFormProps = UseDynamicAssetFormProps & {
  onClose: () => void;
};

const CATEGORY_ICONS: Record<string, any> = {
  'tecnologia': Monitor,
  'seguridad-control': Shield,
  'herramientas-equipos': Wrench,
  'instalaciones': Home,
  'mobiliario': Briefcase,
  'equipos-revision': ClipboardCheck,
  'equipos-operativos': Stethoscope,
  'utiles-suministros': Paperclip,
  'infraestructura-ti': Server,
  'otros-activos': Box,
};

const AREAS_POR_TIPO: Record<string, string[]> = {
  'revision': ['Línea 1', 'Línea 2', 'Counter', 'Recepción', 'Oficina Administrativa', 'Almacén'],
  'policlinico': ['Consultorio', 'Recepción', 'Oficina Administrativa'],
  'escuela_conductores': ['Aula', 'Oficina Administrativa'],
  'central': ['Oficina', 'Counter / Recepción', 'Contabilidad', 'RRHH', 'Sala de Reuniones', 'Almacén'],
  'circuito': ['Circuito', 'Módulo de Control', 'Oficina', 'Cámaras', 'DVR'],
};

export default function DynamicAssetForm({ onClose, onSaved, editAsset, initialCategoryId }: DynamicAssetFormProps) {
  const form = useDynamicAssetForm({ editAsset, initialCategoryId, onSaved });
  const [tipoActivoSearch, setTipoActivoSearch] = useState('');
  const [tieneGarantia, setTieneGarantia] = useState(!!(editAsset && form.formData.garantia_hasta));
  const [areaEsOtro, setAreaEsOtro] = useState(false);

  const selectedLocation = form.locations.find(loc => loc.id === form.formData.location_id);
  const areaOptions = (selectedLocation && AREAS_POR_TIPO[selectedLocation.type]) || [];
  const areaValue = form.formData.area_ubicacion;
  const areaEsCustom = !!areaValue && areaValue !== '__otro__' && !areaOptions.includes(areaValue);

  const currentCategoryObj = form.categories.find(cat => cat.id === form.formData.category_id) as any;
  const currentCategory = CATEGORIAS_CONFIG.find(c => c.key === currentCategoryObj?.slug);
  const tiposActivo = currentCategory?.tiposActivo || [];

  const filteredTiposActivo = useMemo(() => {
    if (!tipoActivoSearch) return tiposActivo;
    return tiposActivo.filter(t => t.toLowerCase().includes(tipoActivoSearch.toLowerCase()));
  }, [tiposActivo, tipoActivoSearch]);

  const camposCategoria = currentCategory?.camposCategoria || [];
  const tipoActivoValue = form.formData.tipo_activo === 'Otro' ? form.formData.tipo_activo_custom : form.formData.tipo_activo;
  const camposPorTipo = currentCategory?.camposPorTipo[form.formData.tipo_activo] || [];

  const renderField = (config: CampoConfig) => {
    if (config.type === 'boolean') {
      return (
        <FormField key={config.key} label={config.label} required={config.required} gridCols={config.colSpan}>
          <div className="flex items-center h-10 px-3 bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id={config.key}
              name={config.key}
              checked={form.camposEspecificos[config.key] === true}
              onChange={(e) => form.handleCamposEspecificosCheckedChange(config.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={config.key} className="ml-2 text-[11px] font-normal text-[#002855] tracking-wide cursor-pointer">
              {config.label}
            </label>
          </div>
        </FormField>
      );
    }

    if (config.type === 'select') {
      return (
        <FormField key={config.key} label={config.label} required={config.required} gridCols={config.colSpan}>
          <FormSelect
            name={config.key}
            value={form.camposEspecificos[config.key] || ''}
            onChange={form.handleCamposEspecificosChange}
            required={config.required}
          >
            <option value="">Seleccionar...</option>
            {config.opciones?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </FormSelect>
        </FormField>
      );
    }

    if (config.type === 'textarea') {
      return (
        <FormField key={config.key} label={config.label} required={config.required} gridCols={config.colSpan || 2}>
          <FormTextarea
            name={config.key}
            value={form.camposEspecificos[config.key] || ''}
            onChange={form.handleCamposEspecificosChange}
            placeholder={config.placeholder}
            required={config.required}
            rows={3}
          />
        </FormField>
      );
    }

    // Default: text, number, date
    return (
      <FormField key={config.key} label={config.label} required={config.required} gridCols={config.colSpan}>
        <FormInput
          type={config.type}
          name={config.key}
          value={form.camposEspecificos[config.key] || ''}
          onChange={form.handleCamposEspecificosChange}
          placeholder={config.placeholder}
          required={config.required}
          step={config.type === 'number' ? 'any' : undefined}
        />
      </FormField>
    );
  };

  const steps = [
    { title: 'Categoría', description: 'Clasificación del activo' },
    { title: 'Ubicación', description: 'Identificación y Sede' },
    { title: 'Estado', description: 'Detalles físicos y adquisición' },
    { title: 'Específicos', description: 'Campos por tipo de activo' },
  ];

  return (
    <MultiStepForm
      title={editAsset ? 'Editar Activo' : 'Nuevo Activo'}
      subtitle={editAsset ? 'Modificar datos del activo seleccionado' : 'Registrar nuevo activo con formulario dinámico'}
      onClose={onClose}
      onSubmit={form.handleSubmit}
      loading={form.loading}
      error={form.errors.submit}
      icon={<Package size={18} className="text-white" />}
      steps={steps}
      maxWidth="max-w-full sm:max-w-4xl"
    >
      {/* Paso 1: Categoría */}
      <div className="space-y-8 min-h-[350px]">

        <div>
          <h3 className="text-[13px] font-normal text-[#002855] tracking-widest uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            1. Seleccione la Categoría
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {form.categories.map(cat => {
              const slug = (cat as any).slug;
              const Icon = CATEGORY_ICONS[slug] || Package;
              const isSelected = form.formData.category_id === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    form.setField('category_id', cat.id as string);
                    form.setField('tipo_activo', ''); // Reset tipo_activo al cambiar categoría
                    setTipoActivoSearch('');
                  }}
                  className={`flex flex-col items-center justify-center p-4 border transition-all duration-200 text-left ${isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-[0_0_0_1px_rgba(37,99,235,1)] rounded-xl'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/50 rounded-xl'
                    }`}
                >
                  <Icon
                    size={28}
                    strokeWidth={1.5}
                    className={`mb-3 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                  <span className={`text-[11px] font-normal uppercase tracking-wider text-center line-clamp-2 leading-snug ${isSelected ? 'text-[#002855]' : 'text-slate-500'
                    }`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {currentCategory && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-[13px] font-normal text-[#002855] tracking-widest uppercase mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                2. Seleccione el Tipo de Activo
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={tipoActivoSearch}
                  onChange={(e) => setTipoActivoSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-[11px] font-normal border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-white w-48"
                />
              </div>
            </h3>

            <div className="bg-slate-50/50 border border-slate-200 p-4 rounded-xl">
              <div className="flex flex-wrap gap-2">
                {filteredTiposActivo.map(tipo => {
                  const isSelected = form.formData.tipo_activo === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        form.setField('tipo_activo', tipo);
                        form.setField('tipo_activo_custom', '');
                      }}
                      className={`px-3 py-1.5 text-[11px] font-normal uppercase tracking-wider rounded-lg transition-all duration-200 border ${isSelected
                          ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                    >
                      {tipo}
                    </button>
                  );
                })}
                {(!tipoActivoSearch || 'otro'.includes(tipoActivoSearch.toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => form.setField('tipo_activo', 'Otro')}
                    className={`px-3 py-1.5 text-[11px] font-normal uppercase tracking-wider rounded-lg transition-all duration-200 border ${form.formData.tipo_activo === 'Otro'
                        ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                  >
                    Otro...
                  </button>
                )}
              </div>

              {filteredTiposActivo.length === 0 && tipoActivoSearch && (
                <div className="text-center py-4 text-[12px] font-normal text-slate-400">
                  No se encontraron resultados para "{tipoActivoSearch}".
                </div>
              )}
            </div>

            {form.formData.tipo_activo === 'Otro' && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <FormSection title="ESPECIFICAR TIPO DE ACTIVO" color="amber" columns={1}>
                  <FormField label="Tipo de Activo (Personalizado)">
                    <FormInput
                      name="tipo_activo_custom"
                      value={form.formData.tipo_activo_custom || ''}
                      onChange={form.handleChange}
                      placeholder="Escriba el tipo de activo..."
                      required
                    />
                  </FormField>
                </FormSection>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Paso 2: Ubicación e Identificación */}
      <div className="space-y-6">
        <FormSection title="IDENTIFICACIÓN" color="blue" columns={2}>
          <FormField label="Código Único">
            <FormInput name="codigo_unico" value={form.formData.codigo_unico} onChange={form.handleChange} disabled className="bg-slate-100 text-slate-500 font-mono cursor-not-allowed" />
          </FormField>
          <FormField label="Nombre del Activo" required>
            <FormInput name="item" value={form.formData.item} onChange={form.handleChange} placeholder="Ej. Laptop Dell Latitude" required />
          </FormField>
        </FormSection>

        <FormSection title="UBICACIÓN Y ASIGNACIÓN" color="emerald" columns={1}>
          <FormField label="Sede" required>
            <FormSelect
              name="location_id"
              value={form.formData.location_id}
              onChange={(e) => form.setField('location_id', e.target.value as string)}
            >
              <option value="">Seleccionar Sede...</option>
              {form.locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="Área de Ubicación">
            <FormSelect
              name="area_ubicacion"
              value={areaEsOtro || areaEsCustom ? '__otro__' : areaValue}
              onChange={(e) => {
                const v = e.target.value;
                setAreaEsOtro(v === '__otro__');
                if (v !== '__otro__') form.setField('area_ubicacion', v);
              }}
            >
              <option value="">Seleccionar...</option>
              {areaOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__otro__">Otro...</option>
            </FormSelect>
            {(areaEsOtro || areaEsCustom) && (
              <FormInput
                name="area_ubicacion_custom"
                value={areaEsCustom ? areaValue : ''}
                onChange={(e) => form.setField('area_ubicacion', e.target.value)}
                placeholder="Escribir área..."
                className="mt-2"
              />
            )}
          </FormField>
        </FormSection>
      </div>

      {/* Paso 3: Detalles Físicos y Estado */}
      <div className="space-y-6">
        <FormSection title="DETALLES FÍSICOS" color="amber" columns={3}>
          <FormField label="Marca">
            <FormInput name="brand" value={form.formData.brand} onChange={form.handleChange} placeholder="Ej. Dell, HP, Lenovo" />
          </FormField>
          <FormField label="Modelo">
            <FormInput name="model" value={form.formData.model} onChange={form.handleChange} placeholder="Ej. Latitude 5420" />
          </FormField>
          <FormField label="Número de Serie">
            <FormInput name="serial_number" value={form.formData.serial_number} onChange={form.handleChange} placeholder="S/N" />
          </FormField>
        </FormSection>

        <FormSection title="ESTADO Y ADQUISICIÓN" color="indigo" columns={3}>
          <FormField label="Estado" required>
            <FormSelect
              name="estado_uso"
              value={form.formData.estado_uso}
              onChange={(e) => form.setField('estado_uso', e.target.value as string)}
            >
              <option value="">Seleccionar Estado...</option>
              <option value="Operativo">Operativo</option>
              <option value="En reparación">En reparación</option>
              <option value="De baja">De baja</option>
              <option value="En almacén">En almacén</option>
            </FormSelect>
          </FormField>
          <FormField label="Fecha de Adquisición">
            <DateTimePicker
              value={form.formData.fecha_adquisicion || ''}
              onChange={(val) => form.setField('fecha_adquisicion', val)}
              placeholder="Seleccionar fecha"
            />
          </FormField>
          <FormField label="Valor de Adquisición (S/.)">
            <FormInput type="number" step="0.01" name="valor_estimado" value={form.formData.valor_estimado} onChange={form.handleChange} placeholder="0.00" />
          </FormField>
          <FormField label="Garantía" gridCols={1}>
            <div className="flex items-center h-10 mt-1">
              <input
                type="checkbox"
                id="tiene_garantia"
                checked={tieneGarantia}
                onChange={(e) => {
                  setTieneGarantia(e.target.checked);
                  if (!e.target.checked) form.setField('garantia_hasta', '');
                }}
                className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="tiene_garantia" className="ml-2 text-sm text-slate-700 cursor-pointer">
                El activo tiene garantía
              </label>
            </div>
          </FormField>
          {tieneGarantia && (
            <FormField label="Garantía Hasta" gridCols={2}>
              <DateTimePicker
                value={form.formData.garantia_hasta || ''}
                onChange={(val) => form.setField('garantia_hasta', val)}
                placeholder="Seleccionar fecha"
              />
            </FormField>
          )}
        </FormSection>


      </div>

      {/* Paso 4: Detalles Específicos */}
      <div className="space-y-6">
        {currentCategory && camposCategoria.length > 0 && (
          <FormSection title={`CAMPOS COMUNES DE ${currentCategory.label.toUpperCase()}`} color="emerald">
            <FormGrid columns={3}>
              {camposCategoria.map(renderField)}
            </FormGrid>
          </FormSection>
        )}
        {!currentCategory ? (
          <div className="py-12 flex items-center justify-center text-slate-400 text-sm font-medium tracking-wide">
            Seleccione una categoría en el paso anterior.
          </div>
        ) : camposPorTipo.length === 0 ? (
          <div className="py-12 flex items-center justify-center text-slate-400 text-sm font-medium tracking-wide">
            No hay campos adicionales para este tipo de activo.
          </div>
        ) : (
          <FormSection title={`ESPECIFICACIONES DE ${tipoActivoValue.toUpperCase()}`} color="blue">
            <FormGrid columns={3}>
              {camposPorTipo.map(renderField)}
            </FormGrid>
          </FormSection>
        )}
      </div>
    </MultiStepForm>
  );
}
