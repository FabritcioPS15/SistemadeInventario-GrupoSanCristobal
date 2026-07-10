import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Mail, MapPin, X, Users as UsersIcon, Shield, Crown, Lock, Settings, TrendingUp, User as UserIcon, Search, Scale } from 'lucide-react';
import ActionToolbar from '../../../shared/components/ui/ActionToolbar';
import FilterBar from '../../../shared/components/ui/FilterBar';
import ExportButtons from '../../../shared/components/ui/ExportButtons';
import ViewToggle from '../../../shared/components/ui/ViewToggle';
import PrimaryButton from '../../../shared/components/ui/PrimaryButton';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useHeaderVisible } from '../../../shared/hooks/useHeaderVisible';
import { supabase, Location } from '../../../shared/services/supabase';
import UserForm from '../forms/UserForm';
import { useAuth } from '../../../app/providers/AuthContext';
import Pagination from '../../../shared/components/ui/Pagination';
import DetailModal, {
  DetailModalHeader,
  DetailModalBody,
  StandardModalFooter,
  DetailModalGrid,
  DetailModalSection,
  DetailModalCard,
  DetailModalRow,
} from '../../../shared/components/ui/DetailModal';
import { useNotify } from '../../../shared/hooks/useNotify';
import UserLocationAccess from '../components/UserLocationAccess';

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
  const [showDetails, setShowDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | undefined>();
  const [showLocationAccess, setShowLocationAccess] = useState(false);
  const [userForLocationAccess, setUserForLocationAccess] = useState<User | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const canEditValue = canEdit();
  const { success: notifySuccess, error: notifyError, warning: notifyWarning, confirm } = useNotify();

  const handleNewUserClick = () => {
    setEditingUser(undefined);
    setShowForm(true);
  };



  useEffect(() => {
    fetchData();
  }, []);


  useEffect(() => {
    const handleNew = () => handleNewUserClick();
    const handleExport = () => exportToExcel();
    const handleExportPdf = () => exportToPdf();
    window.addEventListener('users:new', handleNew);
    window.addEventListener('users:export', handleExport);
    window.addEventListener('users:export-pdf', handleExportPdf);
    return () => {
      window.removeEventListener('users:new', handleNew);
      window.removeEventListener('users:export', handleExport);
      window.removeEventListener('users:export-pdf', handleExportPdf);
    };
  }, [users, searchTerm, roleFilter, statusFilter, selectedLocations, sortConfig]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchLocations()]);
    setLoading(false);
  };

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*').order('name');
    if (data) setLocations(data);
  };

  const handleEditUser = (user: User) => {
    if (user.role === 'super_admin') {
      notifyWarning('No se puede editar al Super Administrador.', 'Acceso restringido');
      return;
    }
    setEditingUser(user);
    setShowForm(true);
  };

  const handleViewUser = (user: User) => { setSelectedUser(user); setShowDetails(true); };

  const handleLocationAccess = (user: User) => {
    if (user.role === 'super_admin') {
      notifyWarning('El Super Administrador tiene acceso a todas las sedes.', 'Acceso restringido');
      return;
    }
    setUserForLocationAccess(user);
    setShowLocationAccess(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (user.role === 'super_admin') {
      notifyWarning('No se puede eliminar al Super Administrador.', 'Acceso restringido');
      return;
    }
    const confirmed = await confirm(
      `Se eliminará al usuario ${user.full_name}. Esta acción no se puede deshacer.`,
      '¿Eliminar usuario?'
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      await fetchUsers();
      notifySuccess('Usuario eliminado correctamente', 'Eliminado');
    } catch (err: any) {
      notifyError('Error: ' + err.message, 'Error al eliminar');
    }
  };

  const handleSaveUser = async () => {
    setShowForm(false);
    setEditingUser(undefined);
    setTimeout(() => fetchUsers(), 100);
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
      }
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
    }
  };



  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Crown className="h-4 w-4" />;
      case 'gerencia': return <TrendingUp className="h-4 w-4" />;
      case 'sistemas': return <Lock className="h-4 w-4" />;
      case 'supervisores': return <Shield className="h-4 w-4" />;
      case 'administradores': return <UsersIcon className="h-4 w-4" />;
      case 'personalizado': return <Settings className="h-4 w-4" />;
      case 'area_legal': return <Scale className="h-4 w-4" />;
      case 'area_contable': return <UsersIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  // Uniform corporate palette — same for all roles
  const getRoleColor = (_role: string) => 'bg-[#002855]/8 text-[#002855] border-[#002855]/20';

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'gerencia': return 'Gerencia';
      case 'sistemas': return 'Sistemas';
      case 'supervisores': return 'Supervisores';
      case 'administradores': return 'Administradores';
      case 'personalizado': return 'Personalizado';
      case 'area_legal': return 'Área Legal';
      case 'area_contable': return 'Área Contable';
      default: return role;
    }
  };

  const statusColors = { active: 'bg-emerald-50 text-emerald-700 border border-emerald-200', inactive: 'bg-slate-50 text-slate-500 border border-slate-200' };
  const statusLabels = { active: 'Activo', inactive: 'Inactivo' };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortableHeader = (label: string, sortKey: string) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className="flex items-center gap-1.5 hover:text-[#002855] text-slate-400 transition-colors"
      >
        <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">{label}</span>
        {isSorted ? (
          <span className="text-[#002855] text-[10px]">
            {sortConfig.direction === 'asc' ? '▲' : '▼'}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px] opacity-50">▲▼</span>
        )}
      </button>
    );
  };

  const filteredUsers = useMemo(() => {
    const filtered = users.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(user.location_id || '');
      return matchesSearch && matchesRole && matchesStatus && matchesLocation;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'user':
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = getRoleLabel(a.role).toLowerCase();
          bValue = getRoleLabel(b.role).toLowerCase();
          break;
        case 'status':
          aValue = statusLabels[a.status as keyof typeof statusLabels].toLowerCase();
          bValue = statusLabels[b.status as keyof typeof statusLabels].toLowerCase();
          break;
        case 'location':
          aValue = (a.locations?.name || '').toLowerCase();
          bValue = (b.locations?.name || '').toLowerCase();
          break;
        default:
          aValue = (a as any)[sortConfig.key];
          bValue = (b as any)[sortConfig.key];
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const result = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [users, searchTerm, roleFilter, statusFilter, selectedLocations, sortConfig]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedUsers.map(u => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm(`¿Eliminar ${selectedIds.length} usuarios seleccionados?`, 'Eliminación por Lote');
    if (confirmed) {
      try {
        const { error } = await supabase.from('users').delete().in('id', selectedIds);
        if (error) throw error;
        setSelectedIds([]);
        await fetchUsers();
        notifySuccess(`${selectedIds.length} usuarios eliminados correctamente`, 'Eliminados');
      } catch (err: any) {
        notifyError('Error: ' + err.message, 'Error al eliminar');
      }
    }
  };

  const exportToExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Usuarios');
      ws.columns = [
        { header: 'NOMBRES', key: 'full_name', width: 25 },
        { header: 'EMAIL', key: 'email', width: 30 },
        { header: 'ROL', key: 'role', width: 20 },
        { header: 'SEDE', key: 'location', width: 20 },
        { header: 'ESTADO', key: 'status', width: 15 },
      ];
      filteredUsers.forEach(u => ws.addRow({
        full_name: u.full_name, email: u.email,
        role: getRoleLabel(u.role), location: u.locations?.name || 'Sistema', status: statusLabels[u.status]
      }));
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Usuarios_${new Date().toISOString().split('T')[0]}.xlsx`; a.click();
    } catch (e) { console.error('Error exportando Excel:', e); }
  };

  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['Nombres', 'Email', 'Rol', 'Sede', 'Estado']],
        body: filteredUsers.map(u => [u.full_name, u.email, getRoleLabel(u.role), u.locations?.name || 'Sistema', statusLabels[u.status]]),
        theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [0, 40, 85] }
      });
      doc.save(`Usuarios_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { console.error('Error exportando PDF:', e); }
  };

  // Suppress unused variable warnings
  void isHeaderVisible;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Action Bar — Sedes-style */}
        <ActionToolbar
          totalItems={filteredUsers.length}
          label="Usuarios"
          searchComponent={
            <>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar usuario, email o rol..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </>
          }
        >
          <FilterBar
            filters={[
              { key: 'location', placeholder: 'TODAS LAS SEDES', icon: MapPin, iconClassName: 'text-rose-500', wrapperClassName: 'md:min-w-[220px]', options: locations.map(loc => ({ value: loc.id, label: loc.name.toUpperCase() })) },
              { key: 'role', placeholder: 'TODOS LOS ROLES', wrapperClassName: 'md:min-w-[180px]', options: [
                { value: 'super_admin', label: 'Super Admin' },
                { value: 'gerencia', label: 'Gerencia' },
                { value: 'sistemas', label: 'Sistemas' },
                { value: 'supervisores', label: 'Supervisores' },
                { value: 'area_legal', label: 'Área Legal' },
                { value: 'area_contable', label: 'Área Contable' },
                { value: 'administradores', label: 'Administradores' },
                { value: 'personalizado', label: 'Personalizado' },
              ]},
              { key: 'status', placeholder: 'TODOS LOS ESTADOS', wrapperClassName: 'md:min-w-[160px]', options: [
                { value: 'active', label: 'Activo' },
                { value: 'inactive', label: 'Inactivo' },
              ]},
            ]}
            values={{ location: selectedLocations[0] || '', role: roleFilter, status: statusFilter }}
            onChange={(key, value) => {
              if (key === 'location') setSelectedLocations(value ? [value as string] : []);
              else if (key === 'role') setRoleFilter(value as string);
              else if (key === 'status') setStatusFilter(value as string);
              setCurrentPage(1);
            }}
          />

          <ViewToggle viewMode={viewMode} onChange={v => setViewMode(v as 'grid' | 'table')} />

          {canEditValue && (
            <div className="flex gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-none hover:bg-rose-100 transition-colors border border-rose-200"
                >
                  <Trash2 size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                    Eliminar ({selectedIds.length})
                  </span>
                </button>
              )}
              <PrimaryButton icon={Plus} onClick={handleNewUserClick}>
                Nuevo Usuario
              </PrimaryButton>
            </div>
          )}

          <ExportButtons onExportExcel={exportToExcel} onExportPDF={exportToPdf} />
        </ActionToolbar>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#002855]"></div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden mb-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-400 transition-all duration-300 flex flex-col group overflow-hidden">
                  <div className="p-6 flex-1">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-[#002855] text-white flex items-center justify-center text-sm font-black overflow-hidden flex-shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `<div class="w-full h-full bg-[#002855] text-white flex items-center justify-center text-sm font-black">${u.full_name?.charAt(0) || '?'}</div>`;
                            }} />
                        ) : (u.full_name?.charAt(0) || '?')}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-black text-[#002855] uppercase tracking-tight mb-2 truncate">{u.full_name}</h3>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                          {getRoleIcon(u.role)}{getRoleLabel(u.role)}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest ${statusColors[u.status]}`}>{statusLabels[u.status]}</span>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <Mail size={14} className="text-blue-500 shrink-0" />
                        <span className="font-bold truncate">{u.email}</span>
                      </div>
                      {u.locations && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                          <MapPin size={14} className="text-rose-500" />
                          <span>{u.locations.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex gap-2">
                    {canEditValue && u.role !== 'super_admin' && (
                      <>
                        <button onClick={() => handleLocationAccess(u)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-slate-600 text-white rounded-lg hover:bg-slate-700 shadow-sm">
                          <MapPin size={14} /> Sedes
                        </button>
                        <button onClick={() => handleEditUser(u)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
                          <Edit size={14} /> Editar
                        </button>
                        <button onClick={() => handleDeleteUser(u)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm">
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
            {/* Pagination Header */}
            <div className="bg-slate-50/50 border-b border-slate-100 relative z-20">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 backdrop-blur-sm">
                  <tr>
                    {canEditValue && (
                      <th className="px-4 py-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedUsers.length > 0 && selectedIds.length === paginatedUsers.length}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4">
                      {renderSortableHeader('Usuario', 'user')}
                    </th>
                    <th className="px-4 py-4 hidden lg:table-cell">
                      {renderSortableHeader('Correo', 'email')}
                    </th>
                    <th className="px-4 py-4">
                      {renderSortableHeader('Rol', 'role')}
                    </th>
                    <th className="px-4 py-4">
                      {renderSortableHeader('Estado', 'status')}
                    </th>
                    <th className="px-4 py-4">
                      {renderSortableHeader('Sede', 'location')}
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/20"
                      onDoubleClick={() => handleViewUser(u)}
                      onClick={() => handleViewUser(u)}
                    >
                      {canEditValue && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-all duration-300 bg-[#002855] text-white group-hover:bg-blue-600 overflow-hidden text-xs font-black shrink-0">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement!.innerHTML = `<div class="w-full h-full bg-[#002855] text-white flex items-center justify-center text-xs font-black">${u.full_name?.charAt(0) || '?'}</div>`;
                                }} />
                            ) : (u.full_name?.charAt(0) || '?')}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-black text-[#002855] uppercase leading-none">{u.full_name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 lg:hidden">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-[11px] font-bold text-slate-700 font-mono leading-none">{u.email}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded-none ${getRoleColor(u.role)}`}>
                          {getRoleIcon(u.role)}{getRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded-none ${u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {statusLabels[u.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {u.locations ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <MapPin size={13} className="text-rose-500 shrink-0" />
                            <span className="text-[11px] font-bold uppercase truncate max-w-xs block leading-none">{u.locations.name}</span>
                          </div>
                        ) : <span className="text-slate-300 italic text-[11px]">Sin asignar</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" onClick={(e) => e.stopPropagation()}>
                          {canEdit() && u.role !== 'super_admin' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleLocationAccess(u); }}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200 transition-all shadow-sm rounded-lg"
                                title="Administrar Accesos a Sedes"
                              >
                                <MapPin size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#002855] hover:bg-slate-100 bg-white border border-slate-200 transition-all shadow-sm rounded-lg"
                                title="Editar Usuario"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteUser(u); }}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 transition-all shadow-sm rounded-lg"
                                title="Eliminar Usuario"
                              >
                                <Trash2 size={14} />
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
      </div>

      {/* Modals */}
      {showForm && (
        <UserForm editUser={editingUser} onClose={handleCloseForm} onSave={handleSaveUser} />
      )}

      {showLocationAccess && userForLocationAccess && (
        <UserLocationAccess
          userId={userForLocationAccess.id}
          userName={userForLocationAccess.full_name}
          isOpen={showLocationAccess}
          onClose={() => {
            setShowLocationAccess(false);
            setUserForLocationAccess(undefined);
          }}
        />
      )}

      {showDetails && selectedUser && (
        <DetailModal maxWidth="5xl" onClose={() => setShowDetails(false)} closeOnBackdrop>
          <DetailModalHeader>
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 pr-1">
              <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                {getRoleIcon(selectedUser.role)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-base md:text-[18px] font-black text-white uppercase tracking-tight leading-snug line-clamp-2 sm:line-clamp-1">
                  {selectedUser.full_name}
                </h2>
                <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase tracking-wide mt-1 flex items-start sm:items-center gap-1.5">
                  <span className="line-clamp-2 sm:truncate">{getRoleLabel(selectedUser.role)}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all -mr-1"
              aria-label="Cerrar detalle"
            >
              <X size={22} />
            </button>
          </DetailModalHeader>

          <DetailModalBody>
            <DetailModalGrid layout="stack-until-xl">
              <DetailModalSection title="Información del Usuario">
                <DetailModalCard className="space-y-2.5 sm:space-y-3">
                  <DetailModalRow label="Nombre Completo">
                    <span className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase">
                      {selectedUser.full_name}
                    </span>
                  </DetailModalRow>
                  <DetailModalRow label="Email">
                    <span className="text-[10px] sm:text-[11px] font-mono font-black text-slate-700 break-all">
                      {selectedUser.email}
                    </span>
                  </DetailModalRow>
                  <DetailModalRow label="Rol">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border rounded-none ${getRoleColor(selectedUser.role)}`}>
                      {getRoleIcon(selectedUser.role)}{getRoleLabel(selectedUser.role)}
                    </span>
                  </DetailModalRow>
                  <DetailModalRow label="Estado">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border rounded-none ${statusColors[selectedUser.status]}`}>
                      {statusLabels[selectedUser.status]}
                    </span>
                  </DetailModalRow>
                </DetailModalCard>

                <DetailModalCard className="space-y-2.5 sm:space-y-3">
                  <DetailModalRow label="Sede">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-rose-500 shrink-0" />
                      <span className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase">
                        {selectedUser.locations?.name || 'N/A'}
                      </span>
                    </div>
                  </DetailModalRow>
                  {selectedUser.phone && (
                    <DetailModalRow label="Teléfono">
                      <span className="text-[10px] sm:text-[11px] font-mono font-black text-slate-700">
                        {selectedUser.phone}
                      </span>
                    </DetailModalRow>
                  )}
                </DetailModalCard>
              </DetailModalSection>

              {selectedUser.notes && (
                <DetailModalSection title="Notas">
                  <DetailModalCard className="bg-amber-50 border-amber-100">
                    <p className="text-[10px] sm:text-[11px] font-medium text-amber-900 leading-relaxed">
                      {selectedUser.notes}
                    </p>
                  </DetailModalCard>
                </DetailModalSection>
              )}
            </DetailModalGrid>
          </DetailModalBody>

          <StandardModalFooter
            onClose={() => setShowDetails(false)}
            onEdit={canEdit() && selectedUser.role !== 'super_admin' ? () => { setShowDetails(false); handleEditUser(selectedUser); } : undefined}
            editLabel="Editar"
          />
        </DetailModal>
      )}
    </div>
  );
}