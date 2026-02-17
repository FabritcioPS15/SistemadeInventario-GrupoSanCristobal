import { useState, useEffect, useMemo } from 'react';
import { Ticket, Plus, LayoutGrid, List, Search, Filter, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

    // Force List view when in History Tab
    useEffect(() => {
        if (activeTab === 'history') {
            setViewMode('list');
        }
    }, [activeTab]);

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

        // Optional: Run cleanup check every minute to auto-close resolved tickets
        const interval = setInterval(() => {
            checkAndAutoCloseTickets();
        }, 60000);

        return () => {
            supabase.removeChannel(ticketSubscription);
            clearInterval(interval);
        };
    }, []);

    const checkAndAutoCloseTickets = async () => {
        // Find tickets that have been 'resolved' for more than 1 hour
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        try {
            const { data: toClose } = await supabase
                .from('tickets')
                .select('id')
                .eq('status', 'resolved')
                .lt('resolved_at', oneHourAgo);

            if (toClose && toClose.length > 0) {
                console.log(` Auto-closing ${toClose.length} resolved tickets...`);
                await supabase
                    .from('tickets')
                    .update({ status: 'closed', closed_at: new Date().toISOString() })
                    .in('id', toClose.map(t => t.id));
            }
        } catch (error) {
            console.error('Error in auto-close logic:', error);
        }
    };

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
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        return tickets.filter(ticket => {
            const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.description?.toLowerCase().includes(searchTerm.toLowerCase());

            // Archiving logic
            // 1. If status is NOT closed, it's active.
            // 2. If status IS closed, it's active only if closed_at is within last 5 minutes.
            // 3. Otherwise, it belongs to history.

            let isHistory = false;
            if (ticket.status === 'closed') {
                if (ticket.closed_at) {
                    const closedTime = new Date(ticket.closed_at).getTime();
                    if (now - closedTime > fiveMinutes) {
                        isHistory = true;
                    }
                } else {
                    // If no closed_at (legacy), assume it's history
                    isHistory = true;
                }
            } else if (ticket.status === 'resolved') {
                // If legacy resolved tickets without resolved_at exist, they stay in active until manual status change
                isHistory = false;
            }

            const matchesTab = activeTab === 'active' ? !isHistory : isHistory;

            const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
            return matchesSearch && matchesTab && matchesStatus;
        });
    }, [tickets, searchTerm, statusFilter, activeTab]);

    const kanbanColumns = useMemo(() => {
        const columns: Record<string, any[]> = activeTab === 'active'
            ? { open: [], in_progress: [], resolved: [], closed: [] }
            : { resolved: [], closed: [] };

        filteredTickets.forEach(ticket => {
            if (columns[ticket.status]) {
                columns[ticket.status].push(ticket);
            }
        });
        return columns;
    }, [filteredTickets, activeTab]);

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            {/* Standard Application Header (h-14) */}
            <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
                        <Ticket size={22} strokeWidth={2.5} />
                    </div>
                    <div className="hidden lg:block border-l border-slate-200 pl-4">
                        <h2 className="text-[14px] font-black text-[#002855] uppercase tracking-wider leading-none">Mesa de Ayuda</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-1.5 bg-slate-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span>Soporte Técnico</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{tickets.length} Global</span>
                        </div>
                    </div>
                </div>

                {/* Archiving Tabs - Professional Design */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'active' ? 'bg-white text-blue-700 shadow-md border border-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Clock size={14} />
                        Gestión Activa
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${activeTab === 'history' ? 'bg-white text-indigo-700 shadow-md border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <LayoutGrid size={14} />
                        Historial
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'active' && (
                        <div className="flex bg-slate-100 p-1 rounded-lg mr-2 border border-slate-200">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Vista Kanban"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Vista Lista"
                            >
                                <List size={16} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
                            title="Nuevo Ticket"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Standard Filter Sub-bar - Enhanced */}
            <div className="px-6 py-4 bg-white/70 border-b border-slate-200/50 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <Filter size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">Estado:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                        >
                            <option value="all">TODOS LOS ESTADOS</option>
                            {Object.entries(TICKET_STATUSES).map(([key, config]) => (
                                <option key={key} value={key}>{config.label.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    {/* Integrated Search */}
                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar ticket..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <Clock size={12} strokeWidth={3} className="text-blue-500" />
                    <span>Sincronizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Main Content View */}
            <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-blue-50 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Consultando Repositorio</p>
                    </div>
                ) : viewMode === 'kanban' ? (
                    /* PREMIUM KANBAN - Redesigned */
                    <div className="flex h-full gap-6 sm:gap-8 overflow-x-auto pb-4 snap-x snap-mandatory remove-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                        {Object.entries(kanbanColumns).map(([statusKey, items]) => {
                            const config = TICKET_STATUSES[statusKey as keyof typeof TICKET_STATUSES];
                            return (
                                <div key={statusKey} className="flex-none w-[300px] sm:w-[340px] flex flex-col h-full bg-slate-200/30 rounded-[2.5rem] border border-white/50 shadow-inner snap-center overflow-hidden">
                                    {/* Kanban Column Header - Glassmorphism */}
                                    <div className="px-6 py-5 bg-white/40 border-b border-white/40 flex items-center justify-between backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-6 rounded-full ${config.badge} shadow-sm`}></div>
                                            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-[13px]">{config.label}</h3>
                                        </div>
                                        <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-black text-slate-600 border border-slate-100 shadow-sm">
                                            {items.length}
                                        </span>
                                    </div>

                                    {/* Kanban Column Content */}
                                    <div className="p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                                        {items.length > 0 ? (
                                            items.map(ticket => (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="group bg-white p-5 rounded-[2rem] border border-transparent shadow-md hover:shadow-2xl hover:border-blue-200 cursor-pointer transition-all duration-500 relative transform hover:-translate-y-2 active:scale-[0.98] overflow-hidden"
                                                >
                                                    {/* Status Decorator */}
                                                    <div className={`absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity ${TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.badge}`}></div>

                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm ${PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES]}`}>
                                                            {ticket.priority}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase font-mono">#{ticket.id.slice(0, 8)}</span>
                                                    </div>

                                                    <h4 className="text-[14px] font-black text-slate-800 mb-3 leading-[1.2] group-hover:text-blue-700 transition-colors">
                                                        {ticket.title}
                                                    </h4>

                                                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-4 font-medium leading-relaxed group-hover:text-slate-600 transition-colors">
                                                        {ticket.description}
                                                    </p>

                                                    {/* Meta Info */}
                                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-[11px] font-black text-slate-500 border border-slate-200 group-hover:from-blue-50 group-hover:to-blue-100 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                                                                {ticket.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter leading-none mb-0.5">Reportado por</span>
                                                                <span className="text-[11px] text-slate-700 font-black truncate max-w-[120px]">
                                                                    {ticket.requester?.full_name}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter leading-none mb-1">Apertura</span>
                                                            <span className="text-[10px] text-slate-500 font-black">{new Date(ticket.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                                        </div>
                                                    </div>

                                                    {/* Attendance Activity Indicator */}
                                                    {ticket.status === 'in_progress' && (
                                                        <div className="mt-4 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/50 flex items-center justify-between relative overflow-hidden group/att">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-black text-white shadow-md border border-amber-400/30">
                                                                    {ticket.attendant?.full_name?.charAt(0) || '?'}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] text-amber-900 font-black leading-none">{ticket.attendant?.full_name}</span>
                                                                    <span className="text-[8px] text-amber-600/70 font-bold mt-0.5 uppercase tracking-widest">En Atención</span>
                                                                </div>
                                                            </div>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="h-40 border-2 border-dashed border-slate-300/40 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 gap-3 grayscale opacity-60">
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                                                    <Ticket size={18} className="opacity-40" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bandeja Vacía</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* PREMIUM LIST VIEW - Redesigned */
                    <div className="grid grid-cols-1 gap-5 max-w-6xl mx-auto pb-10">
                        {filteredTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="bg-white border border-slate-100 rounded-[2rem] p-4 sm:p-6 hover:shadow-2xl hover:border-blue-400/30 transition-all duration-500 cursor-pointer flex flex-col sm:flex-row items-center justify-between group relative overflow-hidden transform hover:-translate-x-1"
                            >
                                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-10 min-w-0 w-full sm:w-auto">
                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-xl border-4 border-white ${TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.color}`}>
                                        {TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.icon}
                                    </div>
                                    <div className="min-w-0 text-center sm:text-left flex-1">
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-3">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-sm ${PRIORITY_STYLES[ticket.priority as keyof typeof PRIORITY_STYLES]}`}>
                                                {ticket.priority}
                                            </span>
                                            <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 font-mono tracking-widest shadow-sm">INC-{ticket.id.slice(0, 8).toUpperCase()}</span>
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.color}`}>
                                                {TICKET_STATUSES[ticket.status as keyof typeof TICKET_STATUSES]?.label}
                                            </span>
                                        </div>
                                        <h2 className="group-hover:text-blue-700 transition-colors mb-4 line-clamp-1 leading-tight">{ticket.title}</h2>

                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 font-bold uppercase tracking-widest">
                                            <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm text-slate-700">
                                                <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center text-[10px]">{ticket.requester?.full_name?.charAt(0)}</div>
                                                <span className="truncate max-w-[120px]">{ticket.requester?.full_name}</span>
                                            </span>
                                            <span className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                <Clock size={14} className="text-slate-400" />
                                                <span className="whitespace-nowrap">{new Date(ticket.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                            </span>
                                            {ticket.locations && (
                                                <span className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                    <LayoutGrid size={14} className="text-slate-400" />
                                                    <span className="whitespace-nowrap">{ticket.locations.name}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 sm:mt-0 flex items-center gap-8 self-center sm:self-auto pl-0 sm:pl-10 border-t sm:border-t-0 sm:border-l border-slate-100 pt-6 sm:pt-0">
                                    {ticket.status === 'in_progress' && (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center shadow-sm">
                                                {ticket.attendant?.full_name?.charAt(0) || '?'}
                                            </div>
                                            <div className="hidden md:block text-right">
                                                <p className="detail-label leading-none mb-1">Asignado a</p>
                                                <p className="detail-value">{ticket.attendant?.full_name}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-slate-50 w-14 h-14 rounded-3xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner border border-slate-200 group-hover:border-blue-400 group-hover:shadow-blue-200 group-hover:shadow-xl">
                                        <ArrowRight size={24} strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredTickets.length === 0 && (
                            <div className="h-60 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                                <Search size={48} className="animate-bounce" />
                                <p className="text-sm font-black uppercase tracking-[0.5em]">Repositorio sin coincidencias</p>
                            </div>
                        )}
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

