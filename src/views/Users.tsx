import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Mail, Phone, MapPin, Eye, X, Users as UsersIcon, UserCheck, Shield, Crown, Filter, Copy, Check } from 'lucide-react';
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
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Usuarios</h2>
          <p className="text-gray-600">Gestión de personal y usuarios del sistema</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              console.log('🔍 Probando conexión con Supabase...');
              try {
                const { data, error } = await supabase
                  .from('users')
                  .select('count')
                  .limit(1);

                if (error) {
                  console.error('❌ Error de conexión:', error);
                  alert(`Error de conexión: ${error.message}`);
                } else {
                  console.log('✅ Conexión exitosa:', data);
                  alert('Conexión con Supabase exitosa');
                }
              } catch (err) {
                console.error('❌ Error inesperado:', err);
                alert('Error inesperado: ' + err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            🔍 Probar Conexión
          </button>
          {canEdit() && (
            <button
              onClick={() => {
                setEditingUser(undefined);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <Plus size={20} />
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Dashboard de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Crown className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byRole.admin || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Supervisores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byRole.supervisor || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Plus className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recientes (7 días)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentlyAdded}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros avanzados */}
      {/* Filtros avanzados */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="technician">Técnico</option>
              <option value="user">Usuario</option>
            </select>
          </div>
          <div className="md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {(searchTerm || roleFilter || statusFilter) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>Filtros activos:</span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                "{searchTerm}"
              </span>
            )}
            {roleFilter && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {getRoleLabel(roleFilter)}
              </span>
            )}
            {statusFilter && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                {statusFilter === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              className="text-red-600 hover:text-red-800 text-xs underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{user.full_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                    {statusLabels[user.status]}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail size={16} />
                      <a href={`mailto:${user.email}`} className="hover:text-blue-600">
                        {user.email}
                      </a>
                    </div>
                    <button
                      onClick={() => copyToClipboard(user.email, `email-${user.id}`)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copiar email"
                    >
                      {copiedItems[`email-${user.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>

                  {user.phone && (
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone size={16} />
                        <span>{user.phone}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(user.phone || '', `phone-${user.id}`)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar teléfono"
                      >
                        {copiedItems[`phone-${user.id}`] ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  {user.locations && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} />
                      <span>{user.locations.name}</span>
                    </div>
                  )}
                </div>

                {user.notes && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{user.notes}</p>
                )}

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleViewUser(user)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    <Eye size={16} />
                    Ver
                  </button>
                  {canEdit() && (
                    <>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Detalles de Usuario</h2>
              <button
                onClick={() => setViewingUser(undefined)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
                <p className="text-gray-900 font-medium">{viewingUser.full_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{viewingUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Rol</label>
                <p className="text-gray-900">{viewingUser.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[viewingUser.status]}`}>
                  {statusLabels[viewingUser.status]}
                </span>
              </div>
              {viewingUser.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono</label>
                  <p className="text-gray-900">{viewingUser.phone}</p>
                </div>
              )}
              {viewingUser.locations && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Ubicación</label>
                  <p className="text-gray-900">{viewingUser.locations.name}</p>
                </div>
              )}
              {viewingUser.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Notas</label>
                  <p className="text-gray-900">{viewingUser.notes}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setViewingUser(undefined)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
                {canEdit() && (
                  <button
                    onClick={() => {
                      setViewingUser(undefined);
                      handleEditUser(viewingUser);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

