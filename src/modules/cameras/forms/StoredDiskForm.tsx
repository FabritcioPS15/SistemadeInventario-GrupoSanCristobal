import { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import { useNotify } from '../../../shared/hooks/useNotify';

interface StoredDiskFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editDisk?: any;
}

export default function StoredDiskForm({ onClose, onSuccess, editDisk }: StoredDiskFormProps) {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    camera_id: '',
    disk_number: 1,
    total_capacity_gb: '',
    used_space_gb: '',
    disk_type: 'HDD' as 'HDD' | 'SSD' | 'NVMe' | 'Other',
    brand: '',
    serial_number: '',
    stored_from: '',
    stored_to: '',
    notes: ''
  });

  useEffect(() => {
    fetchCameras();
    if (editDisk) {
      setFormData({
        camera_id: editDisk.camera_id || '',
        disk_number: editDisk.disk_number || 1,
        total_capacity_gb: editDisk.total_capacity_gb?.toString() || '',
        used_space_gb: editDisk.used_space_gb?.toString() || '',
        disk_type: editDisk.disk_type || 'HDD',
        brand: editDisk.brand || '',
        serial_number: editDisk.serial_number || '',
        stored_from: editDisk.stored_from || '',
        stored_to: editDisk.stored_to || '',
        notes: editDisk.notes || ''
      });
    }
  }, [editDisk]);

  async function fetchCameras() {
    const { data } = await supabase.from('cameras').select('id, name').order('name');
    if (data) setCameras(data);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.camera_id) return;

    setLoading(true);
    try {
      const dataToSave = {
        camera_id: formData.camera_id,
        disk_number: formData.disk_number,
        disk_type: formData.disk_type,
        brand: formData.brand || null,
        serial_number: formData.serial_number || null,
        stored_from: formData.stored_from || null,
        stored_to: formData.stored_to || null,
        notes: formData.notes || null,
        total_capacity_gb: Number(formData.total_capacity_gb),
        used_space_gb: Number(formData.used_space_gb),
        remaining_capacity_gb: Number(formData.total_capacity_gb) - Number(formData.used_space_gb)
      };

      if (editDisk) {
        const { error } = await supabase
          .from('stored_disks')
          .update(dataToSave)
          .eq('id', editDisk.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stored_disks')
          .insert([dataToSave]);
        if (error) throw error;
      }

      notifySuccess(editDisk ? 'Disco actualizado correctamente' : 'Disco creado correctamente', editDisk ? 'Actualizado' : 'Creado');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving disk:', error);
      notifyError('Error al guardar el disco: ' + error.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseForm
      title={editDisk ? 'Editar Disco Almacenado' : 'Nuevo Disco Almacenado'}
      subtitle="Gestión de discos de almacenamiento en cámaras"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      maxWidth="2xl"
      icon={<HardDrive size={18} className="text-white" />}
    >
      <FormSection title="Información del Disco" icon={<HardDrive size={15} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <FormField label="Cámara de Origen" required>
              <FormSelect name="camera_id" value={formData.camera_id} onChange={handleChange} required>
                <option value="">Seleccione una cámara...</option>
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.name}</option>
                ))}
              </FormSelect>
            </FormField>
          </div>

          <FormField label="Marca">
            <FormInput name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: Western Digital, Seagate..." />
          </FormField>

          <FormField label="Número de Serie">
            <FormInput name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="S/N..." />
          </FormField>

          <FormField label="Tipo de Disco">
            <FormSelect name="disk_type" value={formData.disk_type} onChange={handleChange}>
              <option value="HDD">HDD (Mecánico)</option>
              <option value="SSD">SSD (Sólido)</option>
              <option value="NVMe">NVMe</option>
              <option value="Other">Otro</option>
            </FormSelect>
          </FormField>

          <FormField label="Número de Disco">
            <FormInput type="number" name="disk_number" value={formData.disk_number} onChange={handleChange} min="1" />
          </FormField>

          <FormField label="Capacidad Total (GB)" required>
            <FormInput type="number" name="total_capacity_gb" value={formData.total_capacity_gb} onChange={handleChange} required placeholder="Ej: 1000" />
          </FormField>

          <FormField label="Espacio Usado (GB)" required>
            <FormInput type="number" name="used_space_gb" value={formData.used_space_gb} onChange={handleChange} required placeholder="Ej: 800" />
          </FormField>

          <FormField label="Grabación Desde">
            <FormInput type="date" name="stored_from" value={formData.stored_from} onChange={handleChange} />
          </FormField>

          <FormField label="Grabación Hasta">
            <FormInput type="date" name="stored_to" value={formData.stored_to} onChange={handleChange} />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Notas / Observaciones">
              <FormTextarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Detalles sobre el contenido del disco..." />
            </FormField>
          </div>
        </div>
      </FormSection>
    </BaseForm>
  );
}
