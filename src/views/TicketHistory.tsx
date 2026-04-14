import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ShieldCheck, Search, Calendar, Filter, RefreshCw, Ticket as TicketIcon, Clock, User } from 'lucide-react';
import { FaFilePdf } from "react-icons/fa6";
import { RiFileExcel2Fill } from "react-icons/ri";
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Ticket {
    id: string;
    title: string;
    description?: string;
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
    critical: { label: 'P1 - Crítica', color: 'text-rose-600 bg-rose-50', dot: 'bg-rose-500' },
    high: { label: 'P2 - Alta', color: 'text-orange-600 bg-orange-50', dot: 'bg-orange-500' },
    medium: { label: 'P3 - Media', color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
    low: { label: 'P4 - Baja', color: 'text-slate-600 bg-slate-50', dot: 'bg-slate-500' }
};

export default function TicketHistory() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching archived tickets:', error);
                throw error;
            }

            setTickets(data || []);
        } catch (error) {
            console.error('❌ Error in fetchArchivedTickets:', error);
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
            // For history, we usually care about when it was closed
            const ticketDate = new Date(ticket.closed_at || ticket.created_at);
            const now = new Date();

            if (filterDateRange !== 'all') {
                if (filterDateRange === 'custom') {
                    if (startDate) {
                        const [y, m, d] = startDate.split('-').map(Number);
                        const start = new Date(y, m - 1, d, 0, 0, 0);
                        if (ticketDate < start) dateMatch = false;
                    }
                    if (endDate && dateMatch) {
                        const [y, m, d] = endDate.split('-').map(Number);
                        const end = new Date(y, m - 1, d, 23, 59, 59);
                        if (ticketDate > end) dateMatch = false;
                    }
                } else {
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
            }

            return searchMatch && priorityMatch && dateMatch;
        });
    }, [tickets, searchTerm, filterPriority, filterDateRange, startDate, endDate]);

    const getTimeToClose = (ticket: Ticket) => {
        const created = new Date(ticket.created_at);
        const closed = new Date(ticket.closed_at || ticket.updated_at);
        const diffMs = closed.getTime() - created.getTime();

        if (diffMs < 60000) { // Less than 1 minute
            const seconds = Math.floor(diffMs / 1000);
            return `${seconds}s`;
        } else if (diffMs < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diffMs / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            return `${minutes}m ${seconds}s`;
        } else {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchArchivedTickets();
        setRefreshing(false);
    };

    const generateHistoryPDF = () => {
        const doc = new jsPDF();

        // Title & Header
        doc.setFontSize(20);
        doc.setTextColor(0, 40, 85);
        doc.text('Historial de Tickets', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 14, 30);

        if (filterDateRange === 'custom' && (startDate || endDate)) {
            doc.text(`Rango: ${startDate || 'Inicio'} hasta ${endDate || 'Hoy'}`, 14, 37);
        } else if (filterDateRange !== 'all') {
            doc.text(`Periodo: ${filterDateRange}`, 14, 37);
        }

        doc.text(`Total de tickets en este reporte: ${filteredTickets.length}`, 14, 44);

        // Tickets Table
        const tableBody = filteredTickets.slice(0, 100).map(t => [
            `TK-${t.id.slice(0, 6).toUpperCase()}`,
            t.title,
            t.requester?.full_name || 'N/A',
            t.attendant?.full_name || 'Sin asignar',
            PRIORITY_STYLES[t.priority]?.label || t.priority,
            new Date(t.created_at).toLocaleDateString(),
            t.closed_at ? new Date(t.closed_at).toLocaleDateString() : 'N/A',
            getTimeToClose(t)
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['ID', 'Título', 'Solicitante', 'Atendido por', 'Prioridad', 'Fecha Creación', 'Fecha Cierre', 'Tiempo Cierre']],
            body: tableBody,
            headStyles: { fillColor: [0, 40, 85] },
            alternateRowStyles: { fillColor: [240, 245, 250] },
            margin: { top: 50 },
            styles: { fontSize: 8, cellPadding: 2 }
        });

        doc.save(`Historial_Tickets_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const generateHistoryExcel = () => {
        const data = filteredTickets.map(t => ({
            'ID': `TK-${t.id.slice(0, 6).toUpperCase()}`,
            'Incidente': t.title,
            'Descripción': t.description || '',
            'Estado': 'Archivado',
            'Prioridad': PRIORITY_STYLES[t.priority]?.label || t.priority,
            'Solicitante': t.requester?.full_name || 'N/A',
            'Sede': t.locations?.name || 'N/A',
            'Atendido Por': t.attendant?.full_name || 'Sin asignar',
            'Fecha Creación': new Date(t.created_at).toLocaleString(),
            'Fecha Cierre': t.closed_at ? new Date(t.closed_at).toLocaleString() : 'N/A',
            'Tiempo de Cierre': getTimeToClose(t)
        }));

        import('xlsx').then(XLSX => {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Historial Tickets");
            XLSX.writeFile(wb, `Historial_Tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
        });
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
            <div className="px-8 pt-8 pb-6">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
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
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                            <span className="font-medium">Refrescar</span>
                        </button>
                        <button
                            onClick={generateHistoryPDF}
                            disabled={filteredTickets.length === 0}
                            className="flex items-center justify-center w-10 h-10 bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Exportar a PDF"
                        >
                            <FaFilePdf size={20} />
                        </button>
                        <button
                            onClick={generateHistoryExcel}
                            disabled={filteredTickets.length === 0}
                            className="flex items-center justify-center w-10 h-10 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Exportar a Excel"
                        >
                            <RiFileExcel2Fill size={20} />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex-1 min-w-[300px]">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por título, solicitante o sede..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-400" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] text-sm"
                            >
                                <option value="all">Todas las prioridades</option>
                                <option value="critical">P1 - Crítica</option>
                                <option value="high">P2 - Alta</option>
                                <option value="medium">P3 - Media</option>
                                <option value="low">P4 - Baja</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-slate-400" />
                            <select
                                value={filterDateRange}
                                onChange={(e) => setFilterDateRange(e.target.value)}
                                className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] text-sm font-bold uppercase tracking-wider"
                            >
                                <option value="all">Todo el tiempo</option>
                                <option value="7days">Últimos 7 días</option>
                                <option value="30days">Últimos 30 días</option>
                                <option value="90days">Últimos 90 días</option>
                                <option value="custom">Rango Personalizado</option>
                            </select>
                        </div>

                        {filterDateRange === 'custom' && (
                            <div className="flex items-center gap-3 animate-in slide-in-from-left-2 duration-300">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] text-sm font-medium"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#002855] text-sm font-medium"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
                    <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
                        <table className="w-full text-left border-collapse border-spacing-0">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">ID Ticket</span></th>
                                    <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Incidente</span></th>
                                    <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Solicitante</span></th>
                                    <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Atendido por</span></th>
                                    <th className="px-4 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Prioridad</span></th>
                                    <th className="px-4 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Fecha Cierre</span></th>
                                    <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tiempo</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTickets.map((ticket) => {
                                    const prio = PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.medium;
                                    return (
                                        <tr key={ticket.id} onClick={() => navigate(`/ticket/${ticket.id}`)} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0">
                                            <td className="px-6 py-5 font-bold text-left">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                                                        <TicketIcon size={14} />
                                                    </div>
                                                    <span className="text-[14px] font-black text-[#002855] uppercase leading-tight group-hover:text-blue-600 transition-colors">#TK-{ticket.id.slice(0, 6).toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-left">
                                                <div>
                                                    <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">{ticket.title}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{ticket.locations?.name || 'Central'}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-left">
                                                <div className="flex items-center gap-2">
                                                    <User size={12} className="text-slate-400" />
                                                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{ticket.requester?.full_name || 'N/A'}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 text-left">
                                                {ticket.attendant ? (
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{ticket.attendant.full_name}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin asignar</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${prio.color.replace('bg-', 'bg-')} border-current/20 rounded-none`}>
                                                    {prio.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString('es-PE', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    }) : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
                                                    <Clock size={12} className="text-slate-400" />
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
