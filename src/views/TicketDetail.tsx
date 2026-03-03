import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, User, Clock, AlertCircle, MessageSquare, ShieldCheck, MessageCircle, Copy, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function TicketDetail() {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ticket, setTicket] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [copiedItem, setCopiedItem] = useState<string | null>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        if (ticketId) {
            fetchTicket();
            fetchComments();
        }
    }, [ticketId]);

    useEffect(() => {
        if (!ticketId) return;

        const ticketSubscription = supabase
            .channel(`ticket-status-${ticketId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'tickets',
                filter: `id=eq.${ticketId}`
            }, async () => {
                await fetchTicket();
            })
            .subscribe();

        const commentsSubscription = supabase
            .channel(`comments-feed-${ticketId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'ticket_comments',
                filter: `ticket_id=eq.${ticketId}`
            }, () => {
                fetchComments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(ticketSubscription);
            supabase.removeChannel(commentsSubscription);
        };
    }, [ticketId]);

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    const scrollToBottom = () => {
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const fetchTicket = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    requester:requester_id(full_name, email, avatar_url),
                    attendant:assigned_to(full_name, email, avatar_url),
                    locations(name),
                    ticket_assignments(user_id, assigned_at, user:users(id, full_name, email, avatar_url))
                `)
                .eq('id', ticketId)
                .single();

            if (error) throw error;
            
            // Buscar AnyDesk en los comentarios
            const { data: comments } = await supabase
                .from('ticket_comments')
                .select('content')
                .eq('ticket_id', ticketId)
                .ilike('content', '%anydesk%');
            
            if (comments && comments.length > 0) {
                // Buscar en todos los comentarios que contienen "anydesk"
                for (const comment of comments) {
                    // Extraer ID de AnyDesk del comentario con el formato exacto
                    const anydeskMatch = comment.content.match(/anydesk de mi pc:\s*([a-zA-Z0-9]+)/i);
                    if (anydeskMatch) {
                        data.anydesk_id = anydeskMatch[1];
                        data.anydesk_password = null; // En este formato no hay contraseña
                        break; // Tomar el primero que encuentre
                    }
                }
            }
            
            setTicket(data);
        } catch (error) {
            console.error('Error fetching ticket:', error);
            navigate('/tickets');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const { data, error } = await supabase
                .from('ticket_comments')
                .select(`
                    *,
                    author:user_id(full_name, email, avatar_url)
                `)
                .eq('ticket_id', ticketId)
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
                        ticket_id: ticketId,
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
        const createdDate = new Date(ticket.created_at);
        const minutesDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60);
        const isOwner = user?.id === ticket.requester_id;
        const isStaff = user?.role === 'systems' || user?.role === 'management' || user?.role === 'supervisor';
        const canDelete = isStaff || (isOwner && minutesDiff <= 3);

        if (!canDelete) {
            alert(isOwner ? 'Tiempo agotado (3 min).' : 'Acceso Denegado.');
            return;
        }

        if (!confirm('¿Eliminar ticket?')) return;

        try {
            setStatusUpdating(true);
            const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
            if (error) throw error;
            navigate('/tickets');
        } catch (error) {
            console.error(error);
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        console.log('handleStatusUpdate called:', {
            newStatus,
            userRole: user?.role,
            canManageStatus,
            statusUpdating,
            ticketId
        });
        
        if (!canManageStatus) {
            console.log('Cannot manage status - insufficient permissions');
            return;
        }

        if (statusUpdating) {
            console.log('Status is currently updating, please wait...');
            return;
        }

        try {
            setStatusUpdating(true);
            console.log('Starting status update to:', newStatus);
            
            const updatePayload: any = { status: newStatus };
            
            if (newStatus === 'in_progress') {
                updatePayload.assigned_to = user?.id;
                updatePayload.attended_at = new Date().toISOString();
            } else if (newStatus === 'resolved') {
                updatePayload.resolved_at = new Date().toISOString();
            } else if (newStatus === 'closed') {
                updatePayload.closed_at = new Date().toISOString();
            }

            console.log('Update payload:', updatePayload);

            const { error } = await supabase.from('tickets').update(updatePayload).eq('id', ticketId);
            
            if (error) {
                console.error('Error updating ticket status:', error);
                throw error;
            }
            
            console.log('Status updated successfully');

            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `Cambió el estado a: **${getStatusLabel(newStatus).toUpperCase()}**`,
            }]);

            console.log('Comment added successfully');
            fetchComments();
        } catch (error) {
            console.error('Complete error in handleStatusUpdate:', error);
            alert('Error al actualizar el estado: ' + (error as any)?.message || 'Error desconocido');
        } finally {
            setStatusUpdating(false);
            console.log('Status updating finished');
        }
    };

    const handleWhatsAppContact = () => {
        if (!ticket.requester?.email) return;
        
        const phoneNumber = ticket.requester.email.includes('@') ? 
            ticket.requester.email.split('@')[0].replace(/\D/g, '') : '';
        
        if (phoneNumber) {
            const message = encodeURIComponent(`Hola ${ticket.requester.full_name}, te escribo del soporte técnico sobre tu ticket #${ticket.id.slice(0, 8).toUpperCase()}. ¿Cómo podemos ayudarte?`);
            window.open(`https://wa.me/51${phoneNumber}?text=${message}`, '_blank');
        }
    };

    const shouldShowWhatsApp = () => {
        if (!ticket) return false;
        const isHighPriority = ticket.priority === 'high' || ticket.priority === 'critical';
        const now = new Date();
        const created = new Date(ticket.created_at);
        const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
        return isHighPriority && diffMinutes > 10 && ticket.requester?.email;
    };

    const handleCopy = async (text: string, itemType: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedItem(itemType);
            setTimeout(() => setCopiedItem(null), 2000);
        } catch (error) {
            console.error('Error al copiar:', error);
        }
    };

    const canManageStatus = user?.role === 'systems' || user?.role === 'management' || user?.role === 'supervisor' || user?.role === 'admin' || user?.role === 'staff';

    // Debug: mostrar información del usuario y permisos
    console.log('User permissions check:', {
        userRole: user?.role,
        userId: user?.id,
        canManageStatus,
        ticketId,
        ticketStatus: ticket?.status,
        ticketRequesterId: ticket?.requester_id
    });

    const handleJoinTicket = async () => {
        console.log('handleJoinTicket called:', {
            userRole: user?.role,
            canManageStatus,
            ticketId,
            ticketStatus: ticket?.status,
            currentAssignments: ticket?.ticket_assignments?.length || 0,
            userId: user?.id
        });
        
        if (!canManageStatus || !ticket) {
            console.log('Cannot join ticket - insufficient permissions or no ticket');
            return;
        }
        
        // Verificar si ya está asignado
        const isAlreadyAssigned = ticket.ticket_assignments?.some((assignment: any) => assignment.user_id === user?.id);
        console.log('Is already assigned:', isAlreadyAssigned);
        
        if (isAlreadyAssigned) {
            console.log('User already assigned to this ticket');
            alert('Ya estás asignado a este ticket');
            return;
        }
        
        // Verificar límite de 3 personas
        const currentAssignments = ticket.ticket_assignments?.length || 0;
        console.log('Current assignments count:', currentAssignments);
        
        if (currentAssignments >= 3) {
            console.log('Maximum assignments reached');
            alert('Máximo de 3 personas asignadas a este ticket');
            return;
        }
        
        try {
            console.log('Attempting to join ticket...');
            
            const { error } = await supabase
                .from('ticket_assignments')
                .insert([{
                    ticket_id: ticketId,
                    user_id: user?.id,
                    assigned_at: new Date().toISOString()
                }]);
            
            if (error) {
                console.error('Error joining ticket:', error);
                throw error;
            }
            
            console.log('Successfully joined ticket');
            
            // Cambiar estado a in_progress
            await handleStatusUpdate('in_progress');
            
        } catch (error) {
            console.error('Error al unirse al ticket:', error);
            alert('Error al unirse al ticket');
        }
    };

    const getAssignedUsers = () => {
        if (!ticket?.ticket_assignments) return [];
        return ticket.ticket_assignments.map((assignment: any) => ({
            ...assignment,
            user: assignment.user || {
                id: assignment.user_id,
                full_name: 'Usuario',
                email: '',
                avatar_url: null
            },
            isCurrentUser: assignment.user_id === user?.id
        }));
    };

    const canJoinTicket = canManageStatus && ticket?.status === 'open' && !getAssignedUsers().some((u: any) => u.isCurrentUser) && getAssignedUsers().length < 3;

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

    const canAttendTicket = canManageStatus && ticket?.status === 'open';
    const isTicketCreator = user?.id === ticket?.requester_id;

    // Verificar si el ticket puede ser reabierto por el creador
    const canReopenTicket = isTicketCreator && ticket?.status === 'closed' && ticket?.closed_at;
    const timeSinceClosed = ticket?.closed_at ? Math.floor((new Date().getTime() - new Date(ticket.closed_at).getTime()) / (1000 * 60)) : 0;
    const isWithinReopenWindow = timeSinceClosed < 10; // 10 minutos para reabrir

    const handleReopenTicket = async () => {
        if (!canReopenTicket || !isWithinReopenWindow) return;

        try {
            setStatusUpdating(true);
            
            const { error } = await supabase.from('tickets').update({
                status: 'open',
                // Limpiar campos de cierre
                closed_at: null
            }).eq('id', ticketId);

            if (error) throw error;

            // Agregar comentario de reapertura
            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `**REAPERTURA**: Ticket reabierto por el solicitante`,
            }]);

            fetchComments();
        } catch (error) {
            console.error('Error al reabrir ticket:', error);
        } finally {
            setStatusUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-600 mb-2">Ticket no encontrado</h2>
                    <button
                        onClick={() => navigate('/tickets')}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Volver a tickets
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Fijo */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
                <div className="bg-white border-b border-gray-200 px-8 py-4">
                    <div className="max-w-full mx-auto flex items-center gap-2 text-sm text-gray-500">
                        <button
                            onClick={() => navigate('/tickets')}
                            className="hover:text-gray-700 transition-colors"
                        >
                            Mesa de Ayuda
                        </button>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">Ticket #{ticket.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left side: Ticket Details (1/4 del ancho) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">#TK-{ticket.id.slice(0, 8)}</span>
                                <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${getPriorityStyle(ticket.priority)}`}>
                                    Prioridad {ticket.priority}
                                </div>
                            </div>

                            <h2 className="text-lg font-black text-[#002855] leading-tight mb-6 uppercase">{ticket.title}</h2>

                            <div className="space-y-6">
                                {/* Detalle Inicial */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Detalle Inicial</span>
                                    <p className="text-sm text-gray-600 leading-relaxed mt-2">
                                        {ticket.description}
                                    </p>
                                </div>

                                {/* Anydesk */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Acceso Remoto</span>
                                    <div className="mt-2 space-y-3">
                                        {/* AnyDesk ID */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-900">AnyDesk: {ticket.anydesk_id || 'No proporcionado'}</p>
                                            </div>
                                            {ticket.anydesk_id && (
                                                <button
                                                    onClick={() => handleCopy(ticket.anydesk_id, 'anydesk')}
                                                    className="ml-2 w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center hover:bg-blue-50"
                                                    title="Copiar ID"
                                                >
                                                    {copiedItem === 'anydesk' ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                                            <div className="w-2 h-1 bg-white rounded-full transform rotate-45 translate-x-[-1px]"></div>
                                                        </div>
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Contraseña */}
                                        {ticket.anydesk_password && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-600">Contraseña: {ticket.anydesk_password}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(ticket.anydesk_password, 'password')}
                                                    className="ml-2 w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center hover:bg-blue-50"
                                                    title="Copiar contraseña"
                                                >
                                                    {copiedItem === 'password' ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                                            <div className="w-2 h-1 bg-white rounded-full transform rotate-45 translate-x-[-1px]"></div>
                                                        </div>
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Botón copiar todo */}
                                        {ticket.anydesk_id && (
                                            <button
                                                onClick={() => handleCopy(`AnyDesk: ${ticket.anydesk_id}${ticket.anydesk_password ? `\nContraseña: ${ticket.anydesk_password}` : ''}`, 'all')}
                                                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                {copiedItem === 'all' ? (
                                                    <>
                                                        <div className="w-3 h-3 rounded-full bg-white flex items-center justify-center">
                                                            <div className="w-1.5 h-0.5 bg-blue-600 rounded-full transform rotate-45 translate-x-[-0.5px]"></div>
                                                        </div>
                                                        ¡Copiado!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} />
                                                        Copiar Todo
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Gestión de Estado */}
                                <div className="pt-6 border-t border-gray-200">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Gestión de Estado</p>
                                    {isTicketCreator ? (
                                        // Vista informativa para el creador del ticket
                                        <div className="space-y-3">
                                            {['open', 'in_progress', 'resolved', 'closed'].map(st => (
                                                <div
                                                    key={st}
                                                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-between ${
                                                        ticket.status === st 
                                                            ? 'bg-[#002855] text-white shadow-lg' 
                                                            : 'bg-gray-100 text-gray-400'
                                                    }`}
                                                >
                                                    <span>{getStatusLabel(st)}</span>
                                                    {ticket.status === st && (
                                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        // Vista funcional para el staff
                                        <div className="space-y-3 mb-4">
                                            {/* Indicador de permisos */}
                                            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                                <p className="text-xs font-black text-blue-700 text-center">
                                                    Rol: {user?.role} | Permisos: {canManageStatus ? '✅ Gestión' : '❌ Solo lectura'}
                                                </p>
                                            </div>
                                            
                                            {/* Botón de prueba */}
                                            <button
                                                onClick={() => {
                                                    console.log('TEST BUTTON CLICKED!');
                                                    alert('Botón de prueba funciona!');
                                                }}
                                                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-black uppercase"
                                            >
                                                🧪 PROBAR BOTÓN
                                            </button>
                                            
                                            {['open', 'in_progress', 'resolved', 'closed'].map(st => (
                                                <button
                                                    key={st}
                                                    onClick={() => {
                                                        console.log('STATUS BUTTON CLICKED:', st);
                                                        handleStatusUpdate(st);
                                                    }}
                                                    disabled={!canManageStatus || statusUpdating}
                                                    className={`w-full px-4 py-3 rounded-xl text-xs font-black uppercase transition-all transform hover:scale-105 active:scale-95 flex items-center justify-between ${
                                                        ticket.status === st 
                                                            ? 'bg-[#002855] text-white shadow-lg' 
                                                            : 'bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50'
                                                    }`}
                                                >
                                                    <span>{statusUpdating && ticket.status === st ? (
                                                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        getStatusLabel(st)
                                                    )}</span>
                                                    {ticket.status === st && (
                                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Botón de Reapertura para Creador */}
                                    {canReopenTicket && isWithinReopenWindow && (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Opción de Reapertura</span>
                                                </div>
                                                <span className="text-xs font-black text-amber-600">
                                                    {10 - timeSinceClosed}min restantes
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleReopenTicket}
                                                disabled={statusUpdating}
                                                className="w-full px-4 py-3 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {statusUpdating ? (
                                                    <>
                                                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                        Reabriendo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowLeft size={14} />
                                                        Reabrir Ticket
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-xs text-amber-600 mt-2 text-center">
                                                Puedes reabrir este ticket antes de que sea archivado
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Mensaje cuando no se puede reabrir */}
                                    {canReopenTicket && !isWithinReopenWindow && (
                                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full" />
                                                <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Ticket No Reabrible</span>
                                            </div>
                                            <p className="text-xs text-slate-500 text-center">
                                                El tiempo para reabrir ha expirado (más de 10 minutos)
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Botón de WhatsApp para alta prioridad */}
                                    {shouldShowWhatsApp() && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                    <span className="text-xs font-black text-green-700 uppercase tracking-widest">Contacto Urgente</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleWhatsAppContact}
                                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95"
                                            >
                                                <MessageCircle size={14} />
                                                Contactar por WhatsApp
                                            </button>
                                            <p className="text-xs text-green-600 mt-2 text-center">
                                                Ticket de alta prioridad con más de 10 minutos
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Center: Chat (2/4 del ancho) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-blue-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                                        <MessageSquare size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#002855]">CANAL DE SEGUIMIENTO</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-gray-600 uppercase tracking-widest">Interacción directa en tiempo real</p>
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-xs text-green-600 font-black uppercase">Activo</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {shouldShowWhatsApp() && (
                                        <button
                                            onClick={handleWhatsAppContact}
                                            className="w-10 h-10 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all flex items-center justify-center shadow-lg hover:scale-110"
                                            title="Contactar por WhatsApp"
                                        >
                                            <MessageCircle size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleDeleteTicket}
                                        className="w-10 h-10 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center hover:bg-red-50 shadow-sm"
                                        title="Eliminar ticket"
                                    >
                                        <AlertCircle size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
                                {comments.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                                            <MessageSquare size={32} className="opacity-20" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black uppercase tracking-widest opacity-30">Aún no hay mensajes</p>
                                            <p className="text-xs text-gray-400 mt-2">Sé el primero en responder</p>
                                        </div>
                                    </div>
                                ) : comments.map((c, index) => {
                                    const isMe = c.user_id === user?.id;
                                    const isSystem = c.content.includes('Cambió el estado');

                                    if (isSystem) {
                                        return (
                                            <div key={c.id} className="flex flex-col items-center animate-fadeIn">
                                                <div className="w-full flex items-center gap-4 my-4">
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-2 rounded-full shadow-sm text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                        {c.content.replace(/\*\*/g, '')}
                                                    </div>
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                                                </div>
                                                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">
                                                    {new Date(c.created_at).toLocaleString('es-PE', { 
                                                        day: '2-digit', 
                                                        month: 'short', 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={c.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''} group animate-slideIn`} style={{ animationDelay: `${index * 50}ms` }}>
                                            <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 shadow-lg flex-shrink-0 transform transition-all group-hover:scale-110 ${isMe ? 'bg-blue-600 border-blue-700' : 'bg-[#002855] border-[#003366]'}`}>
                                                {c.author?.avatar_url ? (
                                                    <img src={c.author.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white font-black text-sm">
                                                        {c.author?.full_name?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed transition-all group-hover:shadow-md ${isMe ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none hover:border-blue-300'}`}>
                                                    <p className="break-words">{c.content}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 px-1">
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{c.author?.full_name?.split(' ')[0]}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="text-xs font-black text-gray-400 uppercase">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={commentsEndRef} />
                            </div>

                            <div className="p-4 bg-white border-t border-gray-100 bg-gradient-to-t from-gray-50 to-white">
                                <form onSubmit={handleSendComment} className="relative">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Escribe un mensaje aquí..."
                                            className="w-full h-12 pl-4 pr-16 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold text-gray-900 placeholder:text-gray-400 transition-all"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newComment.trim() || sending}
                                            className="absolute right-2 top-2 w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                                        >
                                            {sending ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Send size={16} />
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Right side: People Info (1/4 del ancho) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Información de Participantes</h3>
                            
                            <div className="space-y-4">
                                {/* Fecha de Apertura y Tiempo Transcurrido */}
                                <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 mb-3">
                                        <Clock size={18} />
                                    </div>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Tiempo Activo</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                        {(() => {
                                            const now = new Date();
                                            const created = new Date(ticket.created_at);
                                            const diffMs = now.getTime() - created.getTime();
                                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                            const diffDays = Math.floor(diffHours / 24);
                                            
                                            if (diffDays > 0) {
                                                return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
                                            } else if (diffHours > 0) {
                                                return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                                            } else {
                                                const diffMins = Math.floor(diffMs / (1000 * 60));
                                                return `${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
                                            }
                                        })()}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(ticket.created_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>

                                {/* Reportado Por */}
                                <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl">
                                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden mb-3">
                                        {ticket.requester?.avatar_url ? (
                                            <img src={ticket.requester.avatar_url} className="w-full h-full object-cover" />
                                        ) : <User size={20} />}
                                    </div>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Reportado Por</p>
                                    <p className="text-sm font-bold text-gray-900 uppercase mt-1">{ticket.requester?.full_name?.split(' ')[0]}</p>
                                    <p className="text-xs text-blue-500 uppercase mt-1">{ticket.locations?.name || 'Sede Central'}</p>
                                </div>

                                {/* Participantes Asignados */}
                                {getAssignedUsers().length > 0 && (
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 text-center">
                                            Participantes ({getAssignedUsers().length}/3)
                                        </p>
                                        <div className="space-y-2">
                                            {getAssignedUsers().map((assignment: any) => (
                                                <div key={assignment.user_id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                                                        {assignment.user?.avatar_url ? (
                                                            <img src={assignment.user.avatar_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="text-xs font-black text-blue-600">
                                                                {assignment.user?.full_name?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 truncate">
                                                            {assignment.user?.full_name || 'Usuario'}
                                                        </p>
                                                        {assignment.isCurrentUser && (
                                                            <p className="text-xs text-blue-600">Tú</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Botón Unirse al Ticket */}
                                {canJoinTicket && (
                                    <button
                                        onClick={handleJoinTicket}
                                        className="w-full p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:from-purple-700 hover:to-purple-800 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <User size={18} />
                                        Unirse al Ticket
                                    </button>
                                )}

                                {/* Técnico Asignado */}
                                {ticket.attendant && (
                                    <div className="flex flex-col items-center text-center p-4 bg-blue-600 rounded-xl">
                                        <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-white overflow-hidden mb-3">
                                            {ticket.attendant?.avatar_url ? (
                                                <img src={ticket.attendant.avatar_url} className="w-full h-full object-cover" />
                                            ) : <ShieldCheck size={20} />}
                                        </div>
                                        <p className="text-xs font-black text-white/70 uppercase tracking-widest">Técnico Asignado</p>
                                        <p className="text-sm font-bold text-white uppercase mt-1">{ticket.attendant?.full_name?.split(' ')[0]}</p>
                                    </div>
                                )}

                                {/* Botón Atender para staff */}
                                {canAttendTicket && (
                                    <button
                                        onClick={() => handleStatusUpdate('in_progress')}
                                        className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck size={18} />
                                        Atender Ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
