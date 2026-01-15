import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase, AssetWithDetails } from '../../lib/supabase';

type PartUsed = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
};

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
  next_maintenance_date?: string;
  maintenance_frequency?: number;
  total_cost?: number;
  warranty_claim?: boolean;
  warranty_details?: string;
  location_id?: string;
  assets?: any;
};

type MaintenanceFormProps = {
  onClose: () => void;
  onSave: () => void;
  editRecord?: MaintenanceRecord;
};

export default function MaintenanceForm({ onClose, onSave, editRecord }: MaintenanceFormProps) {
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    asset_id: editRecord?.asset_id || '',
    maintenance_type: editRecord?.maintenance_type || 'preventive',
    status: editRecord?.status || 'pending',
    description: editRecord?.description || '',
    scheduled_date: editRecord?.scheduled_date || '',
    completed_date: editRecord?.completed_date || '',
    technician: editRecord?.technician || '',
    notes: editRecord?.notes || '',
    failure_cause: editRecord?.failure_cause || '',
    solution_applied: editRecord?.solution_applied || '',
    work_hours: editRecord?.work_hours || 0,
    parts_used: editRecord?.parts_used || [],
    next_maintenance_date: editRecord?.next_maintenance_date || '',
    maintenance_frequency: editRecord?.maintenance_frequency || 30,
    total_cost: editRecord?.total_cost || 0,
    warranty_claim: editRecord?.warranty_claim || false,
    warranty_details: editRecord?.warranty_details || '',
    location_id: editRecord?.location_id || ''
  });

  const [newPart, setNewPart] = useState<Omit<PartUsed, 'total_cost'>>({
    name: '',
    quantity: 1,
    unit: 'unidad',
    unit_price: 0
  });
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPartIndex, setEditingPartIndex] = useState<number | null>(null);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*, asset_types(*), locations(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAssets(data as AssetWithDetails[]);
        setFilteredAssets(data as AssetWithDetails[]);

        if (editRecord?.asset_id) {
          data.find((a: any) => a.id === editRecord.asset_id);
        }
      }
    } catch (error) {
      console.error('Error al cargar los activos:', error);
      setErrors(prev => ({ ...prev, fetch: 'Error al cargar la lista de activos' }));
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from('locations').select('*').order('name');
      if (error) throw error;
      if (data) setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  useEffect(() => {
    fetchAssets();
    fetchLocations();
  }, []);

  const handleAssetSelect = (asset: AssetWithDetails) => {
    if (!asset) return;
    setFormData(prev => ({
      ...prev,
      asset_id: asset.id,
      location_id: prev.location_id || asset.location_id || ''
    }));
    setSearchTerm(`${asset.brand || ''} ${asset.model || ''} ${asset.serial_number ? `- ${asset.serial_number}` : ''}`.trim());
    setIsAssetDropdownOpen(false);
    setErrors(prev => ({ ...prev, asset_id: '' }));
    validateField('asset_id', asset.id);
  };

  useEffect(() => {
    let filtered = assets;

    // Filter by Location if selected
    if (formData.location_id) {
      filtered = filtered.filter(asset => asset.location_id === formData.location_id);
    }

    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(asset => (
        asset.brand?.toLowerCase().includes(searchLower) ||
        asset.model?.toLowerCase().includes(searchLower) ||
        asset.serial_number?.toLowerCase().includes(searchLower) ||
        asset.asset_types?.name?.toLowerCase().includes(searchLower) ||
        asset.locations?.name?.toLowerCase().includes(searchLower)
      ));
    }

    setFilteredAssets(filtered);
  }, [searchTerm, assets, formData.location_id]);

  const validateDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return true;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end >= start;
  };

  const validateDate = (dateString: string) => {
    if (!dateString) return true;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const validateField = async (fieldName: string, value: string) => {
    let errorMessage = '';

    switch (fieldName) {
      case 'asset_id':
        if (!value) {
          errorMessage = 'Debe seleccionar un activo';
        }
        break;
      case 'description':
        if (!value.trim()) {
          errorMessage = 'La descripción es requerida';
        } else if (value.trim().length < 5) {
          errorMessage = 'La descripción debe tener al menos 5 caracteres';
        }
        break;
      case 'scheduled_date':
        if (value && !validateDate(value)) {
          errorMessage = 'Fecha programada inválida';
        }
        break;
      case 'completed_date':
        if (value && !validateDate(value)) {
          errorMessage = 'Fecha de completado inválida';
        } else if (value && formData.scheduled_date && !validateDateRange(formData.scheduled_date, value)) {
          errorMessage = 'La fecha de completado no puede ser anterior a la fecha programada';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const calculateTotalCost = (parts: PartUsed[]) => {
    return parts.reduce((total, part) => total + (part.unit_price * part.quantity), 0);
  };

  const handleAddPart = () => {
    if (!newPart.name || newPart.quantity <= 0) return;

    const partWithTotal: PartUsed = {
      ...newPart,
      total_cost: newPart.quantity * newPart.unit_price
    };

    const updatedParts = editingPartIndex !== null
      ? formData.parts_used.map((p, i) => i === editingPartIndex ? partWithTotal : p)
      : [...formData.parts_used, partWithTotal];

    setFormData(prev => ({
      ...prev,
      parts_used: updatedParts,
      total_cost: calculateTotalCost(updatedParts)
    }));

    setNewPart({ name: '', quantity: 1, unit: 'unidad', unit_price: 0 });
    setShowPartForm(false);
    setEditingPartIndex(null);
  };

  const removePart = (index: number) => {
    const updatedParts = formData.parts_used.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      parts_used: updatedParts,
      total_cost: calculateTotalCost(updatedParts)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = ['asset_id', 'maintenance_type', 'status', 'description'];
    const newErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const dataToSave = {
      ...formData,
      scheduled_date: formData.scheduled_date || null,
      completed_date: formData.completed_date || null,
      next_maintenance_date: formData.next_maintenance_date || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editRecord) {
        const { error } = await supabase
          .from('maintenance_records')
          .update(dataToSave)
          .eq('id', editRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('maintenance_records')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
    } catch (err: any) {
      console.error('Error saving maintenance record:', err);
      setErrors({ submit: 'Error al guardar el registro: ' + err.message });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked :
      type === 'number' ? parseFloat(value) : value;

    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editRecord ? 'Editar Registro de Mantenimiento' : 'Nuevo Registro de Mantenimiento'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Completa los detalles técnicos del servicio</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Información General</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sede (Opcional)</label>
                    <select
                      name="location_id"
                      value={formData.location_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Todas las Sedes</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Activo *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setIsAssetDropdownOpen(true);
                        }}
                        onFocus={() => setIsAssetDropdownOpen(true)}
                        placeholder="Buscar activo..."
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.asset_id ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {isAssetDropdownOpen && (
                        <div className="absolute z-30 mt-1 w-full bg-white shadow-2xl rounded-lg border border-gray-100 max-h-60 overflow-y-auto">
                          {filteredAssets.length > 0 ? (
                            filteredAssets.map(asset => (
                              <div
                                key={asset.id}
                                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                onClick={() => handleAssetSelect(asset)}
                              >
                                <p className="text-sm font-bold text-gray-900">{asset.brand} {asset.model}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                  <p className="text-[10px] text-gray-500 font-mono">{asset.serial_number}</p>
                                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{asset.locations?.name}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-center text-gray-400 text-xs italic">
                              No hay activos en esta sede
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.asset_id && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.asset_id}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo *</label>
                    <select
                      name="maintenance_type"
                      value={formData.maintenance_type}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="preventive">Preventivo</option>
                      <option value="corrective">Correctivo</option>
                      <option value="technical_review">Revisión Técnica</option>
                      <option value="repair">Reparación</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estado *</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completado</option>
                      <option value="waiting_parts">Esperando Repuestos</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción del Servicio *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.description ? 'border-red-300' : 'border-gray-200'}`}
                    placeholder="Detalla el trabajo realizado..."
                  />
                  {errors.description && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.description}</p>}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Fechas y Tiempos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prog. Inicia</label>
                    <input
                      type="date"
                      name="scheduled_date"
                      value={formData.scheduled_date}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Completado</label>
                    <input
                      type="date"
                      name="completed_date"
                      value={formData.completed_date}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Próx. Mantenimiento</label>
                    <input
                      type="date"
                      name="next_maintenance_date"
                      value={formData.next_maintenance_date}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horas Hombre</label>
                    <input
                      type="number"
                      name="work_hours"
                      value={formData.work_hours}
                      onChange={handleChange}
                      step="0.5"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Detalle Técnico</h3>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Causa de Falla</label>
                  <textarea
                    name="failure_cause"
                    value={formData.failure_cause}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="¿Por qué ocurrió el problema?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Solución Aplicada</label>
                  <textarea
                    name="solution_applied"
                    value={formData.solution_applied}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Pasos realizados para corregir..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Técnico Responsable</label>
                  <input
                    type="text"
                    name="technician"
                    value={formData.technician}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del técnico"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Repuestos y Costos</h3>
                  <button
                    type="button"
                    onClick={() => setShowPartForm(!showPartForm)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Plus size={14} /> Añadir Repuesto
                  </button>
                </div>

                {showPartForm && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <input
                      type="text"
                      placeholder="Nombre del repuesto"
                      value={newPart.name}
                      onChange={e => setNewPart({ ...newPart, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Cantidad"
                        value={newPart.quantity || ''}
                        onChange={e => setNewPart({ ...newPart, quantity: parseFloat(e.target.value) })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Precio Unit."
                        value={newPart.unit_price || ''}
                        onChange={e => setNewPart({ ...newPart, unit_price: parseFloat(e.target.value) })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddPart}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                      >
                        {editingPartIndex !== null ? 'Actualizar' : 'Añadir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPartForm(false);
                          setEditingPartIndex(null);
                        }}
                        className="px-3 py-2 bg-white text-gray-600 text-xs font-bold rounded-lg border border-gray-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {formData.parts_used.map((part, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg text-sm group">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">{part.name}</p>
                        <p className="text-xs text-gray-500">{part.quantity} x S/ {part.unit_price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600">S/ {part.total_cost.toFixed(2)}</span>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setNewPart({ ...part });
                              setEditingPartIndex(index);
                              setShowPartForm(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removePart(index)}
                            className="p-1.5 text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800 uppercase italic">Costo Total Estimado</span>
                  <span className="text-lg font-black text-blue-800 font-mono">S/ {formData.total_cost.toFixed(2)}</span>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="warranty_claim"
                name="warranty_claim"
                checked={formData.warranty_claim}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="warranty_claim" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">Requerir Garantía</label>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 sm:py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 sm:py-2.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest order-1 sm:order-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {editRecord ? 'Guardar Cambios' : 'Crear Registro'}
              </button>
            </div>
          </div>

          {errors.submit && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-800">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
