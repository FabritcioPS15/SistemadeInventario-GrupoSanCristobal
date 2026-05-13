import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../services/api';

type User = {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  role: string;
  location_id?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  permissions?: string[];
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  login: (user: User, remember?: boolean) => void;
  logout: () => void;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  canEdit: () => boolean;
  needsPasswordSetup: boolean;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const mountedRef = useRef(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar la app
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        if (mountedRef.current) {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const login = (userData: User, remember: boolean = false) => {
    if (mountedRef.current) {
      setUser(userData);
      if (remember) {
        localStorage.setItem('auth_user', JSON.stringify(userData));
      } else {
        localStorage.removeItem('auth_user');
      }
    }
  };

  const logout = () => {
    if (mountedRef.current) {
      setUser(null);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('token'); // Limpiar token de NestJS
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Super Administrador tiene acceso absoluto a todo
    if (user.role === 'super_admin') {
      return true;
    }

    // Para rol personalizado, usar permisos específicos definidos
    if (user.role === 'personalizado') {
      if (!user.permissions || user.permissions.length === 0) {
        return false;
      }
      
      // Verificar permiso exacto (ej: 'tickets-view', 'tickets-edit')
      if (user.permissions.includes(permission)) {
        return true;
      }
      
      // Si solicita un permiso de submenú (ej: 'tickets-dashboard'), verificar si tiene acceso al módulo principal
      const modulePermission = permission.includes('-') ? permission.split('-')[0] : permission;
      if (user.permissions.includes(`${modulePermission}-view`) || user.permissions.includes(`${modulePermission}-edit`)) {
        return true;
      }
      
      return false;
    }

    // Para roles predefinidos, usar los permisos del rol
    const rolePermissions: Record<string, string[]> = {
      // Super Admin: Acceso absoluto a todo
      super_admin: [
        'dashboard-view', 'dashboard-edit',
        'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
        'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',
        'checklist-view', 'checklist-edit', 'checklist-create',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'checklist-interactive-view',
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-vehicular-view', 'flota-vehicular-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'servers-view', 'servers-edit',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view',
        'audit-view', 'audit-export'
      ],
      
      // Gerencia: Acceso completo a todo excepto configuración crítica del sistema
      gerencia: [
        'dashboard-view', 'dashboard-edit',
        'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
        'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',
        'checklist-view', 'checklist-edit', 'checklist-create',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'checklist-interactive-view',
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-vehicular-view', 'flota-vehicular-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view',
        'audit-view', 'audit-export'
      ],
      
      // Sistemas: Acceso completo a todo lo técnico y configuración
      sistemas: [
        'dashboard-view', 'dashboard-edit',
        'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
        'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',
        'checklist-view', 'checklist-edit', 'checklist-create',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'checklist-interactive-view',
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-vehicular-view', 'flota-vehicular-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'servers-view', 'servers-edit',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view',
        'audit-view', 'audit-export'
      ],
      
      // Supervisores: Acceso total igualado a Sistemas
      supervisores: [
        'dashboard-view', 'dashboard-edit',
        'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
        'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',
        'checklist-view', 'checklist-edit', 'checklist-create',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'checklist-interactive-view',
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-vehicular-view', 'flota-vehicular-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'servers-view', 'servers-edit',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view',
        'audit-view', 'audit-export'
      ],
      
      // Administradores: Acceso limitado - solo visualización y gestión básica
      administradores: [
        'dashboard-view',
        'tickets-view', 'tickets-create', 'tickets-edit',
        'tickets-dashboard-view', 'tickets-mine-view',
        'checklist-view', 'checklist-edit',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'spare-parts-view',
        'cameras-view', // Solo ver cámaras de su sede
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', // Solo cámaras de su sede
        'flota-vehicular-view', // Solo ver flota
        'locations-view', // Solo ver sedes, no editar
        'sutran-view', // Solo ver sutran
        'sent-lima-view', 'sent-provincias-view'
      ],
      
      // Personalizado: Permisos básicos de tickets por defecto
      personalizado: ['tickets-view', 'tickets-edit']
    };

    // Para permisos base del sidebar (ej: 'dashboard', 'tickets'), verificar si tiene acceso al módulo
    const rolePerms = rolePermissions[user.role as keyof typeof rolePermissions] || [];
    const hasModuleAccess = rolePerms.some(p => 
      p === `${permission}-view` || 
      p === `${permission}-create` || 
      p === `${permission}-edit` || 
      p === `${permission}-delete` ||
      p === permission
    );

    if (hasModuleAccess) return true;

    // Fallback: Si es un sub-permiso (contiene guion o empieza con 'sub-'), 
    // verificar si tiene acceso al módulo principal
    const modulePrefix = permission.startsWith('sub-') ? 'inventory' : permission.split('-')[0];
    return rolePerms.some(p => p.startsWith(`${modulePrefix}-`));
  };


  const canEdit = (): boolean => {
    if (!user) {
      return false;
    }
    
    // Roles que pueden editar según la nueva jerarquía
    const allowedRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];
    const hasPermission = allowedRoles.includes(user.role);
    
    return hasPermission;
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) return;

    try {
      await api.patch(`/users/${user.id}`, updates);
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    hasPermission,
    canEdit,
    needsPasswordSetup,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
