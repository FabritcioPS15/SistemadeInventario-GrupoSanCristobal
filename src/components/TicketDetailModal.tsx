import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Clock, AlertCircle, MessageSquare, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
        const isStaff = user?.role === 'systems' || user?.role === 'management' || user?.role === 'supervisor';
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
        const canManageStatus = user?.role === 'systems' || user?.role === 'management' || user?.role === 'supervisor';
        if (!canManageStatus) return;

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

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-rose-600 bg-rose-50 border-rose-100';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'medium': return 'text-blue-600 bg-blue-50 border-blue-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-100';
        }
    };

    const canManageStatus = user?.role === 'systems' || user?.role === 'management' || user?.role === 'supervisor';

    return (
        <div className="fixed inset-0 bg-[#001529]/70 backdrop-blur-xl flex items-center justify-center z-50 p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-7xl h-full max-h-[900px] flex flex-col md:flex-row overflow-hidden border border-white/20 animate-in slide-in-from-bottom-8 duration-500">

                {/* Left side: Information (incident context) */}
                <div className="w-full md:w-[420px] bg-[#F8FAFC] border-r border-slate-100 p-10 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-10">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">#TK-{currentTicket.id.slice(0, 8)}</span>
                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${getPriorityStyle(currentTicket.priority)}`}>
                            Prioridad {currentTicket.priority}
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-[#002855] leading-tight mb-8 uppercase italic">{currentTicket.title}</h2>

                    <div className="space-y-10">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative group">
                            <span className="absolute -top-3 left-6 bg-[#002855] text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Detalle Inicial</span>
                            <p className="text-[13px] text-slate-500 leading-relaxed pt-2">
                                {currentTicket.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100">
                                <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner overflow-hidden">
                                    {currentTicket.requester?.avatar_url ? (
                                        <img src={currentTicket.requester.avatar_url} className="w-full h-full object-cover" />
                                    ) : <User size={20} />}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Reportado Por</p>
                                    <p className="text-xs font-black text-[#002855] uppercase">{currentTicket.requester?.full_name}</p>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase mt-0.5">{currentTicket.locations?.name || 'Sede Central'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100">
                                <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Fecha de Apertura</p>
                                    <p className="text-xs font-black text-[#002855]">{new Date(currentTicket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                </div>
                            </div>

                            {currentTicket.attendant && (
                                <div className="flex items-center gap-4 p-5 bg-blue-600 rounded-3xl border border-blue-500 shadow-lg shadow-blue-100">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20 overflow-hidden">
                                        {currentTicket.attendant?.avatar_url ? (
                                            <img src={currentTicket.attendant.avatar_url} className="w-full h-full object-cover" />
                                        ) : <ShieldCheck size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-0.5">Técnico Asignado</p>
                                        <p className="text-xs font-black text-white uppercase">{currentTicket.attendant?.full_name}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-10 border-t border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Gestión de Estado</p>
                            <div className="flex flex-wrap gap-2">
                                {['open', 'in_progress', 'resolved', 'closed'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => handleStatusUpdate(st)}
                                        disabled={!canManageStatus || statusUpdating}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${currentTicket.status === st ? 'bg-[#002855] text-white shadow-xl scale-105' : 'bg-white text-slate-300 border border-slate-100 hover:border-slate-300 hover:text-slate-500'}`}
                                    >
                                        {getStatusLabel(st)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-auto pt-10 flex items-center gap-3 text-[10px] font-black text-slate-300 hover:text-rose-500 transition-all uppercase tracking-[0.3em]"
                    >
                        <X size={16} />
                        Cerrar Ventana
                    </button>
                </div>

                {/* Right side: Interaction Feed (Chat interface) */}
                <div className="flex-1 flex flex-col bg-white relative">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-[1.5rem] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <MessageSquare size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-[#002855] tracking-tight">CANAL DE SEGUIMIENTO</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Interacción directa en tiempo real</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDeleteTicket}
                                className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center hover:bg-rose-50"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-[#F8FAFC]/30">
                        {comments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-6">
                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
                                    <MessageSquare size={32} className="opacity-20" />
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-30">Aún no hay mensajes</p>
                            </div>
                        ) : comments.map((c) => {
                            const isMe = c.user_id === user?.id;
                            const isSystem = c.content.includes('Cambió el estado');

                            if (isSystem) {
                                return (
                                    <div key={c.id} className="flex justify-center">
                                        <div className="bg-white border border-slate-100 px-6 py-2 rounded-full shadow-sm text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3 animate-in fade-in zoom-in duration-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            {c.content.replace(/\*\*/g, '')}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={c.id} className={`flex gap-5 ${isMe ? 'flex-row-reverse' : ''} group`}>
                                    <div className={`w-12 h-12 rounded-2xl shrink-0 overflow-hidden border-2 border-white shadow-xl ${isMe ? 'bg-blue-600' : 'bg-[#002855]'}`}>
                                        {c.author?.avatar_url ? (
                                            <img src={c.author.avatar_url} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-black text-sm">
                                                {c.author?.full_name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                        <div className={`p-6 rounded-[2.5rem] shadow-sm text-[13px] leading-relaxed transition-all ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-[#002855] rounded-tl-none group-hover:shadow-md'}`}>
                                            {c.content}
                                        </div>
                                        <div className="flex items-center gap-3 mt-3 px-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.author?.full_name?.split(' ')[0]}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={commentsEndRef} />
                    </div>

                    <div className="p-8 bg-white border-t border-slate-50">
                        <form onSubmit={handleSendComment} className="relative group">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escribe un mensaje aquí..."
                                className="w-full h-16 pl-8 pr-20 bg-[#F8FAFC] rounded-[2rem] border border-slate-100 outline-none focus:ring-4 focus:ring-blue-50 text-[13px] font-bold text-[#002855] placeholder:text-slate-300 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || sending}
                                className="absolute right-2 top-2 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
