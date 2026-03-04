import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, History, ArrowRight, CheckCircle2, ShieldCheck, X, Lock, BarChart3, TrendingUp, Download, Activity, XCircle, Archive } from 'lucide-react';
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
        const sub = supabase.channel('tickets_board_final').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    // Listen to TopHeader action events
    useEffect(() => {
        const onSearch = (e: Event) => setSearchTerm((e as CustomEvent).detail ?? '');
        const onNew = () => setShowForm(true);
        window.addEventListener('tickets:search', onSearch);
        window.addEventListener('tickets:new', onNew);
        return () => {
            window.removeEventListener('tickets:search', onSearch);
            window.removeEventListener('tickets:new', onNew);
        };
    }, []);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`*, requester:requester_id(full_name, avatar_url), attendant:assigned_to(full_name, avatar_url), locations(name)`)
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

    // Función manual para forzar archivado (para pruebas)
    const forceArchiveOldTickets = async () => {
        console.log('🔧 FORZANDO ARCHIVADO MANUAL');
        await handleAutomation();
    };

    const handleAutomation = async (ticketsData: any[] = tickets) => {
        console.log('🔄 INICIANDO AUTOMATIZACIÓN DE TICKETS');
        console.log('Tickets totales:', ticketsData.length);
        
        const now = new Date();
        const threeMinutes = 3 * 60 * 1000;
        const tenMinutes = 10 * 60 * 1000;

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
                
                console.log(`📋 Ticket ${t.id?.slice(0, 8)}: cerrado hace ${minutesDiff} minutos`);
                
                return minutesDiff >= 10;
            }
            return false;
        });

        console.log(`📊 Resumen: ${toClose.length} para cerrar, ${toArchive.length} para archivar`);

        // Procesar cierre automático
        if (toClose.length > 0) {
            console.log('🔒 Cerrando tickets resueltos:', toClose.map(t => t.id?.slice(0, 8)));
            
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
                    
                    console.log(`✅ Ticket ${ticket.id?.slice(0, 8)} cerrado exitosamente`);
                } catch (error) {
                    console.error(`❌ Error procesando ticket ${ticket.id}:`, error);
                }
            }
        }

        // Procesar archivado automático
        if (toArchive.length > 0) {
            console.log('📁 Archivando tickets cerrados:', toArchive.map(t => t.id?.slice(0, 8)));
            
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
                    
                    console.log(`✅ Ticket ${ticket.id?.slice(0, 8)} archivado exitosamente`);
                    
                } catch (error) {
                    console.error(`❌ Error procesando archivado del ticket ${ticket.id}:`, error);
                }
            }
        }
        
        // Refrescar datos si hubo cambios
        if (toClose.length > 0 || toArchive.length > 0) {
            console.log('🔄 Refrescando tickets...');
            fetchTickets();
        }
    };

    const dashboardMetrics = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));

        const inProgressNum = tickets.filter(t => t.status === 'in_progress').length;
        const resolvedTodayNum = tickets.filter(t => t.status === 'resolved' && new Date(t.resolved_at || t.updated_at) >= startOfDay).length;

        const respondedTickets = tickets.filter(t => t.attended_at && t.created_at);
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

        return { inProgressNum, resolvedTodayNum, avgResponseTime };
    }, [tickets]);

    const filteredTickets = useMemo(() => {
        const active = tickets.filter(t => t.status !== 'archived');

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

        return {
            pending: dashboardList.filter(t => t.status === 'open'),
            inProgress: dashboardList.filter(t => t.status === 'in_progress'),
            resolved: dashboardList.filter(t => t.status === 'resolved'),
            closed: dashboardList.filter(t => t.status === 'closed'),
            recent: dashboardList.slice(0, 15),
            myCreated,
            myAttended,
            archivedList: tickets.filter(t => t.status === 'archived' && searchMatch(t))
        };
    }, [tickets, searchTerm, activeTab, user?.id]);

    const metricsData = useMemo(() => {
        const total = tickets.length;
        if (total === 0) return { resolutionRate: '0%', avgResponseTime: '0m', activeTickets: 0 };

        const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed' || t.status === 'archived').length;
        const resolutionRate = ((resolved / total) * 100).toFixed(1) + '%';
        const activeTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

        const respondedTickets = tickets.filter(t => t.attended_at && t.created_at);
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
    }, [tickets]);

    const generatePDF = () => {
        const doc = new jsPDF();

        // Title & Header
        doc.setFontSize(20);
        doc.setTextColor(0, 40, 85);
        doc.text('Reporte de Mesa de Ayuda', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 14, 30);

        // Metrics Section
        doc.setFontSize(14);
        doc.setTextColor(0, 40, 85);
        doc.text('Métricas Generales', 14, 45);

        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Total de Tickets: ${metricsData.total}`, 14, 55);
        doc.text(`Tickets Resueltos: ${metricsData.resolved} (${metricsData.resolutionRate})`, 14, 62);
        doc.text(`Tickets Activos: ${metricsData.activeTickets}`, 14, 69);
        doc.text(`Tiempo Promedio de Respuesta: ${metricsData.avgResponseTime}`, 14, 76);

        // Tickets Table
        const tableBody = tickets.slice(0, 50).map(t => [
            `TK-${t.id.slice(0, 6).toUpperCase()}`,
            t.title,
            t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado',
            t.priority === 'critical' ? 'Crítico' : t.priority === 'high' ? 'Alta' : t.priority === 'medium' ? 'Media' : 'Baja',
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

        doc.save(`Reporte_Mesa_de_Ayuda_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (loading) return null;

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans animate-in fade-in duration-500" >
            <div className="flex-1 flex flex-col overflow-hidden">

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'reports' ? (
                        <div className="px-8 mt-10 pb-32 max-w-[1800px] mx-auto w-full animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tasa de Resolución</h3>
                                            <p className="text-3xl font-black text-[#002855]">{metricsData.resolutionRate}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{metricsData.resolved} resueltos de {metricsData.total} totales</p>
                                </div>

                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tiempo Promedio</h3>
                                            <p className="text-3xl font-black text-[#002855]">{metricsData.avgResponseTime}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiempo hasta primera respuesta</p>
                                </div>

                                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tickets Activos</h3>
                                            <p className="text-3xl font-black text-[#002855]">{metricsData.activeTickets}</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes y en proceso</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 mb-8">
                                <button
                                    onClick={() => navigate('/tickets/history')}
                                    className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                                >
                                    <History size={18} />
                                    Ver Tickets Archivados
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-[#002855] to-[#001529] p-10 rounded-[3rem] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="relative z-10 max-w-2xl">
                                    <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Generar Reporte Completo</h3>
                                    <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-6">
                                        Descarga un consolidado detallado de todas las métricas, operaciones y el historial reciente de incidencias en formato PDF.
                                    </p>
                                    <button
                                        onClick={generatePDF}
                                        className="px-6 py-3 bg-white text-[#002855] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 active:scale-95"
                                    >
                                        <Download size={16} />
                                        Descargar Reporte PDF
                                    </button>
                                </div>
                                <div className="relative z-10 hidden lg:block">
                                    <BarChart3 size={120} className="text-white/10" />
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'my_tickets' ? (
                        // ===================== MIS TICKETS =====================
                        <div className="px-8 mt-8 pb-32 max-w-[1800px] mx-auto w-full animate-in slide-in-from-bottom-4 duration-500 space-y-10">

                            {/* Tabla: Mis solicitudes creadas */}
                            <div>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                    <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">Solicitudes que creé</h2>
                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black">{filteredTickets.myCreated.length}</span>
                                </div>
                                <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                                    {filteredTickets.myCreated.length === 0 ? (
                                        <div className="py-16 flex flex-col items-center gap-3 text-slate-300">
                                            <CheckCircle2 size={40} className="opacity-30" />
                                            <p className="text-[11px] font-black uppercase tracking-widest opacity-50">Sin solicitudes creadas</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/60">
                                                    <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ID</th>
                                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Incidente</th>
                                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Atendido por</th>
                                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Prioridad</th>
                                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredTickets.myCreated.map(t => {
                                                    const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                                    return (
                                                        <tr key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="hover:bg-blue-50/10 cursor-pointer transition-all group">
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
                                                                    {t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
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
                                    )}
                                </div>
                            </div>

                            {/* Tabla: Tickets que atiendo */}
                            {filteredTickets.myAttended.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-2 h-6 bg-indigo-500 rounded-full" />
                                        <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">Tickets que atiendo</h2>
                                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black">{filteredTickets.myAttended.length}</span>
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
                                                {filteredTickets.myAttended.map(t => {
                                                    const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                                    return (
                                                        <tr key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="hover:bg-indigo-50/10 cursor-pointer transition-all group">
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
                                                                    {t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
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
                        </div>
                    ) : (
                        <>
                            {/* Kanban Section */}
                            <div className="p-8 mt-6">
                                <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar w-full max-w-[1600px] mx-auto">

                                    {/* Column: Pendiente */}
                                    <div className="flex-none w-[320px]">
                                        <div className="flex items-center justify-between mb-6 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">En Espera</h3>
                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black">{filteredTickets.pending.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.pending.map(t => (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                            {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-[#002855] leading-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center text-[9px] font-black text-orange-600 border border-orange-100 uppercase overflow-hidden shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[10px] font-bold text-slate-700">{t.requester?.full_name?.split(' ')[0]}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-600 border border-blue-100 uppercase overflow-hidden shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[10px] font-bold text-slate-700">{t.attendant?.full_name?.split(' ')[0]}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column: En Proceso */}
                                    <div className="flex-none w-[320px]">
                                        <div className="flex items-center justify-between mb-6 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">En Proceso</h3>
                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black">{filteredTickets.inProgress.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.inProgress.map(t => (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                                {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                            </span>
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                        </div>
                                                    </div>
                                                    <h4 className="text-sm font-black text-[#002855] leading-tight mb-4 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center text-[9px] font-black text-orange-600 border border-orange-100 uppercase overflow-hidden shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[10px] font-bold text-slate-700">{t.requester?.full_name?.split(' ')[0]}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center text-[9px] font-black text-blue-600 border border-blue-100 uppercase overflow-hidden shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[10px] font-bold text-slate-700">{t.attendant?.full_name?.split(' ')[0]}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column: Resolved */}
                                    <div className="flex-none w-[320px]">
                                        <div className="flex items-center justify-between mb-6 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Finalizados</h3>
                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black">{filteredTickets.resolved.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar pr-2">
                                            {filteredTickets.resolved.map(t => (
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-emerald-50/30 p-5 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                            {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-emerald-900 leading-tight mb-4 line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center text-[9px] font-black text-orange-600 border border-orange-100 uppercase overflow-hidden shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[10px] font-bold text-emerald-800">{t.requester?.full_name?.split(' ')[0]}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-[9px] font-black text-emerald-700 border border-emerald-200 uppercase overflow-hidden shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[10px] font-bold text-emerald-800">{t.attendant?.full_name?.split(' ')[0]}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Column: Cerrados */}
                                    <div className="flex-none w-[320px]">
                                        <div className="flex items-center justify-between mb-6 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Cerrados</h3>
                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black">{filteredTickets.closed.length}</span>
                                            </div>
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar pr-2">
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
                                                <div key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="bg-slate-50/30 p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#TK-{t.id.slice(0, 6)}</span>
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${PRIORITY_STYLES[t.priority]?.badge || 'bg-gray-600 text-white'}`}>
                                                            {PRIORITY_STYLES[t.priority]?.label || 'P4'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-700 leading-tight mb-4 line-clamp-2 uppercase">{t.title}</h4>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center text-[9px] font-black text-orange-600 border border-orange-100 uppercase overflow-hidden shadow-inner">
                                                                {t.requester?.avatar_url ? (
                                                                    <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                ) : t.requester?.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Solicitante</p>
                                                                <p className="text-[10px] font-bold text-slate-700">{t.requester?.full_name?.split(' ')[0]}</p>
                                                            </div>
                                                        </div>
                                                        {t.attendant && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 border border-slate-300 uppercase overflow-hidden shadow-inner">
                                                                    {t.attendant?.avatar_url ? (
                                                                        <img src={t.attendant.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.attendant?.full_name?.charAt(0)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Atendido por</p>
                                                                    <p className="text-[10px] font-bold text-slate-700">{t.attendant?.full_name?.split(' ')[0]}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-slate-200 pt-3 space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Creado:</span>
                                                                <span className="text-[9px] font-bold text-slate-600">
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
                            <div className="px-8 pb-32 mt-10 max-w-[1800px] mx-auto w-full">
                                <div className="flex items-center justify-between mb-8 px-4">
                                    <div>
                                        <h2 className="text-xl font-black text-[#002855]">Historial de tickets</h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reporte detallado de las últimas interacciones</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate('/tickets/history')}
                                            className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#002855] hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            Historial de tickets
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/30">
                                                <th className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ID Ticket</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Incidente</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Solicitante</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Prioridad</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredTickets.recent.map(t => {
                                                const prio = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
                                                return (
                                                    <tr key={t.id} onClick={() => navigate(`/ticket/${t.id}`)} className="hover:bg-blue-50/10 transition-all cursor-pointer group active:bg-blue-50/30">
                                                        <td className="px-8 py-6">
                                                            <span className="text-[11px] font-black text-[#002855] tracking-tight">#TK-{t.id.slice(0, 6).toUpperCase()}</span>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div>
                                                                <p className="text-[12px] font-black text-slate-700 uppercase tracking-tight line-clamp-1">{t.title}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{new Date(t.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 text-center">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${t.status === 'open' ? 'text-orange-600 bg-orange-50 border border-orange-100' :
                                                                t.status === 'in_progress' ? 'text-blue-600 bg-blue-50 border border-blue-100' :
                                                                    t.status === 'resolved' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' :
                                                                        'text-slate-500 bg-slate-100'
                                                                }`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-orange-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                                                {t.status === 'open' ? 'Pendiente' : t.status === 'in_progress' ? 'En Proceso' : t.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase overflow-hidden shadow-inner group-hover:bg-white transition-all">
                                                                    {t.requester?.avatar_url ? (
                                                                        <img src={t.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : t.requester?.full_name?.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-slate-700 uppercase leading-none mb-1">{t.requester?.full_name?.split(' ')[0]}</p>
                                                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest truncate max-w-[80px]">{t.locations?.name || 'Central'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${prio.color} border-current/10`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{prio.label}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
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
