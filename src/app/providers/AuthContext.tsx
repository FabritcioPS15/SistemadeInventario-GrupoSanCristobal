import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';

import { supabase } from '../../shared/services/supabase';
import { ROLE_PERMISSIONS } from '../../shared/roles';

type User = {
  id: string;
  full_name: string;
  email: string;
  username?: string;
  password?: string;
  role: string;
  location_id?: string;
  location_ids?: string[]; // Array de sedes a las que tiene acceso el usuario
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
      }, async () => {
        // Fetch the complete updated user data
        const { data: updatedUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (updatedUser && mountedRef.current) {
          // Recargar location_ids también
          const { data: userLocations } = await supabase
            .from('user_locations')
            .select('location_id')
            .eq('user_id', user.id);

          const locationIds = userLocations?.map(ul => ul.location_id) || [];

          setUser({
            ...updatedUser as User,
            location_ids: locationIds
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_locations',
        filter: `user_id=eq.${user.id}`
      }, async () => {
        // Recargar location_ids cuando cambian los accesos
        const { data: userLocations } = await supabase
          .from('user_locations')
          .select('location_id')
          .eq('user_id', user.id);

        const locationIds = userLocations?.map(ul => ul.location_id) || [];

        if (mountedRef.current && user) {
          setUser({
            ...user,
            location_ids: locationIds
          });
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
        // También cargar las sedes a las que tiene acceso el usuario
        const { data: freshUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', parsedUser.id)
          .single();

        if (freshUser && mountedRef.current) {
          // Cargar las sedes a las que tiene acceso el usuario
          const { data: userLocations } = await supabase
            .from('user_locations')
            .select('location_id')
            .eq('user_id', freshUser.id);

          const locationIds = userLocations?.map(ul => ul.location_id) || [];

          setUser({
            ...freshUser as User,
            location_ids: locationIds
          });
          localStorage.setItem('auth_user', JSON.stringify({
            ...freshUser,
            location_ids: locationIds
          }));
        } else if (mountedRef.current) {
          setUser(parsedUser);
        }
      }

      // 2. Verificar si hay usuarios sin contraseñas configuradas (lógica original)
      const { data: usersData } = await supabase
        .from('users')
        .select('id, password')
        .eq('status', 'active');

      if (usersData && usersData.length > 0 && mountedRef.current) {
        const hasPasswordUsers = usersData.some(user => user.password && user.password.trim() !== '');
        if (!hasPasswordUsers) {
          setNeedsPasswordSetup(true);
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
    }
  };

  /**
   * Permisos efectivos de un usuario:
   * - Super Admin: acceso absoluto.
   * - Si el usuario tiene permisos personalizados (permissions no vacío),
   *   estos tienen prioridad sobre los permisos del rol.
   * - De lo contrario, se usan los permisos por defecto del rol.
   */
  const getEffectivePermissions = (): string[] => {
    if (!user) return [];
    if (user.role === 'super_admin') return ['*'];
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions;
    }
    // El rol personalizado requiere permisos explícitos
    if (user.role === 'personalizado') return [];
    return ROLE_PERMISSIONS[user.role] || [];
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Super Administrador tiene acceso absoluto a todo
    if (user.role === 'super_admin') return true;

    const perms = getEffectivePermissions();
    if (perms.length === 0) return false;

    // Verificar permiso exacto (ej: 'tickets-view', 'tickets-edit')
    if (perms.includes(permission)) return true;

    // Si solicita un permiso de sub-módulo (ej: 'tickets-dashboard', 'inventory-pc'),
    // verificar si tiene acceso al módulo principal (ej: 'tickets-view', 'inventory-view')
    const modulePrefix = permission.startsWith('sub-') ? 'inventory' : permission.split('-')[0];
    return perms.some(p => p.startsWith(`${modulePrefix}-`));
  };

  const canEdit = (): boolean => {
    if (!user) return false;

    // Super Admin siempre puede editar
    if (user.role === 'super_admin') return true;

    // Roles que pueden editar según la jerarquía
    const baseRoles = ['gerencia', 'sistemas', 'supervisores', 'area_legal', 'area_contable'];
    if (!baseRoles.includes(user.role)) return false;

    // Si el usuario tiene permisos personalizados, respetarlos:
    // solo puede editar si tiene al menos un permiso de escritura (edit/create/delete/export)
    if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      return user.permissions.some(p =>
        p.endsWith('-edit') ||
        p.endsWith('-create') ||
        p.endsWith('-delete') ||
        p.endsWith('-export')
      );
    }

    return true;
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
