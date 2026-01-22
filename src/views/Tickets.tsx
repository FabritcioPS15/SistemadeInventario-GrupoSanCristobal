import { useState, useEffect } from 'react';
import { Ticket, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TicketForm from '../components/forms/TicketForm';
import TicketDetailModal from '../components/TicketDetailModal';

export default function Tickets() {
    // const { user } = useAuth(); // Keeping commented out or just remove. It might be needed later but for now unused.
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any>(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('tickets')
                .select(`
          *,
          profiles:requester_id(full_name, email),
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Abierto';
            case 'in_progress': return 'En Proceso';
            case 'resolved': return 'Resuelto';
            case 'closed': return 'Cerrado';
            default: return status;
        }
    };



    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            {/* Header */}
            <div className="bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855]">
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h1 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">Mesa de Ayuda</h1>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
                            <span>Soporte Técnico</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>{tickets.length} Tickets</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-wider ${filter === 'all' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-[#002855]'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('open')}
                            className={`px-3 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-wider ${filter === 'open' ? 'bg-white text-[#002855] shadow-sm' : 'text-gray-400 hover:text-[#002855]'}`}
                        >
                            Abiertos
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-1" />

                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#002855] text-white rounded-lg hover:bg-[#002855]/90 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm h-9"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Nuevo Ticket</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    {tickets.map(ticket => (
                        <div
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all group cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusColor(ticket.status)}`}>
                                        {getStatusLabel(ticket.status)}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {ticket.category}
                                    </span>
                                </div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {new Date(ticket.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-[#002855] transition-colors">{ticket.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.description}</p>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600">
                                        {ticket.profiles?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">
                                        {ticket.profiles?.full_name || 'Usuario'}
                                    </span>
                                </div>
                                {ticket.locations && (
                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
                                        {ticket.locations.name}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {tickets.length === 0 && !loading && (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Ticket size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-sm font-bold text-gray-900">No hay tickets registrados</h3>
                            <p className="text-xs text-gray-500 mt-1">Crea un nuevo ticket para comenzar</p>
                        </div>
                    )}
                </div>
            </div>

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
                        setSelectedTicket(null);
                        fetchTickets();
                    }}
                />
            )}
        </div>
    );
}


