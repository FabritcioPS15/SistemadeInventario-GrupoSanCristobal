import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { MessageSquare} from 'lucide-react';
import TicketDetailModal from '../components/TicketDetailModal';

const PRIORITY_STYLES: Record<string, { label: string, color: string, dot: string }> = {
    critical: { label: 'P1 - Crítica', color: 'text-rose-600 bg-rose-50', dot: 'bg-rose-500' },
    high: { label: 'P2 - Alta', color: 'text-orange-600 bg-orange-50', dot: 'bg-orange-500' },
    medium: { label: 'P3 - Media', color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
    low: { label: 'P4 - Baja', color: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' }
};

export default function MyChats() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');

    useEffect(() => {
        const initializeData = async () => {
            await fetchMyTickets();
        };
        
        void initializeData();
        
        const subscription = supabase
            .channel('my-tickets-updates')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'tickets' 
            }, () => { fetchMyTickets(); })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, []);

    const fetchMyTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    requester:requester_id(full_name, avatar_url),
                    attendant:assigned_to(full_name, avatar_url),
                    locations(name)
                `)
                .or(`requester_id.eq.${user?.id},assigned_to.eq.${user?.id}`)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Pendiente';
            case 'in_progress': return 'En Proceso';
            case 'resolved': return 'Resuelto';
            case 'closed': return 'Cerrado';
            default: return status;
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            ticket.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = activeFilter === 'all' || ticket.status === activeFilter;
        
        return matchesSearch && matchesFilter;
    });

    const myCreatedTickets = filteredTickets.filter(t => t.requester_id === user?.id);
    const myAttendedTickets = filteredTickets.filter(t => t.assigned_to === user?.id && t.requester_id !== user?.id);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-[#002855] mb-2">Mis Chats</h1>
                <p className="text-gray-600">Todos tus tickets y conversaciones en un solo lugar</p>
            </div>

            {/* Filtros y búsqueda */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Buscar tickets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        {[
                            { key: 'all', label: 'Todos' },
                            { key: 'open', label: 'Pendientes' },
                            { key: 'in_progress', label: 'En Proceso' },
                            { key: 'resolved', label: 'Resueltos' }
                        ].map(filter => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeFilter === filter.key
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tickets creados por mí */}
            {myCreatedTickets.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                        <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">Mis Tickets Creados</h2>
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black">{myCreatedTickets.length}</span>
                    </div>
                    <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60">
                                    <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ID</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Incidente</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Asignado a</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Prioridad</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {myCreatedTickets.map(t => {
                                    const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                    return (
                                        <tr key={t.id} onClick={() => setSelectedTicket(t)} className="hover:bg-blue-50/10 cursor-pointer transition-all group">
                                            <td className="px-7 py-5"><span className="text-[11px] font-black text-[#002855]">#TK-{t.id.slice(0, 6).toUpperCase()}</span></td>
                                            <td className="px-5 py-5">
                                                <p className="text-[12px] font-black text-slate-700 uppercase line-clamp-1">{t.title}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t.locations?.name || 'Central'}</p>
                                            </td>
                                            <td className="px-5 py-5 text-center">
                                                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 ${t.status === 'open' ? 'text-orange-600 bg-orange-50 border border-orange-100' :
                                                    t.status === 'in_progress' ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                                                        t.status === 'resolved' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                                                            'text-slate-500 bg-slate-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-orange-500' : t.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : t.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`} />
                                                    {getStatusLabel(t.status)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5">
                                                {t.attendant ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase overflow-hidden">{t.attendant?.avatar_url ? <img src={t.attendant.avatar_url} className="w-full h-full object-cover" alt="" /> : t.attendant?.full_name?.charAt(0)}</div>
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase">{t.attendant.full_name?.split(' ')[0]}</span>
                                                    </div>
                                                ) : <span className="text-[10px] text-slate-300 font-black uppercase">Sin asignar</span>}
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${prio.color}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                    <span className="text-[10px] font-black uppercase">{prio.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 text-[10px] font-bold text-slate-400">{new Date(t.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tickets que atiendo */}
            {myAttendedTickets.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                        <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">Tickets que Atiendo</h2>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black">{myAttendedTickets.length}</span>
                    </div>
                    <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60">
                                    <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ID</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Incidente</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitante</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Prioridad</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {myAttendedTickets.map(t => {
                                    const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                    return (
                                        <tr key={t.id} onClick={() => setSelectedTicket(t)} className="hover:bg-indigo-50/10 cursor-pointer transition-all group">
                                            <td className="px-7 py-5"><span className="text-[11px] font-black text-[#002855]">#TK-{t.id.slice(0, 6).toUpperCase()}</span></td>
                                            <td className="px-5 py-5">
                                                <p className="text-[12px] font-black text-slate-700 uppercase line-clamp-1">{t.title}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t.locations?.name || 'Central'}</p>
                                            </td>
                                            <td className="px-5 py-5 text-center">
                                                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 ${t.status === 'open' ? 'text-orange-600 bg-orange-50 border border-orange-100' :
                                                    t.status === 'in_progress' ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                                                        t.status === 'resolved' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                                                            'text-slate-500 bg-slate-100'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-orange-500' : t.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : t.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-400'
                                                        }`} />
                                                    {getStatusLabel(t.status)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase overflow-hidden">{t.requester?.avatar_url ? <img src={t.requester.avatar_url} className="w-full h-full object-cover" alt="" /> : t.requester?.full_name?.charAt(0)}</div>
                                                    <span className="text-[11px] font-bold text-slate-600 uppercase">{t.requester?.full_name?.split(' ')[0]}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${prio.color}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                    <span className="text-[10px] font-black uppercase">{prio.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 text-[10px] font-bold text-slate-400">{new Date(t.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Estado vacío */}
            {filteredTickets.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No tienes chats</h3>
                    <p className="text-gray-400">No se encontraron tickets que coincidan con tu búsqueda</p>
                </div>
            )}

            {/* Modal del ticket */}
            {selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                    onUpdate={fetchMyTickets}
                />
            )}
        </div>
    );
}
