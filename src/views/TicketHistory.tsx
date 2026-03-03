import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, ShieldCheck, Lock, Search, Calendar, Clock, Filter, Plus, BarChart3, Download, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Ticket {
    id: string;
    title: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    requester: {
        full_name: string;
        avatar_url?: string;
    };
    attendant?: {
        full_name: string;
        avatar_url?: string;
    };
    locations?: {
        name: string;
    };
}

const PRIORITY_STYLES: Record<string, { label: string, color: string, dot: string }> = {
    critical: { label: 'Crítico', color: 'text-rose-600 bg-rose-50', dot: 'bg-rose-500' },
    high: { label: 'Alta', color: 'text-orange-600 bg-orange-50', dot: 'bg-orange-500' },
    medium: { label: 'Media', color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
    low: { label: 'Baja', color: 'text-slate-600 bg-slate-50', dot: 'bg-slate-500' }
};

export default function TicketHistory() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState('all');

    useEffect(() => {
        fetchArchivedTickets();
    }, []);

    const fetchArchivedTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    requester:requester_id(full_name, avatar_url),
                    attendant:assigned_to(full_name, avatar_url),
                    locations(name)
                `)
                .eq('status', 'archived')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching archived tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            // Search filter
            const searchMatch = searchTerm === '' || 
                ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.locations?.name?.toLowerCase().includes(searchTerm.toLowerCase());

            // Priority filter
            const priorityMatch = filterPriority === 'all' || ticket.priority === filterPriority;

            // Date range filter
            let dateMatch = true;
            if (filterDateRange !== 'all') {
                const ticketDate = new Date(ticket.created_at);
                const now = new Date();
                
                switch (filterDateRange) {
                    case '7days':
                        dateMatch = (now.getTime() - ticketDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
                        break;
                    case '30days':
                        dateMatch = (now.getTime() - ticketDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
                        break;
                    case '90days':
                        dateMatch = (now.getTime() - ticketDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
                        break;
                }
            }

            return searchMatch && priorityMatch && dateMatch;
        });
    }, [tickets, searchTerm, filterPriority, filterDateRange]);

    const getTimeToClose = (ticket: Ticket) => {
        const created = new Date(ticket.created_at);
        const closed = new Date(ticket.closed_at || ticket.updated_at);
        const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'mismo día';
        if (days === 1) return '1 día';
        return `${days} días`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#002855] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Cargando historial...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f9fc]">
            {/* Header Section */}
            <div className="px-8 pt-8 pb-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/tickets')}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-[#002855] hover:bg-slate-50 rounded-lg transition-all"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Volver</span>
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#002855] flex items-center justify-center text-white shadow-xl">
                                <History size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-[#002855] tracking-tight">Historial de Tickets</h1>
                                <p className="text-sm text-slate-500">Tickets cerrados y archivados automáticamente</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-500">
                            <span className="font-bold text-[#002855]">{filteredTickets.length}</span> tickets archivados
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por título, solicitante o sede..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Priority Filter */}
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-400" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-transparent text-sm"
                            >
                                <option value="all">Todas las prioridades</option>
                                <option value="critical">Crítico</option>
                                <option value="high">Alta</option>
                                <option value="medium">Media</option>
                                <option value="low">Baja</option>
                            </select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            <select
                                value={filterDateRange}
                                onChange={(e) => setFilterDateRange(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] focus:border-transparent text-sm"
                            >
                                <option value="all">Todo el tiempo</option>
                                <option value="7days">Últimos 7 días</option>
                                <option value="30days">Últimos 30 días</option>
                                <option value="90days">Últimos 90 días</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-8 pb-12">
                {filteredTickets.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
                        <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck size={48} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">No se encontraron tickets archivados</h3>
                        <p className="text-slate-500">
                            {searchTerm || filterPriority !== 'all' || filterDateRange !== 'all' 
                                ? 'Intenta ajustar los filtros de búsqueda'
                                : 'Los tickets cerrados aparecerán aquí después de 10 minutos'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ID Ticket</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Incidente</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitante</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Atendido por</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Prioridad</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Tiempo cierre</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredTickets.map((ticket) => {
                                    const prio = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium;
                                    
                                    return (
                                        <tr key={ticket.id} onClick={() => navigate(`/ticket/${ticket.id}`)} className="hover:bg-blue-50/10 transition-all cursor-pointer group active:bg-blue-50/30">
                                            <td className="px-8 py-6">
                                                <span className="text-[11px] font-black text-[#002855] tracking-tight">#TK-{ticket.id.slice(0, 6).toUpperCase()}</span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div>
                                                    <p className="text-[12px] font-black text-slate-700 uppercase tracking-tight line-clamp-1">{ticket.title}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{ticket.locations?.name || 'Central'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span className="px-4 py-1.5 rounded-lg bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-100">
                                                    <Lock size={12} />
                                                    Archivado
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase overflow-hidden shadow-inner group-hover:bg-white transition-all">
                                                        {ticket.requester?.avatar_url ? (
                                                            <img src={ticket.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : ticket.requester?.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-700 uppercase leading-none mb-1">{ticket.requester?.full_name?.split(' ')[0]}</p>
                                                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest truncate max-w-[80px]">{ticket.locations?.name || 'Central'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                {ticket.attendant ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[10px] font-black text-blue-600 uppercase overflow-hidden shadow-inner group-hover:bg-white transition-all">
                                                            {ticket.attendant?.avatar_url ? (
                                                                <img src={ticket.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : ticket.attendant?.full_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-slate-700 uppercase leading-none">{ticket.attendant?.full_name?.split(' ')[0]}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-slate-300 font-black uppercase">Sin asignar</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${prio.color} border-current/10`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{prio.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                                    <Clock size={12} />
                                                    {getTimeToClose(ticket)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
