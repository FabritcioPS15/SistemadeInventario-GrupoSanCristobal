import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit, Trash2, Mail, MapPin, Eye, X, Users as UsersIcon, Shield, Crown, LayoutGrid, List, Lock, Settings, TrendingUp, User as UserIcon, Search, ChevronDown } from 'lucide-react';
import { RiFileExcel2Fill } from "react-icons/ri";
import { FaFilePdf } from "react-icons/fa6";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import { supabase, Location } from '../lib/supabase';
import UserForm from '../components/forms/UserForm';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/ui/Pagination';

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
  const [searchTerm, setSearchTerm] = useState('');
  const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  }, [users, searchTerm, roleFilter, statusFilter]);

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
      alert('🔒 No se puede editar al Super Administrador.');
      return;
    }
    setEditingUser(user);
    setShowForm(true);
  };

  const handleViewUser = (user: User) => setViewingUser(user);

  const handleDeleteUser = async (user: User) => {
    if (user.role === 'super_admin') {
      alert('❌ No se puede eliminar al Super Administrador.');
      return;
    }
    if (window.confirm(`¿Eliminar al usuario "${user.full_name}"?`)) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', user.id);
        if (error) throw error;
        await fetchUsers();
        alert('✅ Usuario eliminado correctamente');
      } catch (err: any) {
        alert('❌ Error: ' + err.message);
      }
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
        calculateStats(data as User[]);
      }
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const calculateStats = (usersData: User[]) => {
    const byRole: Record<string, number> = {};
    let active = 0, inactive = 0, recentlyAdded = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    usersData.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
      if (user.status === 'active') active++;
      else inactive++;
      if (new Date(user.created_at) > oneWeekAgo) recentlyAdded++;
    });
    setStats({ total: usersData.length, active, inactive, byRole, recentlyAdded });
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

  const statusColors = { active: 'bg-green-100 text-green-800', inactive: 'bg-gray-100 text-gray-800' };
  const statusLabels = { active: 'Activo', inactive: 'Inactivo' };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      const matchesLocation = selectedLocations.length === 0 || selectedLocations.includes(user.location_id || '');
      return matchesSearch && matchesRole && matchesStatus && matchesLocation;
    });
  }, [users, searchTerm, roleFilter, statusFilter, selectedLocations]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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
    <div className="flex flex-col h-full bg-[#f8fafc] font-sans">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-4">


          {/* Action Bar — Sedes-style */}
          <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
            <div className="absolute -top-3 -left-3">
              <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                {filteredUsers.length} Usuarios
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-[#002855] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Buscar usuario, email o rol..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 text-[11px] font-black text-[#002855] bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#002855]/30 focus:ring-4 focus:ring-[#002855]/5 outline-none transition-all placeholder:text-slate-300 tracking-[0.1em]"
              />
            </div>

            {/* Filters + Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] uppercase tracking-widest flex items-center gap-3 transition-all min-w-[220px]"
                >
                  <MapPin size={14} className="text-rose-500" />
                  <span className="truncate">{selectedLocations.length === 0 || selectedLocations.length === locations.length ? 'Todas las sedes' : `${selectedLocations.length} Sedes`}</span>
                  <ChevronDown size={14} className={`text-slate-300 ml-auto transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedLocations(locations.map(loc => loc.id));
                          setShowLocationDropdown(false);
                          setCurrentPage(1);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        Seleccionar todas las sedes
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLocations([]);
                          setShowLocationDropdown(false);
                          setCurrentPage(1);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      >
                        Limpiar selección
                      </button>
                    </div>
                    {locations.map(location => (
                      <label key={location.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(location.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLocations([...selectedLocations, location.id]);
                            } else {
                              setSelectedLocations(selectedLocations.filter(id => id !== location.id));
                            }
                            setCurrentPage(1);
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mr-3"
                        />
                        <span className="text-xs font-medium text-slate-700">{location.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <select
                value={roleFilter}
                onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] tracking-widest outline-none transition-all min-w-[150px] cursor-pointer"
              >
                <option value="">TODOS LOS ROLES</option>
                <option value="super_admin">Super Admin</option>
                <option value="gerencia">Gerencia</option>
                <option value="sistemas">Sistemas</option>
                <option value="supervisores">Supervisores</option>
                <option value="administradores">Administradores</option>
                <option value="personalizado">Personalizado</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-4 py-3 bg-slate-50 border border-slate-200 hover:border-[#002855]/30 text-[10px] font-black text-[#002855] tracking-widest outline-none transition-all min-w-[150px] appearance-none cursor-pointer"
              >
                <option value="">TODOS LOS ESTADOS</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>

              <div className="flex bg-slate-100 p-1 border border-slate-200">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`} 
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-[#002855] shadow-sm' : 'text-slate-400 hover:text-[#002855]'}`} 
                  title="Vista Tabla"
                >
                  <List size={16} />
                </button>
              </div>

              {canEditValue && (
                <button
                  onClick={handleNewUserClick}
                  className="flex items-center gap-2 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  Nuevo Usuario
                </button>
              )}

              <button
                onClick={exportToExcel}
                className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
                title="Exportar a Excel"
              >
                <RiFileExcel2Fill size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              <button
                onClick={exportToPdf}
                className="group flex items-center justify-center w-10 h-10 bg-white text-slate-400 border border-slate-200 hover:text-rose-700 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
                title="Exportar a PDF"
              >
                <FaFilePdf size={20} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
              </button>
            </div>
          </div>

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
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                            {getRoleIcon(u.role)}{getRoleLabel(u.role)}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${statusColors[u.status]}`}>{statusLabels[u.status]}</span>
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
                      <button onClick={() => handleViewUser(u)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
                        <Eye size={14} /> Ver
                      </button>
                      {canEditValue && u.role !== 'super_admin' && (
                        <>
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
            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
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
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-5"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Usuario</span></th>
                      <th className="px-4 py-5 hidden lg:table-cell"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Correo</span></th>
                      <th className="px-4 py-5"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Rol</span></th>
                      <th className="px-4 py-5"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                      <th className="px-4 py-5"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span></th>
                      <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group border-b border-slate-50 last:border-0" onDoubleClick={() => handleViewUser(u)}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center shadow-sm transition-all duration-300 bg-[#002855] text-white group-hover:bg-blue-600 overflow-hidden text-xs font-black">
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
                              <span className="text-[14px] font-black text-[#002855] uppercase leading-tight">{u.full_name}</span>
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 lg:hidden">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 hidden lg:table-cell">
                          <span className="text-sm font-extrabold text-slate-600 font-mono">{u.email}</span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${getRoleColor(u.role)}`}>
                            {getRoleIcon(u.role)}{getRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest ${statusColors[u.status]}`}>{statusLabels[u.status]}</span>
                        </td>
                        <td className="px-4 py-5">
                          {u.locations ? (
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-[#002855]">{u.locations.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase mt-1">{u.locations.type}</span>
                            </div>
                          ) : <span className="text-slate-300 italic text-xs">Sin asignar</span>}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleViewUser(u); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-100 transition-all shadow-sm" title="Ver Ficha">
                              <Eye size={14} />
                            </button>
                            {canEdit() && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleEditUser(u); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 bg-white border border-slate-100 transition-all shadow-sm"><Edit size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(u); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-100 transition-all shadow-sm"><Trash2 size={14} /></button>
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
      </div>

      {/* Modals */}
      {showForm && (
        <UserForm editUser={editingUser} onClose={handleCloseForm} onSave={handleSaveUser} />
      )}

      {viewingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-8 py-6 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">{getRoleIcon(viewingUser.role)}</div>
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
                      <img src={viewingUser.avatar_url} alt={viewingUser.full_name} className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `<div class="w-full h-full bg-[#002855] text-white flex items-center justify-center text-lg font-black">${viewingUser.full_name?.charAt(0) || '?'}</div>`;
                        }} />
                    ) : (viewingUser.full_name?.charAt(0) || '?')}
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
