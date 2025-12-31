import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type MTCAcceso = {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  access_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type MTCAccesoFormProps = {
  onClose: () => void;
  onSave: () => void;
  editAcceso?: MTCAcceso;
};

export default function MTCAccesoForm({ onClose, onSave, editAcceso }: MTCAccesoFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState({
    name: editAcceso?.name || '',
    url: editAcceso?.url || '',
    username: editAcceso?.username || '',
    password: editAcceso?.password || '',
    access_type: editAcceso?.access_type || 'web',
    notes: editAcceso?.notes || '',
  });

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editAcceso) {
      const originalData = {
        name: editAcceso.name,
        url: editAcceso.url,
        username: editAcceso.username || '',
        password: editAcceso.password || '',
        access_type: editAcceso.access_type,
        notes: editAcceso.notes || '',
      };
      
      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editAcceso]);

  // Funciones de validación
  const validateURL = (url: string): boolean => {
    if (!url) return false; // Campo requerido
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const checkDuplicateAccessName = async (name: string, currentAccessId?: string): Promise<boolean> => {
    if (!name) return false; // Campo requerido
    
    const { data, error } = await supabase
      .from('mtc_accesos')
      .select('id')
      .eq('name', name);
    
    if (error) return false;
    
    // Si estamos editando, excluir el acceso actual
    if (currentAccessId && data) {
      return !data.some(access => access.id !== currentAccessId);
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
          const isUnique = await checkDuplicateAccessName(value, editAcceso?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este nombre de acceso ya está en uso';
          }
        }
        break;
      
      case 'url':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'La URL es requerida';
        } else if (!validateURL(value)) {
          isValid = false;
          errorMessage = 'URL inválida (debe incluir http:// o https://)';
        }
        break;
    }

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos requeridos
    const requiredFields = ['name', 'url', 'access_type'];
    const newErrors: Record<string, string> = {};
    
    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Validar campos con formato específico
    if (formData.url && !validateURL(formData.url)) {
      newErrors.url = 'URL inválida';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Confirmar cambios si estamos editando
    if (editAcceso && hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres guardar los cambios realizados?'
      );
      if (!confirmed) return;
    }

    setLoading(true);

    const dataToSave = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editAcceso) {
        const { error } = await supabase
          .from('mtc_accesos')
          .update(dataToSave)
          .eq('id', editAcceso.id);

        if (error) {
          console.error('Error al actualizar acceso MTC:', error);
          setErrors({ submit: 'Error al actualizar el acceso MTC: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('mtc_accesos')
          .insert([dataToSave]);

        if (error) {
          console.error('Error al crear acceso MTC:', error);
          setErrors({ submit: 'Error al crear el acceso MTC: ' + error.message });
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
    const fieldsToValidate = ['name', 'url'];
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {editAcceso ? 'Editar Acceso MTC' : 'Nuevo Acceso MTC'}
            </h2>
            {editAcceso && hasChanges && (
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
                placeholder="Ej: Portal MTC Principal"
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
              Tipo de Acceso *
            </label>
            <select
              name="access_type"
              value={formData.access_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="web">Web</option>
              <option value="api">API</option>
              <option value="ftp">FTP</option>
              <option value="ssh">SSH</option>
              <option value="database">Base de Datos</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL *
            </label>
            <div className="relative">
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className={getFieldClasses('url')}
                placeholder="https://portal.mtc.gob.pe"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {renderValidationIcon('url')}
              </div>
            </div>
            {errors.url && (
              <p className="text-red-500 text-sm mt-1">{errors.url}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="usuario@mtc.gob.pe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
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
              placeholder="Información adicional sobre el acceso..."
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
                  {editAcceso ? 'Actualizar' : 'Crear'} Acceso
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
