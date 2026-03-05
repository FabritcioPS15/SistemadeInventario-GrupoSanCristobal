import { useState, useEffect, useRef} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Settings, HelpCircle, Menu, Image as ImageIcon, Check, User as UserIcon, LogOut, ChevronRight, ChevronDown, Search, Plus, X, FileText, RefreshCw, BarChart3, Package, Wrench, Calendar, Camera, Building, Users as UsersIcon, Clipboard } from 'lucide-react';
import { supabase, SutranVisit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ROUTE_LABELS: Record<string, string> = {
    'inventory': 'Inventario',
    'camara': 'Cámaras',
    'cameras': 'Cámaras',
    'maintenance': 'Mantenimiento',
    'sent': 'Enviados',
    'sutran': 'Sutran',
    'locations': 'Sedes',
    'mtc': 'MTC Accesos',
    'users': 'Usuarios',
    'audit': 'Auditoría',
    'integrity': 'Integridad',
    'diagnostic': 'Diagnóstico',
    'connection-test': 'Prueba de Conexión',
    'quick-diagnostic': 'Diagnóstico Rápido',
    'tickets': 'Mesa de Ayuda',
    'dashboard': 'Dashboard General',
    'mine': 'Mis Tickets',
    'reports': 'Reportes',
    'painpoint': 'Puntos Críticos',
    'checklist': 'Checklist',
    'vacations': 'Vacaciones',
    'servers': 'Servidores',
    'flota-vehicular': 'Flota Vehicular',
    'spare-parts': 'Repuestos',
    'all': 'Ver Todo',
    'escon': 'ESCON',
    'ecsal': 'ECSAL',
    'citv': 'CITV',
    'lima': 'Lima',
    'provincias': 'Provincias',
    'pending': 'Pendientes',
    'in-progress': 'En Progreso',
    'completed': 'Completados',
};

type TopHeaderProps = {
    onMobileMenuClick?: () => void;
    sidebarCollapsed?: boolean;
};

export default function TopHeader({ onMobileMenuClick, sidebarCollapsed }: TopHeaderProps) {
    const { user, updateProfile, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter(x => x);
    const showBreadcrumbs = location.pathname !== '/' && location.pathname !== '/login';
    const isTicketsRoute = location.pathname.startsWith('/tickets');
    const currentPath = location.pathname;
    
    // Detectar página actual para acciones específicas
    const getPageActions = () => {
        if (currentPath === '/' || currentPath === '/dashboard') {
            return {
                show: true,
                title: 'Acciones Dashboard',
                searchPlaceholder: 'Buscar...',
                actions: [
                    { icon: <FileText size={16} />, label: 'Reportes', action: () => navigate('/tickets/reports') },
                    { icon: <RefreshCw size={16} />, label: 'Actualizar', action: () => window.location.reload() },
                    { icon: <BarChart3 size={16} />, label: 'Estadísticas', action: () => alert('Estadísticas en desarrollo') }
                ]
            };
        }
        
        if (currentPath.startsWith('/tickets')) {
            return {
                show: true,
                title: 'Acciones Tickets',
                searchPlaceholder: 'Buscar tickets...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Nuevo Ticket', action: () => window.dispatchEvent(new CustomEvent('tickets:new')) },
                    { icon: <FileText size={16} />, label: 'Reportes', action: () => navigate('/tickets/reports') },
                    { icon: <Clipboard size={16} />, label: 'Historial', action: () => navigate('/tickets/history') }
                ]
            };
        }
        
        if (currentPath.startsWith('/inventory')) {
            return {
                show: true,
                title: 'Acciones Inventario',
                searchPlaceholder: 'Buscar equipos...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Agregar Equipo', action: () => window.dispatchEvent(new CustomEvent('inventory:new')) },
                    { icon: <Package size={16} />, label: 'Repuestos', action: () => navigate('/spare-parts') },
                    { icon: <Wrench size={16} />, label: 'Mantenimiento', action: () => navigate('/maintenance') }
                ]
            };
        }
        
        if (currentPath.startsWith('/users')) {
            return {
                show: true,
                title: 'Acciones Usuarios',
                searchPlaceholder: 'Buscar usuarios...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Nuevo Usuario', action: () => window.dispatchEvent(new CustomEvent('users:new')) },
                    { icon: <Settings size={16} />, label: 'Permisos', action: () => alert('Permisos en desarrollo') },
                    { icon: <FileText size={16} />, label: 'Reporte', action: () => alert('Reporte en desarrollo') }
                ]
            };
        }
        
        if (currentPath.startsWith('/flota-vehicular')) {
            return {
                show: true,
                title: 'Acciones Flota',
                searchPlaceholder: 'Buscar vehículos...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Agregar Vehículo', action: () => window.dispatchEvent(new CustomEvent('flota:new')) },
                    { icon: <FileText size={16} />, label: 'Reporte', action: () => window.dispatchEvent(new CustomEvent('flota:report')) },
                    { icon: <Wrench size={16} />, label: 'Mantenimiento', action: () => navigate('/maintenance') }
                ]
            };
        }
        
        if (currentPath.startsWith('/sutran')) {
            return {
                show: true,
                title: 'Acciones Sutran',
                searchPlaceholder: 'Buscar visitas...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Nueva Visita', action: () => window.dispatchEvent(new CustomEvent('sutran:new')) },
                    { icon: <Calendar size={16} />, label: 'Calendario', action: () => alert('Calendario en desarrollo') },
                    { icon: <FileText size={16} />, label: 'Reporte', action: () => window.dispatchEvent(new CustomEvent('sutran:report')) }
                ]
            };
        }
        
        if (currentPath.startsWith('/maintenance')) {
            return {
                show: true,
                title: 'Acciones Mantenimiento',
                searchPlaceholder: 'Buscar mantenimientos...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Nueva Orden', action: () => window.dispatchEvent(new CustomEvent('maintenance:new')) },
                    { icon: <Clipboard size={16} />, label: 'Checklist', action: () => navigate('/checklist') },
                    { icon: <Package size={16} />, label: 'Inventario', action: () => navigate('/inventory') }
                ]
            };
        }
        
        if (currentPath.startsWith('/cameras')) {
            return {
                show: true,
                title: 'Acciones Cámaras',
                searchPlaceholder: 'Buscar cámaras...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Agregar Cámara', action: () => window.dispatchEvent(new CustomEvent('cameras:new')) },
                    { icon: <Camera size={16} />, label: 'Revisión', action: () => navigate('/cameras/revision') },
                    { icon: <Building size={16} />, label: 'Sedes', action: () => navigate('/locations') }
                ]
            };
        }
        
        if (currentPath.startsWith('/locations') || currentPath.startsWith('/sedes')) {
            return {
                show: true,
                title: 'Acciones Sedes',
                searchPlaceholder: 'Buscar sedes...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Nueva Sede', action: () => window.dispatchEvent(new CustomEvent('locations:new')) },
                    { icon: <Camera size={16} />, label: 'Cámaras', action: () => navigate('/cameras') },
                    { icon: <UsersIcon size={16} />, label: 'Usuarios', action: () => navigate('/users') }
                ]
            };
        }
        
        if (currentPath.startsWith('/servers')) {
            return {
                show: true,
                title: 'Acciones Servidores',
                searchPlaceholder: 'Buscar servidores...',
                actions: [
                    { icon: <Plus size={16} />, label: 'Agregar Servidor', action: () => window.dispatchEvent(new CustomEvent('servers:new')) },
                    { icon: <Settings size={16} />, label: 'Configuración', action: () => alert('Configuración en desarrollo') },
                    { icon: <FileText size={16} />, label: 'Reporte', action: () => window.dispatchEvent(new CustomEvent('servers:report')) }
                ]
            };
        }
        
        // Para otras páginas, no mostrar acciones por ahora
        return { show: false };
    };
    
    const pageActions = getPageActions();
    
    // Estado para forzar actualización del breadcrumb
    const [breadcrumbKey, setBreadcrumbKey] = useState(0);

    // Actions panel state (for ticket routes)
    const [showActions, setShowActions] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const actionsRef = useRef<HTMLDivElement>(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserSettings, setShowUserSettings] = useState(false);
    const [sutranNotifications, setSutranNotifications] = useState<SutranVisit[]>([]);
    const [userLocation, setUserLocation] = useState<string>('');
    const notificationRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    // Forzar actualización del breadcrumb cuando cambia la ruta
    useEffect(() => {
        setBreadcrumbKey(prev => prev + 1);
    }, [location.pathname]);

    // Close actions panel on route change
    useEffect(() => { setShowActions(false); setSearchValue(''); }, [location.pathname]);

    // Broadcast search to Tickets page
    useEffect(() => {
        if (!isTicketsRoute) return;
        window.dispatchEvent(new CustomEvent('tickets:search', { detail: searchValue }));
    }, [searchValue, isTicketsRoute]);

    
    // Temp state for editing user profile
    const [editName, setEditName] = useState(user?.full_name || '');
    const [editAvatar, setEditAvatar] = useState(user?.avatar_url || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setEditName(user.full_name);
            setEditAvatar(user.avatar_url || '');
        }
    }, [user]);

    // Fetch user's location name with Realtime updates
    useEffect(() => {
        const fetchUserLocation = async () => {
            if (user?.location_id) {
                const { data } = await supabase
                    .from('locations')
                    .select('name')
                    .eq('id', user.location_id)
                    .single();

                if (data) {
                    setUserLocation(data.name);
                }
            } else {
                setUserLocation('');
            }
        };

        fetchUserLocation();

        // Subscribe to location changes
        const locationSubscription = supabase
            .channel('location-changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'locations',
                filter: `id=eq.${user?.location_id}`
            }, (payload) => {
                if (payload.new && 'name' in payload.new) {
                    setUserLocation(payload.new.name as string);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(locationSubscription);
        };
    }, [user?.location_id]);

    // Fetch Sutran notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const today = new Date();
                const fifteenDaysFromNow = new Date();
                fifteenDaysFromNow.setDate(today.getDate() + 15);

                const { data } = await supabase
                    .from('sutran_visits')
                    .select('*')
                    .eq('status', 'pending')
                    .gte('visit_date', today.toISOString().split('T')[0])
                    .lte('visit_date', fifteenDaysFromNow.toISOString().split('T')[0])
                    .order('visit_date', { ascending: true });

                if (data) {
                    setSutranNotifications(data as SutranVisit[]);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowUserSettings(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close actions panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
                setShowActions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSaveProfile = async () => {
        try {
            setIsSaving(true);
            await updateProfile({
                full_name: editName,
                avatar_url: editAvatar || undefined
            });
            setShowUserSettings(false);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Error al guardar el perfil');
        } finally {
            setIsSaving(false);
        }
    };

    const getDaysRemaining = (dateString: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        return `en ${diffDays} días`;
    };

    return (
            <header className={`h-14 bg-white text-gray-800 flex items-center justify-between sticky top-0 z-[100] shadow-lg border-b border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'lg:px-6 px-6' : 'lg:px-6 px-6'}`}>
                <div className="flex items-center gap-4 lg:gap-8 overflow-hidden">
                    <button
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors lg:hidden shrink-0 text-gray-700"
                        onClick={onMobileMenuClick}
                    >
                        <Menu size={20} />
                    </button>

                    {/* Breadcrumbs - Se adapta al espacio disponible según el estado del sidebar */}
                    <div key={breadcrumbKey} className={`flex items-center gap-1.5 overflow-hidden min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'}`}>
                        {showBreadcrumbs && pathnames.length > 0 && (
                            <>
                                {pathnames.map((name, index) => {
                                    const last = index === pathnames.length - 1;
                                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                                    const label = ROUTE_LABELS[name.toLowerCase()] || name.replace(/-/g, ' ');
                                    return (
                                        <div key={`${to}-${breadcrumbKey}`} className="flex items-center gap-1.5 shrink-0 min-w-0">
                                            {last ? (
                                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 truncate max-w-[200px]">
                                                    {label}
                                                </span>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => navigate(to)}
                                                        className="text-[10px] font-black text-gray-600 uppercase tracking-widest hover:text-gray-900 transition-colors truncate max-w-[120px]"
                                                    >
                                                        {label}
                                                    </button>
                                                    <ChevronRight size={12} className="text-gray-400 shrink-0" />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>

            </div>

            <div className="flex items-center gap-2">
                {/* Dynamic Page Actions Dropdown */}
                {pageActions.show && (
                    <div className="relative" ref={actionsRef}>
                        <button
                            onClick={() => setShowActions(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showActions ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`}
                        >
                            <Plus size={13} />
                            Acciones
                            <ChevronDown size={13} className={`transition-transform duration-200 ${showActions ? 'rotate-180' : ''}`} />
                        </button>

                        {showActions && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-[#001e3c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-white/10">
                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-3">{pageActions.title}</p>
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            autoFocus
                                            type="text"
                                            value={searchValue}
                                            onChange={e => setSearchValue(e.target.value)}
                                            placeholder={pageActions.searchPlaceholder}
                                            className="w-full bg-white/10 border border-white/10 rounded-xl pl-8 pr-8 py-2.5 text-[11px] text-white placeholder-white/30 font-medium outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all"
                                        />
                                        {searchValue && (
                                            <button onClick={() => setSearchValue('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                                                <X size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 space-y-2">
                                    {pageActions.actions?.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => { action.action(); setShowActions(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/30"
                                        >
                                            {action.icon}
                                            {action.label}
                                        </button>
                                    )) || []}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-1">
                    {/* Notifications */}
                    <div className="relative" ref={notificationRef}>
                        <button
                            title="Notificaciones"
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors relative ${showNotifications ? 'bg-gray-100' : ''} text-gray-700`}
                        >
                            <Bell size={18} />
                            {sutranNotifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="text-xs font-black text-[#002855] uppercase tracking-wider">Notificaciones</h3>
                                    <span className="text-[10px] font-bold text-gray-400">{sutranNotifications.length} Pendientes</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {sutranNotifications.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400 text-xs">No tienes notificaciones pendientes</div>
                                    ) : (
                                        sutranNotifications.map((note) => (
                                            <div
                                                key={note.id}
                                                onClick={() => { navigate('/sutran'); setShowNotifications(false); }}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-rose-100 p-2 rounded-lg text-rose-600 mt-0.5"><Bell size={14} /></div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700">Visita SUTRAN Programada</p>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">{note.location_name}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{getDaysRemaining(note.visit_date)}</span>
                                                            <span className="text-[10px] text-gray-400">{new Date(note.visit_date).toLocaleDateString('es-ES')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                                    <button onClick={() => { navigate('/sutran'); setShowNotifications(false); }} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest">Ver todas</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Help Button - Después de notificaciones */}
                    <button title="Ayuda" onClick={() => alert('Soporte no disponible')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
                        <HelpCircle size={18} />
                    </button>

                    <div className="h-8 w-[1px] bg-gray-300 mx-1" />

                    {/* User Info - Nombre y Sede - Oculto en móvil */}
                    <div className="flex items-center gap-2 mr-3">
                        {userLocation && (
                            <>
                                <span className="text-gray-600 text-xs hidden lg:block">{userLocation}</span>
                                <div className="w-1 h-1 bg-gray-400 rounded-full hidden lg:block" />
                            </>
                        )}
                        <span className="text-gray-700 text-xs font-medium hidden lg:block">{user?.full_name}</span>
                    </div>

                    {/* User Profile Settings */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setShowUserSettings(!showUserSettings)}
                            className={`flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${showUserSettings ? 'bg-gray-100' : ''}`}
                        >
                            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold uppercase overflow-hidden border border-gray-200 text-gray-700">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.full_name?.charAt(0)
                                )}
                            </div>
                            <Settings size={18} className={`transition-transform duration-300 ${showUserSettings ? 'rotate-90' : ''}`} />
                        </button>

                        {showUserSettings && (
                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-[#002855] to-[#004e92] text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold uppercase overflow-hidden border border-white/20">
                                            {user?.avatar_url ? (
                                                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                user?.full_name?.charAt(0)
                                            )}
                                        </div>
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-sm truncate">{user?.full_name}</h4>
                                            <p className="text-[10px] opacity-80 truncate uppercase tracking-widest">{user?.role}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-widest">Mi Perfil</h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nombre Completo</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-[#002855] focus:bg-white outline-none transition-all font-bold"
                                                    placeholder="Nombre"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">URL Foto de Perfil</label>
                                            <div className="relative">
                                                <ImageIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                <input
                                                    type="text"
                                                    value={editAvatar}
                                                    onChange={(e) => setEditAvatar(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:ring-1 focus:ring-[#002855] focus:bg-white outline-none transition-all font-medium"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSaving}
                                            className="w-full bg-[#002855] text-white py-2.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-[#003d80] transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-900/10 disabled:opacity-50"
                                        >
                                            {isSaving ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Check size={14} />
                                                    Actualizar Perfil
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-2 bg-gray-50 border-t border-gray-100">
                                    <button
                                        onClick={logout}
                                        className="w-full py-2 text-[10px] font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LogOut size={12} />
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>  
                        )}
                    </div>
                </div>
            </div>
            </header>
    );
}
                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                                                                
                                                                
