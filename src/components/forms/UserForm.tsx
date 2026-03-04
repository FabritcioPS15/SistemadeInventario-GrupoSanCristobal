import { useState, useEffect } from 'react';
import { User, Eye, EyeOff } from 'lucide-react';
import { supabase, Location } from '../../lib/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

type UserType = {
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
  editUser?: UserType;
};

export default function UserForm({ onClose, onSave, editUser }: UserFormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    { id: 'my-chats', label: 'Mis Chats', category: 'Principal' },
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

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    if (data) setLocations(data);
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    if (!password) return true;
    return password.length >= 6;
  };

  const checkDuplicateEmail = async (email: string, currentUserId?: string): Promise<boolean> => {
    if (!email) return false;

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email);

    if (error) return false;

    if (currentUserId && data) {
      return !data.some(user => user.id !== currentUserId);
    }

    return data?.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = ['full_name', 'email', 'role', 'status'];
    const newErrors: Record<string, string> = {};

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    if (formData.password && !validatePassword(formData.password)) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (!editUser && !formData.password) {
      newErrors.password = 'La contraseña es requerida para nuevos usuarios (mínimo 6 caracteres)';
    }

    if (formData.password && confirmPassword && formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

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
          setErrors({ submit: 'Error al actualizar el usuario: ' + error.message });
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('users')
          .insert([dataToSave]);

        if (error) {
          setErrors({ submit: 'Error al crear el usuario: ' + error.message });
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
    <BaseForm
      title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      subtitle="Módulo de Gestión de Usuarios"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<User size={24} className="text-blue-600" />}
    >
      {/* Section: Datos Principales */}
      <FormSection title="Información de Identidad" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Nombre Completo" required error={errors.full_name}>
            <FormInput 
              type="text" 
              name="full_name" 
              value={formData.full_name} 
              onChange={handleChange} 
              placeholder="Juan Pérez García"
              required
              error={errors.full_name}
            />
          </FormField>

          <FormField label="Email Corporativo" required error={errors.email}>
            <FormInput 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="juan@corporativo.com"
              required
              error={errors.email}
            />
          </FormField>

          <FormField label="DNI / Documento" error={errors.dni}>
            <FormInput 
              type="text" 
              name="dni" 
              value={formData.dni} 
              onChange={handleChange} 
              placeholder="12345678"
              error={errors.dni}
            />
          </FormField>

          <FormField label="Teléfono de Contacto" error={errors.phone}>
            <FormInput 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              placeholder="+51 123 456 789"
              error={errors.phone}
            />
          </FormField>

          <FormField label="Rol Organizacional" required error={errors.role}>
            <FormSelect
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              error={errors.role}
            >
              <option value="systems">Sistemas (Acceso Total)</option>
              <option value="management">Gerencia (Acceso Total)</option>
              <option value="admin">Administrador (Operaciones)</option>
              <option value="supervisor">Supervisor (Operaciones)</option>
              <option value="user">Usuario Estándar (Consulta)</option>
              <option value="custom">⚙️ Personalizado (Específico)</option>
            </FormSelect>
          </FormField>

          <FormField label="Sede de Operaciones" error={errors.location_id}>
            <FormSelect
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
              error={errors.location_id}
            >
              <option value="">Gestión General / Todas</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
      </FormSection>

      {/* Section: Seguridad */}
      <FormSection title="Credenciales y Acceso" color="emerald">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Contraseña" required={!editUser} error={errors.password}>
            <div className="relative">
              <FormInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={editUser ? 'Ingresar para cambiar' : 'Mínimo 6 caracteres'}
                required={!editUser}
                error={errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {!editUser && !formData.password && (
              <p className="text-blue-600 text-sm mt-1">
                💡 La contraseña debe tener al menos 6 caracteres
              </p>
            )}
          </FormField>

          {formData.password && (
            <FormField label="Confirmar Contraseña" error={errors.confirmPassword}>
              <FormInput
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                error={errors.confirmPassword}
              />
            </FormField>
          )}
        </div>
      </FormSection>

      {/* Section: Configuración */}
      <FormSection title="Configuración de Cuenta" color="amber">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FormField label="Estado del Usuario" required error={errors.status}>
            <FormSelect
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              error={errors.status}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </FormSelect>
          </FormField>

          <FormField label="Notas y Observaciones" error={errors.notes}>
            <FormTextarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Detalles adicionales sobre el perfil o restricciones..."
              rows={3}
              error={errors.notes}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Permisos (solo para rol custom) */}
      {formData.role === 'custom' && (
        <FormSection title="Permisos Personalizados" color="purple">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona los permisos específicos para este usuario:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePermissions.map((permission) => (
                <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          permissions: [...prev.permissions, permission.id]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          permissions: prev.permissions.filter(p => p !== permission.id)
                        }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{permission.label}</span>
                </label>
              ))}
            </div>
          </div>
        </FormSection>
      )}
    </BaseForm>
  );
}
