import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Clock, AlertCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type TicketDetailModalProps = {
    ticket: any;
    onClose: () => void;
    onUpdate: () => void;
};

export default function TicketDetailModal({ ticket, onClose, onUpdate }: TicketDetailModalProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [ticket.id]);

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('ticket_comments')
                .select(`
                    *,
                    profiles:user_id(full_name, email)
                `)
                .eq('ticket_id', ticket.id)
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
                        ticket_id: ticket.id,
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
        if (!confirm(`¿Estás seguro de cambiar el estado a "${getStatusLabel(newStatus)}"?`)) return;

        try {
            setStatusUpdating(true);
            const { error } = await supabase
                .from('tickets')
                .update({ status: newStatus })
                .eq('id', ticket.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating status:', error);
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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-rose-600 bg-rose-50 border-rose-200';
            case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Left Panel: Ticket Info */}
                <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">#{ticket.id.slice(0, 8)}</span>
                        <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                        </div>
                    </div>

                    <h2 className="text-lg font-bold text-slate-800 mb-4 leading-tight">{ticket.title}</h2>

                    <div className="space-y-6">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Descripción</span>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-slate-400" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Solicitante</span>
                                    <span className="text-sm font-medium text-slate-700">{ticket.profiles?.full_name || 'Desconocido'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-slate-400" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fecha</span>
                                    <span className="text-sm font-medium text-slate-700">{new Date(ticket.created_at).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <AlertCircle size={16} className="text-slate-400" />
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Categoría</span>
                                    <span className="text-sm font-medium text-slate-700 capitalize">{ticket.category}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Acciones</span>
                            <div className="space-y-2">
                                {ticket.status !== 'in_progress' && (
                                    <button
                                        onClick={() => handleStatusUpdate('in_progress')}
                                        disabled={statusUpdating}
                                        className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        Marcar En Proceso
                                    </button>
                                )}
                                {ticket.status !== 'resolved' && (
                                    <button
                                        onClick={() => handleStatusUpdate('resolved')}
                                        disabled={statusUpdating}
                                        className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        Marcar Resuelto
                                    </button>
                                )}
                                {ticket.status !== 'closed' && (
                                    <button
                                        onClick={() => handleStatusUpdate('closed')}
                                        disabled={statusUpdating}
                                        className="w-full py-2 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        Cerrar Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Chat/Comments */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={18} className="text-[#002855]" />
                            <h3 className="text-sm font-black text-[#002855] uppercase tracking-wider">Historial de Actividad</h3>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc]">
                        {comments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <MessageSquare size={48} className="mb-2" />
                                <p className="text-sm font-medium">No hay comentarios aún</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className={`flex gap-3 ${comment.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-600">
                                        {comment.profiles?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div className={`max-w-[80%] ${comment.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                                        <div className={`p-3 rounded-2xl text-sm ${comment.user_id === user?.id
                                            ? 'bg-[#002855] text-white rounded-tr-none'
                                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                                            }`}>
                                            {comment.content}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                                            {comment.profiles?.full_name} • {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100">
                        <form onSubmit={handleSendComment} className="flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Escribe un comentario o actualización..."
                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#002855]/20 focus:border-[#002855] outline-none transition-all text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim() || sending}
                                className="p-2.5 bg-[#002855] text-white rounded-xl hover:bg-[#002855]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
