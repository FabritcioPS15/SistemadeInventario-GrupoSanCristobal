import { useState } from 'react';
import { Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

type SparePartType = {
  id?: string;
  name: string;
  description: string;
  part_number: string;
  manufacturer: string;
  category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  min_quantity: number;
  location: string;
  supplier: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

type SparePartFormProps = {
  onClose: () => void;
  onSave: () => void;
  editRecord?: SparePartType;
};

export default function SparePartForm({ onClose, onSave, editRecord }: SparePartFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: editRecord?.name || '',
    description: editRecord?.description || '',
    part_number: editRecord?.part_number || '',
    manufacturer: editRecord?.manufacturer || '',
    category: editRecord?.category || 'electrical',
    quantity: editRecord?.quantity || 1,
    unit: editRecord?.unit || 'unidad',
    unit_price: editRecord?.unit_price || 0,
    min_quantity: editRecord?.min_quantity || 1,
    location: editRecord?.location || '',
    supplier: editRecord?.supplier || '',
    notes: editRecord?.notes || '',
  });

  const categories = [
    { value: 'electrical', label: 'Eléctrico' },
    { value: 'mechanical', label: 'Mecánico' },
    { value: 'hydraulic', label: 'Hidráulico' },
    { value: 'pneumatic', label: 'Neumático' },
    { value: 'electronic', label: 'Electrónico' },
    { value: 'structural', label: 'Estructural' },
    { value: 'consumable', label: 'Consumible' },
    { value: 'other', label: 'Otro' },
  ];

  const units = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'metro', label: 'Metro' },
    { value: 'kg', label: 'Kilogramo' },
    { value: 'litro', label: 'Litro' },
    { value: 'par', label: 'Par' },
    { value: 'caja', label: 'Caja' },
    { value: 'rollo', label: 'Rollo' },
    { value: 'tubo', label: 'Tubo' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del repuesto es requerido';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    if (!formData.part_number.trim()) {
      newErrors.part_number = 'El número de parte es requerido';
    }

    if (!formData.manufacturer.trim()) {
      newErrors.manufacturer = 'El fabricante es requerido';
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
    }

    if (formData.quantity < 0) {
      newErrors.quantity = 'La cantidad debe ser mayor o igual a 0';
    }

    if (formData.unit_price < 0) {
      newErrors.unit_price = 'El precio unitario debe ser mayor o igual a 0';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      part_number: formData.part_number.trim(),
      manufacturer: formData.manufacturer.trim(),
      category: formData.category,
      quantity: formData.quantity,
      unit: formData.unit,
      unit_price: formData.unit_price,
      min_quantity: formData.min_quantity,
      location: formData.location.trim() || null,
      supplier: formData.supplier.trim() || null,
      notes: formData.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editRecord?.id) {
        const { error } = await supabase
          .from('spare_parts')
          .update(dataToSave)
          .eq('id', editRecord.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el repuesto: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('spare_parts')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el repuesto: ' + error.message });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSave();
    } catch (err: any) {
      setErrors({ submit: 'Error inesperado: ' + err });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numValue = ['quantity', 'unit_price', 'min_quantity'].includes(name) ? parseFloat(value) || 0 : value;

    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={editRecord ? 'Editar Repuesto' : 'Nuevo Repuesto'}
      subtitle="Módulo de Gestión de Repuestos"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Package size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información del Repuesto" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Nombre del Repuesto" required error={errors.name}>
            <FormInput
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Batería 12V, Filtro de Aceite"
              required
              error={errors.name}
            />
          </FormField>

          <FormField label="Número de Parte" required error={errors.part_number}>
            <FormInput
              type="text"
              name="part_number"
              value={formData.part_number}
              onChange={handleChange}
              placeholder="Ej: BAT-001, FLT-023"
              required
              error={errors.part_number}
            />
          </FormField>

          <FormField label="Fabricante" required error={errors.manufacturer}>
            <FormInput
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              placeholder="Ej: Bosch, NGK, SKF"
              required
              error={errors.manufacturer}
            />
          </FormField>

          <FormField label="Categoría" required error={errors.category}>
            <FormSelect
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              error={errors.category}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* Section: Descripción */}
      <FormSection title="Descripción Detallada" color="emerald">
        <FormField label="Descripción" required error={errors.description}>
          <FormTextarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descripción detallada del repuesto, especificaciones técnicas, compatibilidad, etc..."
            rows={4}
            required
            error={errors.description}
          />
        </FormField>
      </FormSection>

      {/* Section: Inventario */}
      <FormSection title="Gestión de Inventario" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Cantidad Actual" required error={errors.quantity}>
            <FormInput
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="10"
              required
              error={errors.quantity}
            />
          </FormField>

          <FormField label="Unidad de Medida" required error={errors.unit}>
            <FormSelect
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              required
              error={errors.unit}
            >
              {units.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Precio Unitario" required error={errors.unit_price}>
            <FormInput
              type="number"
              step="0.01"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              placeholder="150.00"
              required
              error={errors.unit_price}
            />
          </FormField>

          <FormField label="Cantidad Mínima" error={errors.min_quantity}>
            <FormInput
              type="number"
              name="min_quantity"
              value={formData.min_quantity}
              onChange={handleChange}
              placeholder="5"
              error={errors.min_quantity}
            />
          </FormField>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium text-blue-900">Valor Total del Inventario:</span>
            <span className="text-xl font-bold text-blue-900">
              S/. {(formData.quantity * formData.unit_price).toFixed(2)}
            </span>
          </div>
        </div>
      </FormSection>

      {/* Section: Proveedor y Ubicación */}
      <FormSection title="Proveedor y Ubicación" color="purple">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Proveedor" error={errors.supplier}>
            <FormInput
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              placeholder="Ej: Ferretería Central, AutoParts S.A."
              error={errors.supplier}
            />
          </FormField>

          <FormField label="Ubicación de Almacenamiento" error={errors.location}>
            <FormInput
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ej: Almacén A, Estante 3, Posición B2"
              error={errors.location}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Notas */}
      <FormSection title="Notas Adicionales" color="rose">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notas adicionales sobre el repuesto, recomendaciones de almacenamiento, observaciones especiales, etc..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
