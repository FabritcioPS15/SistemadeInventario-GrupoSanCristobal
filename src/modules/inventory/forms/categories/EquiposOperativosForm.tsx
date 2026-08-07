import { Wrench } from 'lucide-react';
import MultiStepForm from '../../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect } from '../../../../shared/components/forms/BaseForm';
import CategoryRecommendation from '../../components/CategoryRecommendation';
import { UseAssetFormReturn } from '../../hooks/useAssetForm';

type Props = {
  form: UseAssetFormReturn;
  editAsset?: any;
  onClose: () => void;
};

export default function EquiposOperativosForm({ form, editAsset, onClose }: Props) {
  const { formData, handleChange, filteredSubcategories, categories, locations, loading, errors, handleSubmit, setField } = form;
  const currentSlug = categories.find(c => c.id === formData.category_id) as any;

  const steps = [
    { title: 'Identificación', description: 'Código, tipo y marca' },
    { title: 'Especificaciones', description: 'Rangos, capacidad, norma' },
    { title: 'Estado y Ubicación', description: 'Condición, calibración, sede' },
  ];

  return (
    <MultiStepForm
      title={editAsset ? 'Editar Equipo Operativo' : 'Nuevo Equipo Operativo'}
      subtitle={editAsset ? 'Actualiza la información del equipo.' : 'Registra un nuevo equipo de revisión técnica o evaluación.'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Wrench size={18} className="text-white" />}
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
            <FormInput name="item" value={formData.item} onChange={handleChange} placeholder="Ej. Analizador de gases" required />
          </FormField>
          <FormField label="Descripción">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej. Analizador para revisión técnica" />
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
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: Bosch, Snap-on" />
          </FormField>
          <FormField label="Modelo">
            <FormInput name="model" value={formData.model} onChange={handleChange} placeholder="Ej: BEA 460" />
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
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Especificaciones del Equipo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Capacidad / Rango de medición">
            <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 0-100% Vol, 0-250 kW" />
          </FormField>
          <FormField label="Norma / Estándar aplicable">
            <FormInput name="gama" value={formData.gama} onChange={handleChange} placeholder="Ej: Euro 6, ISO 11614" />
          </FormField>
          <FormField label="Color">
            <FormInput name="color" value={formData.color} onChange={handleChange} placeholder="Ej: Negro" />
          </FormField>
        </div>
      </div>

      {/* Step 3: Estado y Ubicación */}
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
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" placeholder="Ej. 5000.00" />
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
