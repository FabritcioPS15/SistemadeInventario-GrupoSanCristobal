import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

type LocationFormProps = {
  onClose: () => void;
  onSave: () => void;
  editLocation?: Location;
};

export default function LocationForm({ onClose, onSave, editLocation }: LocationFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: editLocation?.name || '',
    type: editLocation?.type || 'revision',
    address: editLocation?.address || '',
    notes: editLocation?.notes || '',
    region: editLocation?.region || 'lima',
    checklist_url: editLocation?.checklist_url || '',
    history_url: editLocation?.history_url || '',
  });

  useEffect(() => {
    // Validar nombre de ubicación en tiempo real
    if (formData.name) {
      validateLocationName(formData.name);
    }
  }, [formData.name]);

  const validateLocationName = async (name: string) => {
    if (!name) return;

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('name', name);

      if (error) throw error;

      const isDuplicate = data && data.length > 0 && (!editLocation || data[0].id !== editLocation.id);
      
      if (isDuplicate) {
        setErrors(prev => ({ ...prev, name: 'Esta ubicación ya existe' }));
      } else {
        setErrors(prev => ({ ...prev, name: '' }));
      }
    } catch (err) {
      console.error('Error validando nombre de ubicación:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la ubicación es requerido';
    }

    if (!formData.type) {
      newErrors.type = 'El tipo de ubicación es requerido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      name: formData.name.trim(),
      type: formData.type,
      address: formData.address.trim() || null,
      notes: formData.notes.trim() || null,
      region: formData.region,
      checklist_url: formData.checklist_url.trim() || null,
      history_url: formData.history_url.trim() || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editLocation) {
        const { error } = await supabase
          .from('locations')
          .update(dataToSave)
          .eq('id', editLocation.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar la ubicación: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('locations')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear la ubicación: ' + error.message });
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

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <BaseForm
      title={editLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
      subtitle="Módulo de Gestión de Sedes"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="5xl"
      icon={<MapPin size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información de la Sede" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="Nombre de la Ubicación" required error={errors.name}>
            <FormInput
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej: Oficina Principal, Almacén Central"
              required
              error={errors.name}
            />
          </FormField>

          <FormField label="Tipo de Ubicación" required error={errors.type}>
            <FormSelect
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              error={errors.type}
            >
              <option value="revision">Centro de Revisión</option>
              <option value="office">Oficina Administrativa</option>
              <option value="warehouse">Almacén</option>
              <option value="workshop">Taller</option>
              <option value="branch">Sucursal</option>
              <option value="other">Otro</option>
            </FormSelect>
          </FormField>

          <FormField label="Región" error={errors.region}>
            <FormSelect
              name="region"
              value={formData.region}
              onChange={handleChange}
              error={errors.region}
            >
              <option value="lima">Lima</option>
              <option value="arequipa">Arequipa</option>
              <option value="trujillo">Trujillo</option>
              <option value="cusco">Cusco</option>
              <option value="piura">Piura</option>
              <option value="other">Otra Región</option>
            </FormSelect>
          </FormField>

          <FormField label="Dirección" error={errors.address}>
            <FormInput
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Av. Principal 123, Lima, Perú"
              error={errors.address}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Configuración */}
      <FormSection title="Configuración de Sistema" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField label="URL de Checklist" error={errors.checklist_url}>
            <FormInput
              type="url"
              name="checklist_url"
              value={formData.checklist_url}
              onChange={handleChange}
              placeholder="https://ejemplo.com/checklist"
              error={errors.checklist_url}
            />
          </FormField>

          <FormField label="URL de Historial" error={errors.history_url}>
            <FormInput
              type="url"
              name="history_url"
              value={formData.history_url}
              onChange={handleChange}
              placeholder="https://ejemplo.com/history"
              error={errors.history_url}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Información Adicional */}
      <FormSection title="Información Adicional" color="amber">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Detalles adicionales sobre la ubicación, horarios, contactos, etc..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
