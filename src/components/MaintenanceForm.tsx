import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, AssetWithDetails } from '../lib/supabase';

type MaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_type: 'preventive' | 'corrective';
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  scheduled_date?: string;
  completed_date?: string;
  technician?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type MaintenanceFormProps = {
  onClose: () => void;
  onSave: () => void;
  editRecord?: MaintenanceRecord;
};

export default function MaintenanceForm({ onClose, onSave, editRecord }: MaintenanceFormProps) {
  const [assets, setAssets] = useState<AssetWithDetails[]>([]);
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
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editRecord) {
      const originalData = {
        asset_id: editRecord.asset_id,
        maintenance_type: editRecord.maintenance_type,
        status: editRecord.status,
        description: editRecord.description,
        scheduled_date: editRecord.scheduled_date || '',
        completed_date: editRecord.completed_date || '',
        technician: editRecord.technician || '',
        notes: editRecord.notes || '',
      };
      
      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editRecord]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('*, asset_types(*), locations(*)')
      .order('brand');
    if (data) setAssets(data as AssetWithDetails[]);
  };

  // Funciones de validación
  const validateDate = (date: string): boolean => {
    if (!date) return true; // Campo opcional
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj.getTime());
  };

  const validateDateRange = (scheduledDate: string, completedDate: string): boolean => {
    if (!scheduledDate || !completedDate) return true; // Ambos opcionales
    const scheduled = new Date(scheduledDate);
    const completed = new Date(completedDate);
    return completed >= scheduled;
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
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validar campos específicos en tiempo real (con debounce)
    const fieldsToValidate = ['asset_id', 'description', 'scheduled_date', 'completed_date', 'technician'];
    if (fieldsToValidate.includes(name)) {
      // Debounce para evitar muchas validaciones
      setTimeout(() => {
        validateField(name, value);
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
              <select
                name="asset_id"
                value={formData.asset_id}
                onChange={handleChange}
                required
                className={getFieldClasses('asset_id')}
              >
                <option value="">Seleccionar activo...</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.brand} {asset.model} - {asset.asset_types?.name} ({asset.locations?.name})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {renderValidationIcon('asset_id')}
              </div>
            </div>
            {errors.asset_id && (
              <p className="text-red-500 text-sm mt-1">{errors.asset_id}</p>
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
