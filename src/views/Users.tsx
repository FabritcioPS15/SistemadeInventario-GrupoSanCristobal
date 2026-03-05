import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Mail, MapPin, Eye, X, Users as UsersIcon, UserCheck, Shield, Crown, LayoutGrid, List, Lock, Star } from 'lucide-react';
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

  // Debug logging before render
  const canEditValue = canEdit();
  console.log('🔍 About to render button - canEditValue:', canEditValue);

  const handleNewUserClick = () => {
    console.log('🔘 Botón Nuevo Usuario clickeado');
    console.log('🔍 Before state change - showForm:', showForm);
    console.log('🔍 Before state change - editingUser:', editingUser);
    
    setEditingUser(undefined);
    setShowForm(true);
    
    console.log('🔍 After state change - showForm should be true');
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
    setEditingUser(user);
    setShowForm(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${user.full_name}"?`)) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);

        if (error) throw error;

        await fetchUsers();
        alert('Usuario eliminado correctamente');
      } catch (err: any) {
        console.error('Error al eliminar usuario:', err);
        alert('Error: ' + err.message);
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
      case 'systems': return <Lock className="h-4 w-4" />;
      case 'management': return <Crown className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'supervisor': return <UserCheck className="h-4 w-4" />;
      case 'user': return <UsersIcon className="h-4 w-4" />;
      default: return <UsersIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'systems': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'management': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'admin': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'supervisor': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'user': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'systems': return 'Sistemas';
      case 'management': return 'Gerencia';
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'user': return 'Usuario';
      case 'custom': return 'Personalizado';
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
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Activos', value: stats.active, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Sistemas', value: stats.byRole.systems || 0, icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Gerencia', value: stats.byRole.management || 0, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Admin/Super', value: (stats.byRole.admin || 0) + (stats.byRole.supervisor || 0), icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
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
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#64748b] outline-none hover:border-[#002855] transition-all"
                >
                  <option value="">ROLES</option>
                  <option value="systems">SISTEMAS</option>
                  <option value="management">GERENCIA</option>
                  <option value="admin">ADMIN</option>
                  <option value="supervisor">SUPER</option>
                  <option value="user">USUARIO</option>
                </select>

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
                  <div className="flex items-start justify-between mb-6">
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
                    <Eye size={14} /> DETALLES
                  </button>
                  {canEdit() && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditUser(u)}
                        className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                          <div className="w-8 h-8 rounded-lg bg-[#002855] text-white flex items-center justify-center text-xs font-black">
                            {u.full_name?.charAt(0)}
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nombre Completo</label>
                <p className="text-lg font-black text-[#002855] uppercase">{viewingUser.full_name}</p>
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
