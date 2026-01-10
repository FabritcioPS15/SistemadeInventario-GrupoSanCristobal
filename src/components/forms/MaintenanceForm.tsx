import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, ChevronDown, Check } from 'lucide-react';
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
  assets?: any;
};

type MaintenanceFormProps = {
  onClose: () => void;
  onSave: () => void;
  editRecord?: MaintenanceRecord;
};

export default function MaintenanceForm({ onClose, onSave, editRecord }: MaintenanceFormProps) {
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<AssetWithDetails[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
    maintenance_frequency: editRecord?.maintenance_frequency || 30, // Default 30 days
    total_cost: editRecord?.total_cost || 0,
    warranty_claim: editRecord?.warranty_claim || false,
    warranty_details: editRecord?.warranty_details || ''
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
        
        // Set selected asset if editing
        if (editRecord?.asset_id) {
          const asset = data.find((a: any) => a.id === editRecord.asset_id);
          if (asset) {
            setSelectedAsset(asset);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar los activos:', error);
      setErrors(prev => ({ ...prev, fetch: 'Error al cargar la lista de activos' }));
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleAssetSelect = (asset: AssetWithDetails) => {
    if (!asset) return;
    
    setFormData(prev => ({
      ...prev,
      asset_id: asset.id,
    }));
    
    setSelectedAsset(asset);
    setSearchTerm(`${asset.brand || ''} ${asset.model || ''} ${asset.serial_number ? `- ${asset.serial_number}` : ''}`.trim());
    setIsAssetDropdownOpen(false);
    setErrors(prev => ({ ...prev, asset_id: '' }));
    setHasChanges(true);
    
    // Update validation
    validateField('asset_id', asset.id);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isAssetDropdownOpen && !target.closest('.relative')) {
        setIsAssetDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetDropdownOpen]);

  useEffect(() => {
    if (editRecord?.asset_id && assets.length > 0) {
      const asset = assets.find(a => a.id === editRecord.asset_id);
      if (asset) {
        setSearchTerm(`${asset.brand} ${asset.model} - ${asset.serial_number || ''}`.trim());
      }
    }
  }, [editRecord, assets]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAssets(assets);
    } else {
      const filtered = assets.filter(asset => {
        const searchLower = searchTerm.toLowerCase();
        return (
          asset.brand?.toLowerCase().includes(searchLower) ||
          asset.model?.toLowerCase().includes(searchLower) ||
          asset.serial_number?.toLowerCase().includes(searchLower) ||
          asset.asset_types?.name?.toLowerCase().includes(searchLower) ||
          asset.locations?.name?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredAssets(filtered);
    }
  }, [searchTerm, assets]);

  const validateDateRange = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return true;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return end >= start;
  };

  const validateDate = (dateString: string) => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  const validateField = async (fieldName: string, value: string) => {
    setValidationStatus(prev => ({ ...prev, [fieldName]: 'checking' }));
    
    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'asset_id':
        if (!value) {
          isValid = false;
          errorMessage = 'Debe seleccionar un activo';
        }
        break;
      
      case 'description':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'La descripción es requerida';
        } else if (value.trim().length < 10) {
          isValid = false;
          errorMessage = 'La descripción debe tener al menos 10 caracteres';
        }
        break;
      
      case 'scheduled_date':
        if (value && !validateDate(value)) {
          isValid = false;
          errorMessage = 'Fecha programada inválida';
        }
        break;
      
      case 'completed_date':
        if (value && !validateDate(value)) {
          isValid = false;
          errorMessage = 'Fecha de completado inválida';
        } else if (value && formData.scheduled_date && !validateDateRange(formData.scheduled_date, value)) {
          isValid = false;
          errorMessage = 'La fecha de completado no puede ser anterior a la fecha programada';
        }
        break;
      
      case 'technician':
        if (value && value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre del técnico debe tener al menos 2 caracteres';
        }
        break;
    }

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    const requiredFields = ['asset_id', 'maintenance_type', 'status', 'description'];
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Validar campos con formato específico
    if (formData.scheduled_date && !validateDate(formData.scheduled_date)) {
      newErrors.scheduled_date = 'Fecha programada inválida';
    }
    
    if (formData.completed_date && !validateDate(formData.completed_date)) {
      newErrors.completed_date = 'Fecha de completado inválida';
    }
    
    if (formData.scheduled_date && formData.completed_date && !validateDateRange(formData.scheduled_date, formData.completed_date)) {
      newErrors.completed_date = 'La fecha de completado no puede ser anterior a la fecha programada';
    }

    // Validar partes si es un mantenimiento correctivo o reparación
    if ((formData.maintenance_type === 'corrective' || formData.maintenance_type === 'repair') && 
        formData.parts_used && formData.parts_used.length === 0) {
      newErrors.parts_used = 'Debe agregar al menos una parte o repuesto utilizado';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Confirmar cambios si estamos editando
    if (editRecord && hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres guardar los cambios realizados?'
      );
      if (!confirmed) return;
    }

    setLoading(true);

    const dataToSave = {
      ...formData,
      scheduled_date: formData.scheduled_date || null,
      completed_date: formData.completed_date || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editRecord) {
        const { error } = await supabase
          .from('maintenance_records')
          .update(dataToSave)
          .eq('id', editRecord.id);

        if (error) {
          console.error('Error al actualizar registro de mantenimiento:', error);
          setErrors({ submit: 'Error al actualizar el registro de mantenimiento: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('maintenance_records')
          .insert([dataToSave]);

        if (error) {
          console.error('Error al crear registro de mantenimiento:', error);
          setErrors({ submit: 'Error al crear el registro de mantenimiento: ' + error.message });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSave();
    } catch (err) {
      console.error('Error:', err);
      setErrors({ submit: 'Error inesperado: ' + err });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? target.checked : undefined;
    
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    setHasChanges(true);

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validar campos específicos en tiempo real (con debounce)
    const fieldsToValidate = ['asset_id', 'description', 'scheduled_date', 'completed_date', 'technician'];
    if (fieldsToValidate.includes(name)) {
      // Debounce para evitar muchas validaciones
      setTimeout(() => {
        validateField(name, String(newValue));
      }, 500);
    }
  };

  // Función helper para renderizar el estado de validación
  const renderValidationIcon = (fieldName: string) => {
    const status = validationStatus[fieldName];
    if (status === 'checking') {
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    } else if (status === 'valid') {
      return <CheckCircle size={16} className="text-green-500" />;
    } else if (status === 'invalid') {
      return <AlertCircle size={16} className="text-red-500" />;
    }
    return null;
  };

  // Función helper para obtener clases CSS del campo
  const getFieldClasses = (fieldName: string) => {
    const baseClasses = "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2";
    const status = validationStatus[fieldName];
    
    if (status === 'invalid' || errors[fieldName]) {
      return `${baseClasses} border-red-300 focus:ring-red-500`;
    } else if (status === 'valid') {
      return `${baseClasses} border-green-300 focus:ring-green-500`;
    }
    
    return `${baseClasses} border-gray-300 focus:ring-blue-500`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editRecord ? 'Editar Registro de Mantenimiento' : 'Nuevo Registro de Mantenimiento'}
            </h2>
            {editRecord && hasChanges && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Tienes cambios sin guardar
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mensaje de error general */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-red-500 mr-2" />
                <p className="text-red-700">{errors.submit}</p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activo *
            </label>
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (!isAssetDropdownOpen) setIsAssetDropdownOpen(true);
                  }}
                  onFocus={() => setIsAssetDropdownOpen(true)}
                  placeholder="Buscar por marca, modelo o número de serie..."
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-all ${
                    errors.asset_id 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <ChevronDown size={20} className={`transition-transform ${isAssetDropdownOpen ? 'transform rotate-180' : ''}`} />
                </div>
                <input
                  type="hidden"
                  name="asset_id"
                  value={formData.asset_id}
                  required
                />
              </div>

              {isAssetDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white shadow-xl rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden focus:outline-none sm:text-sm transition-all duration-200 transform origin-top">
                  <div className="max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="px-4 py-3 text-gray-500 text-sm flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando activos...</span>
                      </div>
                    ) : filteredAssets.length === 0 ? (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No se encontraron activos que coincidan con "{searchTerm}"
                      </div>
                    ) : (
                      <>
                        <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          {filteredAssets.length} {filteredAssets.length === 1 ? 'activo encontrado' : 'activos encontrados'}
                        </div>
                        {filteredAssets.map((asset) => {
                          const isSelected = formData.asset_id === asset.id;
                          return (
                            <div
                              key={asset.id}
                              className={`px-4 py-2.5 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-blue-50 text-blue-800' 
                                  : 'hover:bg-gray-50 text-gray-800'
                              }`}
                              onClick={() => handleAssetSelect(asset)}
                            >
                              <div className="flex items-start">
                                <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mt-0.5 mr-3 ${
                                  isSelected ? 'bg-blue-100 border-blue-400' : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check size={12} className="text-blue-600" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between">
                                    <p className="text-sm font-medium truncate">
                                      {asset.brand} {asset.model}
                                    </p>
                                    {asset.serial_number && (
                                      <span className="ml-2 text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded">
                                        {asset.serial_number}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    <span className="font-medium">Tipo:</span> {asset.asset_types?.name || 'No especificado'}
                                    <span className="mx-2">•</span>
                                    <span className="font-medium">Ubicación:</span> {asset.locations?.name || 'No especificada'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {renderValidationIcon('asset_id')}
              </div>
            </div>
            {errors.asset_id && (
              <p className="text-red-500 text-sm mt-1">{errors.asset_id}</p>
            )}
            {selectedAsset && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{selectedAsset.brand} {selectedAsset.model}</h4>
                    <div className="mt-1 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <span className="w-20 font-medium">Tipo:</span>
                        <span className="flex-1">{selectedAsset.asset_types?.name || 'No especificado'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-20 font-medium">Ubicación:</span>
                        <span className="flex-1">{selectedAsset.locations?.name || 'No especificada'}</span>
                      </div>
                      {selectedAsset.serial_number && (
                        <div className="flex items-center">
                          <span className="w-20 font-medium">N° de Serie:</span>
                          <span className="flex-1 font-mono">{selectedAsset.serial_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Mantenimiento *
              </label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="preventive">Preventivo</option>
                <option value="corrective">Correctivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <div className="relative">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                className={getFieldClasses('description')}
                placeholder="Describe el trabajo de mantenimiento a realizar..."
              />
              <div className="absolute right-3 top-3">
                {renderValidationIcon('description')}
              </div>
            </div>
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Programada
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="scheduled_date"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                  className={getFieldClasses('scheduled_date')}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {renderValidationIcon('scheduled_date')}
                </div>
              </div>
              {errors.scheduled_date && (
                <p className="text-red-500 text-sm mt-1">{errors.scheduled_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Completado
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="completed_date"
                  value={formData.completed_date}
                  onChange={handleChange}
                  className={getFieldClasses('completed_date')}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {renderValidationIcon('completed_date')}
                </div>
              </div>
              {errors.completed_date && (
                <p className="text-red-500 text-sm mt-1">{errors.completed_date}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Técnico Responsable
            </label>
            <input
              type="text"
              name="technician"
              value={formData.technician}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del técnico responsable"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Adicionales
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales sobre el mantenimiento..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {editRecord ? 'Actualizar' : 'Crear'} Registro
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
