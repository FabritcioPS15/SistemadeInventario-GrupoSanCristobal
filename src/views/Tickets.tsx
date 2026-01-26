import { useState, useEffect, useMemo } from 'react';
import { Ticket, Plus, LayoutGrid, List, Search, Filter, Clock, User, ArrowRight, Star, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import TicketForm from '../components/forms/TicketForm';
import TicketDetailModal from '../components/TicketDetailModal';

// Status definitions with premium executive styling
const TICKET_STATUSES: Record<string, { label: string, color: string, badge: string, icon: string }> = {
    open: {
        label: 'Abierto',
        color: 'bg-blue-50 text-blue-700 border-blue-200/50',
        badge: 'bg-blue-600 text-white shadow-blue-200',
        icon: '🔵'
    },
    in_progress: {
        label: 'En Proceso',
        color: 'bg-amber-50 text-amber-700 border-amber-200/50',
        badge: 'bg-amber-500 text-white shadow-amber-200',
        icon: '🟠'
    },
    resolved: {
        label: 'Resuelto',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
        badge: 'bg-emerald-500 text-white shadow-emerald-200',
        icon: '🟢'
    },
    closed: {
        label: 'Cerrado',
        color: 'bg-slate-50 text-slate-700 border-slate-200/50',
        badge: 'bg-slate-500 text-white shadow-slate-200',
        icon: '⚪'
    }
};

const PRIORITY_STYLES: Record<string, string> = {
    critical: 'bg-rose-600 text-white shadow-rose-200',
    high: 'bg-orange-500 text-white shadow-orange-100',
    medium: 'bg-indigo-500 text-white shadow-indigo-100',
    low: 'bg-slate-400 text-white shadow-slate-100'
};

export default function Tickets() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

    useEffect(() => {
        fetchTickets();

        const ticketSubscription = supabase
            .channel('tickets-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
                fetchTickets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ticketSubscription);
        };
    }, []);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    requester:requester_id(full_name, email),
                    attendant:assigned_to(full_name, email),
                    locations(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tickets, searchTerm, statusFilter]);

    const kanbanColumns = useMemo(() => {
        const columns: Record<string, any[]> = { open: [], in_progress: [], resolved: [], closed: [] };
        filteredTickets.forEach(ticket => {
            if (columns[ticket.status]) {
                columns[ticket.status].push(ticket);
            }
        });
        return columns;
    }, [filteredTickets]);

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            {/* Standard Application Header (h-14) */}
            <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-4">
                    <div className="bg-[#f1f5f9] p-2 rounded-xl text-blue-600">
                        <Ticket size={20} />
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Mesa de Ayuda</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
                            <span>Soporte Técnico</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{tickets.length} Tickets</span>
                        </div>
                    </div>
                </div>

                {/* Integrated Search Bar in Header */}
                <div className="flex-1 max-w-md px-2 sm:px-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all text-xs sm:text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-2 border border-slate-200 shadow-inner">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Kanban"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Lista"
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
                        <button
                            onClick={() => setShowForm(true)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                            title="Nuevo Ticket"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
                        <Star size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Standard Filter Sub-bar */}
            <div className="px-6 py-3 bg-white/50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                        <Filter size={12} className="text-slate-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Estado:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-[10px] font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="all">TODOS LOS ESTADOS</option>
                            {Object.entries(TICKET_STATUSES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={12} />
                    <span>Sincronizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Main Content View */}
            <div className="flex-1 overflow-hidden p-4 sm:p-8">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Analizando Datos</p>
                    </div>
                ) : viewMode === 'kanban' ? (
                    /* PREMIUM KANBAN */
                    <div className="flex h-full gap-4 sm:gap-8 overflow-x-auto pb-4 snap-x snap-mandatory remove-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                        {Object.entries(TICKET_STATUSES).map(([statusKey, config]) => (
                            <div key={statusKey} className="flex-none w-[280px] sm:w-80 flex flex-col h-full bg-slate-200/40 rounded-[1.5rem] sm:rounded-[2rem] border border-white/40 shadow-xl backdrop-blur-sm snap-center overflow-hidden">
                                {/* Kanban Column Header */}
                                <div className="px-6 py-5 bg-white/60 border-b border-white/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${config.badge} shadow-md`}></div>
                                        <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xs">{config.label}</h3>
                                    </div>
                                    <span className="bg-white/80 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100 shadow-sm">
                                        {kanbanColumns[statusKey]?.length || 0}
                                    </span>
                                </div>

                                {/* Kanban Column Content */}
                                <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                                    {kanbanColumns[statusKey]?.length > 0 ? (
                                        kanbanColumns[statusKey].map(ticket => (
                                            <div
                                                key={ticket.id}
                                                onClick={() => setSelectedTicket(ticket)}
                                                className="bg-white p-4 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 cursor-pointer transition-all duration-300 group relative transform hover:-translate-y-1 active:scale-[0.98]"
                                            >
                                                {/* Priority Indicator */}
                                                <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full group-hover:w-1.5 transition-all ${PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES]}`}></div>

                                                <div className="flex justify-between items-center mb-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES]}`}>
                                                        {ticket.priority}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-300 tracking-tighter uppercase font-mono">INC-{ticket.id.slice(0, 4)}</span>
                                                </div>

                                                <h4 className="text-[13px] font-bold text-slate-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors">
                                                    {ticket.title}
                                                </h4>

                                                {/* Meta Info */}
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                                            {ticket.requester?.full_name?.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter leading-none">Solicitado por</span>
                                                            <span className="text-[10px] text-slate-700 font-bold truncate max-w-[120px]">
                                                                {ticket.requester?.full_name}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button className="text-slate-300 group-hover:text-blue-500 transition-colors">
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>

                                                {/* Attendance Activity Indicator */}
                                                {ticket.status === 'in_progress' && ticket.attendant && (
                                                    <div className="mt-4 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/50 flex flex-col gap-2 relative overflow-hidden group/att">
                                                        <div className="absolute top-0 right-0 p-1">
                                                            <div className="w-1 h-1 rounded-full bg-amber-400 animate-ping"></div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[8px] font-black text-amber-600 uppercase tracking-widest">
                                                            <Clock size={10} />
                                                            <span>Atención Prioritaria</span>
                                                        </div>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center text-[9px] font-black text-white shadow-md border border-amber-400/30">
                                                                {ticket.attendant.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] text-amber-900 font-black leading-none">{ticket.attendant.full_name}</span>
                                                                {ticket.attended_at && (
                                                                    <span className="text-[8px] text-amber-600/70 font-bold mt-0.5">
                                                                        Desde {new Date(ticket.attended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-40 border-2 border-dashed border-slate-300/50 rounded-[1.5rem] flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                                <Ticket size={14} className="opacity-40" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest">Sin Pendientes</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* EXECUTIVE LIST VIEW */
                    <div className="grid grid-cols-1 gap-4 max-w-6xl mx-auto pb-10">
                        {filteredTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="bg-white border border-slate-200 rounded-[1.2rem] sm:rounded-[1.5rem] p-3 sm:p-5 hover:shadow-2xl hover:border-blue-300 transition-all duration-300 cursor-pointer flex items-center justify-between group relative overflow-hidden"
                            >
                                <div className="flex items-center gap-3 sm:gap-8 min-w-0">
                                    <div className={`w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl shadow-lg border-2 ${TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.color}`}>
                                        {TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES]}`}>
                                                {ticket.priority}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate">INC-{ticket.id.slice(0, 8)}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm sm:text-lg group-hover:text-blue-700 transition-colors mb-2 truncate">{ticket.title}</h4>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-5 text-[10px] sm:text-xs text-slate-500 font-medium font-sans">
                                            <span className="flex items-center gap-1 sm:gap-2 px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-100 rounded-full border border-slate-200">
                                                <User size={12} className="text-slate-400" />
                                                <span className="font-bold text-slate-700 leading-none truncate max-w-[80px] sm:max-w-none">{ticket.requester?.full_name}</span>
                                            </span>
                                            <span className="flex items-center gap-1 sm:gap-2">
                                                <Clock size={12} className="text-slate-400" />
                                                <span className="hidden xs:inline">{new Date(ticket.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                <span className="xs:hidden">{new Date(ticket.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}</span>
                                            </span>

                                            {/* Attendant Badge in List */}
                                            {ticket.status === 'in_progress' && ticket.attendant && (
                                                <span className="flex items-center gap-2 text-amber-700 font-black px-2 py-0.5 sm:px-4 sm:py-1.5 bg-amber-100 border border-amber-200 rounded-full animate-in slide-in-from-left-2 shadow-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
                                                    <span className="hidden sm:inline">En Atención por: </span>{ticket.attendant.full_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:gap-6 ml-4">
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación</p>
                                        <p className="text-sm font-bold text-slate-700 uppercase">{ticket.locations?.name || 'General'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-200 group-hover:border-blue-400">
                                        <ArrowRight size={16} className="sm:size-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Premium Modals Overlay */}
            {showForm && (
                <TicketForm
                    onClose={() => setShowForm(false)}
                    onSave={() => {
                        setShowForm(false);
                        fetchTickets();
                    }}
                />
            )}

            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={() => {
                        fetchTickets();
                    }}
                />
            )}
        </div>
    );
}
