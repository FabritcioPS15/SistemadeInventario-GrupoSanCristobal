import { MapPin } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';
import GenericForm, { SectionConfig } from './GenericForm';

type LocationFormProps = {
  onClose: () => void;
  onSave: () => void;
  editLocation?: Location;
};

export default function LocationFormGeneric({ onClose, onSave, editLocation }: LocationFormProps) {

  const sections: SectionConfig[] = [
    {
      title: 'Información de la Sede',
      color: 'blue',
      fields: [
        {
          name: 'name',
          label: 'Nombre de la Ubicación',
          type: 'text',
          required: true,
          placeholder: 'Ej: Oficina Principal, Almacén Central',
          defaultValue: editLocation?.name || '',
        },
        {
          name: 'type',
          label: 'Tipo de Ubicación',
          type: 'select',
          required: true,
          defaultValue: editLocation?.type || 'revision',
          options: [
            { value: 'revision', label: 'Centro de Revisión (CITV)' },
            { value: 'policlinico', label: 'Policlínico' },
            { value: 'escuela_conductores', label: 'Escuela de Conductores' },
            { value: 'central', label: 'Sede Central / Administrativa' },
            { value: 'circuito', label: 'Circuito de Manejo' },
          ],
        },
        {
          name: 'region',
          label: 'Región',
          type: 'select',
          defaultValue: editLocation?.region || 'lima',
          options: [
            { value: 'lima', label: 'Lima' },
            { value: 'provincia', label: 'Provincia' },
          ],
        },
        {
          name: 'address',
          label: 'Dirección',
          type: 'text',
          defaultValue: editLocation?.address || '',
          placeholder: 'Av. Principal 123, Lima, Perú',
        },
      ],
    },
    {
      title: 'Configuración de Sistema',
      color: 'emerald',
      fields: [
        {
          name: 'checklist_url',
          label: 'URL de Checklist',
          type: 'url',
          defaultValue: editLocation?.checklist_url || '',
          placeholder: 'https://ejemplo.com/checklist',
        },
        {
          name: 'history_url',
          label: 'URL de Historial',
          type: 'url',
          defaultValue: editLocation?.history_url || '',
          placeholder: 'https://ejemplo.com/history',
        },
      ],
    },
    {
      title: 'Información Adicional',
      color: 'amber',
      fields: [
        {
          name: 'notes',
          label: 'Notas y Observaciones',
          type: 'textarea',
          defaultValue: editLocation?.notes || '',
          placeholder: 'Detalles adicionales sobre la ubicación, horarios, contactos, etc...',
          gridCols: 2,
        },
      ],
    },
  ];

  const handleSave = async (formData: Record<string, any>) => {
    const dataToSave: any = {
      name: formData.name.trim(),
      type: formData.type,
      address: formData.address.trim() || null,
      notes: formData.notes.trim() || null,
      region: formData.region,
    };

    if (formData.checklist_url?.trim()) dataToSave.checklist_url = formData.checklist_url.trim();
    if (formData.history_url?.trim()) dataToSave.history_url = formData.history_url.trim();

    if (editLocation) {
      const { error } = await supabase
        .from('locations')
        .update(dataToSave)
        .eq('id', editLocation.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('locations')
        .insert([dataToSave]);

      if (error) throw error;
    }

    onSave();
  };

  return (
    <GenericForm
      title={editLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
      subtitle="Módulo de Gestión de Sedes"
      onClose={onClose}
      onSave={handleSave}
      sections={sections}
      icon={<MapPin size={24} className="text-blue-600" />}
      maxWidth="5xl"
    />
  );
}
