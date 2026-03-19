import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Clock, MessageSquare, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { IoChatbubbles } from "react-icons/io5";

type TicketDetailModalProps = {
    ticket: any;
    onClose: () => void;
    onUpdate: () => void;
};

export default function TicketDetailModal({ ticket: initialTicket, onClose, onUpdate }: TicketDetailModalProps) {
    const { user } = useAuth();
    const [currentTicket, setCurrentTicket] = useState<any>(initialTicket);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'feed'>('feed');

    useEffect(() => {
        setCurrentTicket(initialTicket);
    }, [initialTicket]);

    useEffect(() => {
        fetchComments();

        const ticketSubscription = supabase
            .channel(`ticket-status-${currentTicket.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets',
                filter: `id=eq.${currentTicket.id}`
            }, async () => {
                const { data } = await supabase
                    .from('tickets')
                    .select(`
                        *,
                        requester:requester_id(full_name, email, avatar_url),
                        attendant:assigned_to(full_name, email, avatar_url),
                        locations(name)
                    `)
                    .eq('id', currentTicket.id)
                    .single();

                if (data) setCurrentTicket(data);
                onUpdate();
            })
            .subscribe();

        const commentsSubscription = supabase
            .channel(`comments-feed-${currentTicket.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'ticket_comments',
                filter: `ticket_id=eq.${currentTicket.id}`
            }, () => {
                fetchComments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ticketSubscription);
            supabase.removeChannel(commentsSubscription);
        };
    }, [currentTicket.id]);

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    const scrollToBottom = () => {
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('ticket_comments')
                .select(`
                    *,
                    author:user_id(full_name, email, avatar_url)
                `)
                .eq('ticket_id', currentTicket.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            setSending(true);
            const { error } = await supabase
                .from('ticket_comments')
                .insert([
                    {
                        ticket_id: currentTicket.id,
                        user_id: user?.id,
                        content: newComment.trim()
                    }
                ]);

            if (error) throw error;
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Error sending comment:', error);
        } finally {
            setSending(false);
        }
    };

    const handleDeleteTicket = async () => {
        const now = new Date();
        const createdDate = new Date(currentTicket.created_at);
        const minutesDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60);
        const isOwner = user?.id === currentTicket.requester_id;
        const isStaff = user?.role === 'super_admin' || user?.role === 'sistemas' || user?.role === 'gerencia' || user?.role === 'supervisores';
        const canDelete = isStaff || (isOwner && minutesDiff <= 3);

        if (!canDelete) {
            alert(isOwner ? 'Tiempo agotado (3 min).' : 'Acceso Denegado.');
            return;
        }

        if (!confirm('¿Eliminar ticket?')) return;

        try {
            setStatusUpdating(true);
            const { error } = await supabase.from('tickets').delete().eq('id', currentTicket.id);
            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        const isAssignedTechnician = user?.id === currentTicket.assigned_to;
        
        if (!isAssignedTechnician) return;

        try {
            setStatusUpdating(true);
            const updatePayload: any = { status: newStatus };
            if (newStatus === 'in_progress') {
                updatePayload.assigned_to = user?.id;
                updatePayload.attended_at = new Date().toISOString();
            }

            const { error } = await supabase.from('tickets').update(updatePayload).eq('id', currentTicket.id);
            if (error) throw error;

            await supabase.from('ticket_comments').insert([{
                ticket_id: currentTicket.id,
                user_id: user?.id,
                content: `Cambió el estado a: **${getStatusLabel(newStatus).toUpperCase()}**`,
            }]);

            fetchComments();
            onUpdate();
        } catch (error) {
            console.error(error);
        } finally {
            setStatusUpdating(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Pendiente';
            case 'in_progress': return 'Atendiendo';
            case 'resolved': return 'Resuelto';
            case 'closed': return 'Cerrado';
            default: return status;
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'critical': return 'P1 - Crítica';
            case 'high': return 'P2 - Alta';
            case 'medium': return 'P3 - Media';
            case 'low': return 'P4 - Baja';
            default: return priority;
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-rose-600 bg-rose-50 border-rose-100';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'medium': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    const canManageStatus = user?.id === currentTicket.assigned_to;

    return (
        <div className="fixed inset-0 bg-[#001529]/70 backdrop-blur-xl flex items-center justify-center z-4 p-2 sm:p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full h-full max-h-[95vh] sm:max-h-[85vh] md:max-h-[700px] max-w-5xl flex flex-col overflow-hidden border border-white/20 animate-in slide-in-from-bottom-8 duration-500">

                {/* Header for mobile */}
                <div className="flex md:hidden items-center justify-between p-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <IoChatbubbles size={20} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-[#002855] tracking-tight">CANAL DE SEGUIMIENTO</h3>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">Interacción en tiempo real</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteTicket}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-100 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center hover:bg-rose-50"
                            title="Eliminar ticket"
                        >
                            <Trash2 size={12} />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-100 text-slate-300 hover:text-slate-600 transition-all flex items-center justify-center hover:bg-slate-50"
                            title="Cerrar ventana"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {/* Mobile Tabs */}
                <div className="flex md:hidden border-b border-slate-100 bg-white">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'details' 
                                ? 'text-[#002855] border-b-2 border-[#002855] bg-[#F8FAFC]' 
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Detalles
                    </button>
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'feed' 
                                ? 'text-[#002855] border-b-2 border-[#002855] bg-[#F8FAFC]' 
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Chat
                    </button>
                </div>

                {/* Content Container */}
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    {/* Left side: Information - Hidden on mobile unless active tab is details */}
                    <div className={`${
                        activeTab === 'details' ? 'flex' : 'hidden'
                    } md:flex w-full md:w-[420px] bg-[#F8FAFC] border-r border-slate-100 p-4 sm:p-6 md:p-10 flex-col overflow-y-auto custom-scrollbar`}>
                        <div className="flex items-center justify-between mb-6 sm:mb-8 md:mb-10">
                            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em]">#TK-{currentTicket.id.slice(0, 8)}</span>
                            <div className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] border ${getPriorityStyle(currentTicket.priority)}`}>
                                {getPriorityLabel(currentTicket.priority)}
                            </div>
                        </div>

                        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-[#002855] leading-tight mb-4 sm:mb-6 md:mb-8 uppercase italic">{currentTicket.title}</h2>

                        <div className="space-y-6 sm:space-y-8 md:space-y-10">
                            <div className="bg-white p-4 sm:p-5 md:p-6 rounded-[1rem] sm:rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm relative group">
                                <span className="absolute -top-2 sm:-top-2.5 md:-top-3 left-3 sm:left-4 md:left-6 bg-[#002855] text-white px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 rounded-lg text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-widest">Detalle Inicial</span>
                                <p className="text-[11px] sm:text-[12px] md:text-[13px] text-slate-500 leading-relaxed pt-1 sm:pt-1.5 md:pt-2">
                                    {currentTicket.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 bg-white rounded-[1.5rem] sm:rounded-2xl md:rounded-3xl border border-slate-100">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner overflow-hidden">
                                        {currentTicket.requester?.avatar_url ? (
                                            <img src={currentTicket.requester.avatar_url} className="w-full h-full object-cover" />
                                        ) : <User size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Reportado Por</p>
                                        <p className="text-xs sm:text-xs md:text-xs font-black text-[#002855] uppercase truncate">{currentTicket.requester?.full_name}</p>
                                        <p className="text-[8px] sm:text-[9px] md:text-[10px] font-bold text-blue-500 uppercase mt-0.5 truncate">{currentTicket.locations?.name || 'Sede Central'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 bg-white rounded-[1.5rem] sm:rounded-2xl md:rounded-3xl border border-slate-100">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Fecha de Apertura</p>
                                        <p className="text-xs sm:text-xs md:text-xs font-black text-[#002855] truncate">{new Date(currentTicket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                </div>

                                {currentTicket.attendant && (
                                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 bg-blue-600 rounded-[1.5rem] sm:rounded-2xl md:rounded-3xl border border-blue-500 shadow-lg shadow-blue-100">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20 overflow-hidden">
                                            {currentTicket.attendant?.avatar_url ? (
                                                <img src={currentTicket.attendant.avatar_url} className="w-full h-full object-cover" />
                                            ) : <ShieldCheck size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-white/50 uppercase tracking-widest mb-0.5">Técnico Asignado</p>
                                            <p className="text-xs sm:text-xs md:text-xs font-black text-white uppercase truncate">{currentTicket.attendant?.full_name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 sm:pt-8 md:pt-10 border-t border-slate-200">
                                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.25em] md:tracking-[0.3em] mb-3 sm:mb-4">Gestión de Estado</p>
                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                    {['open', 'resolved', 'closed'].map(st => (
                                        <button
                                            key={st}
                                            onClick={() => handleStatusUpdate(st)}
                                            disabled={!canManageStatus || statusUpdating}
                                            className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${
                                                currentTicket.status === st 
                                                    ? 'bg-[#002855] text-white shadow-lg sm:shadow-xl scale-105' 
                                                    : 'bg-white text-slate-300 border border-slate-100 hover:border-slate-300 hover:text-slate-500'
                                            }`}
                                        >
                                            {getStatusLabel(st)}
                                        </button>
                                    ))}
                                    {canManageStatus && (
                                        <button
                                            key="in_progress"
                                            onClick={() => handleStatusUpdate('in_progress')}
                                            disabled={statusUpdating}
                                            className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[7px] sm:text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${
                                                currentTicket.status === 'in_progress' 
                                                    ? 'bg-[#002855] text-white shadow-lg sm:shadow-xl scale-105' 
                                                    : 'bg-white text-slate-300 border border-slate-100 hover:border-slate-300 hover:text-slate-500'
                                            }`}
                                        >
                                            {getStatusLabel('in_progress')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right side: Interaction Feed - Hidden on mobile unless active tab is feed */}
                    <div className={`${
                        activeTab === 'feed' ? 'flex' : 'hidden'
                    } md:flex flex-1 flex-col bg-white relative`}>
                        {/* Desktop Header - Hidden on mobile */}
                        <div className="hidden md:flex p-6 sm:p-7 md:p-8 border-b border-slate-50 items-center justify-between shrink-0">
                            <div className="flex items-center gap-4 sm:gap-5">
                                <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <IoChatbubbles className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xs sm:text-sm font-black text-[#002855] tracking-tight">CANAL DE SEGUIMIENTO</h3>
                                    <p className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Interacción directa en tiempo real</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-slate-600 transition-all flex items-center justify-center hover:bg-slate-50"
                                    title="Cerrar ventana"
                                >
                                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <button
                                    onClick={handleDeleteTicket}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center hover:bg-rose-50"
                                    title="Eliminar ticket"
                                >
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 custom-scrollbar bg-[#F8FAFC]/30">
                            {comments.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 sm:space-y-6">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                                        <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 opacity-20" />
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] opacity-30 text-center px-4">Aún no hay mensajes</p>
                                </div>
                            ) : comments.map((c) => {
                                const isMe = c.user_id === user?.id;
                                const isSystem = c.content.includes('Cambió el estado');

                                if (isSystem) {
                                    return (
                                        <div key={c.id} className="flex justify-center">
                                            <div className="bg-white border border-slate-100 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full shadow-sm text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] flex items-center gap-2 sm:gap-3 animate-in fade-in zoom-in duration-500">
                                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500" />
                                                <span className="text-center">{c.content.replace(/\*\*/g, '')}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={c.id} className={`flex gap-3 sm:gap-4 md:gap-5 ${isMe ? 'flex-row-reverse' : ''} group`}>
                                        <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl shrink-0 overflow-hidden border-2 border-white shadow-lg sm:shadow-xl ${
                                            isMe ? 'bg-blue-600' : 'bg-[#002855]'
                                        }`}>
                                            {c.author?.avatar_url ? (
                                                <img src={c.author.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-black text-xs sm:text-sm">
                                                    {c.author?.full_name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%] sm:max-w-[75%] md:max-w-[80%]`}>
                                            <div className={`p-3 sm:p-4 md:p-6 rounded-[1rem] sm:rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm text-[11px] sm:text-[12px] md:text-[13px] leading-relaxed transition-all ${
                                                isMe 
                                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                                    : 'bg-white border border-slate-100 text-[#002855] rounded-tl-none group-hover:shadow-md'
                                            }`}>
                                                {c.content}
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 px-1 sm:px-2">
                                                <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.author?.full_name?.split(' ')[0]}</span>
                                                <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-slate-200"></span>
                                                <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={commentsEndRef} />
                        </div>

                        <div className="p-3 sm:p-4 bg-white border-t border-slate-50">
                            <form onSubmit={handleSendComment} className="relative group">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Escribe un mensaje aquí..."
                                    className="w-full h-10 sm:h-12 pl-4 sm:pl-6 pr-12 sm:pr-16 bg-[#F8FAFC] rounded-[1rem] sm:rounded-[1.5rem] border border-slate-100 outline-none focus:ring-3 sm:focus:ring-4 focus:ring-blue-50 text-[11px] sm:text-[13px] font-bold text-[#002855] placeholder:text-slate-300 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || sending}
                                    className="absolute right-1 sm:right-1.5 top-1 sm:top-1.5 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
                                >
                                    <Send className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
