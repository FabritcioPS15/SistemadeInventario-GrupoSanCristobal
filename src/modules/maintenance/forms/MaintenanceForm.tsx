import { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import SearchableAssetSelect from '../../inventory/components/SearchableAssetSelect';
import { PartUsed } from '../../../shared/types/inventory.types';

type MaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_type: 'preventive' | 'corrective' | 'technical_review' | 'repair';
  status: 'pending' | 'in_progress' | 'completed' | 'waiting_parts';
  description: string;
  scheduled_date?: string;
  completed_date?: string;
  technician?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  failure_cause?: string;
  solution_applied?: string;
  work_hours?: number;
  parts_used?: PartUsed[];
  total_cost?: number;
  warranty_claim?: boolean;
};

type MaintenanceFormProps = {
  onClose: () => void;
  onSave: () => void;
  editMaintenance?: MaintenanceRecord;
  assetId?: string;
};

export default function MaintenanceForm({ onClose, onSave, editMaintenance, assetId }: MaintenanceFormProps) {
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    asset_id: editMaintenance?.asset_id || assetId || '',
    maintenance_type: editMaintenance?.maintenance_type || 'preventive',
    status: editMaintenance?.status || 'pending',
    description: editMaintenance?.description || '',
    scheduled_date: editMaintenance?.scheduled_date || '',
    completed_date: editMaintenance?.completed_date || '',
    technician: editMaintenance?.technician || '',
    notes: editMaintenance?.notes || '',
    failure_cause: editMaintenance?.failure_cause || '',
    solution_applied: editMaintenance?.solution_applied || '',
    work_hours: editMaintenance?.work_hours?.toString() || '',
    warranty_claim: editMaintenance?.warranty_claim || false,
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select(`
        *,
        asset_types(name),
        locations(name)
      `)
      .order('created_at', { ascending: false });
    
    if (data) setAssets(data as AssetWithDetails[]);
  };

  const calculateTotalCost = () => {
    const workHoursCost = (parseFloat(formData.work_hours) || 0) * 50; // Tarifa por hora: S/ 50
    return workHoursCost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.asset_id) {
      newErrors.asset_id = 'El activo es requerido';
    }

    if (!formData.maintenance_type) {
      newErrors.maintenance_type = 'El tipo de mantenimiento es requerido';
    }

    if (!formData.status) {
      newErrors.status = 'El estado es requerido';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const VALID_TYPES = ['preventive', 'corrective', 'technical_review', 'repair'] as const;
    const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'waiting_parts'] as const;

    const safeType = VALID_TYPES.includes(formData.maintenance_type as any)
      ? formData.maintenance_type
      : 'preventive';

    const safeStatus = VALID_STATUSES.includes(formData.status as any)
      ? formData.status
      : 'pending';

    const dataToSave = {
      asset_id: formData.asset_id || null,
      maintenance_type: safeType,
      status: safeStatus,
      description: formData.description.trim(),
      scheduled_date: formData.scheduled_date || null,
      completed_date: formData.completed_date || null,
      technician: formData.technician.trim() || null,
      notes: formData.notes.trim() || null,
      failure_cause: formData.failure_cause.trim() || null,
      solution_applied: formData.solution_applied.trim() || null,
      work_hours: formData.work_hours ? parseFloat(formData.work_hours) : null,
      total_cost: calculateTotalCost(),
      warranty_claim: formData.warranty_claim,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editMaintenance) {
        const { error } = await supabase
          .from('maintenance_records')
          .update(dataToSave)
          .eq('id', editMaintenance.id);

        if (error) {
          setErrors({ submit: 'Error al actualizar el mantenimiento: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('maintenance_records')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el mantenimiento: ' + error.message });
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
      title={editMaintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
      subtitle="Módulo de Gestión de Mantenimiento"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Wrench size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información del Mantenimiento" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Activo" required error={errors.asset_id}>
            <SearchableAssetSelect
              assets={assets}
              value={formData.asset_id}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, asset_id: val }));
                if (errors.asset_id) setErrors(prev => ({ ...prev, asset_id: '' }));
              }}
              error={errors.asset_id}
              placeholder="Escribe marca, modelo o serie..."
            />
          </FormField>

          <FormField label="Tipo de Mantenimiento" required error={errors.maintenance_type}>
            <FormSelect
              name="maintenance_type"
              value={formData.maintenance_type}
              onChange={handleChange}
              required
              error={errors.maintenance_type}
            >
              <option value="preventive">Preventivo</option>
              <option value="corrective">Correctivo</option>
              <option value="technical_review">Revisión Técnica</option>
              <option value="repair">Reparación</option>
            </FormSelect>
          </FormField>

          <FormField label="Estado" required error={errors.status}>
            <FormSelect
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              error={errors.status}
            >
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Progreso</option>
              <option value="completed">Completado</option>
              <option value="waiting_parts">Esperando Repuestos</option>
            </FormSelect>
          </FormField>

          <FormField label="Técnico Asignado" error={errors.technician}>
            <FormInput
              type="text"
              name="technician"
              value={formData.technician}
              onChange={handleChange}
              placeholder="Nombre del técnico"
              error={errors.technician}
            />
          </FormField>

          <FormField label="Fecha Programada" error={errors.scheduled_date}>
            <FormInput
              type="datetime-local"
              name="scheduled_date"
              value={formData.scheduled_date}
              onChange={handleChange}
              error={errors.scheduled_date}
            />
          </FormField>

          <FormField label="Fecha de Completado" error={errors.completed_date}>
            <FormInput
              type="datetime-local"
              name="completed_date"
              value={formData.completed_date}
              onChange={handleChange}
              error={errors.completed_date}
            />
          </FormField>

          <FormField label="Horas de Trabajo" error={errors.work_hours}>
            <FormInput
              type="number"
              step="0.5"
              name="work_hours"
              value={formData.work_hours}
              onChange={handleChange}
              placeholder="8.5"
              error={errors.work_hours}
            />
          </FormField>

          <FormField label="Reclamo de Garantía">
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                name="warranty_claim"
                checked={formData.warranty_claim}
                onChange={(e) => setFormData(prev => ({ ...prev, warranty_claim: e.target.checked }))}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Activar reclamo de garantía</label>
            </div>
          </FormField>
        </div>
      </FormSection>

      {/* Section: Descripción */}
      <FormSection title="Descripción del Trabajo" color="emerald">
        <FormField label="Descripción" required error={errors.description}>
          <FormTextarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descripción detallada del mantenimiento a realizar..."
            rows={4}
            required
            error={errors.description}
          />
        </FormField>

        {formData.maintenance_type === 'corrective' && (
          <>
            <FormField label="Causa del Fallo" error={errors.failure_cause}>
              <FormTextarea
                name="failure_cause"
                value={formData.failure_cause}
                onChange={handleChange}
                placeholder="Describir la causa del problema o fallo detectado..."
                rows={3}
                error={errors.failure_cause}
              />
            </FormField>

            <FormField label="Solución Aplicada" error={errors.solution_applied}>
              <FormTextarea
                name="solution_applied"
                value={formData.solution_applied}
                onChange={handleChange}
                placeholder="Describir la solución aplicada para resolver el problema..."
                rows={3}
                error={errors.solution_applied}
              />
            </FormField>
          </>
        )}
      </FormSection>

      {/* Section: Notas */}
      <FormSection title="Notas Adicionales" color="purple">
        <FormField label="Notas y Observaciones" error={errors.notes}>
          <FormTextarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Notas adicionales sobre el mantenimiento, observaciones, recomendaciones..."
            rows={4}
            error={errors.notes}
          />
        </FormField>
      </FormSection>
    </BaseForm>
  );
}
