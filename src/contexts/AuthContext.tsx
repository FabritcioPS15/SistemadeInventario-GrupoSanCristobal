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
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  canEdit: () => boolean;
  needsPasswordSetup: boolean;
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

  const checkSession = async () => {
    try {
      // Verificar si hay usuarios sin contraseñas configuradas
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'active');

      if (usersData && usersData.length > 0) {
        // Verificar si alguno de estos usuarios tiene contraseña
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

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions = {
      admin: [
        // Menús principales
        'dashboard', 'inventory', 'cameras', 'maintenance', 'sent', 'sutran', 'checklist',
        'locations', 'mtc', 'users', 'vacations', 'servers', 'audit', 'integrity', 'flota-vehicular',
        // Submenús de inventario
        'inventory-pc', 'inventory-celular', 'inventory-dvr',
        'inventory-impresora', 'inventory-escaner', 'inventory-monitor', 'inventory-laptop',
        'inventory-proyector', 'inventory-switch', 'inventory-chip', 'inventory-tinte',
        'inventory-fuente', 'inventory-ram', 'inventory-disco', 'inventory-disco-extraido',
        'spare-parts',
        // Submenús de cámaras
        'cameras-revision', 'cameras-escuela', 'cameras-policlinico', 'cameras-circuito',
        // Submenús de mantenimiento
        'maintenance-pending', 'maintenance-in-progress', 'maintenance-completed',
        'maintenance-preventive', 'maintenance-corrective',
        // Submenús de enviados
        'sent-lima', 'sent-provincias',
        // Submenús de checklist
        'checklist-escon', 'checklist-ecsal', 'checklist-citv'
      ],
      supervisor: [
        // Menús principales
        'dashboard', 'inventory', 'cameras', 'maintenance', 'sent', 'sutran', 'checklist',
        'locations', 'users', 'vacations', 'flota-vehicular',
        // Submenús de inventario
        'inventory-pc', 'inventory-celular', 'inventory-dvr',
        'inventory-impresora', 'inventory-escaner', 'inventory-monitor', 'inventory-laptop',
        'inventory-proyector', 'inventory-switch', 'inventory-chip', 'inventory-tinte',
        'inventory-fuente', 'inventory-ram', 'inventory-disco', 'inventory-disco-extraido',
        // Submenús de cámaras
        'cameras-revision', 'cameras-escuela', 'cameras-policlinico', 'cameras-circuito',
        // Submenús de mantenimiento
        'maintenance-pending', 'maintenance-in-progress', 'maintenance-completed',
        'maintenance-preventive', 'maintenance-corrective',
        // Submenús de enviados
        'sent-lima', 'sent-provincias',
        // Submenús de checklist
        'checklist-escon', 'checklist-ecsal', 'checklist-citv'
      ],
      technician: [
        // Menús principales
        'dashboard', 'inventory', 'cameras', 'maintenance', 'sent', 'sutran', 'checklist',
        'locations', 'users', 'vacations', 'flota-vehicular',
        // Submenús de inventario
        'inventory-pc', 'inventory-celular', 'inventory-dvr',
        'inventory-impresora', 'inventory-escaner', 'inventory-monitor', 'inventory-laptop',
        'inventory-proyector', 'inventory-switch', 'inventory-chip', 'inventory-tinte',
        'inventory-fuente', 'inventory-ram', 'inventory-disco', 'inventory-disco-extraido',
        // Submenús de cámaras
        'cameras-revision', 'cameras-escuela', 'cameras-policlinico', 'cameras-circuito',
        // Submenús de mantenimiento
        'maintenance-pending', 'maintenance-in-progress', 'maintenance-completed',
        'maintenance-preventive', 'maintenance-corrective',
        // Submenús de enviados
        'sent-lima', 'sent-provincias',
        // Submenús de checklist
        'checklist-escon', 'checklist-ecsal', 'checklist-citv'
      ],
      user: [
        'dashboard', 'cameras',
        // Submenús de cámaras
        'cameras-revision', 'cameras-escuela', 'cameras-policlinico', 'cameras-circuito'
      ]
    };

    return rolePermissions[user.role as keyof typeof rolePermissions]?.includes(permission) || false;
  };

  const canEdit = (): boolean => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'technician';
  };

  const value = {
    user,
    login,
    logout,
    loading,
    hasPermission,
    canEdit,
    needsPasswordSetup,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
