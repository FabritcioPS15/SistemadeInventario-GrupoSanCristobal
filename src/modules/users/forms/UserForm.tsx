import { useState, useEffect } from 'react';
import { User, Eye, EyeOff, HelpCircle, Crown, TrendingUp, Lock, Shield, Users as UsersIcon, Settings, User as UserIcon, X, ChevronRight, Scale, CheckSquare, Square } from 'lucide-react';
import { supabase, Location } from '../../../shared/services/supabase';
import { ROLE_PERMISSIONS } from '../../../shared/roles';
import MultiStepForm from '../../../shared/components/forms/MultiStepForm';
import { FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import { useNotify } from '../../../shared/hooks/useNotify';

type UserType = {
  id: string;
  full_name: string;
  email: string;
  username?: string;
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
  const { success: notifySuccess } = useNotify();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [customPermissionsMode, setCustomPermissionsMode] = useState<boolean>(
    () => !!editUser && Array.isArray(editUser.permissions) && editUser.permissions.length > 0
  );

  const [formData, setFormData] = useState({
    full_name: editUser?.full_name || '',
    username: (editUser as any)?.username || '',
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
        { id: 'checklist-all', label: 'Ver Todo' },
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
    {
      id: 'inventory',
      label: 'Inventario',
      category: 'Operativo',
      hasSubmenu: true,
      submenu: [
        { id: 'inventory-all', label: 'Ver Todo' },
        { id: 'cat-tecnologia', label: 'Tecnología' },
        { id: 'cat-seguridad', label: 'Seguridad y Control' },
        { id: 'cat-operativos', label: 'Equipos de Línea' },
        { id: 'cat-mobiliario', label: 'Mobiliario' },
        { id: 'cat-suministros', label: 'Útiles y Suministros' },
        { id: 'cat-flota', label: 'Flota Vehicular' },
        { id: 'cat-infraestructura', label: 'Infraestructura TI' },
        { id: 'cat-herramientas', label: 'Herramientas y Equipos' },
        { id: 'cat-instalaciones', label: 'Instalaciones' }
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
        { id: 'cameras-all', label: 'Ver Todo' },
        { id: 'cameras-revision', label: 'Revisión' },
        { id: 'cameras-escuela', label: 'Escuela' },
        { id: 'cameras-policlinico', label: 'Policlínico' },
        { id: 'cameras-circuito', label: 'Circuito' },
        { id: 'cameras-disks', label: 'Discos Extraídos' }
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
    {
      id: 'requests',
      label: 'Solicitudes',
      category: 'Operativo',
      hasSubmenu: false,
      permissions: [
        { id: 'requests-view', label: 'Ver Solicitudes', type: 'view' },
        { id: 'requests-edit', label: 'Gestionar Solicitudes', type: 'edit' }
      ]
    },
    {
      id: 'quotations',
      label: 'Cotizaciones',
      category: 'Operativo',
      hasSubmenu: false,
      permissions: [
        { id: 'quotations-view', label: 'Ver Cotizaciones', type: 'view' },
        { id: 'quotations-edit', label: 'Gestionar Cotizaciones', type: 'edit' }
      ]
    },
    {
      id: 'spare-parts',
      label: 'Repuestos',
      category: 'Operativo',
      hasSubmenu: false,
      permissions: [
        { id: 'spare-parts-view', label: 'Ver Repuestos', type: 'view' },
        { id: 'spare-parts-edit', label: 'Editar Repuestos', type: 'edit' }
      ]
    },
    {
      id: 'cvs',
      label: "CV's",
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'cvs-view', label: "Ver CV's", type: 'view' },
        { id: 'cvs-edit', label: "Editar CV's", type: 'edit' }
      ]
    },
    {
      id: 'titulos-habilitantes',
      label: 'Títulos Habilitantes',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'titulos-habilitantes-view', label: 'Ver Títulos', type: 'view' },
        { id: 'titulos-habilitantes-edit', label: 'Editar Títulos', type: 'edit' }
      ]
    },
    {
      id: 'planos-defensa-civil',
      label: 'Planos Defensa Civil',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'planos-defensa-civil-view', label: 'Ver Planos', type: 'view' },
        { id: 'planos-defensa-civil-edit', label: 'Editar Planos', type: 'edit' }
      ]
    },
    {
      id: 'vacations',
      label: 'Vacaciones',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'vacations-view', label: 'Ver Vacaciones', type: 'view' },
        { id: 'vacations-edit', label: 'Editar Vacaciones', type: 'edit' }
      ]
    },
    {
      id: 'reports',
      label: 'Reportes',
      category: 'Sistema',
      hasSubmenu: false,
      permissions: [
        { id: 'reports-view', label: 'Ver Reportes', type: 'view' },
        { id: 'reports-edit', label: 'Editar Reportes', type: 'edit' }
      ]
    },
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
      id: 'painpoint',
      label: 'Painpoints',
      category: 'Administrativo',
      hasSubmenu: false,
      permissions: [
        { id: 'painpoint-view', label: 'Ver Painpoints', type: 'view' },
        { id: 'painpoint-create', label: 'Crear Painpoints', type: 'edit' },
        { id: 'painpoint-edit', label: 'Editar Painpoints', type: 'edit' }
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

  useEffect(() => {
    // El rol "personalizado" siempre requiere configuración manual de permisos
    if (formData.role === 'personalizado') {
      setCustomPermissionsMode(true);
    }
  }, [formData.role]);

  const checkSuperAdminExists = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasSuperAdmin(true);
    }
  };

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

  const checkSuperAdminAvailability = async (currentUserId?: string): Promise<boolean> => {
    if (formData.role !== 'super_admin') return true;

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin');

    if (error) return false;

    if (currentUserId && data) {
      return !data.some(user => user.id !== currentUserId);
    }

    return data?.length === 0;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-4 w-4" />;
      case 'gerencia': return <TrendingUp className="h-4 w-4" />;
      case 'sistemas': return <Lock className="h-4 w-4" />;
      case 'supervisores': return <Shield className="h-4 w-4" />;
      case 'administradores': return <UsersIcon className="h-4 w-4" />;
      case 'personalizado': return <Settings className="h-4 w-4" />;
      case 'area_legal': return <Scale className="h-4 w-4" />;
      case 'area_contable': return <UsersIcon className="h-4 w-4" />;
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

  const getPermissionIdsForCategory = (category: string): string[] => {
    const ids: string[] = [];
    availablePermissions
      .filter(p => p.category === category)
      .forEach(p => {
        p.permissions.forEach(perm => ids.push(perm.id));
        p.submenu?.forEach(sub => {
          ids.push(`${sub.id}-view`);
          ids.push(`${sub.id}-edit`);
        });
      });
    return ids;
  };

  const setCategoryPermissions = (category: string, checked: boolean) => {
    const ids = getPermissionIdsForCategory(category);
    setFormData(prev => {
      if (checked) {
        const next = new Set(prev.permissions);
        ids.forEach(id => next.add(id));
        return { ...prev, permissions: Array.from(next) };
      }
      return { ...prev, permissions: prev.permissions.filter(p => !ids.includes(p)) };
    });
  };

  const setAllPermissions = (checked: boolean) => {
    setFormData(prev => {
      if (!checked) return { ...prev, permissions: [] };
      const next = new Set(prev.permissions);
      availablePermissions.forEach(p => {
        p.permissions.forEach(perm => next.add(perm.id));
        p.submenu?.forEach(sub => {
          next.add(`${sub.id}-view`);
          next.add(`${sub.id}-edit`);
        });
      });
      return { ...prev, permissions: Array.from(next) };
    });
  };

  // Permisos por defecto del rol que sí pueden representarse en el árbol
  const getRoleDefaultPermissionIds = (role: string): string[] => {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const treeIds = new Set<string>();
    availablePermissions.forEach(p => {
      p.permissions.forEach(perm => treeIds.add(perm.id));
      p.submenu?.forEach(sub => {
        treeIds.add(`${sub.id}-view`);
        treeIds.add(`${sub.id}-edit`);
      });
    });
    return rolePerms.filter(id => treeIds.has(id));
  };

  const handlePermissionsModeChange = (custom: boolean) => {
    setCustomPermissionsMode(custom);
    if (custom) {
      setFormData(prev => {
        if (prev.permissions.length > 0) return prev;
        return { ...prev, permissions: getRoleDefaultPermissionIds(prev.role) };
      });
    } else {
      setFormData(prev => ({ ...prev, permissions: [] }));
    }
  };

  const getRoleModuleLabels = (role: string): string[] => {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    const labelMap = new Map<string, string>();
    availablePermissions.forEach(p => {
      labelMap.set(p.id, p.label);
      p.submenu?.forEach(sub => labelMap.set(sub.id, sub.label));
    });
    const labels = new Set<string>();
    rolePerms.forEach(permId => {
      const base = permId.replace(/-(view|edit|create|delete|export)$/, '');
      labels.add(labelMap.get(base) || base);
    });
    return Array.from(labels);
  };

  const getRoleAccessInfo = (role: string) => {
    switch (role) {
      case 'super_admin':
        return {
          title: 'Super Admin',
          description: 'Control total del sistema',
          accesses: [
            'Acceso completo a todos los módulos',
            'Gestión de usuarios y roles',
            'Configuración del sistema',
            'Reportes avanzados',
            'Copias de seguridad y restauración',
            'Auditoría completa del sistema'
          ]
        };
      case 'gerencia':
        return {
          title: 'Gerencia',
          description: 'Supervisión estratégica',
          accesses: [
            'Dashboard y métricas clave',
            'Reportes ejecutivos',
            'Aprobación de tickets críticos',
            'Visibilidad de todas las operaciones',
            'Análisis de rendimiento',
            'No puede modificar configuraciones del sistema'
          ]
        };
      case 'sistemas':
        return {
          title: 'Sistemas',
          description: 'Soporte técnico y mantenimiento',
          accesses: [
            'Gestión de servidores y equipos',
            'Soporte técnico avanzado',
            'Mantenimiento preventivo',
            'Configuración técnica',
            'Diagnóstico de problemas',
            'No puede gestionar usuarios'
          ]
        };
      case 'supervisores':
        return {
          title: 'Supervisores',
          description: 'Gestión operativa diaria',
          accesses: [
            'Gestión de tickets asignados',
            'Supervisión de personal',
            'Reportes operativos',
            'Coordinación de tareas',
            'Sin acceso a: Usuarios, Sedes, Servidores, Painpoints, Enviados, Inventario y Mantenimiento'
          ]
        };
      case 'administradores':
        return {
          title: 'Administradores',
          description: 'Gestión administrativa',
          accesses: [
            'Gestión de usuarios básica',
            'Control de accesos',
            'Reportes administrativos',
            'Gestión de ubicaciones',
            'Soporte a usuarios',
            'No puede modificar roles de sistema'
          ]
        };
      case 'area_legal':
        return {
          title: 'Área Legal',
          description: 'Cumplimiento normativo y control de activos',
          accesses: [
            'Acceso a Sutran y visitas futuras',
            'Gestión de accesos MTC',
            'Control e historial de Flota Vehicular',
            'Consulta de Sedes de la organización',
            'Mesa de ayuda y creación de tickets',
            'Sin acceso a: Inventarios, Mantenimiento TI, Cámaras, Servidores, Checklists ni Painpoints'
          ]
        };
      case 'area_contable':
        return {
          title: 'Área Contable',
          description: 'Gestión contable y operativa',
          accesses: [
            'Dashboard principal',
            'Mesa de ayuda (tickets)',
            'Visualización de cámaras',
            'Flota vehicular (solo lectura)',
            'Consulta de sedes',
            'Sin acceso a: Inventario TI, Servidores, Usuarios, Painpoints, Sutran, MTC'
          ]
        };
      case 'personalizado':
        return {
          title: 'Personalizado',
          description: 'Acceso configurado según necesidades',
          accesses: [
            'Permisos configurados manualmente',
            'Acceso según asignación específica',
            'Funcionalidades limitadas',
            'Restricciones personalizadas'
          ]
        };
      default:
        return {
          title: 'Sin rol definido',
          description: 'Permisos básicos',
          accesses: [
            'Permisos no especificados',
            'Contactar al administrador'
          ]
        };
    }
  };

  const handleSubmit = async () => {
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
      username: formData.username || null,
      email: formData.email,
      dni: formData.dni || null,
      role: formData.role,
      location_id: formData.location_id || null,
      phone: formData.phone || null,
      status: formData.status,
      notes: formData.notes || null,
      permissions: customPermissionsMode ? formData.permissions : [],
      updated_at: new Date().toISOString(),
    };

    if (formData.password && formData.password.trim() !== '') {
      dataToSave.password = formData.password;
    } else if (editUser) {
      // En edición, nunca enviar una contraseña vacía: conserva la actual en BD.
      delete dataToSave.password;
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
      notifySuccess(editUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', editUser ? 'Actualizado' : 'Creado');
      onSave();
    } catch (err: any) {
      setErrors({ submit: 'Error inesperado: ' + err });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'role') {
      if (value === 'personalizado') {
        setCustomPermissionsMode(true);
        setFormData(prev => ({ ...prev, role: value }));
      } else if (!customPermissionsMode) {
        setFormData(prev => ({ ...prev, role: value, permissions: [] }));
      } else {
        setFormData(prev => ({ ...prev, role: value }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <MultiStepForm
      title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      subtitle="Módulo de Gestión de Usuarios"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<User size={20} />}
      steps={[
        { title: 'Datos', description: 'Nombre, email, rol, sede' },
        { title: 'Acceso', description: 'Contraseña y estado' },
        { title: 'Permisos', description: 'Configuración de permisos' },
      ]}
    >
      {/* Step 1: Información del Usuario */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Información de Identidad</h3>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setShowRoleInfo(!showRoleInfo)}
              className={`p-1.5 rounded-lg border transition-colors ${showRoleInfo
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'
                }`}
              title={showRoleInfo ? "Cerrar información de roles" : "Ver información de roles y accesos"}
            >
              <HelpCircle size={14} />
            </button>
          </div>
        </div>

        {showRoleInfo && (
          <div className="relative mb-2">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-normal text-blue-900 uppercase tracking-wider">Información de Roles y Accesos</h4>
                <button
                  type="button"
                  onClick={() => setShowRoleInfo(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {['super_admin', 'gerencia', 'sistemas', 'supervisores', 'area_legal', 'area_contable', 'administradores', 'personalizado'].map((role) => {
                  const roleInfo = getRoleAccessInfo(role);
                  return (
                    <div key={role} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getRoleIcon(role)}
                        <span className="text-xs font-normal text-blue-900 uppercase">{roleInfo.title}</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xs text-amber-600 mt-1">Campo protegido - Super Admin</p>
            )}
          </FormField>

          <FormField label="Nombre de Usuario" error={errors.username}>
            <FormInput
              type="text"
              name="username"
              value={formData.username}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/\s/g, '_');
                setFormData(prev => ({ ...prev, username: val }));
              }}
              placeholder="ej: juan_perez"
              error={errors.username}
              disabled={editUser?.role === 'super_admin'}
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
              disabled={editUser?.role === 'super_admin'}
            />
            {editUser?.role === 'super_admin' && (
              <p className="text-xs text-amber-600 mt-1">Campo protegido - Super Admin</p>
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
              <p className="text-xs text-amber-600 mt-1">Campo protegido - Super Admin</p>
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
              <p className="text-xs text-amber-600 mt-1">Campo protegido - Super Admin</p>
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
                <option value="super_admin">Super Administrador (Exclusivo)</option>
              )}
              <option value="gerencia">Gerencia (Gestión Total)</option>
              <option value="sistemas">Sistemas (Acceso Técnico)</option>
              <option value="supervisores">Supervisores (Operaciones)</option>
              <option value="area_legal">Área Legal (Cumplimiento y Flotas)</option>
              <option value="area_contable">Área Contable (Gestión Contable)</option>
              <option value="administradores">Administradores (Gestión)</option>
              <option value="personalizado">Personalizado (Permisos Específicos)</option>
            </FormSelect>

            {formData.role === 'super_admin' && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  Atención: El rol Super Administrador es exclusivo y único.
                  Solo puede existir un usuario con este rol en todo el sistema.
                </p>
              </div>
            )}

            {editUser?.role === 'super_admin' && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  Protegido: Este usuario tiene rol Super Administrador.
                  No se puede modificar su rol ni sus datos de identificación.
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
      </div>

      {/* Step 2: Credenciales y Acceso */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Credenciales y Acceso</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                autoComplete="new-password"
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
                La contraseña debe tener al menos 6 caracteres
              </p>
            )}
            {editUser && (
              <p className="text-blue-600 text-sm mt-1">
                Déjalo en blanco para conservar la contraseña actual
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

        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Configuración de Cuenta</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Step 3: Permisos y Acceso a Módulos */}
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 shrink-0" />
          <h3 className="text-[11px] font-normal text-[#002855] uppercase tracking-wider">Permisos y Acceso a Módulos</h3>
        </div>

        {formData.role === 'super_admin' ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-sm text-blue-800 font-medium">
              El Super Administrador tiene acceso total a todos los módulos del sistema.
            </p>
            <p className="text-xs text-blue-600 mt-2">
              No es posible restringir los permisos de este rol.
            </p>
          </div>
        ) : (
          <>
            {/* Selector de modo de permisos */}
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Elige cómo se asignan los accesos a este usuario:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handlePermissionsModeChange(false)}
                  disabled={formData.role === 'personalizado'}
                  className={`p-4 rounded-lg border text-left transition-colors ${!customPermissionsMode
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                    } ${formData.role === 'personalizado' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Lock size={16} className={!customPermissionsMode ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-900">Permisos del rol</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Usa los accesos predefinidos de <strong>{getRoleAccessInfo(formData.role).title}</strong>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handlePermissionsModeChange(true)}
                  className={`p-4 rounded-lg border text-left transition-colors ${customPermissionsMode
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                    } cursor-pointer`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Settings size={16} className={customPermissionsMode ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-900">Permisos personalizados</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Selecciona manualmente los módulos a los que tendrá acceso
                  </p>
                </button>
              </div>
            </div>

            {customPermissionsMode ? (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-[#002855]">{formData.permissions.length}</span> permisos seleccionados. Los menús pueden expandirse para ver opciones detalladas:
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAllPermissions(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <CheckSquare size={14} /> Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllPermissions(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Square size={14} /> Quitar todos
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {['Principal', 'Operativo', 'Administrativo', 'Sistema'].map((category) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <h4 className="text-sm font-normal text-gray-900 uppercase tracking-wider">
                          {category}
                        </h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCategoryPermissions(category, true)}
                            className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                          >
                            Marcar todo
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryPermissions(category, false)}
                            className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                          >
                            Quitar todo
                          </button>
                        </div>
                      </div>

                      {availablePermissions
                        .filter((permission) => permission.category === category)
                        .map((permission) => (
                          <div key={permission.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
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
                                    title="Incluye crear, editar y eliminar en este módulo"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Editar</span>
                                </label>
                              </div>
                            </div>

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
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Este usuario usará los permisos automáticos del rol <strong>{getRoleAccessInfo(formData.role).title}</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getRoleModuleLabels(formData.role).map((label) => (
                      <span key={label} className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold text-[#002855] bg-[#002855]/5 border border-[#002855]/15 rounded-full uppercase tracking-wider">
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-4">
                    Para otorgar un acceso específico por módulos, cambia a "Permisos personalizados".
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MultiStepForm>
  );
}
