import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Eye, X, Users as UsersIcon, UserCheck, Shield, Crown, Copy, Check, LayoutGrid, List, Lock, Star } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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
    console.log('✏️ Editando usuario:', user);
    setEditingUser(user);
    setShowForm(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
  };

  const handleDeleteUser = async (user: User) => {
    console.log('🗑️ Iniciando eliminación de usuario:', user);

    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario "${user.full_name}"?`)) {
      try {
        console.log(`🗑️ Eliminando usuario: ${user.full_name} (ID: ${user.id})`);
        const { data, error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id)
          .select();

        console.log('📋 Resultado de eliminación:', { data, error });

        if (error) {
          console.error('❌ Error al eliminar usuario:', error);
          alert(`Error al eliminar el usuario: ${error.message}\n\nCódigo: ${error.code}\nDetalles: ${error.details}`);
        } else {
          console.log('✅ Usuario eliminado correctamente');
          // Pequeño delay para asegurar que la base de datos se actualice
          setTimeout(async () => {
            await fetchUsers();
          }, 100);
          alert('Usuario eliminado correctamente');
        }
      } catch (err) {
        console.error('❌ Error inesperado al eliminar usuario:', err);
        alert('Error inesperado al eliminar el usuario: ' + err);
      }
    }
  };

  const handleSaveUser = async () => {
    console.log('💾 Guardando usuario...');
    setShowForm(false);
    setEditingUser(undefined);
    // Pequeño delay para asegurar que la base de datos se actualice
    setTimeout(async () => {
      await fetchUsers();
    }, 100);
    console.log('✅ Usuario guardado y datos actualizados');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(undefined);
  };

  const fetchUsers = async () => {
    console.log('🔄 Recargando usuarios...');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, locations(*)')
        .order('created_at', { ascending: false });

      console.log('📋 Resultado de fetchUsers:', { data, error });

      if (error) {
        console.error('❌ Error al cargar usuarios:', error);
        alert(`Error al cargar usuarios: ${error.message}`);
        return;
      }

      if (data) {
        console.log(`✅ ${data.length} usuarios cargados`);
        setUsers(data);
        calculateStats(data);
      } else {
        console.log('⚠️ No se recibieron datos de usuarios');
        setUsers([]);
        calculateStats([]);
      }
    } catch (err) {
      console.error('❌ Error inesperado al cargar usuarios:', err);
      alert('Error inesperado al cargar usuarios: ' + err);
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
      // Contar por rol
      byRole[user.role] = (byRole[user.role] || 0) + 1;

      // Contar por estado
      if (user.status === 'active') {
        active++;
      } else {
        inactive++;
      }

      // Contar recientes
      if (new Date(user.created_at) > oneWeekAgo) {
        recentlyAdded++;
      }
    });

    setStats({
      total: usersData.length,
      active,
      inactive,
      byRole,
      recentlyAdded
    });
  };



  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    } catch (err) {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedItems(prev => ({ ...prev, [itemId]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }));
      }, 2000);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'supervisor': return <Shield className="h-4 w-4" />;
      case 'technician': return <UserCheck className="h-4 w-4" />;
      case 'user': return <UsersIcon className="h-4 w-4" />;
      case 'custom': return <Lock className="h-4 w-4" />;
      default: return <UsersIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'supervisor': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'technician': return 'bg-green-50 text-green-700 border-green-200';
      case 'user': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'custom': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'technician': return 'Técnico';
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
      {/* Title / Tab Bar */}
      <div className="bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
            <UsersIcon size={20} />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Listado de Usuarios</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
              <span>Gestión Corporativa</span>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <span>{stats.total} Registros</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
            <Star size={18} />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats Grid - More Compact & Executive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Activos', value: stats.total, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Usuarios Activos', value: stats.active, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Administradores', value: stats.byRole.admin || 0, icon: Crown, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Supervisores', value: stats.byRole.supervisor || 0, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Nuevos (7d)', value: stats.recentlyAdded, icon: Plus, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
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


        {/* Control Bar Estilo ERP */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-3 rounded-xl border border-[#e2e8f0] shadow-sm">
          <div className="flex items-center gap-3">
            {canEdit() && (
              <button
                onClick={() => {
                  setEditingUser(undefined);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 bg-[#002855] text-white px-4 py-2 rounded-lg hover:bg-[#003366] transition-all shadow-md active:scale-95 text-sm font-semibold"
              >
                <Plus size={18} />
                Nuevo Usuario
              </button>
            )}

            <div className="h-8 w-px bg-gray-200 mx-2" />

            <div className="flex items-center bg-[#f1f5f9] p-1 rounded-lg border border-[#e2e8f0]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
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
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="font-medium">
              Mostrando <span className="text-[#002855] font-bold">{filteredUsers.length}</span> resultados
            </span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user: User) => (
              <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400/50 transition-all duration-300 flex flex-col group overflow-hidden">
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight mb-2">
                        {user.full_name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${statusColors[user.status as keyof typeof statusColors]}`}>
                      {statusLabels[user.status as keyof typeof statusLabels]}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-700 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50 group/item">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail size={16} className="text-blue-500 shrink-0" />
                        <a href={`mailto:${user.email}`} className="hover:text-blue-600 font-medium truncate">
                          {user.email}
                        </a>
                      </div>
                      <button
                        onClick={() => copyToClipboard(user.email, `email-${user.id}`)}
                        className="text-gray-400 hover:text-blue-600 p-1 hover:bg-white rounded-lg transition-all"
                        title="Copiar email"
                      >
                        {copiedItems[`email-${user.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={12} />}
                      </button>
                    </div>

                    {user.phone && (
                      <div className="flex items-center justify-between text-sm text-gray-700 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100/50 group/item">
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-emerald-500 shrink-0" />
                          <span className="font-medium tracking-tight">{user.phone}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(user.phone || '', `phone-${user.id}`)}
                          className="text-gray-400 hover:text-emerald-600 p-1 hover:bg-white rounded-lg transition-all"
                          title="Copiar teléfono"
                        >
                          {copiedItems[`phone-${user.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    )}

                    {user.locations && (
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                        <MapPin size={14} className="text-blue-500" />
                        <span>{user.locations.name}</span>
                      </div>
                    )}
                  </div>

                  {user.notes && (
                    <p className="text-xs text-gray-500 font-medium italic leading-relaxed line-clamp-2 px-1">
                      "{user.notes}"
                    </p>
                  )}
                </div>

                <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-50 flex gap-2">
                  <button
                    onClick={() => handleViewUser(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                  >
                    <Eye size={16} />
                    DETALLES
                  </button>
                  {canEdit() && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 bg-white text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 bg-white text-rose-500 border border-rose-100 rounded-lg hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-[#e2e8f0] overflow-hidden">
            <div className="overflow-x-auto whitespace-nowrap lg:whitespace-normal">
              <table className="min-w-full table-fixed border-collapse">
                <thead>
                  {/* Header labels */}
                  <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <th className="w-[200px] px-4 py-3 text-left text-[11px] font-bold text-[#475569] uppercase tracking-wider">Usuario</th>
                    <th className="w-[180px] px-4 py-3 text-left text-[11px] font-bold text-[#475569] uppercase tracking-wider">Email / Contacto</th>
                    <th className="w-[140px] px-4 py-3 text-left text-[11px] font-bold text-[#475569] uppercase tracking-wider">Rol / Cargo</th>
                    <th className="w-[120px] px-4 py-3 text-left text-[11px] font-bold text-[#475569] uppercase tracking-wider">Estado</th>
                    <th className="w-[150px] px-4 py-3 text-left text-[11px] font-bold text-[#475569] uppercase tracking-wider">Sede</th>
                    <th className="w-[100px] px-4 py-3 text-right text-[11px] font-bold text-[#475569] uppercase tracking-wider">Acciones</th>
                  </tr>
                  {/* Filter row */}
                  <tr className="bg-white border-b border-[#e2e8f0]">
                    <th className="px-3 py-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          type="text"
                          placeholder="Buscar..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-xs focus:ring-1 focus:ring-[#002855] focus:outline-none"
                        />
                      </div>
                    </th>
                    <th className="px-3 py-2">
                    </th>
                    <th className="px-3 py-2">
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-xs focus:ring-1 focus:ring-[#002855] focus:outline-none"
                      >
                        <option value="">Todos</option>
                        <option value="admin">Admin</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="technician">Técnico</option>
                        <option value="user">Usuario</option>
                        <option value="custom">Personalizado</option>
                      </select>
                    </th>
                    <th className="px-3 py-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded text-xs focus:ring-1 focus:ring-[#002855] focus:outline-none"
                      >
                        <option value="">Todos</option>
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </th>
                    <th className="px-3 py-2">
                    </th>
                    <th className="px-3 py-2">
                      <button
                        onClick={() => { setSearchTerm(''); setRoleFilter(''); setStatusFilter(''); }}
                        className="w-full flex items-center justify-center gap-1 text-[10px] text-[#2563eb] hover:underline font-bold"
                      >
                        <X size={12} /> Limpiar
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredUsers.map((user: User) => (
                    <tr key={user.id} className="hover:bg-[#f8fafc] transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#002855] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {user.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-[#1e293b] truncate uppercase tracking-tight">{user.full_name}</span>
                            <span className="text-[11px] text-[#64748b] font-medium tracking-tight">ID: {user.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-[#1e293b]">
                            <Mail size={14} className="text-[#3b82f6] shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] mt-0.5">
                              <Phone size={12} className="text-[#10b981] shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase border ${getRoleColor(user.role)} shadow-sm`}>
                          {getRoleIcon(user.role)}
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColors[user.status as keyof typeof statusColors]} shadow-sm`}>
                          {statusLabels[user.status as keyof typeof statusLabels]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {user.locations ? (
                          <div className="flex items-center gap-1.5 text-sm text-[#1e293b] font-medium bg-[#f1f5f9] px-2 py-1 rounded border border-[#e2e8f0]">
                            <MapPin size={14} className="text-[#3b82f6] shrink-0" />
                            <span className="truncate">{user.locations.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[#94a3b8] italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="p-1.5 text-[#64748b] hover:text-[#002855] hover:bg-white rounded border border-transparent hover:border-[#e2e8f0] shadow-sm transition-all"
                            title="Ver Perfil"
                          >
                            <Eye size={16} />
                          </button>
                          {canEdit() && (
                            <>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1.5 text-[#64748b] hover:text-[#2563eb] hover:bg-white rounded border border-transparent hover:border-[#e2e8f0] shadow-sm transition-all"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 text-[#64748b] hover:text-[#ef4444] hover:bg-white rounded border border-transparent hover:border-[#e2e8f0] shadow-sm transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
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

        {!loading && filteredUsers.length === 0 && (
          <div className="text-left py-12">
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        )}

        {showForm && (
          <UserForm
            editUser={editingUser}
            onClose={handleCloseForm}
            onSave={handleSaveUser}
          />
        )}

        {viewingUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className={`px-8 py-6 flex items-center justify-between border-b border-gray-100 ${getRoleColor(viewingUser.role).split(' ')[0]} bg-opacity-30`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                    {getRoleIcon(viewingUser.role)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Perfil de Usuario</h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">{getRoleLabel(viewingUser.role)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingUser(undefined)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                {/* Información Personal */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Datos Personales y Perfil</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nombre Completo</label>
                      <p className="text-gray-900 font-bold text-lg leading-tight uppercase">{viewingUser.full_name}</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cargo / Rol</label>
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${getRoleColor(viewingUser.role)}`}>
                        {getRoleIcon(viewingUser.role)}
                        {getRoleLabel(viewingUser.role)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Estado de Cuenta</label>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${statusColors[viewingUser.status as keyof typeof statusColors]}`}>
                        {statusLabels[viewingUser.status as keyof typeof statusLabels]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Canales de Contacto</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Correo Institucional</label>
                      <p className="text-gray-900 font-black font-mono lowercase break-all">{viewingUser.email}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teléfono Móvil</label>
                      <p className="text-gray-900 font-black font-mono tracking-tight">{viewingUser.phone || 'No registrado'}</p>
                    </div>
                  </div>
                </div>

                {/* Asignación */}
                {viewingUser.locations && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Ubicación y Sede</h3>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <MapPin size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase">{viewingUser.locations.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{viewingUser.locations.type}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notas */}
                {viewingUser.notes && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-amber-500 rounded-full" />
                      <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Notas del Perfil</h3>
                    </div>
                    <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                      <p className="text-sm text-amber-950 font-medium italic leading-relaxed whitespace-pre-wrap">"{viewingUser.notes}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setViewingUser(undefined)}
                  className="flex-1 px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  Cerrar
                </button>
                {canEdit() && (
                  <button
                    onClick={() => {
                      setViewingUser(undefined);
                      handleEditUser(viewingUser);
                    }}
                    className="flex-1 px-4 py-3 text-xs font-black text-white uppercase tracking-widest bg-blue-600 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    Editar Usuario
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
