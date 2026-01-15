import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Eye, EyeOff, User, Mail, Phone, Shield, MapPin, FileText, Lock } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';

type User = {
  id: string;
  full_name: string;
  email: string;
  dni?: string;
  password?: string;
  role: string;
  location_id?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
};

type UserFormProps = {
  onClose: () => void;
  onSave: () => void;
  editUser?: User;
};

export default function UserForm({ onClose, onSave, editUser }: UserFormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'checking' | null>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formData, setFormData] = useState({
    full_name: editUser?.full_name || '',
    email: editUser?.email || '',
    dni: editUser?.dni || '',
    password: '',
    role: editUser?.role || 'user',
    location_id: editUser?.location_id || '',
    phone: editUser?.phone || '',
    status: editUser?.status || 'active',
    notes: editUser?.notes || '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  // Detectar cambios en el formulario
  useEffect(() => {
    if (editUser) {
      const originalData = {
        full_name: editUser.full_name,
        email: editUser.email,
        dni: editUser.dni || '',
        password: '', // No comparar contraseñas por seguridad
        role: editUser.role,
        location_id: editUser.location_id || '',
        phone: editUser.phone || '',
        status: editUser.status,
        notes: editUser.notes || '',
      };

      const hasFormChanges = JSON.stringify(originalData) !== JSON.stringify(formData);
      setHasChanges(hasFormChanges);
    }
  }, [formData, editUser]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  // Funciones de validación
  const validateEmail = (email: string): boolean => {
    if (!email) return false; // Campo requerido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Campo opcional
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,15}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password: string): boolean => {
    if (!password) return true; // Campo opcional para edición
    return password.length >= 6;
  };

  const checkDuplicateEmail = async (email: string, currentUserId?: string): Promise<boolean> => {
    if (!email) return false; // Campo requerido

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);

    if (error) return false;

    // Si estamos editando, excluir el usuario actual
    if (currentUserId && data) {
      return !data.some(user => user.id !== currentUserId);
    }

    return data?.length === 0;
  };

  const validateField = async (fieldName: string, value: string) => {
    setValidationStatus(prev => ({ ...prev, [fieldName]: 'checking' }));

    let isValid = true;
    let errorMessage = '';

    switch (fieldName) {
      case 'full_name':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El nombre completo es requerido';
        } else if (value.trim().length < 2) {
          isValid = false;
          errorMessage = 'El nombre debe tener al menos 2 caracteres';
        }
        break;

      case 'email':
        if (!value.trim()) {
          isValid = false;
          errorMessage = 'El email es requerido';
        } else if (!validateEmail(value)) {
          isValid = false;
          errorMessage = 'Formato de email inválido';
        } else {
          const isUnique = await checkDuplicateEmail(value, editUser?.id);
          if (!isUnique) {
            isValid = false;
            errorMessage = 'Este email ya está en uso';
          }
        }
        break;

      case 'phone':
        if (value && !validatePhoneNumber(value)) {
          isValid = false;
          errorMessage = 'Formato de teléfono inválido';
        }
        break;

      case 'password':
        if (value && !validatePassword(value)) {
          isValid = false;
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        }
        break;
    }

    setValidationStatus(prev => ({ ...prev, [fieldName]: isValid ? 'valid' : 'invalid' }));
    setErrors(prev => ({ ...prev, [fieldName]: errorMessage }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos requeridos
    const requiredFields = ['full_name', 'email', 'role', 'status'];
    const newErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    // Validar campos con formato específico
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    if (formData.phone && !validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Formato de teléfono inválido';
    }

    // Validar contraseña si se proporciona
    if (formData.password && !validatePassword(formData.password)) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validar que las contraseñas coincidan si ambas están llenas
    if (formData.password && confirmPassword && formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Confirmar cambios si estamos editando
    if (editUser && hasChanges) {
      const confirmed = window.confirm(
        '¿Estás seguro de que quieres guardar los cambios realizados?'
      );
      if (!confirmed) return;
    }

    setLoading(true);

    const dataToSave = {
      ...formData,
      location_id: formData.location_id || null,
      updated_at: new Date().toISOString(),
      // Solo incluir contraseña si se proporciona
      ...(formData.password && { password: formData.password }),
    };

    try {
      if (editUser) {
        const { error } = await supabase
          .from('users')
          .update(dataToSave)
          .eq('id', editUser.id);

        if (error) {
          console.error('Error al actualizar usuario:', error);
          setErrors({ submit: 'Error al actualizar el usuario: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('users')
          .insert([dataToSave]);

        if (error) {
          console.error('Error al crear usuario:', error);
          setErrors({ submit: 'Error al crear el usuario: ' + error.message });
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
    const fieldsToValidate = ['full_name', 'email', 'phone'];
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header mejorado en blanco y negro */}
        <div className="sticky top-0 bg-gradient-to-r from-gray-800 to-gray-900 text-white px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <User size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <p className="text-gray-300 text-sm mt-1">
                  {editUser ? 'Modifica la información del usuario' : 'Completa los datos para crear un nuevo usuario'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>
          {editUser && hasChanges && (
            <div className="mt-4 bg-yellow-600/20 backdrop-blur-sm border border-yellow-500/30 rounded-lg px-4 py-2">
              <p className="text-yellow-200 text-sm font-medium flex items-center gap-2">
                <AlertCircle size={16} />
                Tienes cambios sin guardar
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Mensaje de error general mejorado */}
          {errors.submit && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-full p-2">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-red-800 font-semibold">Error al procesar</p>
                  <p className="text-red-600 text-sm mt-1">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sección: Información Personal */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-300">
              <div className="bg-gray-100 rounded-lg p-2">
                <User size={18} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Información Personal</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className={getFieldClasses('full_name')}
                    placeholder="Ej: Juan Pérez García"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('full_name')}
                  </div>
                </div>
                {errors.full_name && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1 mt-2">
                    <AlertCircle size={14} />
                    {errors.full_name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Mail size={16} className="text-gray-500" />
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={getFieldClasses('email')}
                    placeholder="Ej: juan@ejemplo.com"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('email')}
                  </div>
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1 mt-2">
                    <AlertCircle size={14} />
                    {errors.email}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText size={16} className="text-gray-500" />
                  DNI
                </label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ej: 12345678"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Phone size={16} className="text-gray-500" />
                  Teléfono
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={getFieldClasses('phone')}
                    placeholder="Ej: +51 999 999 999"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {renderValidationIcon('phone')}
                  </div>
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1 mt-2">
                    <AlertCircle size={14} />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sección: Seguridad */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-300">
              <div className="bg-gray-100 rounded-lg p-2">
                <Lock size={18} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Seguridad</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Lock size={16} className="text-gray-500" />
                  Contraseña {editUser ? <span className="text-gray-500 font-normal">(dejar vacío para no cambiar)</span> : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={getFieldClasses('password')}
                    placeholder={editUser ? 'Nueva contraseña (opcional)' : 'Contraseña segura'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-lg p-1.5 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm font-medium flex items-center gap-1 mt-2">
                    <AlertCircle size={14} />
                    {errors.password}
                  </p>
                )}
              </div>

              {formData.password && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Lock size={16} className="text-gray-500" />
                    Confirmar Contraseña <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${confirmPassword && formData.password !== confirmPassword
                        ? 'border-red-300 focus:ring-red-500'
                        : 'border-gray-300'
                        }`}
                      placeholder="Repetir contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-lg p-1.5 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm font-medium flex items-center gap-1 mt-2">
                      <AlertCircle size={14} />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sección: Rol y Permisos */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-300">
              <div className="bg-gray-100 rounded-lg p-2">
                <Shield size={18} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Rol y Permisos</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Shield size={16} className="text-gray-500" />
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="admin">👑 Administrador</option>
                  <option value="supervisor">👨‍💼 Supervisor</option>
                  <option value="technician">🔧 Técnico</option>
                  <option value="user">👤 Usuario</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  Estado <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="active">✅ Activo</option>
                  <option value="inactive">❌ Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sección: Ubicación y Notas */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-300">
              <div className="bg-gray-100 rounded-lg p-2">
                <MapPin size={18} className="text-gray-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Información Adicional</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MapPin size={16} className="text-gray-500" />
                  Ubicación Asignada
                </label>
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">🌍 Sin ubicación específica</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      📍 {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <FileText size={16} className="text-gray-500" />
                  Notas Adicionales
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Información adicional, observaciones o comentarios importantes..."
                />
              </div>
            </div>
          </div>

          {/* Botones de acción mejorados */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-100 text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-200 disabled:opacity-50 font-semibold text-base transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-3 order-2 sm:order-1"
            >
              <X size={20} />
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
              className="flex-1 bg-gradient-to-r from-gray-700 to-gray-900 text-white py-4 px-6 rounded-xl hover:from-gray-800 hover:to-black disabled:opacity-50 font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 order-1 sm:order-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  {editUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

