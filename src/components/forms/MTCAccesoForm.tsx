import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
            {editAcceso ? 'Editar Acceso MTC' : 'Nuevo Acceso MTC'}
          </h2>
          {editAcceso && hasChanges && (
            <p className="text-xs text-orange-600 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={12} />
              Cambios sin guardar
            </p>
          )}
        </div>
        {/* Close button removed or handled by parent if needed. For embedded form, we usually have 'Cancel' at bottom */}
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Mensaje de error general */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex items-center gap-2 text-red-700">
            <AlertCircle size={16} />
            <p>{errors.submit}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Nombre del Acceso *
            </label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={`${getFieldClasses('name')} text-sm placeholder:text-gray-300`}
                placeholder="Ej: Portal MTC Principal"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {renderValidationIcon('name')}
              </div>
            </div>
            {errors.name && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tipo de Acceso *
            </label>
            <select
              name="access_type"
              value={formData.access_type}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all bg-white"
            >
              <option value="web">Web Service / Portal</option>
              <option value="api">API Endpoint</option>
              <option value="ftp">Servidor FTP</option>
              <option value="ssh">Acceso SSH</option>
              <option value="database">Base de Datos</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              URL de Destino *
            </label>
            <div className="relative">
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                required
                className={`${getFieldClasses('url')} text-sm placeholder:text-gray-300`}
                placeholder="https://portal.mtc.gob.pe"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {renderValidationIcon('url')}
              </div>
            </div>
            {errors.url && (
              <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.url}</p>
            )}
          </div>

          <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-6 mt-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              Credenciales de Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Usuario / ID
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                  placeholder="usuario@mtc.gob.pe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Contraseña / Token
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Notas y Observaciones
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-300 resize-none"
              placeholder="Información adicional sobre el acceso, restricciones, etc..."
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
            className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                {editAcceso ? 'Actualizar' : 'Crear'} Acceso
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
