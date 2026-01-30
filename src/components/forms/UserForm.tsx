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
  permissions?: string[];
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
    permissions: editUser?.permissions || [] as string[],
  });

  const availablePermissions = [
    { id: 'dashboard', label: 'Dashboard', category: 'Principal' },
    { id: 'inventory', label: 'Inventario', category: 'Principal' },
    { id: 'cameras', label: 'Cámaras', category: 'Principal' },
    { id: 'maintenance', label: 'Mantenimiento', category: 'Principal' },
    { id: 'sent', label: 'Enviados', category: 'Principal' },
    { id: 'tickets', label: 'Mesa de Ayuda (Tickets)', category: 'Principal' },
    { id: 'sutran', label: 'Sutran', category: 'Operaciones' },
    { id: 'checklist', label: 'Checklist', category: 'Operaciones' },
    { id: 'flota-vehicular', label: 'Flota Vehicular', category: 'Operaciones' },
    { id: 'mtc', label: 'MTC', category: 'Operaciones' },
    { id: 'locations', label: 'Sedes', category: 'Configuración' },
    { id: 'users', label: 'Usuarios', category: 'Configuración' },
    { id: 'vacations', label: 'Vacaciones', category: 'RRHH' },
    { id: 'servers', label: 'Servidores', category: 'TI' },
    { id: 'audit', label: 'Auditoría', category: 'TI' },
    { id: 'integrity', label: 'Integridad', category: 'TI' },
  ];

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
        permissions: editUser.permissions || [],
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
    let errorMessage = '';

    switch (fieldName) {
      case 'full_name':
        if (!value.trim()) {
          errorMessage = 'El nombre completo es requerido';
        } else if (value.trim().length < 2) {
          errorMessage = 'El nombre debe tener al menos 2 caracteres';
        }
        break;

      case 'email':
        if (!value.trim()) {
          errorMessage = 'El email es requerido';
        } else if (!validateEmail(value)) {
          errorMessage = 'Formato de email inválido';
        } else {
          const isUnique = await checkDuplicateEmail(value, editUser?.id);
          if (!isUnique) {
            errorMessage = 'Este email ya está en uso';
          }
        }
        break;

      case 'phone':
        if (value && !validatePhoneNumber(value)) {
          errorMessage = 'Formato de teléfono inválido';
        }
        break;

      case 'password':
        if (value && !validatePassword(value)) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        }
        break;
    }

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

    // Prepare data to save - exclude password if empty
    const dataToSave: any = {
      full_name: formData.full_name,
      email: formData.email,
      dni: formData.dni || null,
      role: formData.role,
      location_id: formData.location_id || null,
      phone: formData.phone || null,
      status: formData.status,
      notes: formData.notes || null,
      permissions: formData.permissions,
      updated_at: new Date().toISOString(),
    };

    // Only include password if it's provided and not empty
    if (formData.password && formData.password.trim() !== '') {
      dataToSave.password = formData.password;
    }

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



  return (
    <div className="fixed inset-0 bg-[#001529]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
        {/* Header Estilo ERP */}
        <div className="bg-[#002855] text-white px-8 py-5 flex items-center justify-between shadow-lg relative z-10">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {editUser ? 'Editar Registro' : 'Nuevo Registro'}
              </h2>
              <p className="text-blue-100/70 text-[11px] font-medium uppercase tracking-[0.1em] mt-0.5">
                Módulo de Gestión de Usuarios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-[#f8fafc] flex flex-col">
          <div className="p-8 space-y-8 flex-1">
            {/* General Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-bold text-sm">Error en la operación</p>
                  <p className="text-red-600 text-[13px] mt-1">{errors.submit}</p>
                </div>
              </div>
            )}

            {/* Section: Datos Principales */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
                <div className="w-1 h-4 bg-[#002855] rounded-full" />
                <h3 className="text-[12px] font-black text-[#64748b] uppercase tracking-widest">Información de Identidad</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Nombre Completo <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-[#002855] transition-colors" size={16} />
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none transition-all text-[13px] font-medium text-[#1e293b] placeholder-gray-400"
                      placeholder="Juan Pérez García"
                    />
                  </div>
                  {errors.full_name && <p className="text-red-500 text-[11px] font-semibold mt-1">{errors.full_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Email Corporativo <span className="text-red-500">*</span></label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] group-focus-within:text-[#002855] transition-colors" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none transition-all text-[13px] font-medium text-[#1e293b]"
                      placeholder="juan@corporativo.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">DNI / Documento</label>
                  <div className="relative group">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors" size={16} />
                    <input
                      type="text"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none transition-all text-[13px] font-medium text-[#1e293b]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Teléfono de Contacto</label>
                  <div className="relative group">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors" size={16} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none transition-all text-[13px] font-medium text-[#1e293b]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Seguridad */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
                <div className="w-1 h-4 bg-[#002855] rounded-full" />
                <h3 className="text-[12px] font-black text-[#64748b] uppercase tracking-widest">Credenciales y Acceso</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Contraseña {editUser && '(Opcional)'}</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2 bg-white border border-[#e2e8f0] rounded-lg focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none transition-all text-[13px] font-medium"
                      placeholder={editUser ? 'Ingresar para cambiar' : '********'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#002855] p-1"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {formData.password && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Confirmar Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 bg-white border rounded-lg outline-none transition-all text-[13px] font-medium ${confirmPassword && formData.password !== confirmPassword ? 'border-red-300 ring-4 ring-red-500/10' : 'border-[#e2e8f0] focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855]'}`}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section: Configuración del Sistema */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
                <div className="w-1 h-4 bg-[#002855] rounded-full" />
                <h3 className="text-[12px] font-black text-[#64748b] uppercase tracking-widest">Configuración de Cuenta</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Rol Organizacional</label>
                  <div className="relative group">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors group-focus-within:text-[#002855]" size={16} />
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#e2e8f0] rounded-lg outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] transition-all text-[13px] font-semibold text-[#1e293b] appearance-none cursor-pointer"
                    >
                      <option value="systems">Sistemas (Acceso Total)</option>
                      <option value="management">Gerencia (Acceso Total)</option>
                      <option value="admin">Administrador (Operaciones)</option>
                      <option value="supervisor">Supervisor (Operaciones)</option>
                      <option value="user">Usuario Estándar (Consulta)</option>
                      <option value="custom">⚙️ Personalizado (Específico)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Sede de Operaciones</label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] transition-colors group-focus-within:text-[#002855]" size={16} />
                    <select
                      name="location_id"
                      value={formData.location_id}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-[#e2e8f0] rounded-lg outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] transition-all text-[13px] font-semibold text-[#1e293b] appearance-none cursor-pointer"
                    >
                      <option value="">Gestión General / Todas</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Estado de la Cuenta</label>
                <div className="flex gap-4">
                  {['active', 'inactive'].map((status) => (
                    <label key={status} className="flex-1 cursor-pointer group">
                      <input
                        type="radio"
                        name="status"
                        value={status}
                        checked={formData.status === status}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`p-3 rounded-xl border-2 text-center transition-all ${formData.status === status ? (status === 'active' ? 'border-[#10b981] bg-emerald-50 text-[#065f46]' : 'border-[#ef4444] bg-red-50 text-[#991b1b]') : 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1]'}`}>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                          {status === 'active' ? '● Cuenta Activa' : '○ Cuenta Inactiva'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Section */}
              {formData.role === 'custom' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-500 pb-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#e2e8f0]">
                    <div className="w-1 h-4 bg-[#6366f1] rounded-full" />
                    <h3 className="text-[12px] font-black text-[#64748b] uppercase tracking-widest">Permisos de Módulo</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Principal', 'Operaciones', 'Configuración', 'RRHH', 'TI'].map(category => (
                      <div key={category} className="space-y-3 bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
                        <h4 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-2">{category}</h4>
                        <div className="space-y-2">
                          {availablePermissions.filter(p => p.category === category).map(permission => (
                            <label key={permission.id} className="flex items-center gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission.id)}
                                onChange={(e) => {
                                  const newPermissions = e.target.checked
                                    ? [...formData.permissions, permission.id]
                                    : formData.permissions.filter(p => p !== permission.id);
                                  setFormData(prev => ({ ...prev, permissions: newPermissions }));
                                }}
                                className="w-4 h-4 rounded text-[#002855] border-[#cbd5e1] focus:ring-[#002855]/20 focus:ring-offset-0 transition-all"
                              />
                              <span className="text-[13px] font-medium text-[#475569] group-hover:text-[#1e293b] transition-colors">{permission.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Notas y Observaciones</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl outline-none focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] transition-all text-[13px] font-medium text-[#1e293b] resize-none"
                  placeholder="Detalles adicionales sobre el perfil o restricciones..."
                />
              </div>
            </div>
          </div>

          {/* Footer Estilo ERP */}
          <div className="bg-[#f8fafc] border-t border-[#e2e8f0] px-8 py-5 flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[12px] font-bold text-[#64748b] hover:text-[#1e293b] hover:bg-gray-100 rounded-lg uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-[#002855] text-white px-8 py-2.5 rounded-lg hover:bg-[#003366] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 text-[12px] font-black uppercase tracking-widest"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Procesando
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  {editUser ? 'Actualizar Registro' : 'Crear Registro'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

