import { useState, useEffect, ReactNode } from 'react';
import { Wrench, Mail, Plus, X, ChevronDown, Check } from 'lucide-react';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea, FormGrid } from '../../../shared/components/forms/BaseForm';
import DateTimePicker from '../../../shared/components/forms/DateTimePicker';
import SearchableAssetSelect from '../../inventory/components/SearchableAssetSelect';
import AssetForm from '../../inventory/forms/AssetForm';
import { emailService } from '../../../shared/services/emailService';
import { useNotify } from '../../../shared/hooks/useNotify';
import { useAllowedLocations } from '../../../shared/hooks/useAllowedLocations';

const PRESET_EMAILS = [
  { email: 'centraldecontrollima@gmail.com', label: 'sistemas' },
  { email: 'cquispe@rtpsancristobal.pe', label: '' },
];

function CollapsibleSection({
  title,
  color = 'blue',
  defaultOpen = false,
  children,
}: {
  title: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <FormSection
      title={title}
      color={color}
      titleRight={
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-[#002855] hover:bg-slate-100 transition-all"
          aria-label={open ? 'Colapsar sección' : 'Expandir sección'}
        >
          <span className={`text-[9px] font-bold uppercase tracking-widest ${open ? 'text-slate-400' : 'text-blue-600'}`}>
            {open ? 'Ocultar' : 'Mostrar'}
          </span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      }
    >
      {open && children}
    </FormSection>
  );
}

type MaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_type: 'preventive' | 'corrective' | 'technical_review' | 'repair';
  status: 'pending' | 'in_progress' | 'completed' | 'waiting_parts';
  priority?: 'high' | 'medium' | 'low';
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
  labor_cost?: number;
  service_provider?: string;
  invoice_number?: string;
  other_costs?: number;
  total_cost?: number;
  warranty_claim?: boolean;
  warranty_details?: string;
  next_maintenance_date?: string;
  maintenance_frequency?: number;
  location_id?: string;
};

type MaintenanceFormProps = {
  onClose: () => void;
  onSave: () => void;
  editMaintenance?: MaintenanceRecord;
  assetId?: string;
};

export default function MaintenanceForm({ onClose, onSave, editMaintenance, assetId }: MaintenanceFormProps) {
  const { success: notifySuccess, error: notifyError } = useNotify();
  const allowedLocations = useAllowedLocations();
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendEmail, setSendEmail] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState({
    to: [] as string[],
    cc: [] as string[],
  });
  const [newEmailTo, setNewEmailTo] = useState('');
  const [newEmailCc, setNewEmailCc] = useState('');

  const [formData, setFormData] = useState({
    asset_id: editMaintenance?.asset_id || assetId || '',
    maintenance_type: editMaintenance?.maintenance_type || 'preventive',
    status: editMaintenance?.status || 'pending',
    priority: editMaintenance?.priority || 'medium',
    description: editMaintenance?.description || '',
    scheduled_date: editMaintenance?.scheduled_date || '',
    completed_date: editMaintenance?.completed_date || '',
    technician: editMaintenance?.technician || '',
    notes: editMaintenance?.notes || '',
    failure_cause: editMaintenance?.failure_cause || '',
    solution_applied: editMaintenance?.solution_applied || '',
    work_hours: editMaintenance?.work_hours?.toString() || '',
    labor_cost: editMaintenance?.labor_cost?.toString() || '',
    service_provider: editMaintenance?.service_provider || '',
    invoice_number: editMaintenance?.invoice_number || '',
    other_costs: editMaintenance?.other_costs?.toString() || '',
    warranty_claim: editMaintenance?.warranty_claim || false,
    warranty_details: editMaintenance?.warranty_details || '',
    next_maintenance_date: editMaintenance?.next_maintenance_date || '',
    maintenance_frequency: editMaintenance?.maintenance_frequency?.toString() || '',
    location_id: editMaintenance?.location_id || '',
  });

  useEffect(() => {
    fetchAssets();
    fetchLocations();
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

    if (data) {
      const filtered = allowedLocations
        ? (data as AssetWithDetails[]).filter(a => a.location_id && allowedLocations.includes(a.location_id))
        : data as AssetWithDetails[];
      setAssets(filtered);
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .order('name');

    if (data) {
      const filtered = allowedLocations
        ? data.filter(l => allowedLocations.includes(l.id))
        : data;
      setLocations(filtered);
    }
  };

  const calculateTotalCost = () => {
    const labor = parseFloat(formData.labor_cost) || 0;
    const other = parseFloat(formData.other_costs) || 0;
    return labor + other;
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

    if (sendEmail && emailRecipients.to.length === 0) {
      newErrors.email = 'Debe agregar al menos un destinatario principal para enviar el correo';
    }

    if (Object.keys(newErrors).length > 0) {
      newErrors.submit = 'Por favor, completa todos los campos requeridos antes de guardar.';
      setErrors(newErrors);
      return;
    }

    setErrors({});
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
      priority: formData.priority || null,
      description: formData.description.trim(),
      scheduled_date: formData.scheduled_date || null,
      completed_date: formData.completed_date || null,
      technician: formData.technician.trim() || null,
      notes: formData.notes.trim() || null,
      failure_cause: formData.failure_cause.trim() || null,
      solution_applied: formData.solution_applied.trim() || null,
      work_hours: formData.work_hours ? parseFloat(formData.work_hours) : null,
      labor_cost: formData.labor_cost ? parseFloat(formData.labor_cost) : null,
      service_provider: formData.service_provider.trim() || null,
      invoice_number: formData.invoice_number.trim() || null,
      other_costs: formData.other_costs ? parseFloat(formData.other_costs) : null,
      next_maintenance_date: formData.next_maintenance_date || null,
      maintenance_frequency: formData.maintenance_frequency ? parseInt(formData.maintenance_frequency) : null,
      total_cost: calculateTotalCost(),
      warranty_claim: formData.warranty_claim,
      warranty_details: formData.warranty_details.trim() || null,
      location_id: formData.location_id || null,
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

      if (sendEmail && emailRecipients.to.length > 0) {
        const selectedAsset = assets.find(a => a.id === formData.asset_id);
        const assetName = selectedAsset
          ? `${selectedAsset.brand || ''} ${selectedAsset.model || ''} ${selectedAsset.descripcion || ''}`.trim()
          : 'Activo no especificado';

        const maintenanceTypeLabels = {
          preventive: 'Preventivo',
          corrective: 'Correctivo',
          technical_review: 'Revisión Técnica',
          repair: 'Reparación',
        };

        const emailResult = await emailService.sendMaintenanceNotification({
          to: emailRecipients.to,
          cc: emailRecipients.cc,
          assetName,
          maintenanceType: maintenanceTypeLabels[formData.maintenance_type as keyof typeof maintenanceTypeLabels],
          description: formData.description,
          technician: formData.technician,
          scheduledDate: formData.scheduled_date,
          location: selectedAsset?.locations?.name,
        });

        if (!emailResult.success) {
          console.error('Error al enviar correo:', emailResult.error);
          setLoading(false);
          notifyError(`El mantenimiento se guardó correctamente, pero no se pudo enviar el correo: ${emailResult.error}`, 'Correo no enviado');
          onSave();
          return;
        }
      }

      setLoading(false);
      notifySuccess(editMaintenance ? 'Registro de mantenimiento actualizado correctamente' : 'Registro de mantenimiento creado correctamente', editMaintenance ? 'Actualizado' : 'Creado');
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
    <>
      <BaseForm
        title={editMaintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
      subtitle="Módulo de Gestión de Mantenimiento"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Wrench size={20} />}
      maxWidth="6xl"
    >
      {/* Sección: Información del Mantenimiento */}
      <FormSection title="Información del Mantenimiento" color="blue">
        <FormGrid columns={4}>
          <FormField label="Activo" required error={errors.asset_id} gridCols={2}>
            <SearchableAssetSelect
              assets={assets}
              value={formData.asset_id}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, asset_id: val }));
                if (errors.asset_id) setErrors(prev => ({ ...prev, asset_id: '' }));
              }}
              error={errors.asset_id}
              placeholder="Escribe marca, modelo o serie..."
              onCreateNew={() => setShowAssetForm(true)}
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

          <FormField label="Prioridad" error={errors.priority}>
            <FormSelect
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              error={errors.priority}
            >
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </FormSelect>
          </FormField>

          <FormField label="Ubicación del Mantenimiento" error={errors.location_id}>
            <FormSelect
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
              error={errors.location_id}
            >
              <option value="">Seleccionar ubicación...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Fecha Programada" error={errors.scheduled_date}>
            <DateTimePicker
              value={formData.scheduled_date}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, scheduled_date: val }));
                if (errors.scheduled_date) setErrors(prev => ({ ...prev, scheduled_date: '' }));
              }}
              error={errors.scheduled_date}
              placeholder="Seleccionar fecha y hora"
            />
          </FormField>

          <FormField label="Fecha de Completado" error={errors.completed_date}>
            <DateTimePicker
              value={formData.completed_date}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, completed_date: val }));
                if (errors.completed_date) setErrors(prev => ({ ...prev, completed_date: '' }));
              }}
              error={errors.completed_date}
              placeholder="Seleccionar fecha y hora"
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

          <FormField label="Costo Mano de Obra (S/)" error={errors.labor_cost}>
            <FormInput
              type="number"
              step="0.01"
              min="0"
              name="labor_cost"
              value={formData.labor_cost}
              onChange={handleChange}
              placeholder="250.00"
              error={errors.labor_cost}
            />
          </FormField>

          <FormField label="Proveedor del Servicio" error={errors.service_provider}>
            <FormInput
              type="text"
              name="service_provider"
              value={formData.service_provider}
              onChange={handleChange}
              placeholder="Nombre del proveedor o técnico externo"
              error={errors.service_provider}
            />
          </FormField>

          <FormField label="N° Factura / Recibo" error={errors.invoice_number}>
            <FormInput
              type="text"
              name="invoice_number"
              value={formData.invoice_number}
              onChange={handleChange}
              placeholder="F001-000123"
              error={errors.invoice_number}
            />
          </FormField>

          <FormField label="Otros Gastos (S/)" error={errors.other_costs}>
            <FormInput
              type="number"
              step="0.01"
              min="0"
              name="other_costs"
              value={formData.other_costs}
              onChange={handleChange}
              placeholder="50.00"
              error={errors.other_costs}
            />
          </FormField>

        </FormGrid>

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Reclamo de Garantía</h3>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="warranty_claim"
            checked={formData.warranty_claim}
            onChange={(e) => setFormData(prev => ({ ...prev, warranty_claim: e.target.checked }))}
            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-700">Activar reclamo de garantía</label>
        </div>

        {formData.warranty_claim && (
          <FormField label="Detalles del Reclamo de Garantía" error={errors.warranty_details}>
            <FormTextarea
              name="warranty_details"
              value={formData.warranty_details}
              onChange={handleChange}
              placeholder="Describir los detalles del reclamo de garantía, proveedor, tiempo restante..."
              rows={3}
              error={errors.warranty_details}
            />
          </FormField>
        )}
      </FormSection>

      {/* Sección: Descripción del Trabajo */}
      <CollapsibleSection title="Descripción del Trabajo" color="blue" defaultOpen={true}>
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

        {(formData.maintenance_type === 'corrective' || formData.maintenance_type === 'repair') && (
          <FormGrid columns={2}>
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
          </FormGrid>
        )}

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Resumen de Costos</h3>
        </div>
        <FormGrid columns={3}>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <p className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">Mano de Obra</p>
            <p className="text-sm font-normal text-blue-600 font-mono">S/ {parseFloat(formData.labor_cost || '0').toFixed(2)}</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200">
            <p className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">Otros Gastos</p>
            <p className="text-sm font-normal text-blue-600 font-mono">S/ {parseFloat(formData.other_costs || '0').toFixed(2)}</p>
          </div>
          <div className="p-3 bg-[#002855] border border-[#002855]">
            <p className="text-[9px] font-normal text-blue-200 uppercase tracking-wider">Costo Total</p>
            <p className="text-sm font-normal text-white font-mono">S/ {calculateTotalCost().toFixed(2)}</p>
          </div>
        </FormGrid>
      </CollapsibleSection>

      {/* Sección: Seguimiento */}
      <CollapsibleSection title="Seguimiento y Próximo Mantenimiento" color="blue">
        <FormGrid columns={4}>
          <FormField label="Fecha Próximo Mantenimiento" error={errors.next_maintenance_date}>
            <DateTimePicker
              value={formData.next_maintenance_date}
              onChange={(val) => {
                setFormData(prev => ({ ...prev, next_maintenance_date: val }));
                if (errors.next_maintenance_date) setErrors(prev => ({ ...prev, next_maintenance_date: '' }));
              }}
              error={errors.next_maintenance_date}
              placeholder="Seleccionar fecha y hora"
            />
          </FormField>
          <FormField label="Frecuencia (días)" error={errors.maintenance_frequency}>
            <FormInput
              type="number"
              min="1"
              step="1"
              name="maintenance_frequency"
              value={formData.maintenance_frequency}
              onChange={handleChange}
              placeholder="90"
              error={errors.maintenance_frequency}
            />
          </FormField>
        </FormGrid>

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

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Notificación por Correo Electrónico</h3>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="sendEmail"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm font-normal text-gray-700">
            <Mail size={16} className="text-blue-600" />
            Enviar notificación por correo
          </label>
        </div>

        {sendEmail && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Destinatarios Principales (Para)
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Opciones rápidas:</span>
                {PRESET_EMAILS.map(({ email, label }) => {
                  const added = emailRecipients.to.includes(email);
                  return (
                    <button
                      key={email}
                      type="button"
                      disabled={added}
                      onClick={() => {
                        if (!added) {
                          setEmailRecipients(prev => ({ ...prev, to: [...prev.to, email] }));
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold border rounded-md transition-all ${
                        added
                          ? 'bg-blue-600 border-blue-600 text-white cursor-default'
                          : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      <Mail size={12} />
                      {email}
                      {label && <span className={`font-normal ${added ? 'text-blue-200' : 'text-blue-400'}`}>({label})</span>}
                      {added && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newEmailTo}
                  onChange={(e) => setNewEmailTo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newEmailTo && !emailRecipients.to.includes(newEmailTo)) {
                      setEmailRecipients(prev => ({
                        ...prev,
                        to: [...prev.to, newEmailTo]
                      }));
                      setNewEmailTo('');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {emailRecipients.to.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmailRecipients(prev => ({
                        ...prev,
                        to: prev.to.filter((_, i) => i !== index)
                      }))}
                      className="hover:text-blue-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Copia (CC)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newEmailCc}
                  onChange={(e) => setNewEmailCc(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newEmailCc && !emailRecipients.cc.includes(newEmailCc)) {
                      setEmailRecipients(prev => ({
                        ...prev,
                        cc: [...prev.cc, newEmailCc]
                      }));
                      setNewEmailCc('');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {emailRecipients.cc.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmailRecipients(prev => ({
                        ...prev,
                        cc: prev.cc.filter((_, i) => i !== index)
                      }))}
                      className="hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {emailRecipients.to.length === 0 && (
              <p className={`text-sm mt-2 ${errors.email ? 'text-rose-600 font-semibold' : 'text-blue-600'}`}>
                {errors.email || 'Debe agregar al menos un destinatario principal para enviar el correo.'}
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>
    </BaseForm>
    {showAssetForm && (
      <AssetForm
        onClose={() => setShowAssetForm(false)}
        onSave={async () => {
          setShowAssetForm(false);
          await fetchAssets();
        }}
      />
    )}
    </>
  );
}
