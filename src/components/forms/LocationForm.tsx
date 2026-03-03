import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';

type LocationFormProps = {
  onClose: () => void;
  onSave: () => void;
  editLocation?: Location;
};

export default function LocationForm({ onClose, onSave, editLocation }: LocationFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'checking' | 'valid' | 'invalid' | undefined>>({});

  const [formData, setFormData] = useState({
    name: editLocation?.name || '',
    type: editLocation?.type || 'revision',
    address: editLocation?.address || '',
    notes: editLocation?.notes || '',
    region: editLocation?.region || 'lima',
    checklist_url: editLocation?.checklist_url || '',
    history_url: editLocation?.history_url || '',
  });

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editLocation) {
      const originalData = {
        name: editLocation.name,
        type: editLocation.type,
        address: editLocation.address || '',
        notes: editLocation.notes || '',
        region: editLocation.region || 'lima',
        checklist_url: editLocation.checklist_url || '',
        history_url: editLocation.history_url || '',
      };

      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editLocation]);

  // Funciones de validación
  const checkDuplicateLocationName = async (name: string, currentLocationId?: string): Promise<boolean> => {
    if (!name) return false; // Campo requerido

    const { data, error } = await supabase
      .from('locations')
      .select('id')
      .eq('name', name);

    if (error) return false;

    // Si estamos editando, excluir la ubicación actual
    if (currentLocationId && data) {
      return !data.some(location => location.id !== currentLocationId);
    }

    return data?.length === 0;
  };

  const validateField = async (fieldName: string, value: string) => {
    setValidationStatus(prev => ({ ...prev, [fieldName]: 'checking' }));

    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El nombre es requerido';
        } else if (value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre debe tener al menos 2 caracteres';
        } else {
          const isUnique = await checkDuplicateLocationName(value, editLocation?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este nombre de ubicación ya está en uso';
          }
        }
        break;
    }

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos requeridos
    const requiredFields = ['name', 'type', 'region'];
    const newErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Merge with existing errors from real-time validation
    const allErrors = { ...errors, ...newErrors };

    // Filter out empty error messages to get only active errors
    const activeErrors = Object.entries(allErrors).filter(([, value]) =>
      value && value.trim() !== ''
    );

    if (activeErrors.length > 0) {
      setErrors(allErrors); // Update state with all current errors
      return;
    }
    // Confirmar cambios si estamos editando (opcional, removido para mejorar confiabilidad)
    /* 
    if (editLocation && hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres guardar los cambios realizados?'
      );
      if (!confirmed) return;
    }
    */

    setLoading(true);

    const dataToSave = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editLocation) {
        const { error } = await supabase
          .from('locations')
          .update(dataToSave)
          .eq('id', editLocation.id);

        if (error) {
          console.error('Error al actualizar ubicación:', error);
          setErrors({ submit: 'Error al actualizar la ubicación: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('locations')
          .insert([dataToSave]);

        if (error) {
          console.error('Error al crear ubicación:', error);
          setErrors({ submit: 'Error al crear la ubicación: ' + error.message });
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
    if (name === 'name') {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full h-[95vh] sm:h-auto sm:max-w-md sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 uppercase">
              {editLocation ? 'Editar Ubicación' : 'Nueva Ubicación'}
            </h2>
            {editLocation && hasChanges && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Tienes cambios sin guardar
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                Nombre *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={getFieldClasses('name')}
                  placeholder="Ej: Policlínico Lima Centro"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {renderValidationIcon('name')}
                </div>
              </div>
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="revision">Revisión</option>
                <option value="policlinico">Policlínico</option>
                <option value="escuela_conductores">Escuela de Conductores</option>
                <option value="central">Central</option>
                <option value="circuito">Circuito</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Región *
              </label>
              <select
                name="region"
                value={formData.region}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lima">Lima</option>
                <option value="provincia">Provincias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Av. Principal 123, Lima"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Información adicional..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link de Checklist (Google Sheets, etc.)
              </label>
              <input
                type="text"
                name="checklist_url"
                value={formData.checklist_url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://docs.google.com/spreadsheets/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link de Historial (Drive, etc.)
              </label>
              <input
                type="text"
                name="history_url"
                value={formData.history_url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://drive.google.com/drive/..."
              />
            </div>

          </div>

          <div className="sticky bottom-0 bg-gray-50 border-t p-4 sm:p-6 flex flex-col sm:flex-row-reverse gap-3 z-10">
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
              className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {editLocation ? 'Actualizar' : 'Crear'} Registro
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 border border-gray-200 text-slate-600 rounded-lg hover:bg-gray-100 transition-all font-bold text-[10px] uppercase tracking-widest"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}