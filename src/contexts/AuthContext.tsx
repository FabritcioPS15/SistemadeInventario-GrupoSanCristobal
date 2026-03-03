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
      return user.permissions.includes(permission);
    }

    const fullAccess = [
      'dashboard', 'inventory', 'cameras', 'maintenance', 'sent', 'checklist', 'painpoint',
      'locations', 'mtc', 'users', 'vacations', 'servers', 'audit', 'integrity', 'flota-vehicular', 'tickets', 'tickets-dashboard', 'tickets-mine', 'tickets-reports', 'my-chats', 'painpoint',
      'inventory-pc', 'inventory-celular', 'inventory-dvr', 'inventory-impresora', 'inventory-escaner',
      'inventory-monitor', 'inventory-laptop', 'inventory-proyector', 'inventory-switch', 'inventory-chip',
      'inventory-tinte', 'inventory-fuente', 'inventory-ram', 'inventory-disco', 'inventory-disco-extraido',
      'inventory-maquinaria', 'inventory-otros', 'spare-parts',
      'cameras-revision', 'cameras-escuela', 'cameras-policlinico', 'cameras-circuito',
      'maintenance-pending', 'maintenance-in-progress', 'maintenance-completed',
      'maintenance-preventive', 'maintenance-corrective',
      'sent-lima', 'sent-provincias',
      'checklist-escon', 'checklist-ecsal', 'checklist-citv'
    ];

    const rolePermissions: Record<string, string[]> = {
      systems: fullAccess,
      management: fullAccess,
      admin: fullAccess,
      supervisor: fullAccess,
      user: fullAccess,
      custom: []
    };

    return rolePermissions[user.role as keyof typeof rolePermissions]?.includes(permission) || false;
  };


  const canEdit = (): boolean => {
    if (!user) return false;
    const allowedRoles = ['systems', 'management', 'admin', 'technician'];
    return allowedRoles.includes(user.role);
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
