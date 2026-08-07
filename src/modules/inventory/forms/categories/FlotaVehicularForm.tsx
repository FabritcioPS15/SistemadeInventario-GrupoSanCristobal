import { Truck } from 'lucide-react';
import MultiStepForm from '../../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect } from '../../../../shared/components/forms/BaseForm';
import CategoryRecommendation from '../../components/CategoryRecommendation';
import { UseAssetFormReturn } from '../../hooks/useAssetForm';

type Props = {
  form: UseAssetFormReturn;
  editAsset?: any;
  onClose: () => void;
};

export default function FlotaVehicularForm({ form, editAsset, onClose }: Props) {
  const { formData, handleChange, filteredSubcategories, categories, locations, loading, errors, handleSubmit, setField } = form;
  const currentSlug = categories.find(c => c.id === formData.category_id) as any;

  const steps = [
    { title: 'Identificación', description: 'Placa, marca y modelo' },
    { title: 'Datos del Vehículo', description: 'Motor, kilometraje, año' },
    { title: 'Documentación', description: 'SOAT, revisión, seguro' },
    { title: 'Estado y Ubicación', description: 'Condición, sede, valor' },
  ];

  return (
    <MultiStepForm
      title={editAsset ? 'Editar Vehículo' : 'Nuevo Vehículo'}
      subtitle={editAsset ? 'Actualiza la información del vehículo.' : 'Registra un nuevo vehículo o equipo de transporte.'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Truck size={18} className="text-white" />}
      steps={steps}
    >
      {/* Step 1: Identificación */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Identificación del Vehículo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Código único">
            <FormInput name="codigo_unico" value={formData.codigo_unico} onChange={handleChange} placeholder="ACT-XXXXXX" className="font-mono bg-slate-100" readOnly />
          </FormField>
          <FormField label="Placa" required>
            <FormInput name="placa" value={formData.placa} onChange={handleChange} placeholder="Ej: ABC-123" className="font-mono uppercase" required />
          </FormField>
          <FormField label="Marca / Modelo" required>
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: Toyota Hilux" required />
          </FormField>
          <FormField label="Color">
            <FormInput name="color" value={formData.color} onChange={handleChange} placeholder="Ej: Blanco" />
          </FormField>
          <FormField label="Nombre / Descripción">
            <FormInput name="item" value={formData.item} onChange={handleChange} placeholder="Ej: Camioneta de operaciones" />
          </FormField>
          <FormField label="Nº de serie / VIN">
            <FormInput name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="VIN del vehículo" className="font-mono" />
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

      {/* Step 2: Datos del Vehículo */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Datos del Vehículo</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Año de fabricación">
            <FormInput
              type="number"
              name="fecha_adquisicion"
              value={formData.fecha_adquisicion ? new Date(formData.fecha_adquisicion).getFullYear() : ''}
              onChange={(e) => {
                const year = e.target.value;
                handleChange({ target: { name: 'fecha_adquisicion', value: year ? `${year}-01-01` : '' } } as any);
              }}
              placeholder="Ej: 2022"
              min="1980"
              max={new Date().getFullYear()}
            />
          </FormField>
          <FormField label="Kilometraje actual">
            <FormInput name="capacity" value={formData.capacity} onChange={handleChange} placeholder="Ej: 45,000 km" />
          </FormField>
          <FormField label="Marca del motor">
            <FormInput name="marca_motor" value={formData.marca_motor} onChange={handleChange} placeholder="Ej: 2GD-FTV" />
          </FormField>
          <FormField label="Capacidad de carga">
            <FormInput name="gama" value={formData.gama} onChange={handleChange} placeholder="Ej: 1.5 toneladas" />
          </FormField>
        </div>
      </div>

      {/* Step 3: Documentación */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Documentación</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="SOAT - Fecha de vencimiento">
            <FormInput name="physical_condition" value={formData.physical_condition} onChange={handleChange} placeholder="Ej: 15/03/2025" />
          </FormField>
          <FormField label="Revisión técnica - Vencimiento">
            <FormInput name="sistema_operativo" value={formData.sistema_operativo} onChange={handleChange} placeholder="Ej: 20/06/2025" />
          </FormField>
          <FormField label="Póliza de seguro - Vencimiento">
            <FormInput name="version_so" value={formData.version_so} onChange={handleChange} placeholder="Ej: 01/12/2025" />
          </FormField>
          <FormField label="Notas adicionales">
            <FormInput name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Ej: Vehículo asignado a zona norte" />
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
          <FormField label="Estado del vehículo" required>
            <FormSelect name="estado_uso" value={formData.estado_uso} onChange={handleChange}>
              <option value="Operativo">Operativo</option>
              <option value="Inoperativo">Inoperativo</option>
              <option value="En Reparación">En Mantenimiento</option>
              <option value="Baja">De Baja</option>
            </FormSelect>
          </FormField>
          <FormField label="Condición" required>
            <FormSelect name="condicion" value={formData.condicion} onChange={handleChange}>
              <option value="Nuevo">Nuevo</option>
              <option value="Bueno">Bueno</option>
              <option value="Regular">Regular</option>
              <option value="Malo">Malo</option>
            </FormSelect>
          </FormField>
          <FormField label="Valor estimado (S/.)">
            <FormInput type="number" name="valor_estimado" value={formData.valor_estimado} onChange={handleChange} step="0.01" placeholder="Ej. 85000.00" />
          </FormField>
          <FormField label="Último mantenimiento">
            <FormInput name="accesorios" value={formData.accesorios} onChange={handleChange} placeholder="Ej: 15/01/2025" />
          </FormField>
          <FormField label="Ubicación actual">
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
