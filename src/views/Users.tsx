import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Mail, MapPin, Eye, X, Users as UsersIcon, Shield, Crown, LayoutGrid, List, Lock, Star, Settings, TrendingUp, User as UserIcon, HelpCircle } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { supabase } from '../lib/supabase';
import UserForm from '../components/forms/UserForm';
import { useAuth } from '../contexts/AuthContext';

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  location_id?: string;
  phone?: string;
  status: 'active' | 'inactive';
  notes?: string;
  permissions?: string[];
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  locations?: {
    id: string;
    name: string;
    type: string;
  };
};

export default function Users() {
  const { canEdit } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [viewingUser, setViewingUser] = useState<User | undefined>();
  const [searchTerm] = useState('');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showRoleInfo, setShowRoleInfo] = useState(false);

  // Debug logging before render
  const canEditValue = canEdit();

  const handleNewUserClick = () => {
    
    setEditingUser(undefined);
    setShowForm(true);
    
  };

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    byRole: {} as Record<string, number>,
    recentlyAdded: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchUsers();
    setLoading(false);
  };

  const handleEditUser = (user: User) => {
    if (user.role === 'super_admin') {
      alert('🔒 No se puede editar al Super Administrador. Este usuario está protegido y no se pueden modificar sus datos.');
      return;
    }
    setEditingUser(user);
    setShowForm(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };

  const handleDeleteUser = async (user: User) => {
    if (user.role === 'super_admin') {
      alert('❌ No se puede eliminar al Super Administrador. Este rol es protegido y exclusivo del sistema.');
      return;
    }

    const confirmMessage = user.role === 'gerencia' || user.role === 'sistemas' 
      ? `⚠️ ADVERTENCIA: Estás a punto de eliminar a un usuario con rol de ${user.role === 'gerencia' ? 'Gerencia' : 'Sistemas'}. Esta acción es crítica.\n\n¿Estás seguro de que quieres eliminar al usuario "${user.full_name}"?`
      : `¿Estás seguro de que quieres eliminar al usuario "${user.full_name}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);

        if (error) throw error;

        await fetchUsers();
        alert('✅ Usuario eliminado correctamente');
      } catch (err: any) {
        console.error('Error al eliminar usuario:', err);
        alert('❌ Error: ' + err.message);
      }
    }
  };

  const handleSaveUser = async () => {
    setShowForm(false);
    setEditingUser(undefined);
    setTimeout(async () => {
      await fetchUsers();
    }, 100);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(undefined);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, locations(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setUsers(data as User[]);
        calculateStats(data as User[]);
      }
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const calculateStats = (usersData: User[]) => {
    const byRole: Record<string, number> = {};
    let active = 0;
    let inactive = 0;
    let recentlyAdded = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    usersData.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
      if (user.status === 'active') active++;
      else inactive++;
      if (new Date(user.created_at) > oneWeekAgo) recentlyAdded++;
    });

    setStats({
      total: usersData.length,
      active,
      inactive,
      byRole,
      recentlyAdded
    });
  };

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'gerencia': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'sistemas': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'supervisores': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'administradores': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'personalizado': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'gerencia': return 'Gerencia';
      case 'sistemas': return 'Sistemas';
      case 'supervisores': return 'Supervisores';
      case 'administradores': return 'Administradores';
      case 'personalizado': return 'Personalizado';
      default: return role;
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
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
            ' Control de accesos',
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

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Standard Application Header (h-14) */}
      <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <UsersIcon size={20} />
          </div>
          <div className="hidden lg:block">
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Gestión de Usuarios</h2>
          </div>
        </div>



        <div className="flex items-center gap-2">
          {canEditValue && (
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
              <button
                onClick={handleNewUserClick}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors"
                title="Nuevo Usuario"
              >
                <Plus size={22} />
              </button>
            </div>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Tarjeta unificada para modo responsive */}
        <div className="lg:hidden bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[#002855] uppercase tracking-widest">Resumen de Usuarios</h3>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <UsersIcon size={16} />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <p className="text-lg font-black text-blue-600">{stats.active}</p>
              <p className="text-[6px] font-bold text-blue-400 uppercase tracking-widest">Activos</p>
            </div>
            <div>
              <p className="text-lg font-black text-purple-600">{stats.byRole.super_admin || 0}</p>
              <p className="text-[6px] font-bold text-purple-400 uppercase tracking-widest">Admin</p>
            </div>
            <div>
              <p className="text-lg font-black text-amber-600">{stats.byRole.gerencia || 0}</p>
              <p className="text-[6px] font-bold text-amber-400 uppercase tracking-widest">Gerencia</p>
            </div>
            <div>
              <p className="text-lg font-black text-rose-600">{stats.byRole.sistemas || 0}</p>
              <p className="text-[6px] font-bold text-rose-400 uppercase tracking-widest">Sistemas</p>
            </div>
            <div>
              <p className="text-lg font-black text-indigo-600">{stats.recentlyAdded}</p>
              <p className="text-[6px] font-bold text-indigo-400 uppercase tracking-widest">Nuevos</p>
            </div>
          </div>
        </div>

        {/* Tarjetas separadas para modo desktop */}
        <div className="hidden lg:grid grid-cols-5 gap-4">
          {[
            { label: 'Total Activos', value: stats.active, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Super Admin', value: stats.byRole.super_admin || 0, icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Gerencia', value: stats.byRole.gerencia || 0, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Sistemas', value: stats.byRole.sistemas || 0, icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Nuevos (7d)', value: stats.recentlyAdded, icon: Plus, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-[#002855]">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                  <stat.icon size={18} />
                </div>
              </div>
              <div className={`absolute -right-2 -bottom-2 w-16 h-16 ${stat.bg} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
            </div>
          ))}
        </div>

        {/* Control Bar */}
        <div className="flex flex-col gap-4 bg-white p-3 sm:p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-50'}`}
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  title="Vista Lista"
                >
                  <List size={18} />
                </button>
              </div>

              <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />

              <div className="grid grid-cols-2 gap-2 flex-1 sm:flex-none">
                <div className="relative flex gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#64748b] outline-none hover:border-[#002855] transition-all"
                  >
                    <option value="">ROLES</option>
                    <option value="super_admin">SUPER ADMIN</option>
                    <option value="gerencia">GERENCIA</option>
                    <option value="sistemas">SISTEMAS</option>
                    <option value="supervisores">SUPERVISORES</option>
                    <option value="administradores">ADMINISTRADORES</option>
                    <option value="personalizado">PERSONALIZADO</option>
                  </select>
                  
                  <button
                    onClick={() => setShowRoleInfo(!showRoleInfo)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      showRoleInfo 
                        ? 'bg-[#002855] border-[#002855] text-white' 
                        : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-[#002855] hover:border-[#002855]'
                    }`}
                    title={showRoleInfo ? "Cerrar información de roles" : "Ver información de roles y accesos"}
                  >
                    <HelpCircle size={14} />
                  </button>
                  
                  {/* Tooltip con información de roles */}
                  {showRoleInfo && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-[#e2e8f0] p-4 z-50 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-[#002855] uppercase tracking-wider">Información de Roles y Accesos</h4>
                        <button
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
                                <span className="text-xs font-black text-[#002855] uppercase">{roleInfo.title}</span>
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
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#64748b] outline-none hover:border-[#002855] transition-all"
                >
                  <option value="">ESTADOS</option>
                  <option value="active">ACTIVO</option>
                  <option value="inactive">INACTIVO</option>
                </select>
              </div>
            </div>

            <div className="text-[10px] font-black text-[#64748b] uppercase tracking-widest text-right">
              {filteredUsers.length} Usuarios
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#002855]"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col group overflow-hidden">
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-[#002855] text-white flex items-center justify-center text-sm font-black overflow-hidden flex-shrink-0">
                      {u.avatar_url ? (
                        <img 
                          src={u.avatar_url} 
                          alt={u.full_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Si la imagen falla al cargar, mostrar la inicial
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = `<div class="w-full h-full bg-[#002855] text-white flex items-center justify-center text-sm font-black">${u.full_name?.charAt(0) || '?'}</div>`;
                          }}
                        />
                      ) : (
                        u.full_name?.charAt(0) || '?'
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-[#002855] uppercase tracking-tight mb-2 truncate" title={u.full_name}>
                        {u.full_name}
                      </h3>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                        {getRoleIcon(u.role)}
                        {getRoleLabel(u.role)}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${statusColors[u.status]}`}>
                      {statusLabels[u.status]}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100 group/item">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={14} className="text-blue-500 shrink-0" />
                        <span className="font-bold truncate">{u.email}</span>
                      </div>
                    </div>

                    {u.locations && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 hidden sm:block">
                        <MapPin size={14} className="text-rose-500" />
                        <span>{u.locations.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleViewUser(u)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                  >
                    <Eye size={14} />
                    Ver
                  </button>
                  
                  {canEditValue && u.role !== 'super_admin' && (
                    <button
                      onClick={() => handleEditUser(u)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                  )}
                  
                  {u.role === 'super_admin' && (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed shadow-sm"
                      title="Protegido - No se puede editar"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                  )}
                  
                  {canEditValue && u.role !== 'super_admin' && (
                    <button
                      onClick={() => handleDeleteUser(u)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all active:scale-95 shadow-sm"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  )}
                  
                  {u.role === 'super_admin' && (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed shadow-sm"
                      title="Protegido - No se puede eliminar"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
) : (
  <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[#e2e8f0]">
        <thead className="bg-[#f8fafc]">
          <tr>
            <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Nombre del Usuario</th>
            <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Correo Electrónico</th>
            <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Cargo / Rol</th>
            <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Estado</th>
            <th className="px-6 py-3 text-left text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Sede</th>
            <th className="px-6 py-3 text-right text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e8f0] bg-white">
          {filteredUsers.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#002855] text-white flex items-center justify-center text-xs font-black overflow-hidden">
                    {u.avatar_url ? (
                      <img 
                        src={u.avatar_url} 
                        alt={u.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si la imagen falla al cargar, mostrar la inicial
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `<div class="w-full h-full bg-[#002855] text-white flex items-center justify-center text-xs font-black">${u.full_name?.charAt(0) || '?'}</div>`;
                        }}
                      />
                    ) : (
                      u.full_name?.charAt(0) || '?'
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">{u.full_name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-gray-600 font-mono">{u.email}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                  {getRoleIcon(u.role)}
                  {getRoleLabel(u.role)}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm ${statusColors[u.status]}`}>
                  {statusLabels[u.status]}
                </span>
              </td>
              <td className="px-6 py-4 hidden sm:block">
                {u.locations ? (
                  <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">{u.locations.name}</span>
                ) : (
                  <span className="text-gray-300 italic text-xs">Sin asignar</span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleViewUser(u)} className="p-2 text-gray-400 hover:text-[#002855] hover:bg-white rounded-lg shadow-sm"><Eye size={16} /></button>
                  {canEdit() && (
                    <>
                      <button onClick={() => handleEditUser(u)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg shadow-sm"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteUser(u)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg shadow-sm"><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      </div>

      {/* Modals */}
      {showForm && (
        <UserForm
          editUser={editingUser}
          onClose={handleCloseForm}
          onSave={handleSaveUser}
        />
      )}

      {viewingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className={`px-8 py-6 flex items-center justify-between border-b border-gray-100 ${getRoleColor(viewingUser.role).split(' ')[0]} bg-opacity-30`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">{getRoleIcon(viewingUser.role)}</div>
                <div>
                  <h3 className="text-lg font-black text-[#002855] uppercase tracking-tight">Ficha de Usuario</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{getRoleLabel(viewingUser.role)}</p>
                </div>
              </div>
              <button onClick={() => setViewingUser(undefined)} className="text-gray-400 hover:text-gray-600 p-2"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-[#002855] text-white flex items-center justify-center text-lg font-black overflow-hidden flex-shrink-0">
                    {viewingUser.avatar_url ? (
                      <img 
                        src={viewingUser.avatar_url} 
                        alt={viewingUser.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Si la imagen falla al cargar, mostrar la inicial
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `<div class="w-full h-full bg-[#002855] text-white flex items-center justify-center text-lg font-black">${viewingUser.full_name?.charAt(0) || '?'}</div>`;
                        }}
                      />
                    ) : (
                      viewingUser.full_name?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nombre Completo</label>
                    <p className="text-lg font-black text-[#002855] uppercase">{viewingUser.full_name}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                  <p className="text-xs font-bold font-mono text-gray-700 truncate">{viewingUser.email}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Sede</label>
                  <p className="text-xs font-bold text-gray-700">{viewingUser.locations?.name || 'N/A'}</p>
                </div>
              </div>

              {viewingUser.notes && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <p className="text-sm font-medium italic text-amber-900 leading-relaxed">"{viewingUser.notes}"</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button onClick={() => setViewingUser(undefined)} className="flex-1 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
