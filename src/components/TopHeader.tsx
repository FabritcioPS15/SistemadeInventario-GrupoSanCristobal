import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Star, Plus, Settings, HelpCircle, Globe, LayoutGrid, Trash2 } from 'lucide-react';
import { supabase, SutranVisit } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function TopHeader() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [sutranNotifications, setSutranNotifications] = useState<SutranVisit[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Favorites State
    const [favorites, setFavorites] = useState<{ path: string; title: string }[]>([]);
    const [showFavorites, setShowFavorites] = useState(false);
    const favoriteRef = useRef<HTMLDivElement>(null);

    // Load favorites from local storage
    useEffect(() => {
        const saved = localStorage.getItem('gsc_favorites');
        if (saved) {
            setFavorites(JSON.parse(saved));
        }
    }, []);

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

    const toggleFavorite = () => {
        const currentPath = location.pathname;
        const isFavorite = favorites.some(fav => fav.path === currentPath);
        let newFavorites;

        if (isFavorite) {
            newFavorites = favorites.filter(fav => fav.path !== currentPath);
        } else {
            newFavorites = [...favorites, { path: currentPath, title: getPageTitle(currentPath) }];
        }

        setFavorites(newFavorites);
        localStorage.setItem('gsc_favorites', JSON.stringify(newFavorites));
    };

    const isCurrentPageFavorite = favorites.some(fav => fav.path === location.pathname);

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
            if (favoriteRef.current && !favoriteRef.current.contains(event.target as Node)) {
                setShowFavorites(false);
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

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
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
        <header className="h-14 bg-[#002855] text-white flex items-center justify-between px-6 sticky top-0 z-20 shadow-lg">
            <div className="flex items-center gap-6">
                <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <LayoutGrid size={20} />
                </button>

                <div className="h-8 w-[1px] bg-white/20" />

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 group-hover:text-white transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar en el sistema..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearch}
                        className="bg-white/10 border-none rounded-md pl-10 pr-4 py-1.5 text-sm w-48 lg:w-80 focus:ring-1 focus:ring-white/30 focus:bg-white/20 transition-all placeholder:text-white/40"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Mock currency info from the image */}
                <div className="hidden xl:flex items-center gap-4 text-[11px] font-bold text-white/70 mr-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-white/40"></span>
                        <span>GRUPO SAN CRISTOBAL</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        title="Nuevo"
                        onClick={() => alert('Función de creación rápida próximamente')}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Plus size={18} />
                    </button>

                    {/* Favorites */}
                    <div className="relative" ref={favoriteRef}>
                        <button
                            title="Favoritos"
                            onClick={() => setShowFavorites(!showFavorites)}
                            className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${showFavorites ? 'bg-white/10' : ''}`}
                        >
                            <Star size={18} className={isCurrentPageFavorite ? "fill-yellow-400 text-yellow-400" : ""} />
                        </button>

                        {showFavorites && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="text-xs font-black text-[#002855] uppercase tracking-wider">Favoritos</h3>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    <button
                                        onClick={toggleFavorite}
                                        className="w-full text-left p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors flex items-center gap-2 text-xs font-bold text-blue-600"
                                    >
                                        <Star size={14} className={isCurrentPageFavorite ? "fill-blue-600" : ""} />
                                        {isCurrentPageFavorite ? 'Quitar página actual' : 'Agendar esta página'}
                                    </button>

                                    {favorites.map((fav) => (
                                        <div
                                            key={fav.path}
                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors flex items-center justify-between group"
                                            onClick={() => {
                                                navigate(fav.path);
                                                setShowFavorites(false);
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                                <span className="text-xs font-medium text-gray-700">{fav.title}</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newFavs = favorites.filter(f => f.path !== fav.path);
                                                    setFavorites(newFavs);
                                                    localStorage.setItem('gsc_favorites', JSON.stringify(newFavs));
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}

                                    {favorites.length === 0 && !isCurrentPageFavorite && (
                                        <div className="p-4 text-center text-gray-400 text-xs italic">
                                            No tienes favoritos guardados
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        title="Pantalla completa"
                        onClick={toggleFullscreen}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors hidden sm:block"
                    >
                        <Globe size={18} />
                    </button>

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
                            {sutranNotifications.length > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#002855]" />
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <h3 className="text-xs font-black text-[#002855] uppercase tracking-wider">Notificaciones</h3>
                                    <span className="text-[10px] font-bold text-gray-400">{sutranNotifications.length} Pendientes</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {sutranNotifications.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400 text-xs">
                                            No tienes notificaciones pendientes
                                        </div>
                                    ) : (
                                        sutranNotifications.map((note) => (
                                            <div
                                                key={note.id}
                                                onClick={() => {
                                                    navigate('/sutran');
                                                    setShowNotifications(false);
                                                }}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-rose-100 p-2 rounded-lg text-rose-600 mt-0.5">
                                                        <Bell size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700">Visita SUTRAN Programada</p>
                                                        <p className="text-[11px] text-gray-500 mt-0.5">{note.location_name}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                                                {getDaysRemaining(note.visit_date)}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(note.visit_date).toLocaleDateString('es-ES')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
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
    );
}
