import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  useEffect(() => {
    // Verificar si hay una sesión activa al cargar la app
    checkSession();
  }, []);

  // Update localStorage when user changes (if they opted in)
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem('auth_user');
      if (saved) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
    }
  }, [user]);

  // Subscribe to realtime changes for the current user
  useEffect(() => {
    if (!user?.id) return;

    const userSubscription = supabase
      .channel(`user-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`
      }, async (payload) => {
        // Fetch the complete updated user data
        const { data: updatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (updatedUser) {
          setUser(updatedUser as User);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(userSubscription);
    };
  }, [user?.id]);

  const checkSession = async () => {
    try {
      // 1. Verificar si hay usuario en localStorage
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);

        // Refrescar datos desde la DB para asegurar que tenemos location_id y permisos actualizados
        const { data: freshUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', parsedUser.id)
          .single();

        if (freshUser) {
          setUser(freshUser as User);
          localStorage.setItem('auth_user', JSON.stringify(freshUser));
        } else {
          setUser(parsedUser);
        }
      }

      // 2. Verificar si hay usuarios sin contraseñas configuradas (lógica original)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, password')
        .eq('status', 'active');

      if (usersData && usersData.length > 0) {
        const hasPasswordUsers = usersData.some(user => user.password && user.password.trim() !== '');
        if (!hasPasswordUsers) {
          setNeedsPasswordSetup(true);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: User, remember: boolean = false) => {
    setUser(userData);
    if (remember) {
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('auth_user');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Si el usuario tiene permisos específicos definidos, usarlos con prioridad
    if (user.permissions && user.permissions.length > 0) {
      // Para usuarios personalizados, verificar si tiene el permiso específico
      if (user.role === 'personalizado') {
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
      
      // Para otros roles con permisos personalizados, usar lógica normal
      return user.permissions.includes(permission);
    }

    // Super Administrador tiene acceso absoluto a todo
    if (user.role === 'super_admin') {
      return true;
    }

    // Definir permisos por rol según la nueva jerarquía
    const rolePermissions: Record<string, string[]> = {
      // Super Admin: Acceso absoluto a todo
      super_admin: [
        'dashboard-view', 'dashboard-edit',
        'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
        'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',
        'checklist-view', 'checklist-edit', 'checklist-create',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-view', 'flota-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'servers-view', 'servers-edit',
        'painpoint-view', 'painpoint-create', 'painpoint-edit',
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
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-view', 'flota-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'painpoint-view', 'painpoint-create', 'painpoint-edit',
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
        'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
        'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
        'inventory-disco-extraido-view', 'inventory-maquinaria-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-view', 'flota-edit',
        'users-view', 'users-create', 'users-edit', 'users-delete',
        'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
        'sutran-view', 'sutran-edit',
        'mtc-view', 'mtc-edit',
        'servers-view', 'servers-edit',
        'painpoint-view', 'painpoint-create', 'painpoint-edit',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view',
        'audit-view', 'audit-export'
      ],
      
      // Supervisores: Acceso a operaciones básicas y gestión de su equipo
      supervisores: [
        'dashboard-view',
        'tickets-view', 'tickets-create', 'tickets-edit',
        'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view',
        'checklist-view', 'checklist-edit',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'inventory-view', 'inventory-create', 'inventory-edit',
        'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
        'flota-view', 'flota-edit',
        'locations-view', 'sutran-view', 'mtc-view',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view'
      ],
      
      // Administradores: Acceso a gestión básica
      administradores: [
        'dashboard-view',
        'tickets-view', 'tickets-create',
        'tickets-mine-view',
        'checklist-view', 'checklist-edit',
        'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
        'inventory-view', 'inventory-create', 'inventory-edit',
        'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
        'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view',
        'cameras-view', 'cameras-edit',
        'cameras-revision-view', 'cameras-escuela-view',
        'maintenance-view', 'maintenance-create', 'maintenance-edit',
        'maintenance-pending-view', 'maintenance-in-progress-view',
        'locations-view', 'mtc-view',
        'sent-view', 'sent-create', 'sent-edit',
        'sent-lima-view', 'sent-provincias-view'
      ],
      
      // Personalizado: Sin permisos por defecto, se configuran individualmente
      personalizado: []
    };

    return rolePermissions[user.role as keyof typeof rolePermissions]?.includes(permission) || false;
  };


  const canEdit = (): boolean => {
    if (!user) {
      console.log('❌ canEdit: No user found');
      return false;
    }
    
    // Roles que pueden editar según la nueva jerarquía
    const allowedRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];
    const hasPermission = allowedRoles.includes(user.role);
    
    console.log('🔍 canEdit check:', {
      userRole: user.role,
      allowedRoles,
      hasPermission,
      userId: user.id,
      userFullName: user.full_name
    });
    
    return hasPermission;
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // El estado se actualizará automáticamente vía Realtime subscription
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
