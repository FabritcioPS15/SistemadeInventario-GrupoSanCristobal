import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { History, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FaFilePdf } from "react-icons/fa6";
import { RiFileExcel2Fill } from "react-icons/ri";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import TicketForm from '../components/forms/TicketForm';

// Definición de Estilos de Prioridad (P1 más crítico)
const PRIORITY_STYLES: Record<string, { label: string, color: string, dot: string, badge: string }> = {
    critical: { label: 'P1', color: 'text-red-700 bg-red-50 border-red-200', dot: 'bg-red-600', badge: 'bg-red-600 text-white' },
    high: { label: 'P2', color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-600', badge: 'bg-orange-600 text-white' },
    medium: { label: 'P3', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-600', badge: 'bg-yellow-600 text-white' },
    low: { label: 'P4', color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-600', badge: 'bg-green-600 text-white' }
};

export default function Tickets() {
    const { user } = useAuth();
    const { view } = useParams();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sincronizar activeTab con la URL
    const activeTab = useMemo(() => {
        if (view === 'mine' || view === 'mine_tickets') return 'my_tickets';
        if (view === 'reports') return 'reports';
        return 'dashboard';
    }, [view]);

    useEffect(() => {
        if (!view) {
            navigate('/tickets/dashboard', { replace: true });
        }
    }, [view, navigate]);

    useEffect(() => {
        fetchTickets();

        const channel = supabase
            .channel('tickets_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'tickets' 
            }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    // For inserts, we fetch the single new ticket with its relations
                    const { data } = await supabase
                        .from('tickets')
                        .select(`*, requester:requester_id(full_name, avatar_url), attendant:assigned_to(full_name, avatar_url), locations(name)`)
                        .eq('id', (payload.new as any).id)
                        .single();
                    
                    if (data) {
                        setTickets(prev => [data, ...prev]);
                    }
                } else if (payload.eventType === 'UPDATE') {
                    // For updates, we can update the local state if it's just a status/field change
                    // But some changes might need new relation data (e.g. assigned_to changed)
                    // For now, let's update the ticket in state
                    setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
                    
                    // If assigned_to or requester_id changed, we might want to refresh relations
                    // but most updates are status changes.
                } else if (payload.eventType === 'DELETE') {
                    setTickets(prev => prev.filter(t => t.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channel); 
        };
    }, []);

    // Listen to TopHeader action events
    useEffect(() => {
        const onSearch = (e: Event) => setSearchTerm((e as CustomEvent).detail ?? '');
        const onNew = () => setShowForm(true);
        const onExportExcel = () => generateExcel();
        const onExportPdf = () => generatePDF();
        
        window.addEventListener('tickets:search', onSearch);
        window.addEventListener('tickets:new', onNew);
        window.addEventListener('tickets:export', onExportExcel);
        window.addEventListener('tickets:export-pdf', onExportPdf);
        
        return () => {
            window.removeEventListener('tickets:search', onSearch);
            window.removeEventListener('tickets:new', onNew);
            window.removeEventListener('tickets:export', onExportExcel);
            window.removeEventListener('tickets:export-pdf', onExportPdf);
        };
    }, [tickets]);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    id, 
                    title, 
                    description, 
                    status, 
                    priority, 
                    created_at, 
                    updated_at, 
                    attended_at, 
                    resolved_at, 
                    closed_at,
                    requester_id,
                    assigned_to,
                    location_id,
                    requester:requester_id(full_name, avatar_url), 
                    attendant:assigned_to(full_name, avatar_url), 
                    locations(name)
                `)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setTickets(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE AUTOMATIZACIÓN (10 MINUTOS) ---
    useEffect(() => {
        const interval = setInterval(() => {
            handleAutomation();
        }, 60000); // Revisar cada minuto
        return () => clearInterval(interval);
    }, [tickets]);

    
    const handleAutomation = async (ticketsData: any[] = tickets) => {
        
        const now = new Date();
        const threeMinutes = 3 * 60 * 1000;

        // 1. Resuelto -> Cerrado (automáticamente después de 3 minutos)
        const toClose = ticketsData.filter(t =>
            t.status === 'resolved' &&
            t.resolved_at &&
            (now.getTime() - new Date(t.resolved_at).getTime()) >= threeMinutes
        );

        // 2. Cerrado -> Archivado (después de 10 minutos)
        const toArchive = ticketsData.filter(t => {
            const isClosed = t.status === 'closed';
            const hasClosedAt = t.closed_at;
            
            if (isClosed && hasClosedAt) {
                const closedTime = new Date(t.closed_at);
                const timeDiff = now.getTime() - closedTime.getTime();
                const minutesDiff = Math.floor(timeDiff / 60000);
                
                
                return minutesDiff >= 10;
            }
            return false;
        });


        // Procesar cierre automático
        if (toClose.length > 0) {
            
            for (const ticket of toClose) {
                try {
                    const { error } = await supabase.from('tickets').update({
                        status: 'closed',
                        closed_at: new Date().toISOString()
                    }).eq('id', ticket.id);
                    
                    if (error) {
                        console.error('❌ Error cerrando ticket:', error);
                        continue;
                    }
                    
                } catch (error) {
                    console.error(`❌ Error procesando ticket ${ticket.id}:`, error);
                }
            }
        }

        // Procesar archivado automático
        if (toArchive.length > 0) {
            
            for (const ticket of toArchive) {
                try {
                    const { error } = await supabase.from('tickets').update({ 
                        status: 'archived' 
                    }).eq('id', ticket.id);
                    
                    if (error) {
                        console.error('❌ Error archivando ticket:', error);
                        console.error('Detalles:', {
                            ticketId: ticket.id,
                            currentStatus: ticket.status,
                            closedAt: ticket.closed_at
                        });
                        continue;
                    }

                    // Limpiar almacenamiento para tickets archivados (Imágenes temporales)
                    try {
                        const { data: files } = await supabase.storage.from('chat-attachments').list(`ticket_${ticket.id}`);
                        if (files && files.length > 0) {
                            await supabase.storage.from('chat-attachments').remove(
                                files.map(f => `ticket_${ticket.id}/${f.name}`)
                            );
                            console.log(`🧹 Limpieza de almacenamiento completada para ticket ${ticket.id}`);
                        }
                    } catch (storageError) {
                        console.error('Error al limpiar almacenamiento:', storageError);
                    }
                    
                    
                } catch (error) {
                    console.error(`❌ Error procesando archivado del ticket ${ticket.id}:`, error);
                }
            }
        }
        
        // Refrescar datos si hubo cambios
        if (toClose.length > 0 || toArchive.length > 0) {
            fetchTickets();
        }
    };
 
    
    const filteredTickets = useMemo(() => {
        let active = tickets.filter(t => t.status !== 'archived');
        
        // Filter by date range if provided
        if (startDate) {
            const [y, m, d] = startDate.split('-').map(Number);
            const start = new Date(y, m - 1, d, 0, 0, 0);
            active = active.filter(t => new Date(t.created_at) >= start);
        }
        if (endDate) {
            const [y, m, d] = endDate.split('-').map(Number);
            const end = new Date(y, m - 1, d, 23, 59, 59);
            active = active.filter(t => new Date(t.created_at) <= end);
        }

        const searchMatch = (t: any) =>
            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.locations?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        // Dashboard: todos los tickets activos
        const dashboardList = active.filter(searchMatch);

        // Mis Tickets: creados por mí
        const myCreated = tickets.filter(t => t.requester_id === user?.id && searchMatch(t));
        // Mis Tickets: atendidos por mí (assigned)
        const myAttended = tickets.filter(t => t.assigned_to === user?.id && t.requester_id !== user?.id && searchMatch(t));

        let archivedList = tickets.filter(t => t.status === 'archived' && searchMatch(t));
        if (startDate) {
            const [y, m, d] = startDate.split('-').map(Number);
            const start = new Date(y, m - 1, d, 0, 0, 0);
            archivedList = archivedList.filter(t => new Date(t.created_at) >= start);
        }
        if (endDate) {
            const [y, m, d] = endDate.split('-').map(Number);
            const end = new Date(y, m - 1, d, 23, 59, 59);
            archivedList = archivedList.filter(t => new Date(t.created_at) <= end);
        }

        return {
            pending: dashboardList.filter(t => t.status === 'open'),
            inProgress: dashboardList.filter(t => t.status === 'in_progress'),
            resolved: dashboardList.filter(t => t.status === 'resolved'),
            closed: dashboardList.filter(t => t.status === 'closed'),
            recent: dashboardList.slice(0, 15),
            myCreated,
            myAttended,
            archivedList
        };
    }, [tickets, searchTerm, activeTab, user?.id, startDate, endDate]);

    const metricsData = useMemo(() => {
        let filteredForMetrics = [...tickets];
        if (startDate) {
            const start = new Date(startDate);
            filteredForMetrics = filteredForMetrics.filter(t => new Date(t.created_at) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filteredForMetrics = filteredForMetrics.filter(t => new Date(t.created_at) <= end);
        }

        const total = filteredForMetrics.length;
        if (total === 0) return { resolutionRate: '0%', avgResponseTime: '0m', activeTickets: 0, total: 0, resolved: 0 };

        const resolved = filteredForMetrics.filter(t => t.status === 'resolved' || t.status === 'closed' || t.status === 'archived').length;
        const resolutionRate = ((resolved / total) * 100).toFixed(1) + '%';
        const activeTickets = filteredForMetrics.filter(t => t.status === 'open' || t.status === 'in_progress').length;

        const respondedTickets = filteredForMetrics.filter(t => t.attended_at && t.created_at);
        let avgResponseTime = '0m 0s';
        if (respondedTickets.length > 0) {
            const totalMs = respondedTickets.reduce((acc, t) => {
                return acc + (new Date(t.attended_at).getTime() - new Date(t.created_at).getTime());
            }, 0);
            const avgMs = totalMs / respondedTickets.length;
            const minutes = Math.floor(avgMs / 60000);
            const seconds = Math.floor((avgMs % 60000) / 1000);
            avgResponseTime = `${minutes}m ${seconds}s`;
        }

        return { resolutionRate, avgResponseTime, activeTickets, total, resolved };
    }, [tickets, startDate, endDate]);

    const generatePDF = () => {
        const doc = new jsPDF();

        // Filter tickets for report
        let reportTickets = [...tickets];
        if (startDate) {
            const start = new Date(startDate);
            reportTickets = reportTickets.filter(t => new Date(t.created_at) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            reportTickets = reportTickets.filter(t => new Date(t.created_at) <= end);
        }

        // Title & Header
        doc.setFontSize(20);
        doc.setTextColor(0, 40, 85);
        doc.text('Reporte de Mesa de Ayuda', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 14, 30);
        if (startDate || endDate) {
            doc.text(`Rango: ${startDate || 'Inicio'} hasta ${endDate || 'Hoy'}`, 14, 37);
        }

        // Metrics Section
        doc.setFontSize(14);
        doc.setTextColor(0, 40, 85);
        doc.text('Métricas del Periodo', 14, 48);

        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Total de Tickets: ${metricsData.total}`, 14, 58);
        doc.text(`Tickets Resueltos: ${metricsData.resolved} (${metricsData.resolutionRate})`, 14, 65);
        doc.text(`Tickets Activos: ${metricsData.activeTickets}`, 14, 72);
        doc.text(`Tiempo Promedio de Respuesta: ${metricsData.avgResponseTime}`, 14, 79);

        // Tickets Table
        const tableBody = reportTickets.slice(0, 100).map(t => [
            `TK-${t.id.slice(0, 6).toUpperCase()}`,
            t.title,
            t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : t.status === 'closed' ? 'Cerrado' : 'Archivado',
            t.priority === 'critical' ? 'P1 - Crítica' : t.priority === 'high' ? 'P2 - Alta' : t.priority === 'medium' ? 'P3 - Media' : 'P4 - Baja',
            new Date(t.created_at).toLocaleDateString()
        ]);

        autoTable(doc, {
            startY: 90,
            head: [['ID', 'Incidente', 'Estado', 'Prioridad', 'Fecha']],
            body: tableBody,
            headStyles: { fillColor: [0, 40, 85] },
            alternateRowStyles: { fillColor: [240, 245, 250] },
            margin: { top: 90 }
        });

        doc.save(`Reporte_Tickets_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const generateExcel = () => {
        // Filter tickets for report
        let reportTickets = [...tickets];
        if (startDate) {
            const start = new Date(startDate);
            reportTickets = reportTickets.filter(t => new Date(t.created_at) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            reportTickets = reportTickets.filter(t => new Date(t.created_at) <= end);
        }

        const data = reportTickets.map(t => ({
            'ID': `TK-${t.id.slice(0, 6).toUpperCase()}`,
            'Incidente': t.title,
            'Descripción': t.description || '',
            'Estado': t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : t.status === 'closed' ? 'Cerrado' : 'Archivado',
            'Prioridad': t.priority === 'critical' ? 'P1 - Crítica' : t.priority === 'high' ? 'P2 - Alta' : t.priority === 'medium' ? 'P3 - Media' : 'P4 - Baja',
            'Solicitante': t.requester?.full_name || 'N/A',
            'Sede': t.locations?.name || 'N/A',
            'Atendido Por': t.attendant?.full_name || 'Sin asignar',
            'Fecha Creación': new Date(t.created_at).toLocaleString(),
            'Fecha Cierre': t.closed_at ? new Date(t.closed_at).toLocaleString() : 'N/A'
        }));

        import('xlsx').then(XLSX => {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Tickets");
            XLSX.writeFile(wb, `Reporte_Tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
        });
    };

    if (loading) return null;

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden" >
            <div className="flex-1 flex flex-col overflow-hidden">

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'reports' ? (
                        <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-4">
                            <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6 lg:p-8 relative">
                                <div className="absolute -top-3 -left-3">
                                    <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                                        REPORTES DE TICKETS
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
                                    <div className="flex flex-col p-6 bg-slate-50 border border-slate-200 rounded-none">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Tickets</div>
                                        <div className="text-3xl font-black text-[#002855]">{metricsData.total}</div>
                                    </div>
                                    <div className="flex flex-col p-6 bg-emerald-50/50 border border-emerald-100 rounded-none">
                                        <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-2">Resueltos</div>
                                        <div className="text-3xl font-black text-emerald-600">{metricsData.resolved}</div>
                                    </div>
                                    <div className="flex flex-col p-6 bg-amber-50/50 border border-amber-100 rounded-none">
                                        <div className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-2">Activos</div>
                                        <div className="text-3xl font-black text-amber-600">{metricsData.activeTickets}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha Inicio</label>
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none text-[11px] font-black text-[#002855] focus:outline-none focus:border-[#002855]/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Fecha Fin</label>
                                        <input 
                                            type="date" 
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none text-[11px] font-black text-[#002855] focus:outline-none focus:border-[#002855]/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => navigate('/tickets/history')}
                                        className="flex-1 px-4 py-3 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <History size={16} />
                                        Ver Historial Diario
                                    </button>
                                    <button
                                        onClick={generatePDF}
                                        className="flex-1 sm:flex-none px-4 py-3 bg-white border border-slate-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm flex items-center justify-center"
                                        title="Exportar a PDF"
                                    >
                                        <FaFilePdf size={16} className="mr-2" /> PDF
                                    </button>
                                    <button
                                        onClick={generateExcel}
                                        className="flex-1 sm:flex-none px-4 py-3 bg-white border border-slate-200 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm flex items-center justify-center"
                                        title="Exportar a Excel"
                                    >
                                        <RiFileExcel2Fill size={16} className="mr-2" /> EXCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'my_tickets' ? (
                        // ===================== MIS TICKETS =====================
                        <div className="w-full px-4 md:px-8 xl:px-12 py-8 space-y-8">

                            {/* Tabla: Mis solicitudes creadas */}
                            <div className="bg-white border border-slate-200 rounded-none shadow-sm flex flex-col p-4 relative pt-10">
                                <div className="absolute -top-3 -left-3">
                                    <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                                        SOLICITUDES CREADAS ({filteredTickets.myCreated.length})
                                    </div>
                                </div>
                                <div className="overflow-hidden">
                                    {filteredTickets.myCreated.length === 0 ? (
                                        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-slate-50/50 border border-dashed border-slate-200">
                                            <CheckCircle2 size={32} className="text-slate-300" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin solicitudes creadas</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse border-spacing-0">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="px-6 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">ID</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Incidente</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Atendido por</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Prioridad</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Fecha</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredTickets.myCreated.map(t => {
                                                        const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                                        return (
                                                            <tr key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group border-b border-slate-50 last:border-0 relative">
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[12px] font-black text-[#002855] group-hover:text-blue-600 transition-colors uppercase">#TK-{t.id.slice(0, 6)}</span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[13px] font-black text-slate-700 uppercase leading-tight line-clamp-1">{t.title}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.locations?.name || 'Central'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded-none inline-flex items-center gap-1 ${t.status === 'open' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                                                                        t.status === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                                                            t.status === 'resolved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                                                                'text-slate-600 bg-slate-100 border-slate-200'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-orange-500' : t.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : t.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                                        {t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    {t.attendant ? (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{t.attendant.full_name}</span>
                                                                        </div>
                                                                    ) : <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin asignar</span>}
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${prio.color.replace('bg-', 'bg-').replace('text-', 'text-')} border-current/20 rounded-none inline-flex items-center gap-1`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                                        {prio.label}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                                                    {new Date(t.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
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

                            {/* Tabla: Tickets que atiendo */}
                            {filteredTickets.myAttended.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-none shadow-sm flex flex-col p-4 relative pt-10">
                                    <div className="absolute -top-3 -left-3">
                                        <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                                            TICKETS QUE ATIENDO ({filteredTickets.myAttended.length})
                                        </div>
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse border-spacing-0">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="px-6 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">ID</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Incidente</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Solicitante</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Prioridad</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Fecha</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredTickets.myAttended.map(t => {
                                                        const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                                        return (
                                                            <tr key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group border-b border-slate-50 last:border-0 relative">
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[12px] font-black text-[#002855] group-hover:text-blue-600 transition-colors uppercase">#TK-{t.id.slice(0, 6)}</span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[13px] font-black text-slate-700 uppercase leading-tight line-clamp-1">{t.title}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.locations?.name || 'Central'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded-none inline-flex items-center gap-1 ${t.status === 'open' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                                                                        t.status === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                                                            t.status === 'resolved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                                                                'text-slate-600 bg-slate-100 border-slate-200'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-orange-500' : t.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : t.status === 'resolved' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                                        {t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{t.requester?.full_name}</span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${prio.color.replace('bg-', 'bg-').replace('text-', 'text-')} border-current/20 rounded-none inline-flex items-center gap-1`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                                        {prio.label}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                                                    {new Date(t.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Kanban Section */}
                            <div className="p-4 sm:p-8 mt-6">
                                <div className="flex overflow-x-auto pb-6 custom-scrollbar w-full max-w-[1600px] mx-auto">

                                    {/* Column: Pendiente */}
                                    <div className="flex-none w-[320px] sm:w-[380px] px-3 sm:px-5 border-r border-slate-200 last:border-0">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 pr-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-none bg-orange-500" />
                                                <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.2em]">En Espera</h3>
                                                <span className="bg-slate-50 text-[#002855] border border-slate-200 px-2 py-0.5 rounded-none text-[10px] font-black">{filteredTickets.pending.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.pending.map(t => (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-white p-4 sm:p-5 rounded-none border border-slate-200 hover:border-[#002855] shadow-sm transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <span className={`px-2 py-1 rounded-none text-[8px] sm:text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                            {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs sm:text-sm font-black text-[#002855] leading-tight mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-orange-50 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-orange-600 border border-orange-100 uppercase shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{t.requester?.full_name}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-blue-50 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-blue-600 border border-blue-100 uppercase shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{t.attendant?.full_name}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column: En Proceso */}
                                    <div className="flex-none w-[320px] sm:w-[380px] px-3 sm:px-5 border-r border-slate-200 last:border-0">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 pr-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-none bg-blue-500" />
                                                <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.2em]">En Proceso</h3>
                                                <span className="bg-slate-50 text-[#002855] border border-slate-200 px-2 py-0.5 rounded-none text-[10px] font-black">{filteredTickets.inProgress.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.inProgress.map(t => (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-white p-4 sm:p-5 rounded-none border border-slate-200 hover:border-[#002855] shadow-sm transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded-none text-[8px] sm:text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                                {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                            </span>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <h4 className="text-xs sm:text-sm font-black text-[#002855] leading-tight mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-orange-50 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-orange-600 border border-orange-100 uppercase shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{t.requester?.full_name}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-blue-50 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-blue-600 border border-blue-100 uppercase shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{t.attendant?.full_name}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column: Resolved */}
                                    <div className="flex-none w-[320px] sm:w-[380px] px-3 sm:px-5 border-r border-slate-200 last:border-0">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 pr-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-none bg-emerald-500" />
                                                <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.2em]">Finalizados</h3>
                                                <span className="bg-slate-50 text-[#002855] border border-slate-200 px-2 py-0.5 rounded-none text-[10px] font-black">{filteredTickets.resolved.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.resolved.map(t => (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-emerald-50/30 p-4 sm:p-5 rounded-none border border-emerald-200 hover:border-[#002855] shadow-sm transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[8px] sm:text-[9px] font-black text-emerald-300 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <span className={`px-2 py-1 rounded-none text-[8px] sm:text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                            {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs sm:text-sm font-black text-emerald-900 leading-tight mb-3 sm:mb-4 line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-orange-50 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-orange-600 border border-orange-100 uppercase shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-tight">Solicitante</p>
                                                                 <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800">{t.requester?.full_name}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-emerald-100 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-emerald-700 border border-emerald-200 uppercase shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                     <p className="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-tight">Atendido por</p>
                                                                     <p className="text-[9px] sm:text-[10px] font-bold text-emerald-800">{t.attendant?.full_name}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column: Cerrados */}
                                    <div className="flex-none w-[320px] sm:w-[380px] px-3 sm:px-5 border-r border-slate-200 last:border-0">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 pr-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-none bg-slate-400" />
                                                <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.2em]">Cerrados</h3>
                                                <span className="bg-slate-50 text-[#002855] border border-slate-200 px-2 py-0.5 rounded-none text-[10px] font-black">{filteredTickets.closed.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-3 sm:space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.closed.map(t => {
                                                const createdDate = new Date(t.created_at);
                                                const closedDate = new Date(t.closed_at || t.updated_at);
                                                
                                                // Calcular diferencia en milisegundos
                                                const diffMs = closedDate.getTime() - createdDate.getTime();
                                                const diffSeconds = Math.floor(diffMs / 1000);
                                                const diffMinutes = Math.floor(diffSeconds / 60);
                                                const diffHours = Math.floor(diffMinutes / 60);
                                                const diffDays = Math.floor(diffHours / 24);
                                                
                                                // Formato legible del tiempo
                                                let timeToCloseText = '';
                                                if (diffDays > 0) {
                                                    timeToCloseText = diffDays === 1 ? '1 día' : `${diffDays} días`;
                                                    if (diffHours % 24 > 0) {
                                                        timeToCloseText += ` ${diffHours % 24}h`;
                                                    }
                                                } else if (diffHours > 0) {
                                                    timeToCloseText = diffHours === 1 ? '1 hora' : `${diffHours} horas`;
                                                    if (diffMinutes % 60 > 0) {
                                                        timeToCloseText += ` ${diffMinutes % 60}m`;
                                                    }
                                                } else if (diffMinutes > 0) {
                                                    timeToCloseText = diffMinutes === 1 ? '1 minuto' : `${diffMinutes} minutos`;
                                                    if (diffSeconds % 60 > 0) {
                                                        timeToCloseText += ` ${diffSeconds % 60}s`;
                                                    }
                                                } else {
                                                    timeToCloseText = diffSeconds <= 1 ? 'menos de 1 segundo' : `${diffSeconds} segundos`;
                                                }

                                                return (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-slate-50/30 p-4 sm:p-5 rounded-none border border-slate-200 hover:border-slate-400 shadow-sm transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <span className={`px-2 py-1 rounded-none text-[8px] sm:text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                            {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs sm:text-sm font-black text-slate-700 leading-tight mb-3 sm:mb-4 line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-2 sm:space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-orange-50 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-orange-600 border border-orange-100 uppercase shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{t.requester?.full_name}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-none bg-slate-200 flex items-center justify-center text-[8px] sm:text-[9px] font-black text-slate-600 border border-slate-300 uppercase shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-700">{t.attendant?.full_name}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-slate-200 pt-2 sm:pt-3 space-y-1 sm:space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-tight">Creado:</span>
                                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-600">
                                                                    {createdDate && !isNaN(createdDate.getTime()) 
                                                                        ? createdDate.toLocaleString('es-PE', { 
                                                                            day: '2-digit', 
                                                                            month: 'short', 
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                          }) 
                                                                        : 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Content Table */}
                            <div className="px-4 sm:px-8 pb-32 mt-10 max-w-[1800px] mx-auto w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 px-4 gap-4">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-black text-[#002855]">Historial de tickets</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reporte detallado de las últimas interacciones</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/tickets/history')}
                                            className="px-4 sm:px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#002855] hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            Historial de tickets
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-none shadow-sm flex flex-col p-4 relative pt-10">
                                    <div className="absolute -top-3 -left-3">
                                        <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
                                            ÚLTIMAS INTERACCIONES ({filteredTickets.recent.length})
                                        </div>
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse border-spacing-0">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="px-6 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">ID Ticket</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Incidente</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Estado</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Solicitante</span></th>
                                                        <th className="px-4 py-4 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Prioridad</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {filteredTickets.recent.map(t => {
                                                        const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                                        return (
                                                            <tr key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group border-b border-slate-50 last:border-0 relative">
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[12px] font-black text-[#002855] group-hover:text-blue-600 transition-colors uppercase">#TK-{t.id.slice(0, 6)}</span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[13px] font-black text-slate-700 uppercase leading-tight line-clamp-1">{t.title}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{new Date(t.created_at).toLocaleDateString()}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border rounded-none inline-flex items-center gap-1 ${t.status === 'open' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                                                                        t.status === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' :
                                                                            t.status === 'resolved' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                                                                'text-slate-600 bg-slate-100 border-slate-200'
                                                                    }`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-orange-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                                        {t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{t.requester?.full_name}</span>
                                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{t.locations?.name || 'Central'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${prio.color.replace('bg-', 'bg-').replace('text-', 'text-')} border-current/20 rounded-none inline-flex items-center gap-1`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                                        {prio.label}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Modals */}
                {showForm && (
                    <TicketForm
                        onClose={() => setShowForm(false)}
                        onSave={() => { setShowForm(false); fetchTickets(); }}
                    />
                )}
            </div>
        </div>
    );
}
