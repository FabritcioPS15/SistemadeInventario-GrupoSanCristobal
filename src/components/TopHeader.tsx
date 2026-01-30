import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Settings, HelpCircle, LayoutGrid, Menu, Pin, PinOff, AlertTriangle } from 'lucide-react';
import { supabase, SutranVisit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useHeaderVisible } from '../hooks/useHeaderVisible';

type TopHeaderProps = {
    onMobileMenuClick?: () => void;
};

export default function TopHeader({ onMobileMenuClick }: TopHeaderProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [sutranNotifications, setSutranNotifications] = useState<SutranVisit[]>([]);
    const [vehicleNotifications, setVehicleNotifications] = useState<any[]>([]);
    const [userLocation, setUserLocation] = useState<string>('');
    const notificationRef = useRef<HTMLDivElement>(null);

    // Pinning State
    const [isPinned, setIsPinned] = useState(() => {
        return localStorage.getItem('header_pinned') === 'true';
    });

    const isVisible = useHeaderVisible(isPinned);

    const togglePin = () => {
        const newValue = !isPinned;
        setIsPinned(newValue);
        localStorage.setItem('header_pinned', String(newValue));
    };


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
                console.log('Location updated:', payload);
                if (payload.new && 'name' in payload.new) {
                    setUserLocation(payload.new.name as string);
                }
            })
            .subscribe();

        // Subscribe to user changes (in case location_id changes)
        const userSubscription = supabase
            .channel('user-changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${user?.id}`
            }, (payload) => {
                console.log('User updated:', payload);
                // Refetch location if location_id changed
                if (payload.new && 'location_id' in payload.new) {
                    fetchUserLocation();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(locationSubscription);
            supabase.removeChannel(userSubscription);
        };
    }, [user?.location_id, user?.id]);

    // Helper to get readable title from path
    const getPageTitle = (path: string) => {
        if (path === '/') return 'Dashboard';
        if (path.startsWith('/inventory')) return 'Inventario';
        if (path.startsWith('/tickets')) return 'Mesa de Ayuda';
        if (path.startsWith('/users')) return 'Usuarios';
        if (path.startsWith('/flota')) return 'Flota Vehicular';
        if (path.startsWith('/maintenance')) return 'Mantenimiento';
        if (path.startsWith('/checklist')) return 'Checklists';
        if (path.startsWith('/sutran')) return 'SUTRAN';
        if (path.startsWith('/cameras')) return 'Camaras';
        if (path.startsWith('/audit')) return 'Auditoría';
        return 'Página del Sistema';
    };


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

        // Polling every minute
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // Basic global search implementation: redirect to inventory with query
            // In a real app, this might open a command palette or search across multiple tables
            if (searchTerm.trim()) {
                navigate(`/inventory?search=${encodeURIComponent(searchTerm)}`);
            }
        }
    };

    const getDaysRemaining = (dateString: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Mañana';
        return `en ${diffDays} días`;
    };

    return (
        <>
            <header className={`h-14 bg-[#002855] text-white flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg transition-transform duration-500 ease-in-out ${isVisible || isPinned ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-4 lg:gap-6">
                    <button
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                        onClick={onMobileMenuClick}
                    >
                        <Menu size={20} />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors hidden lg:block">
                        <LayoutGrid size={20} />
                    </button>

                    <div className="h-8 w-[1px] bg-white/20" />

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-hover:text-white transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                            className="bg-white/10 border-none rounded-md pl-10 pr-4 py-1.5 text-sm w-32 sm:w-48 lg:w-80 focus:ring-1 focus:ring-white/30 focus:bg-white/20 transition-all placeholder:text-white/40"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mock currency info from the image */}
                    <div className="hidden xl:flex items-center gap-4 text-[11px] font-bold text-white/70 mr-4">
                        <div className="flex items-center gap-2">
                            <span className="text-white/40"></span>
                            <span>GRUPO SAN CRISTOBAL</span>
                            {userLocation && (
                                <>
                                    <span className="text-white/30">•</span>
                                    <span className="text-white/90">{userLocation}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1">

                        {/* Notifications */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                title="Notificaciones"
                                onClick={() => {
                                    setShowNotifications(!showNotifications);
                                }}
                                className={`p-2 hover:bg-white/10 rounded-lg transition-colors relative ${showNotifications ? 'bg-white/10' : ''}`}
                            >
                                <Bell size={18} />
                                {sutranNotifications.length + vehicleNotifications.length > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#002855]" />
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                        <h3 className="text-xs font-black text-[#002855] uppercase tracking-wider">Notificaciones</h3>
                                        <span className="text-[10px] font-bold text-gray-400">{sutranNotifications.length + vehicleNotifications.length} Pendientes</span>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {sutranNotifications.length === 0 && vehicleNotifications.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400 text-xs">
                                                No tienes notificaciones pendientes
                                            </div>
                                        ) : (
                                            <>
                                                {/* Vehicle Alerts */}
                                                {vehicleNotifications.map((note) => (
                                                    <div
                                                        key={note.id}
                                                        onClick={() => {
                                                            navigate('/flota-vehicular');
                                                            setShowNotifications(false);
                                                        }}
                                                        className="p-3 hover:bg-orange-50 cursor-pointer border-b border-gray-50 transition-colors group"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`p-2 rounded-lg mt-0.5 ${note.priority === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                                <AlertTriangle size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-800 group-hover:text-amber-700">{note.title}</p>
                                                                <p className="text-[11px] text-gray-500 mt-0.5">{note.subtitle}</p>
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${note.priority === 'danger'
                                                                        ? 'text-rose-600 bg-rose-50 border-rose-100'
                                                                        : 'text-amber-600 bg-amber-50 border-amber-100'
                                                                        }`}>
                                                                        {note.daysRemaining < 0 ? `Vencido hace ${Math.abs(note.daysRemaining)} días` : (note.daysRemaining === 0 ? 'Vence Hoy' : `Vence en ${note.daysRemaining} días`)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Sutran Alerts */}
                                                {sutranNotifications.map((note) => (
                                                    <div
                                                        key={note.id}
                                                        onClick={() => {
                                                            navigate('/sutran');
                                                            setShowNotifications(false);
                                                        }}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors group"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-0.5">
                                                                <Bell size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700">Visita SUTRAN Programada</p>
                                                                <p className="text-[11px] text-gray-500 mt-0.5">{note.location_name}</p>
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                                        {getDaysRemaining(note.visit_date)}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {new Date(note.visit_date).toLocaleDateString('es-ES')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                                        <button
                                            onClick={() => {
                                                navigate('/sutran');
                                                setShowNotifications(false);
                                            }}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                                        >
                                            Ver todas
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            title={isPinned ? "Desfijar Header" : "Fijar Header"}
                            onClick={togglePin}
                            className={`p-2 rounded-lg transition-colors hidden sm:flex ${isPinned ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-white/70'}`}
                        >
                            {isPinned ? <Pin size={18} /> : <PinOff size={18} />}
                        </button>

                        <button title="Ayuda" onClick={() => alert('Soporte no disponible')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <HelpCircle size={18} />
                        </button>

                        <div className="h-8 w-[1px] bg-white/20 mx-1" />

                        <button className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                            <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                                {user?.full_name?.charAt(0)}
                            </div>
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </header>

        </>
    );
}
