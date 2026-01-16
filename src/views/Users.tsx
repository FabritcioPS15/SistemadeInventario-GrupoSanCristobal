import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Eye, X, Users as UsersIcon, UserCheck, Shield, Crown, Copy, Check, LayoutGrid, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
      default: return <UsersIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'supervisor': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'technician': return 'bg-green-50 text-green-700 border-green-200';
      case 'user': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'technician': return 'Técnico';
      case 'user': return 'Usuario';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  const statusLabels = {
    active: 'Activo',
    inactive: 'Inactivo',
  };

  return (
    <div className="w-full px-4 py-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">Usuarios</h2>
          <p className="text-slate-500 text-sm font-medium">Gestión de personal corporativo y permisos institucionales del sistema</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={async () => {
              try {
                const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
                if (error) throw error;
                alert('Conexión con Supabase exitosa');
              } catch (err: any) {
                alert('Error de conexión: ' + err.message);
              }
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
          >
            Probar Conexión
          </button>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Vista Listado"
            >
              <List size={16} />
            </button>
          </div>
          {canEdit() && (
            <button
              onClick={() => {
                setEditingUser(undefined);
                setShowForm(true);
              }}
              className="flex items-center justify-center gap-2 px-6 py-3 sm:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
            >
              <Plus size={14} />
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Dashboard de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Usuarios</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <UsersIcon className="h-5 w-5 text-gray-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Activos</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
            <UserCheck className="h-5 w-5 text-emerald-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Admins</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.byRole.admin || 0}</div>
            <Crown className="h-5 w-5 text-amber-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Supervisores</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-gray-900">{stats.byRole.supervisor || 0}</div>
            <Shield className="h-5 w-5 text-blue-300" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Recientes (7d)</div>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-blue-500">{stats.recentlyAdded}</div>
            <Plus className="h-5 w-5 text-blue-500/20" />
          </div>
        </div>
      </div>


      {/* Filtros avanzados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-blue-100/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
            />
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-blue-100/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] font-medium text-gray-700"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="technician">Técnico</option>
              <option value="user">Usuario</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-blue-100/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] font-medium text-gray-700"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {(searchTerm || roleFilter || statusFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtros:</span>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 text-[10px] font-bold uppercase tracking-widest">
                    "{searchTerm}"
                  </span>
                )}
                {roleFilter && (
                  <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded border border-gray-100 text-[10px] font-bold uppercase tracking-widest">
                    {getRoleLabel(roleFilter)}
                  </span>
                )}
                {statusFilter && (
                  <span className="bg-gray-50 text-gray-700 px-2 py-0.5 rounded border border-gray-100 text-[10px] font-bold uppercase tracking-widest">
                    {statusLabels[statusFilter as keyof typeof statusLabels]}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-rose-600 transition-colors uppercase tracking-widest"
            >
              <X size={14} /> Limpiar filtros
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${statusColors[user.status]}`}>
                    {statusLabels[user.status]}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Email</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Sede</th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="bg-gray-50 rounded-lg p-2">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 uppercase tracking-tight">{user.full_name}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-500 font-medium">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a href={`mailto:${user.email}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                        {user.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${statusColors[user.status]}`}>
                        {statusLabels[user.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.locations ? (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <MapPin size={14} className="text-blue-500" />
                          <span>{user.locations.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="Ver detalles"
                        >
                          <Eye size={16} />
                        </button>
                        {canEdit() && (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-slate-600 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-lg transition-all"
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
  );
}
