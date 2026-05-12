import { useState, useEffect } from 'react';
import { User, Eye, EyeOff, HelpCircle, Crown, TrendingUp, Lock, Shield, Users as UsersIcon, Settings, User as UserIcon, X, ChevronRight } from 'lucide-react';
import { Location } from '../../lib/supabase';
import { userService } from '../../services/userService';
import { locationService } from '../../services/locationService';
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
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    full_name: editUser?.full_name || '',
    email: editUser?.email || '',
    dni: editUser?.dni || '',
    password: '',
    role: editUser?.role || 'administradores',
    location_id: editUser?.location_id || '',
    phone: editUser?.phone || '',
    status: editUser?.status || 'active',
    notes: editUser?.notes || '',
    permissions: editUser?.permissions || [] as string[],
  });

  const availablePermissions = [
    // Principal
    {
      id: 'dashboard',
      label: 'Dashboard',
      category: 'Principal',
      hasSubmenu: false,
      permissions: [
        { id: 'dashboard-view', label: 'Ver Dashboard', type: 'view' },
        { id: 'dashboard-edit', label: 'Editar Dashboard', type: 'edit' }
      ]
    },
    {
      id: 'tickets',
      label: 'Mesa de Ayuda',
      category: 'Principal',
      hasSubmenu: true,
      submenu: [
        { id: 'tickets-dashboard', label: 'Dashboard General' },
        { id: 'tickets-mine', label: 'Mis Tickets' },
        { id: 'tickets-reports', label: 'Reportes' },
        { id: 'tickets-history', label: 'Historial de Tickets' }
      ],
      permissions: [
        { id: 'tickets-view', label: 'Ver Tickets', type: 'view' },
        { id: 'tickets-create', label: 'Crear Tickets', type: 'edit' },
        { id: 'tickets-edit', label: 'Editar Tickets', type: 'edit' },
        { id: 'tickets-delete', label: 'Eliminar Tickets', type: 'edit' }
      ]
    },
    {
      id: 'checklist',
      label: 'Checklist',
      category: 'Principal',
      hasSubmenu: true,
      submenu: [
        { id: 'checklist-escon', label: 'ESCON' },
        { id: 'checklist-ecsal', label: 'ECSAL' },
        { id: 'checklist-citv', label: 'CITV' }
      ],
      permissions: [
        { id: 'checklist-view', label: 'Ver Checklist', type: 'view' },
        { id: 'checklist-edit', label: 'Editar Checklist', type: 'edit' },
        { id: 'checklist-create', label: 'Crear Checklist', type: 'edit' }
      ]
    },
    
    // Operativo
    {
      id: 'inventory',
      label: 'Inventario',
      category: 'Operativo',
      hasSubmenu: true,
      submenu: [
        { id: 'spare-parts', label: 'Repuestos' },
        { id: 'inventory-pc', label: 'PCs' },
        { id: 'inventory-celular', label: 'Celulares' },
        { id: 'inventory-dvr', label: 'DVRs' },
        { id: 'inventory-impresora', label: 'Impresoras' },
        { id: 'inventory-escaner', label: 'Escáneres' },
        { id: 'inventory-monitor', label: 'Monitores' },
        { id: 'inventory-laptop', label: 'Laptops' },
        { id: 'inventory-proyector', label: 'Proyectores' },
        { id: 'inventory-switch', label: 'Switch' },
        { id: 'inventory-chip', label: 'Chips de Celular' },
        { id: 'inventory-tinte', label: 'Tintes' },
        { id: 'inventory-fuente', label: 'Fuentes de Poder' },
        { id: 'inventory-ram', label: 'Memorias RAM' },
        { id: 'inventory-disco', label: 'Discos' },
        { id: 'inventory-disco-extraido', label: 'Discos Extraídos' },
        { id: 'inventory-maquinaria', label: 'Maquinarias' }
      ],
      permissions: [
        { id: 'inventory-view', label: 'Ver Inventario', type: 'view' },
        { id: 'inventory-create', label: 'Crear Items', type: 'edit' },
        { id: 'inventory-edit', label: 'Editar Items', type: 'edit' },
        { id: 'inventory-delete', label: 'Eliminar Items', type: 'edit' }
      ]
    },
    {
      id: 'cameras',
      label: 'Cámaras',
      category: 'Operativo',
      hasSubmenu: true,
      submenu: [
        { id: 'cameras-revision', label: 'Revisión' },
        { id: 'cameras-escuela', label: 'Escuela' },
        { id: 'cameras-policlinico', label: 'Policlínico' },
        { id: 'cameras-circuito', label: 'Circuito' }
      ],
      permissions: [
        { id: 'cameras-view', label: 'Ver Cámaras', type: 'view' },
        { id: 'cameras-edit', label: 'Configurar Cámaras', type: 'edit' }
      ]
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      category: 'Operativo',
      hasSubmenu: true,
      submenu: [
        { id: 'maintenance-pending', label: 'Pendientes' },
        { id: 'maintenance-in-progress', label: 'En Progreso' },
        { id: 'maintenance-completed', label: 'Completados' }
      ],
      permissions: [
        { id: 'maintenance-view', label: 'Ver Mantenimiento', type: 'view' },
        { id: 'maintenance-create', label: 'Crear Mantenimiento', type: 'edit' },
        { id: 'maintenance-edit', label: 'Editar Mantenimiento', type: 'edit' }
      ]
    },
    {
      id: 'flota-vehicular',
      label: 'Flota Vehicular',
      category: 'Operativo',
      hasSubmenu: false,
      permissions: [
        { id: 'flota-view', label: 'Ver Flota', type: 'view' },
        { id: 'flota-edit', label: 'Editar Flota', type: 'edit' }
      ]
    },
    
    // Administrativo
    {
      id: 'users',
      label: 'Usuarios',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'users-view', label: 'Ver Usuarios', type: 'view' },
        { id: 'users-create', label: 'Crear Usuarios', type: 'edit' },
        { id: 'users-edit', label: 'Editar Usuarios', type: 'edit' },
        { id: 'users-delete', label: 'Eliminar Usuarios', type: 'edit' }
      ]
    },
    {
      id: 'locations',
      label: 'Sedes',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'locations-view', label: 'Ver Sedes', type: 'view' },
        { id: 'locations-create', label: 'Crear Sedes', type: 'edit' },
        { id: 'locations-edit', label: 'Editar Sedes', type: 'edit' },
        { id: 'locations-delete', label: 'Eliminar Sedes', type: 'edit' }
      ]
    },
    {
      id: 'sutran',
      label: 'Sutran',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'sutran-view', label: 'Ver Sutran', type: 'view' },
        { id: 'sutran-edit', label: 'Editar Sutran', type: 'edit' }
      ]
    },
    {
      id: 'mtc',
      label: 'MTC Accesos',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'mtc-view', label: 'Ver MTC', type: 'view' },
        { id: 'mtc-edit', label: 'Editar MTC', type: 'edit' }
      ]
    },
    {
      id: 'servers',
      label: 'Servidores',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'servers-view', label: 'Ver Servidores', type: 'view' },
        { id: 'servers-edit', label: 'Configurar Servidores', type: 'edit' }
      ]
    },
    {
      id: 'sent',
      label: 'Enviados',
      category: 'Administrativo',
      hasSubmenu: true,
      submenu: [
        { id: 'sent-lima', label: 'Lima' },
        { id: 'sent-provincias', label: 'Provincias' }
      ],
      permissions: [
        { id: 'sent-view', label: 'Ver Enviados', type: 'view' },
        { id: 'sent-create', label: 'Crear Envíos', type: 'edit' },
        { id: 'sent-edit', label: 'Editar Envíos', type: 'edit' }
      ]
    },
    
    // Sistema
    {
      id: 'audit',
      label: 'Auditoría',
      category: 'Sistema',
      hasSubmenu: false,
      permissions: [
        { id: 'audit-view', label: 'Ver Auditoría', type: 'view' },
        { id: 'audit-export', label: 'Exportar Auditoría', type: 'edit' }
      ]
    }
  ];

  useEffect(() => {
    fetchLocations();
    checkSuperAdminExists();
  }, []);

  const checkSuperAdminExists = async () => {
    try {
      const users = await userService.getAll();
      if (Array.isArray(users)) {
        const superAdmin = users.find((u: any) => u.role === 'super_admin');
        if (superAdmin) setHasSuperAdmin(true);
      }
    } catch (err) {
      console.error('Error al verificar Super Admin:', err);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await locationService.getAll();
      if (Array.isArray(data)) setLocations(data);
    } catch (err) {
      console.error('Error al cargar sedes:', err);
    }
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
    try {
      const users = await userService.getAll();
      if (Array.isArray(users)) {
        const duplicate = users.find((u: any) => u.email === email && u.id !== currentUserId);
        return !duplicate;
      }
    } catch (err) {
      console.error('Error al verificar duplicado:', err);
    }
    return true;
  };

  const checkSuperAdminAvailability = async (currentUserId?: string): Promise<boolean> => {
    if (formData.role !== 'super_admin') return true;
    try {
      const users = await userService.getAll();
      if (Array.isArray(users)) {
        const superAdmin = users.find((u: any) => u.role === 'super_admin' && u.id !== currentUserId);
        return !superAdmin;
      }
    } catch (err) {
      console.error('Error al verificar disponibilidad Super Admin:', err);
    }
    return true;
  };

  // Funciones para roles
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-4 w-4" />;
      case 'gerencia': return <TrendingUp className="h-4 w-4" />;
      case 'sistemas': return <Lock className="h-4 w-4" />;
      case 'supervisores': return <Shield className="h-4 w-4" />;
      case 'administradores': return <UsersIcon className="h-4 w-4" />;
      case 'personalizado': return <Settings className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permissionId)
      }));
    }
  };

  const handleMenuPermissionToggle = (menuId: string, permissionType: 'view' | 'edit', checked: boolean) => {
    const permissionId = `${menuId}-${permissionType}`;
    handlePermissionChange(permissionId, checked);
    
    // Si se desmarca el permiso principal, desmarcar todos los submenús
    if (!checked && permissionType === 'view') {
      const menu = availablePermissions.find(p => p.id === menuId);
      if (menu?.submenu) {
        const submenuPermissions = menu.submenu.map(sub => `${sub.id}-${permissionType}`);
        setFormData(prev => ({
          ...prev,
          permissions: prev.permissions.filter(p => !submenuPermissions.includes(p))
        }));
      }
    }
  };

  const getRoleAccessInfo = (role: string) => {
    switch (role) {
      case 'super_admin':
        return {
          title: 'Super Admin',
          description: 'Control total del sistema',
          accesses: [
            '✅ Acceso completo a todos los módulos',
            '✅ Gestión de usuarios y roles',
            '✅ Configuración del sistema',
            '✅ Reportes avanzados',
            '✅ Copias de seguridad y restauración',
            '✅ Auditoría completa del sistema'
          ]
        };
      case 'gerencia':
        return {
          title: 'Gerencia',
          description: 'Supervisión estratégica',
          accesses: [
            '✅ Dashboard y métricas clave',
            '✅ Reportes ejecutivos',
            '✅ Aprobación de tickets críticos',
            '✅ Visibilidad de todas las operaciones',
            '✅ Análisis de rendimiento',
            '❌ No puede modificar configuraciones del sistema'
          ]
        };
      case 'sistemas':
        return {
          title: 'Sistemas',
          description: 'Soporte técnico y mantenimiento',
          accesses: [
            '✅ Gestión de servidores y equipos',
            '✅ Soporte técnico avanzado',
            '✅ Mantenimiento preventivo',
            '✅ Configuración técnica',
            '✅ Diagnóstico de problemas',
            '❌ No puede gestionar usuarios'
          ]
        };
      case 'supervisores':
        return {
          title: 'Supervisores',
          description: 'Gestión operativa diaria',
          accesses: [
            '✅ Gestión de tickets asignados',
            '✅ Supervisión de personal',
            '✅ Reportes operativos',
            '✅ Control de inventario básico',
            '✅ Coordinación de tareas',
            '❌ No puede acceder a configuraciones'
          ]
        };
      case 'administradores':
        return {
          title: 'Administradores',
          description: 'Gestión administrativa',
          accesses: [
            '✅ Gestión de usuarios básica',
            '✅ Control de accesos',
            '✅ Reportes administrativos',
            '✅ Gestión de ubicaciones',
            '✅ Soporte a usuarios',
            '❌ No puede modificar roles de sistema'
          ]
        };
      case 'personalizado':
        return {
          title: 'Personalizado',
          description: 'Acceso configurado según necesidades',
          accesses: [
            '⚙️ Permisos configurados manualmente',
            '⚙️ Acceso según asignación específica',
            '⚙️ Funcionalidades limitadas',
            '⚙️ Restricciones personalizadas'
          ]
        };
      default:
        return {
          title: 'Sin rol definido',
          description: 'Permisos básicos',
          accesses: [
            '❓ Permisos no especificados',
            '❓ Contactar al administrador'
          ]
        };
    }
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

    // Validar email duplicado
    if (formData.email) {
      const isEmailAvailable = await checkDuplicateEmail(formData.email, editUser?.id);
      if (!isEmailAvailable) {
        newErrors.email = 'Este email ya está registrado en el sistema';
      }
    }

    if (formData.password && !validatePassword(formData.password)) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (!editUser && !formData.password) {
      newErrors.password = 'La contraseña es requerida para nuevos usuarios (mínimo 6 caracteres)';
    }

    if (formData.password && confirmPassword && formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    // Validar disponibilidad de Super Admin
    if (formData.role === 'super_admin') {
      const isAvailable = await checkSuperAdminAvailability(editUser?.id);
      if (!isAvailable) {
        newErrors.role = 'Ya existe un Super Administrador. Este rol es exclusivo y único.';
      }
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
        await userService.update(editUser.id, dataToSave);
      } else {
        await userService.create(dataToSave);
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
      <FormSection 
        title="Información de Identidad" 
        color="blue"
        titleRight={
          <button
            type="button"
            onClick={() => setShowRoleInfo(!showRoleInfo)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showRoleInfo 
                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'
            }`}
            title={showRoleInfo ? "Cerrar información de roles" : "Ver información de roles y accesos"}
          >
            <HelpCircle size={14} />
          </button>
        }
      >
        {/* Tooltip con información de roles */}
        {showRoleInfo && (
          <div className="relative mb-4">
            <div className="absolute top-0 left-0 w-full bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Información de Roles y Accesos</h4>
                <button
                  type="button"
                  onClick={() => setShowRoleInfo(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {['super_admin', 'gerencia', 'sistemas', 'supervisores', 'administradores', 'personalizado'].map((role) => {
                  const roleInfo = getRoleAccessInfo(role);
                  return (
                    <div key={role} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getRoleIcon(role)}
                        <span className="text-xs font-bold text-blue-900 uppercase">{roleInfo.title}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mb-2 italic">{roleInfo.description}</p>
                      <div className="space-y-1">
                        {roleInfo.accesses.map((access, index) => (
                          <p key={index} className="text-[9px] text-gray-700 leading-tight">{access}</p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
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
              disabled={editUser?.role === 'super_admin'}
            />
            {editUser?.role === 'super_admin' && (
              <p className="text-xs text-amber-600 mt-1">🔒 Campo protegido - Super Admin</p>
            )}
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
              disabled={editUser?.role === 'super_admin'}
            />
            {editUser?.role === 'super_admin' && (
              <p className="text-xs text-amber-600 mt-1">🔒 Campo protegido - Super Admin</p>
            )}
          </FormField>

          <FormField label="DNI / Documento" error={errors.dni}>
            <FormInput 
              type="text" 
              name="dni" 
              value={formData.dni} 
              onChange={handleChange} 
              placeholder="12345678"
              error={errors.dni}
              disabled={editUser?.role === 'super_admin'}
            />
            {editUser?.role === 'super_admin' && (
              <p className="text-xs text-amber-600 mt-1">🔒 Campo protegido - Super Admin</p>
            )}
          </FormField>

          <FormField label="Teléfono de Contacto" error={errors.phone}>
            <FormInput 
              type="tel" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              placeholder="+51 123 456 789"
              error={errors.phone}
              disabled={editUser?.role === 'super_admin'}
            />
            {editUser?.role === 'super_admin' && (
              <p className="text-xs text-amber-600 mt-1">🔒 Campo protegido - Super Admin</p>
            )}
          </FormField>

          <FormField label="Rol Organizacional" required error={errors.role}>
            <FormSelect
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              error={errors.role}
              disabled={editUser?.role === 'super_admin'}
            >
              <option value="">Seleccionar un rol...</option>
              {!hasSuperAdmin && !editUser && (
                <option value="super_admin">👑 Super Administrador (Exclusivo)</option>
              )}
              <option value="gerencia">Gerencia (Gestión Total)</option>
              <option value="sistemas">Sistemas (Acceso Técnico)</option>
              <option value="supervisores">Supervisores (Operaciones)</option>
              <option value="administradores">Administradores (Gestión)</option>
              <option value="personalizado">Personalizado (Permisos Específicos)</option>
            </FormSelect>
            
            {/* Advertencia para Super Admin */}
            {formData.role === 'super_admin' && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ <strong>Atención:</strong> El rol Super Administrador es exclusivo y único. 
                  Solo puede existir un usuario con este rol en todo el sistema.
                </p>
              </div>
            )}

            {/* Advertencia para usuarios Super Admin existentes */}
            {editUser?.role === 'super_admin' && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  🔒 <strong>Protegido:</strong> Este usuario tiene rol Super Administrador. 
                  No se puede modificar su rol ni sus datos de identificación.
                </p>
              </div>
            )}

            {/* Mensaje si Super Admin ya existe */}
            {hasSuperAdmin && !editUser && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">
                  ℹ️ <strong>Información:</strong> Ya existe un Super Administrador en el sistema. 
                  Este rol no está disponible para nuevos usuarios.
                </p>
              </div>
            )}

            {errors.role && (
              <p className="text-red-600 text-sm mt-1">{errors.role}</p>
            )}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
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

      {/* Section: Permisos (solo para rol personalizado) */}
      {formData.role === 'personalizado' && (
        <FormSection title="Permisos Personalizados" color="purple">
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Selecciona los permisos específicos para este usuario. Los menús principales pueden expandirse para ver opciones detalladas:
            </p>
            
            {/* Agrupar por categorías */}
            {['Principal', 'Operativo', 'Administrativo', 'Sistema'].map((category) => (
              <div key={category} className="space-y-4">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2">
                  {category}
                </h4>
                
                {availablePermissions
                  .filter((permission) => permission.category === category)
                  .map((permission) => (
                    <div key={permission.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {/* Menú principal */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {permission.hasSubmenu && (
                            <button
                              type="button"
                              onClick={() => toggleMenu(permission.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <ChevronRight 
                                size={16} 
                                className={`transition-transform ${expandedMenus.has(permission.id) ? 'rotate-90' : ''}`}
                              />
                            </button>
                          )}
                          <span className="font-medium text-gray-900">{permission.label}</span>
                        </div>
                        
                        {/* Permisos de Ver/Editar */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(`${permission.id}-view`)}
                              onChange={(e) => handleMenuPermissionToggle(permission.id, 'view', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Ver</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(`${permission.id}-edit`)}
                              onChange={(e) => handleMenuPermissionToggle(permission.id, 'edit', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Editar</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Submenús desplegables */}
                      {permission.hasSubmenu && expandedMenus.has(permission.id) && (
                        <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4">
                          {permission.submenu?.map((submenu) => (
                            <div key={submenu.id} className="flex items-center justify-between py-2">
                              <span className="text-sm text-gray-600">{submenu.label}</span>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.permissions.includes(`${submenu.id}-view`)}
                                    onChange={(e) => handlePermissionChange(`${submenu.id}-view`, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-600">Ver</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={formData.permissions.includes(`${submenu.id}-edit`)}
                                    onChange={(e) => handlePermissionChange(`${submenu.id}-edit`, e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-600">Editar</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </FormSection>
      )}
    </BaseForm>
  );
}
