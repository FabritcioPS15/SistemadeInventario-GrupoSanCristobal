import { useState, useEffect } from 'react';
import { Wrench, Mail, Plus, X } from 'lucide-react';
import { supabase, AssetWithDetails } from '../../../shared/services/supabase';
import MultiStepForm from '../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import SearchableAssetSelect from '../../inventory/components/SearchableAssetSelect';
import { PartUsed } from '../../../shared/types/inventory.types';
import { emailService } from '../../../shared/services/emailService';

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
  parts_used?: PartUsed[];
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
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
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
  const [partsUsed, setPartsUsed] = useState<PartUsed[]>(editMaintenance?.parts_used || []);

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
    
    if (data) setAssets(data as AssetWithDetails[]);
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .order('name');
    
    if (data) setLocations(data);
  };

  const calculateTotalCost = () => {
    const labor = parseFloat(formData.labor_cost) || 0;
    const parts = partsUsed.reduce((sum, p) => sum + (p.total_cost || 0), 0);
    const other = parseFloat(formData.other_costs) || 0;
    return labor + parts + other;
  };

  const calculatePartTotal = (part: PartUsed) => {
    return (part.quantity || 0) * (part.unit_price || 0);
  };

  const addPart = () => {
    setPartsUsed(prev => [...prev, { name: '', quantity: 1, unit: 'unidad', unit_price: 0, total_cost: 0 }]);
  };

  const removePart = (index: number) => {
    setPartsUsed(prev => prev.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof PartUsed, value: string | number) => {
    setPartsUsed(prev => {
      const updated = [...prev];
      const part = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        part.total_cost = calculatePartTotal(part);
      }
      updated[index] = part;
      return updated;
    });
  };

  const handleSubmit = async () => {
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
      parts_used: partsUsed.length > 0 ? partsUsed : null,
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
          setErrors({ submit: 'Mantenimiento guardado pero error al enviar correo: ' + emailResult.error });
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
    <MultiStepForm
      title={editMaintenance ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}
      subtitle="Módulo de Gestión de Mantenimiento"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<Wrench size={20} />}
      steps={[
        { title: 'Información', description: 'Activo, tipo, estado, costos, proveedor, recibo' },
        { title: 'Descripción', description: 'Trabajo realizado, causa, solución, repuestos' },
        { title: 'Seguimiento', description: 'Próx. mantenimiento, notas, garantía, correo' },
      ]}
    >
      {/* Step 1: Información del Mantenimiento */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Información del Mantenimiento</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Step 2: Descripción del Trabajo */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Descripción del Trabajo</h3>
        </div>
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

        {/* Repuestos Utilizados */}
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-amber-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Repuestos Utilizados</h3>
        </div>

        <div className="space-y-3">
          {partsUsed.map((part, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-slate-50 border border-slate-200">
              <div className="col-span-4">
                <FormField label="Nombre">
                  <FormInput
                    type="text"
                    value={part.name}
                    onChange={(e) => updatePart(index, 'name', e.target.value)}
                    placeholder="Nombre del repuesto"
                  />
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Cantidad">
                  <FormInput
                    type="number"
                    min="1"
                    step="1"
                    value={part.quantity}
                    onChange={(e) => updatePart(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Unidad">
                  <FormSelect
                    value={part.unit}
                    onChange={(e) => updatePart(index, 'unit', e.target.value)}
                  >
                    <option value="unidad">Unidad</option>
                    <option value="litro">Litro</option>
                    <option value="kg">Kg</option>
                    <option value="metro">Metro</option>
                    <option value="galon">Galón</option>
                    <option value="par">Par</option>
                    <option value="juego">Juego</option>
                  </FormSelect>
                </FormField>
              </div>
              <div className="col-span-2">
                <FormField label="Precio Unit.">
                  <FormInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={part.unit_price}
                    onChange={(e) => updatePart(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </FormField>
              </div>
              <div className="col-span-1">
                <FormField label="Total">
                  <p className="text-[11px] font-normal text-emerald-600 font-mono mt-2">
                    S/ {part.total_cost.toFixed(2)}
                  </p>
                </FormField>
              </div>
              <div className="col-span-1 flex items-end pb-2">
                <button
                  type="button"
                  onClick={() => removePart(index)}
                  className="p-2 text-rose-500 hover:bg-rose-50 border border-rose-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPart}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-normal uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all"
          >
            <Plus size={14} />
            Agregar Repuesto
          </button>

          {partsUsed.length > 0 && (
            <div className="flex justify-end p-3 bg-slate-50 border border-slate-200">
              <div className="text-right">
                <span className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">Costo de Repuestos</span>
                <p className="text-sm font-normal text-emerald-600 font-mono">
                  S/ {partsUsed.reduce((sum, p) => sum + (p.total_cost || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Resumen de Costos */}
          <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-600 shrink-0" />
            <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Resumen de Costos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200">
              <p className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">Mano de Obra</p>
              <p className="text-sm font-normal text-blue-600 font-mono">S/ {parseFloat(formData.labor_cost || '0').toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <p className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">Repuestos</p>
              <p className="text-sm font-normal text-emerald-600 font-mono">S/ {partsUsed.reduce((sum, p) => sum + (p.total_cost || 0), 0).toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200">
              <p className="text-[9px] font-normal text-slate-400 uppercase tracking-wider">Otros Gastos</p>
              <p className="text-sm font-normal text-amber-600 font-mono">S/ {parseFloat(formData.other_costs || '0').toFixed(2)}</p>
            </div>
            <div className="p-3 bg-[#002855] border border-[#002855]">
              <p className="text-[9px] font-normal text-blue-200 uppercase tracking-wider">Costo Total</p>
              <p className="text-sm font-normal text-white font-mono">S/ {calculateTotalCost().toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Seguimiento */}
      <div className="space-y-4">
        {/* Próximo Mantenimiento */}
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-purple-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Próximo Mantenimiento</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField label="Fecha Próximo Mantenimiento" error={errors.next_maintenance_date}>
            <FormInput
              type="datetime-local"
              name="next_maintenance_date"
              value={formData.next_maintenance_date}
              onChange={handleChange}
              error={errors.next_maintenance_date}
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
        </div>

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Notas Adicionales</h3>
        </div>
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

        {/* Garantía */}
        {formData.warranty_claim && (
          <>
            <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
              <div className="w-1 h-4 bg-indigo-600 shrink-0" />
              <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Detalles de Garantía</h3>
            </div>
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
          </>
        )}

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
            <Mail size={16} className="text-indigo-600" />
            Enviar notificación por correo
          </label>
        </div>

        {sendEmail && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-normal text-gray-700 mb-2">
                Destinatarios Principales (Para)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newEmailTo}
                  onChange={(e) => setNewEmailTo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {emailRecipients.to.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmailRecipients(prev => ({
                        ...prev,
                        to: prev.to.filter((_, i) => i !== index)
                      }))}
                      className="hover:text-indigo-600"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                  className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
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
              <p className="text-sm text-amber-600 mt-2">
                Debe agregar al menos un destinatario principal para enviar el correo.
              </p>
            )}
          </div>
        )}
      </div>
    </MultiStepForm>
  );
}
