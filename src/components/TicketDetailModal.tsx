import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Clock, AlertCircle, MessageSquare } from 'lucide-react';
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

    useEffect(() => {
        setCurrentTicket(initialTicket);
    }, [initialTicket]);

    useEffect(() => {
        fetchComments();

        // 1. Subscribe to TICKET changes (Realtime Status/Assigned)
        const ticketSubscription = supabase
            .channel(`ticket-status-${currentTicket.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets',
                filter: `id=eq.${currentTicket.id}`
            }, async () => {
                // Fetch the fresh ticket with joins
                const { data } = await supabase
                    .from('tickets')
                    .select(`
                        *,
                        requester:requester_id(full_name, email),
                        attendant:assigned_to(full_name, email)
                    `)
                    .eq('id', currentTicket.id)
                    .single();

                if (data) setCurrentTicket(data);
                onUpdate();
            })
            .subscribe();

        // 2. Subscribe to NEW comments
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
                    author:user_id(full_name, email)
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

    const handleStatusUpdate = async (newStatus: string) => {
        if (user?.role !== 'systems' && user?.role !== 'management') {
            alert('Acceso Denegado: Solo el personal de Sistemas o Gerencia puede gestionar el estado de los tickets.');
            return;
        }

        try {
            setStatusUpdating(true);

            // 1. Optimistic Update (Instant UI Feedback)
            setCurrentTicket((prev: any) => ({ ...prev, status: newStatus }));

            const updatePayload: any = { status: newStatus };
            if (newStatus === 'in_progress') {
                updatePayload.assigned_to = user?.id;
                updatePayload.attended_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('tickets')
                .update(updatePayload)
                .eq('id', currentTicket.id);

            if (error) throw error;

            // 2. Insert "System" comment & Refresh local feed
            await supabase.from('ticket_comments').insert([
                {
                    ticket_id: currentTicket.id,
                    user_id: user?.id,
                    content: `Cambió el estado a: **${getStatusLabel(newStatus).toUpperCase()}**`,
                }
            ]);

            fetchComments();
            onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
            // Revert on error
            setCurrentTicket(initialTicket);
            alert('Error al actualizar el estado');
        } finally {
            setStatusUpdating(false);
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

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-rose-600 bg-rose-50 border-rose-200 shadow-rose-100';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200 shadow-orange-100';
            case 'medium': return 'text-indigo-600 bg-indigo-50 border-indigo-200 shadow-indigo-100';
            case 'low': return 'text-slate-600 bg-slate-50 border-slate-200 shadow-slate-100';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-[#001529]/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#f8fafc] rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-300">

                {/* Left Panel: Executive Summary */}
                <div className="w-[380px] bg-white border-r border-slate-200 p-8 flex flex-col overflow-y-auto custom-scrollbar shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)] relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Referencia</span>
                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">#{currentTicket.id.slice(0, 12).toUpperCase()}</span>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 shadow-sm ${getPriorityStyle(currentTicket.priority)}`}>
                            {currentTicket.priority}
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-[#001529] mb-6 leading-[1.1] tracking-tight">{currentTicket.title}</h2>

                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Resumen del Reporte</span>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-[13px] text-slate-600 leading-relaxed italic relative">
                                <span className="absolute -top-3 left-6 bg-white px-2 text-[10px] font-bold text-slate-400">Descripción</span>
                                {currentTicket.description}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                    <User size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Solicitante</span>
                                    <span className="text-sm font-bold text-slate-800">{currentTicket.requester?.full_name || 'Desconocido'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                    <Clock size={20} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Apertura</span>
                                    <span className="text-sm font-bold text-slate-800">{new Date(currentTicket.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Management: Executive Actions - MORE NOTICABLE */}
                        <div className="pt-8 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-4 bg-indigo-600 rounded-full"></div>
                                <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Establecer Estado</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Button: OPEN */}
                                <button
                                    onClick={() => handleStatusUpdate('open')}
                                    disabled={statusUpdating || currentTicket.status === 'open' || (user?.role !== 'systems' && user?.role !== 'management')}
                                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${currentTicket.status === 'open'
                                        ? 'bg-blue-600 text-white shadow-blue-200 border-2 border-blue-400 ring-4 ring-blue-500/10'
                                        : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300 hover:text-blue-500'
                                        }`}
                                >
                                    {currentTicket.status === 'open' ? '✓ Activo' : 'Abrir'}
                                </button>

                                {/* Button: IN PROGRESS */}
                                <button
                                    onClick={() => handleStatusUpdate('in_progress')}
                                    disabled={statusUpdating || currentTicket.status === 'in_progress' || (user?.role !== 'systems' && user?.role !== 'management')}
                                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${currentTicket.status === 'in_progress'
                                        ? 'bg-amber-500 text-white shadow-amber-200 border-2 border-amber-300 ring-4 ring-amber-500/10'
                                        : 'bg-white text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-500'
                                        }`}
                                >
                                    {currentTicket.status === 'in_progress' ? '✓ Atendiendo' : 'Atender'}
                                </button>

                                {/* Button: RESOLVED */}
                                <button
                                    onClick={() => handleStatusUpdate('resolved')}
                                    disabled={statusUpdating || currentTicket.status === 'resolved' || (user?.role !== 'systems' && user?.role !== 'management')}
                                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${currentTicket.status === 'resolved'
                                        ? 'bg-emerald-500 text-white shadow-emerald-200 border-2 border-emerald-400 ring-4 ring-emerald-500/10'
                                        : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-300 hover:text-emerald-500'
                                        }`}
                                >
                                    {currentTicket.status === 'resolved' ? '✓ Resuelto' : 'Resolver'}
                                </button>

                                {/* Button: CLOSED */}
                                <button
                                    onClick={() => handleStatusUpdate('closed')}
                                    disabled={statusUpdating || currentTicket.status === 'closed' || (user?.role !== 'systems' && user?.role !== 'management')}
                                    className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm ${currentTicket.status === 'closed'
                                        ? 'bg-slate-800 text-white shadow-slate-200 border-2 border-slate-600 ring-4 ring-slate-800/10'
                                        : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400 hover:text-slate-800'
                                        }`}
                                >
                                    {currentTicket.status === 'closed' ? '✓ Cerrado' : 'Cerrar'}
                                </button>
                            </div>

                            <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">
                                {user?.role === 'systems' || user?.role === 'management'
                                    ? '* El cambio de estado queda registrado en el historial'
                                    : '* Solo personal de Sistemas/Gerencia puede gestionar estados'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Executive Feed */}
                <div className="flex-1 flex flex-col bg-[#f1f5f9]/50">
                    <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[#001529] uppercase tracking-widest">Feed de Actividad</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Hilo de Seguimiento en Tiempo Real</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 rounded-2xl transition-all text-slate-400 hover:text-rose-500 hover:rotate-90">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Chat Experience */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {comments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                                <div className="w-20 h-20 rounded-[2rem] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center">
                                    <MessageSquare size={32} className="opacity-20" />
                                </div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Sin Comunicaciones</p>
                            </div>
                        ) : (
                            comments.map((comment) => {
                                const isSystem = comment.content.includes('Cambió el estado a');
                                const isMe = comment.user_id === user?.id;

                                if (isSystem) {
                                    return (
                                        <div key={comment.id} className="flex justify-center">
                                            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 px-4 py-1.5 rounded-full shadow-sm">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                    <AlertCircle size={10} className="text-blue-500" />
                                                    {comment.content.replace(/\*\*/g, '')}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={comment.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                        <div className="flex-shrink-0">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-md border-2 ${isMe ? 'bg-blue-600 text-white border-blue-400' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                {comment.author?.full_name?.charAt(0)}
                                            </div>
                                        </div>
                                        <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-5 rounded-[2rem] text-[13px] leading-relaxed shadow-xl ${isMe
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                                                }`}>
                                                {comment.content}
                                            </div>
                                            <div className={`flex items-center gap-2 mt-2 px-2 text-[10px] font-bold uppercase tracking-wider ${isMe ? 'text-blue-400' : 'text-slate-400'}`}>
                                                <span>{comment.author?.full_name}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Chat Input: Executive Style */}
                    <div className="p-6 bg-white border-t border-slate-200 relative">
                        <form onSubmit={handleSendComment} className="flex gap-4 bg-slate-50 p-2 rounded-[2rem] border border-slate-200 shadow-inner group focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escribe un mensaje de seguimiento..."
                                className="flex-1 px-6 bg-transparent outline-none text-[13px] font-medium placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || sending}
                                className="w-12 h-12 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-30 active:scale-95"
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
