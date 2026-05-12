import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, User, AlertCircle, MessageSquare, Copy, ArrowLeft, Lock, Smile, Bold, Italic, List, Image as ImageIcon, Loader2, Clock, Activity, CheckCircle2, XCircle, Underline, Strikethrough, Monitor, Eye, Briefcase, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FaWhatsapp, FaTrashAlt } from "react-icons/fa";
import { IoChatbubbles } from "react-icons/io5";
import { notifyTicketAttended, notifyTicketResolved, notifyTicketClosed } from '../lib/notifications';

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
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showListMenu, setShowListMenu] = useState(false);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [activeFormats, setActiveFormats] = useState<string[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Estados para edición inline
    const [isEditing, setIsEditing] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<any>({});
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        if (ticketId) {
            fetchTicket();
            fetchComments();
        }
    }, [ticketId]);

    useEffect(() => {
        if (!ticketId) return;

        const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';
        if (DB_MODE !== 'supabase') return;

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

    useEffect(() => {
        if (!ticketId || !user) return;

        const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';
        if (DB_MODE !== 'supabase') return;

        // Configurar presencia en tiempo real
        const presenceChannel = supabase.channel(`presence-ticket-${ticketId}`, {
            config: { presence: { key: user.id } }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const onlineIds = new Set(Object.keys(state));
                setOnlineUsers(onlineIds);
            })
            .subscribe(async (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [ticketId, user]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (showListMenu && !(event.target as Element).closest('.list-menu-container')) {
                setShowListMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showListMenu]);

    const fetchTicket = async () => {
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    *,
                    requester:requester_id(full_name, email, avatar_url, role),
                    attendant:assigned_to(full_name, email, avatar_url, role),
                    locations(name),
                    ticket_assignments(user_id, assigned_at, user:users(id, full_name, email, avatar_url, role))
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
                    author:user_id(full_name, email, avatar_url, role)
                `)
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const uploadFile = async (file: File) => {
        if (!ticketId) return;
        try {
            setUploadingImage(true);
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `ticket_${ticketId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            const { error: commentError } = await supabase
                .from('ticket_comments')
                .insert([{
                    ticket_id: ticketId,
                    user_id: user?.id,
                    content: `![imagen](${publicUrl})`
                }]);

            if (commentError) throw commentError;
            fetchComments();
        } catch (error: any) {
            console.error('Error al subir imagen:', error);
            alert('No se pudo subir la imagen: ' + (error.message || 'Error desconocido'));
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await uploadFile(file);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        let hasImage = false;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) await uploadFile(file);
                hasImage = true;
                break;
            }
        }

        if (!hasImage) {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || sending) return;

        setSending(true);
        try {
            const content = editorRef.current ? htmlToMarkdown(editorRef.current.innerHTML) : '';
            if (!content.trim()) return;

            const { error } = await supabase
                .from('ticket_comments')
                .insert([{
                    ticket_id: ticketId,
                    user_id: user?.id,
                    content: content
                }]);

            if (error) throw error;
            if (editorRef.current) editorRef.current.innerHTML = '';
            setNewComment('');
            await fetchComments();
        } catch (error) {
            console.error('Error al enviar comentario:', error);
        } finally {
            setSending(false);
        }
    };

    // Funciones para emojis y formato
    const commonEmojis = [
        '😀', '😊', '😂', '❤️', '👍', '👎', '🎉', '🔥', '💯', '✅',
        '❌', '🚀', '💪', '🙏', '👏', '🤝', '💡', '⚡', '🌟', '✨',
        '😎', '🤔', '😅', '🤗', '🎯', '💎', '🏆', '🌈', '🎨', '📌',
        '🔔', '📢', '📝', '📋', '🔧', '⚙️', '🎯', '📊', '📈', '📉',
        '⭐', '🌟', '💫', '🌙', '☀️', '🌺', '🦁', '🐧', '🦊', '🐼'
    ];

    const editorRef = useRef<HTMLDivElement>(null);

    const addEmoji = (emoji: string) => {
        if (!editorRef.current) return;

        // Enfocar el editor antes de insertar
        editorRef.current.focus();

        // Insertar el emoji en la posición del cursor
        document.execCommand('insertText', false, emoji);

        // Actualizar el estado manualmente ya que execCommand no dispara onInput siempre
        setNewComment(editorRef.current.innerText);

        setShowEmojiPicker(false);
    };

    const updateActiveFormats = () => {
        const formats = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
        setActiveFormats(formats.filter(f => document.queryCommandState(f)));
    };

    const toggleFormat = (command: string) => {
        document.execCommand(command, false);
        updateActiveFormats();
        if (editorRef.current) editorRef.current.focus();
    };


    const htmlToMarkdown = (html: string) => {
        let text = html
            // Listas
            .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (_match: string, content: string) => {
                return content.replace(/<li[^>]*>(.*?)<\/li>/g, (_liMatch: string, liContent: string) => `• ${liContent}\n`);
            })
            .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (_match: string, content: string) => {
                let index = 1;
                return content.replace(/<li[^>]*>(.*?)<\/li>/g, (_liMatch: string, liContent: string) => `${index++}. ${liContent}\n`);
            })
            // Formatos de texto
            .replace(/<b>(.*?)<\/b>/g, '**$1**')
            .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
            .replace(/<i>(.*?)<\/i>/g, '_$1_')
            .replace(/<em>(.*?)<\/em>/g, '_$1_')
            .replace(/<u>(.*?)<\/u>/g, '__$1__')
            .replace(/<strike>(.*?)<\/strike>/g, '~~$1~~')
            .replace(/<del>(.*?)<\/del>/g, '~~$1~~')
            // Saltos y bloques
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<div>(.*?)<\/div>/g, '\n$1')
            .replace(/&nbsp;/g, ' ')
            // Limpiar tags restantes
            .replace(/<[^>]*>/g, '');

        return text.trim();
    };

    // Función mejorada para renderizar markdown
    const renderMarkdown = (text: string) => {
        return text
            // Formatos de texto
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // **negrita**
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // *cursiva*
            .replace(/__(.*?)__/g, '<u>$1</u>') // __subrayado__
            .replace(/~~(.*?)~~/g, '<del>$1</del>') // ~~tachado~~
            .replace(/==(.*?)==/g, '<mark>$1</mark>') // ==destacado==

            // Código
            .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>') // `código`
            .replace(/```(.*?)```/gs, '<pre class="code-block"><code>$1</code></pre>') // ```código```

            // Citas
            .replace(/^> (.*?)$/gm, '<blockquote class="quote">$1</blockquote>') // > cita

            // Encabezados
            .replace(/^# (.*?)$/gm, '<h1 class="title">$1</h1>') // # Título
            .replace(/^## (.*?)$/gm, '<h2 class="subtitle">$1</h2>') // ## Subtítulo

            // Listas
            .replace(/^• (.*?)$/gm, '<li class="bullet-item">$1</li>') // • lista
            .replace(/^\d+\. (.*?)$/gm, '<li class="numbered-item">$1</li>') // 1. lista numerada
            .replace(/^-\s*\[\s*\] (.*?)$/gm, '<li class="checklist-item">☐ $1</li>') // - [ ] checklist
            .replace(/^-\s*\[x\] (.*?)$/gm, '<li class="checklist-item">☑ $1</li>') // - [x] checklist completado

            // Imágenes
            .replace(/!\[imagen\]\((.*?)\)/g, '<img src="$1" alt="Adjunto" class="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity mt-2" onclick="window.open(\'$1\', \'_blank\')" />')

            // Envolver listas
            .replace(/(<li class="bullet-item">.*<\/li>)/gs, '<ul class="bullet-list">$1</ul>')
            .replace(/(<li class="numbered-item">.*<\/li>)/gs, '<ol class="numbered-list">$1</ol>')
            .replace(/(<li class="checklist-item">.*<\/li>)/gs, '<ul class="checklist">$1</ul>')

            .replace(/\n/g, '<br>'); // saltos de línea
    };


    const handleDeleteTicket = async () => {
        const now = new Date();
        const createdDate = new Date(ticket.created_at);
        const minutesDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60);
        const isOwner = user?.id === ticket.requester_id;
        const isStaff = user?.role === 'super_admin' || user?.role === 'sistemas' || user?.role === 'gerencia' || user?.role === 'supervisores';
        const canDelete = isStaff || (isOwner && minutesDiff <= 3);

        if (!canDelete) {
            alert(isOwner ? 'Tiempo agotado (3 min).' : 'Acceso Denegado.');
            return;
        }

        if (!confirm('¿Eliminar ticket?')) return;

        try {
            setStatusUpdating(true);
            // Limpiar archivos adjuntos antes de eliminar el ticket
            const { data: files } = await supabase.storage.from('chat-attachments').list(`ticket_${ticketId}`);
            if (files && files.length > 0) {
                await supabase.storage.from('chat-attachments').remove(
                    files.map((f: any) => `ticket_${ticketId}/${f.name}`)
                );
            }

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

        if (!canManageStatus) {
            return;
        }

        if (statusUpdating) {
            return;
        }

        try {
            setStatusUpdating(true);

            const updatePayload: any = { status: newStatus };

            if (newStatus === 'in_progress') {
                updatePayload.assigned_to = user?.id;
                updatePayload.attended_at = new Date().toISOString();
            } else if (newStatus === 'resolved') {
                updatePayload.resolved_at = new Date().toISOString();
            } else if (newStatus === 'closed') {
                updatePayload.closed_at = new Date().toISOString();
            }


            const { error } = await supabase.from('tickets').update(updatePayload).eq('id', ticketId);

            if (error) {
                throw error;
            }

            // Enviar notificaciones según el nuevo estado
            if (newStatus === 'resolved') {
                await notifyTicketResolved(
                    ticketId || '',
                    ticket.title || '',
                    user?.id || '',
                    user?.full_name || '',
                    ticket.locations?.name || 'Sin ubicación'
                );
            } else if (newStatus === 'closed') {
                await notifyTicketClosed(
                    ticketId || '',
                    ticket.title || '',
                    user?.id || '',
                    user?.full_name || '',
                    ticket.locations?.name || 'Sin ubicación'
                );
            }

            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `Cambió el estado a: **${getStatusLabel(newStatus).toUpperCase()}**`,
            }]);

            fetchComments();
        } catch (error) {
            alert('Error al actualizar el estado: ' + (error as any)?.message || 'Error desconocido');
        } finally {
            setStatusUpdating(false);
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
        }
    };

    const canManageStatus = user?.role === 'super_admin' || user?.role === 'sistemas' || user?.role === 'gerencia' || user?.role === 'supervisores' || user?.role === 'administradores' || user?.role === 'personalizado';

    const handleAttendTicket = async () => {
        if (!canAttendTicket || statusUpdating) {
            return;
        }

        if (!confirm('¿Está seguro de atender este ticket? Se le asignará como técnico responsable.')) {
            return;
        }

        try {
            setStatusUpdating(true);

            // Actualizar a en_progreso y asignar como técnico responsable
            const { error } = await supabase.from('tickets').update({
                status: 'in_progress',
                assigned_to: user?.id,
                attended_at: new Date().toISOString()
            }).eq('id', ticketId);

            if (error) {
                throw error;
            }

            // Enviar notificación de ticket atendido
            await notifyTicketAttended(
                ticketId || '',
                ticket.title || '',
                user?.id || '',
                user?.full_name || '',
                ticket.locations?.name || ''
            );

            // Agregar comentario de atención
            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `**ATENDIENDO**: Ticket atendido y asignado a ${user?.full_name}`,
            }]);

            fetchComments();
        } catch (error) {
            alert('Error al atender ticket: ' + (error as any)?.message || 'Error desconocido');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleJoinTicket = async () => {

        if (!canManageStatus || !ticket) {
            return;
        }

        // Verificar si ya está asignado (evitar duplicados)
        const isAlreadyAssigned = ticket.ticket_assignments?.some((assignment: any) => assignment.user_id === user?.id);

        if (isAlreadyAssigned) {
            alert('Ya estás asignado a este ticket');
            return;
        }

        // Verificar límite de 4 personas
        const currentAssignments = ticket.ticket_assignments?.length || 0;

        if (currentAssignments >= 4) {
            alert('Máximo de 4 personas asignadas a este ticket');
            return;
        }

        try {

            const { error } = await supabase
                .from('ticket_assignments')
                .insert([{
                    ticket_id: ticketId,
                    user_id: user?.id,
                    assigned_at: new Date().toISOString()
                }]);

            if (error) {
                throw error;
            }


            // No cambiar estado automáticamente - solo participar sin atender

            // Agregar notificación de unión al chat
            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `**${user?.full_name || 'Un usuario'}** se ha unido al ticket.`
            }]);

            // Actualizar el ticket para reflejar los cambios
            await fetchTicket();

        } catch (error) {
        }
    };

    const getAssignedUsers = () => {

        if (!ticket?.ticket_assignments) {
            return [];
        }

        const result = ticket.ticket_assignments.map((assignment: any) => {
            return {
                ...assignment,
                user: assignment.user || {
                    id: assignment.user_id,
                    full_name: 'Usuario',
                    email: '',
                    avatar_url: null
                },
                isCurrentUser: assignment.user_id === user?.id
            };
        });

        return result;
    };

    const handleFinalizeTicket = async () => {
        if (!canManageStatus || statusUpdating) {
            return;
        }

        try {
            setStatusUpdating(true);

            // Actualizar directamente a archivado con timestamp
            const { error } = await supabase.from('tickets').update({
                status: 'archived',
                closed_at: new Date().toISOString()
            }).eq('id', ticketId);

            if (error) {
                throw error;
            }

            // Agregar comentario de finalización
            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `**FINALIZADO**: Ticket finalizado y archivado manualmente por ${user?.full_name}`,
            }]);

            setShowFinalizeConfirm(false);
            alert('¡El ticket fue cerrado correctamente! Puedes verlo en el apartado de historial de tickets :D');
            navigate('/tickets');
        } catch (error) {
            alert('Error al finalizar ticket: ' + (error as any)?.message || 'Error desconocido');
        } finally {
            setStatusUpdating(false);
        }
    };

    // Verificar si el usuario está asignado al ticket
    const isUserAssigned = getAssignedUsers().some((u: any) => u.isCurrentUser);
    const canFinalizeTicket = canManageStatus && ticket?.status !== 'archived';

    // Permitir unirse si el ticket está abierto o en progreso
    const hasPermission = canManageStatus;
    const isOpen = ticket?.status === 'open' || ticket?.status === 'in_progress';
    const hasSpace = getAssignedUsers().length < 4;
    const canJoinTicket = hasPermission && isOpen && hasSpace;


    // Auto-unir al ticket si es el creador y no está asignado
    useEffect(() => {

        if (ticket && user && !isUserAssigned && user.id === ticket.requester_id && canJoinTicket) {
            handleJoinTicket();
        } else {
        }
    }, [ticket, user, isUserAssigned, canJoinTicket]);

    const getRoleIcon = (role: string, size: number = 14) => {
        switch (role) {
            case 'super_admin': return <Terminal size={size} />;
            case 'sistemas': return <Monitor size={size} />;
            case 'gerencia': return <Briefcase size={size} />;
            case 'supervisores': return <Eye size={size} />;
            default: return <User size={size} />;
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open': return <Clock size={14} />;
            case 'in_progress': return <Activity size={14} className="animate-pulse" />;
            case 'resolved': return <CheckCircle2 size={14} />;
            case 'closed': return <XCircle size={14} />;
            default: return <Clock size={14} />;
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

    // Funciones para edición inline
    const startEditing = (field: string, currentValue: any) => {
        setEditingField(field);
        setEditValues({ ...editValues, [field]: currentValue });
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setEditingField(null);
        setEditValues({});
        setIsEditing(false);
    };

    const saveEdit = async (field: string) => {
        if (!ticket) return;
        
        try {
            setEditLoading(true);
            
            const updateData: any = { [field]: editValues[field] };
            updateData.updated_at = new Date().toISOString();
            
            const { error } = await supabase
                .from('tickets')
                .update(updateData)
                .eq('id', ticketId);
            
            if (error) throw error;
            
            // Agregar comentario de edición
            await supabase.from('ticket_comments').insert([{
                ticket_id: ticketId,
                user_id: user?.id,
                content: `**EDICIÓN**: Campo "${field}" actualizado por ${user?.full_name || 'un usuario'}`
            }]);
            
            // Actualizar ticket localmente
            setTicket({ ...ticket, ...updateData });
            fetchComments();
            cancelEditing();
            
        } catch (error) {
            console.error('Error al guardar edición:', error);
            alert('Error al guardar los cambios');
        } finally {
            setEditLoading(false);
        }
    };

    const handleEditChange = (field: string, value: any) => {
        setEditValues({ ...editValues, [field]: value });
    };

    // Componente de campo editable
    const EditableField = ({ 
        field, 
        value, 
        type = 'text', 
        className = '', 
        placeholder = '',
        multiline = false 
    }: {
        field: string;
        value: any;
        type?: string;
        className?: string;
        placeholder?: string;
        multiline?: boolean;
    }) => {
        const isCurrentlyEditing = editingField === field;
        const canEdit = user?.role === 'super_admin' || user?.role === 'sistemas' || user?.role === 'gerencia' || user?.role === 'supervisores';
        
        if (!canEdit) {
            return multiline ? (
                <p className={className}>{value || placeholder}</p>
            ) : (
                <span className={className}>{value || placeholder}</span>
            );
        }
        
        if (isCurrentlyEditing) {
            return multiline ? (
                <textarea
                    value={editValues[field] || ''}
                    onChange={(e) => handleEditChange(field, e.target.value)}
                    className={`w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
                    placeholder={placeholder}
                    rows={3}
                    autoFocus
                />
            ) : (
                <input
                    type={type}
                    value={editValues[field] || ''}
                    onChange={(e) => handleEditChange(field, e.target.value)}
                    className={`w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
                    placeholder={placeholder}
                    autoFocus
                />
            );
        }
        
        return multiline ? (
            <div 
                className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors ${className}`}
                onClick={() => startEditing(field, value)}
                title="Click para editar"
            >
                <p className="m-0">{value || placeholder}</p>
            </div>
        ) : (
            <span 
                className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors ${className}`}
                onClick={() => startEditing(field, value)}
                title="Click para editar"
            >
                {value || placeholder}
            </span>
        );
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
        <div className="h-screen bg-white flex flex-col overflow-hidden font-sans">
            <style>{`
                .inline-code { background-color: rgba(0, 0, 0, 0.1); padding: 2px 6px; font-family: 'Courier New', monospace; font-size: 0.9em; }
                .code-block { background-color: rgba(0, 0, 0, 0.05); padding: 12px; border-left: 4px solid #002855; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto; margin: 8px 0; }
                .quote { border-left: 3px solid #e5e7eb; padding-left: 12px; margin: 8px 0; font-style: italic; color: #6b7280; }
                .title { font-size: 1.2em; font-weight: 900; margin: 16px 0 8px 0; color: #002855; text-transform: uppercase; }
                .subtitle { font-size: 1.1em; font-weight: 900; margin: 12px 0 6px 0; color: #002855; text-transform: uppercase; }
                .bullet-list, .numbered-list, .checklist { margin: 8px 0; padding-left: 20px; }
                .bullet-item, .numbered-item, .checklist-item { margin: 4px 0; line-height: 1.5; }
                .checklist-item { list-style: none; }
                mark { background-color: #fef3c7; padding: 1px 2px; }
                b, strong { font-weight: 900 !important; color: inherit; }
            `}</style>

            {/* Header Fijo */}
            <div className="flex-none bg-[#002855] px-6 py-4 flex items-center justify-between shadow-sm z-50">
                <div className="flex items-center gap-3 text-[14px] font-black uppercase tracking-widest text-slate-300">
                    <button onClick={() => navigate('/tickets')} className="hover:text-white transition-colors flex items-center gap-1">
                        <ArrowLeft size={18} /> Mesa de Ayuda
                    </button>
                    <span className="text-slate-500">/</span>
                    <span className="text-white">Ticket #{ticket.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-2 py-1 text-[10px] rounded-none font-black uppercase border ${getPriorityStyle(ticket.priority)}`}>
                        {getPriorityLabel(ticket.priority)}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                {/* Left side: Ticket Details */}
                <div className="w-full lg:w-[320px] xl:w-[350px] flex-none border-r border-slate-200 bg-slate-50 overflow-y-auto max-h-[40vh] lg:max-h-full">
                    <div className="p-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-[#002855] leading-tight mb-6 uppercase">
                                <EditableField 
                                    field="title" 
                                    value={ticket.title} 
                                    className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                    placeholder="Título del ticket"
                                />
                            </h2>
                            {editingField === 'title' && (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => saveEdit('title')}
                                        disabled={editLoading}
                                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {editLoading ? '...' : '✓'}
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                    >
                                        ✗
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* Detalle Inicial */}
                            <div>
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2 mb-3">Detalle Inicial</span>
                                <div className="space-y-2">
                                    <EditableField 
                                        field="description" 
                                        value={ticket.description} 
                                        multiline={true}
                                        className="text-[14px] text-slate-700 leading-relaxed font-medium"
                                        placeholder="Describe el problema..."
                                    />
                                    {editingField === 'description' && (
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={() => saveEdit('description')}
                                                disabled={editLoading}
                                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                            >
                                                {editLoading ? 'Guardando...' : 'Guardar'}
                                            </button>
                                            <button
                                                onClick={cancelEditing}
                                                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Anydesk */}
                            <div>
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2 mb-3">Acceso Remoto</span>
                                <div className="space-y-3">
                                    {/* AnyDesk ID */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-900">
                                                AnyDesk: 
                                                <EditableField 
                                                    field="anydesk_id" 
                                                    value={ticket.anydesk_id} 
                                                    className="text-slate-600 font-normal ml-1"
                                                    placeholder="ID de AnyDesk"
                                                />
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {ticket.anydesk_id && (
                                                <button
                                                    onClick={() => handleCopy(ticket.anydesk_id, 'anydesk')}
                                                    className="w-6 h-6 rounded-none bg-white border border-slate-200 text-slate-600 hover:text-[#002855] hover:border-[#002855] transition-all flex items-center justify-center"
                                                >
                                                    {copiedItem === 'anydesk' ? <div className="w-2 h-2 bg-green-500 rounded-none shrink-0" /> : <Copy size={12} />}
                                                </button>
                                            )}
                                            {editingField === 'anydesk_id' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => saveEdit('anydesk_id')}
                                                        disabled={editLoading}
                                                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                    >
                                                        ✗
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contraseña */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-900">
                                                Pass: 
                                                <EditableField 
                                                    field="anydesk_password" 
                                                    value={ticket.anydesk_password || ''} 
                                                    type="password"
                                                    className="text-slate-600 font-normal ml-1"
                                                    placeholder="Contraseña"
                                                />
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {ticket.anydesk_password && (
                                                <button
                                                    onClick={() => handleCopy(ticket.anydesk_password, 'password')}
                                                    className="w-6 h-6 rounded-none bg-white border border-slate-200 text-slate-600 hover:text-[#002855] hover:border-[#002855] transition-all flex items-center justify-center"
                                                >
                                                    {copiedItem === 'password' ? <div className="w-2 h-2 bg-green-500 rounded-none shrink-0" /> : <Copy size={12} />}
                                                </button>
                                            )}
                                            {editingField === 'anydesk_password' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => saveEdit('anydesk_password')}
                                                        disabled={editLoading}
                                                        className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                    >
                                                        ✗
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Gestión de Estado */}
                            <div>
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2 mb-3">Gestión de Estado</span>
                                {ticket?.status === 'archived' ? (
                                    <div className="text-center py-4 bg-white border border-slate-200 p-4">
                                        <Lock size={18} className="text-slate-400 mx-auto mb-2" />
                                        <h3 className="text-[15px] font-black text-slate-700 uppercase mb-1">Bloqueado</h3>
                                        <p className="text-[12px] text-slate-500 uppercase tracking-wider">Ticket archivado.</p>
                                    </div>
                                ) : isTicketCreator ? (
                                    // Vista informativa
                                    <div className="space-y-2">
                                        {['open', 'in_progress', 'resolved', 'closed'].map(st => (
                                            <div
                                                key={st}
                                                className={`w-full px-4 py-2.5 rounded-none text-[12px] font-black uppercase tracking-widest flex items-center justify-between border ${ticket.status === st
                                                    ? 'bg-[#002855] text-white border-[#002855]'
                                                    : 'bg-white text-slate-400 border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(st)}
                                                    <span>{getStatusLabel(st)}</span>
                                                </div>
                                                {ticket.status === st && <div className="w-1.5 h-1.5 bg-white rounded-none" />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Vista funcional
                                    <div className="space-y-2 mb-4">
                                        {['open', 'in_progress', 'resolved', 'closed'].map(st => (
                                            <button
                                                key={st}
                                                onClick={() => handleStatusUpdate(st)}
                                                disabled={!canManageStatus || statusUpdating}
                                                className={`w-full px-4 py-2.5 rounded-none text-[12px] font-black uppercase tracking-widest flex items-center justify-between border transition-colors ${ticket.status === st
                                                    ? 'bg-[#002855] text-white border-[#002855]'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#002855] disabled:opacity-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(st)}
                                                    <span>{statusUpdating && ticket.status === st ? '...' : getStatusLabel(st)}</span>
                                                </div>
                                                {ticket.status === st && <div className="w-1.5 h-1.5 bg-white rounded-none animate-pulse" />}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {canReopenTicket && isWithinReopenWindow && (
                                    <div className="mt-4 p-3 bg-white border border-slate-200 rounded-none">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Reapertura</span>
                                            <span className="text-[9px] font-black text-[#002855]">{10 - timeSinceClosed}m</span>
                                        </div>
                                        <button onClick={handleReopenTicket} disabled={statusUpdating} className="w-full py-2 bg-[#002855] text-white rounded-none text-[10px] font-black uppercase tracking-widest flex justify-center border border-[#002855] hover:bg-white hover:text-[#002855] transition-colors">
                                            Reabrir
                                        </button>
                                    </div>
                                )}

                                {canFinalizeTicket && (
                                    <div className="mt-6">
                                        <button onClick={() => setShowFinalizeConfirm(true)} disabled={statusUpdating} className="w-full py-3 bg-rose-600 text-white rounded-none text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors border border-rose-600">
                                            <AlertCircle size={14} /> Finalizar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: Chat */}
                <div className="flex-1 flex flex-col bg-white border-r border-slate-200 min-w-0 min-h-0">
                    <div className="flex-none px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-none bg-[#002855] text-white flex items-center justify-center">
                                <IoChatbubbles size={16} />
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-[15px] font-black text-[#002855] uppercase tracking-[0.2em]">Canal de Seguimiento</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-none animate-pulse" />
                                    <span className="text-[11px] text-green-600 font-black uppercase tracking-widest">Sincronización Activa</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {shouldShowWhatsApp() && (
                                <button onClick={handleWhatsAppContact} className="w-8 h-8 rounded-none bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center">
                                    <FaWhatsapp size={14} />
                                </button>
                            )}
                            <button onClick={handleDeleteTicket} className="w-8 h-8 rounded-none bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-600 transition-colors flex items-center justify-center">
                                <FaTrashAlt size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                        {isUserAssigned ? (
                            <>
                                {comments.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                        <MessageSquare size={40} className="mb-4 opacity-10" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No hay registros en el log</p>
                                    </div>
                                ) : comments.map((c) => {
                                    const isMe = c.user_id === user?.id;
                                    const isSystem = c.content.includes('Cambió el estado') ||
                                        c.content.includes('ATENDIENDO') ||
                                        c.content.includes('FINALIZADO') ||
                                        c.content.includes('REAPERTURA') ||
                                        c.content.includes('se ha unido al ticket') ||
                                        c.content.includes('asignado a');

                                    if (isSystem) {
                                        return (
                                            <div key={c.id} className="flex flex-col items-center my-2">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="h-px w-8 bg-slate-200" />
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Registro de Sistema</span>
                                                    <div className="h-px w-8 bg-slate-200" />
                                                </div>
                                                <div className="bg-white px-4 py-2 border border-slate-200 shadow-sm flex items-center gap-3 relative overflow-hidden group">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#002855]" />
                                                    <div className="w-1.5 h-1.5 bg-[#002855] rounded-none shrink-0" />
                                                    <span className="text-[10px] font-black text-[#002855] uppercase tracking-widest leading-none">
                                                        {c.content.replace(/\*\*/g, '')}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                                                    {new Date(c.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-8 h-8 flex-none rounded-none overflow-hidden border ${isMe ? 'bg-[#002855] border-[#002855]' : 'bg-slate-200 border-slate-300'}`}>
                                                {c.author?.avatar_url ? (
                                                    <img src={c.author.avatar_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center ${isMe ? 'text-white' : 'text-slate-500'}`}>
                                                        {getRoleIcon(c.author?.role, 14)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[90%] lg:max-w-[85%]`}>
                                                <div className={`px-4 py-3 border shadow-sm ${isMe ? 'bg-[#002855] border-[#002855] text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                                                    <p className="text-[14px] leading-relaxed font-medium break-words overflow-hidden" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.content) }} />
                                                    <div className={`text-[8px] mt-2 font-black uppercase tracking-widest ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                                                        {new Date(c.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Lock size={40} className="mb-4 opacity-10" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Acceso Restringido</p>
                                <p className="text-[9px] font-black uppercase tracking-widest mt-2">{canJoinTicket ? 'Inicie sesión en el ticket para visualizar' : 'No tiene permisos para este canal'}</p>
                            </div>
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    <div className="flex-none p-4 lg:p-6 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-20">
                        {ticket?.status === 'archived' ? (
                            <div className="text-center py-2">
                                <p className="text-[14px] font-black text-rose-600 uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Lock size={16} /> Archivo Histórico (Solo Lectura)
                                </p>
                            </div>
                        ) : !isUserAssigned ? (
                            <div className="text-center py-2">
                                <button onClick={handleJoinTicket} className="px-8 py-3 bg-[#002855] text-white text-[14px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg border border-[#002855] flex items-center gap-2 mx-auto">
                                    <MessageSquare size={18} /> Ingresar al Ticket
                                </button>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto w-full">
                                {/* Barra de Herramientas Superior */}
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex flex-wrap items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleFormat('bold')}
                                            className={`w-9 h-9 flex items-center justify-center transition-all ${activeFormats.includes('bold') ? 'bg-[#002855] text-white shadow-inner' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                                            title="Negrita (Ctrl+B)"
                                        >
                                            <Bold size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleFormat('italic')}
                                            className={`w-9 h-9 flex items-center justify-center transition-all ${activeFormats.includes('italic') ? 'bg-[#002855] text-white shadow-inner' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                                            title="Cursiva (Ctrl+I)"
                                        >
                                            <Italic size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleFormat('underline')}
                                            className={`w-9 h-9 flex items-center justify-center transition-all ${activeFormats.includes('underline') ? 'bg-[#002855] text-white shadow-inner' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                                            title="Subrayado (Ctrl+U)"
                                        >
                                            <Underline size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => toggleFormat('strikeThrough')}
                                            className={`w-9 h-9 flex items-center justify-center transition-all ${activeFormats.includes('strikeThrough') ? 'bg-[#002855] text-white shadow-inner' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                                            title="Tachado"
                                        >
                                            <Strikethrough size={16} />
                                        </button>

                                        <div className="w-px h-5 bg-slate-200 mx-1" />

                                        <div className="relative list-menu-container">
                                            <button
                                                type="button"
                                                onClick={() => setShowListMenu(!showListMenu)}
                                                className={`w-9 h-9 flex items-center justify-center transition-all ${(activeFormats.includes('insertUnorderedList') || activeFormats.includes('insertOrderedList') || showListMenu) ? 'bg-[#002855] text-white shadow-inner' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                                                title="Opciones de Lista"
                                            >
                                                <List size={16} />
                                            </button>

                                            {showListMenu && (
                                                <div className="absolute bottom-full left-0 mb-2 bg-white border-2 border-[#002855] shadow-2xl p-1 z-[110] w-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => { toggleFormat('insertUnorderedList'); setShowListMenu(false); }}
                                                        className="w-full px-3 py-2 text-[10px] font-black uppercase flex items-center gap-3 hover:bg-slate-50 text-slate-600"
                                                    >
                                                        <List size={14} className="text-slate-400" />
                                                        <span>Viñetas</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { toggleFormat('insertOrderedList'); setShowListMenu(false); }}
                                                        className="w-full px-3 py-2 text-[10px] font-black uppercase flex items-center gap-3 hover:bg-slate-50 text-slate-600 border-t border-slate-100"
                                                    >
                                                        <div className="font-black text-[10px] text-slate-400">1.</div>
                                                        <span>Numerada</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-px h-5 bg-slate-200 mx-1" />

                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className={`w-9 h-9 flex items-center justify-center transition-all ${showEmojiPicker ? 'bg-[#002855] text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent hover:border-slate-200'}`}
                                            title="Insertar Emoji"
                                        >
                                            <Smile size={16} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="h-9 px-3 flex items-center gap-2 text-slate-400 hover:bg-slate-100 hover:text-[#002855] border border-transparent hover:border-slate-200 transition-all"
                                            title="Adjuntar Imagen"
                                        >
                                            {uploadingImage ? <Loader2 size={16} className="animate-spin text-[#002855]" /> : <ImageIcon size={16} />}
                                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Imagen</span>
                                        </button>
                                    </div>

                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Registrar Avance</span>
                                </div>

                                {/* Contenedor de Escritura */}
                                <div className="relative flex items-end gap-3">
                                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />

                                    <div className="flex-1 relative bg-white">
                                        {/* Placeholder Real */}
                                        {!newComment.trim() && (
                                            <div className="absolute inset-0 px-5 py-4 text-slate-300 pointer-events-none text-[14px] font-medium select-none uppercase tracking-wider">
                                                Escribe aquí tu mensaje...
                                            </div>
                                        )}

                                        <div
                                            ref={editorRef}
                                            contentEditable={!sending}
                                            onPaste={handlePaste}
                                            onInput={() => {
                                                if (editorRef.current) {
                                                    setNewComment(editorRef.current.innerText);
                                                }
                                            }}
                                            onKeyUp={updateActiveFormats}
                                            onClick={updateActiveFormats}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleCommentSubmit(e);
                                                }
                                                // Atajos de teclado para formato
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                                                    e.preventDefault();
                                                    toggleFormat('bold');
                                                }
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                                                    e.preventDefault();
                                                    toggleFormat('italic');
                                                }
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                                                    e.preventDefault();
                                                    toggleFormat('underline');
                                                }
                                            }}
                                            className="w-full px-5 py-4 bg-transparent border-2 border-slate-200 rounded-none focus:outline-none focus:border-[#002855] text-[14px] font-medium transition-all min-h-[56px] max-h-[300px] overflow-y-auto block custom-scrollbar relative z-10"
                                        />

                                        {/* Pickers Absolutos */}
                                        {showEmojiPicker && (
                                            <div className="absolute bottom-full left-0 mb-4 bg-white border-2 border-[#002855] shadow-2xl p-4 z-[100] w-[300px]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emojis Frecuentes</span>
                                                    <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-rose-600 font-bold">×</button>
                                                </div>
                                                <div className="grid grid-cols-7 gap-2">
                                                    {commonEmojis.slice(0, 35).map((emoji, i) => (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()} // Evita pérdida de foco
                                                            onClick={() => addEmoji(emoji)}
                                                            className="text-xl hover:scale-125 transition-transform p-1"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleCommentSubmit}
                                        disabled={sending || !newComment.trim()}
                                        className="w-14 h-14 bg-[#002855] text-white border-2 border-[#002855] flex items-center justify-center hover:bg-white hover:text-[#002855] transition-all active:scale-90 shadow-xl disabled:opacity-50 disabled:grayscale shrink-0"
                                        title="Enviar Mensaje"
                                    >
                                        {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: People Info */}
                <div className="w-full lg:w-[280px] xl:w-[300px] flex-none bg-slate-50 overflow-y-auto max-h-[40vh] lg:max-h-full border-t lg:border-t-0 border-slate-200">
                    <div className="p-6 space-y-8">
                        {/* Participantes */}
                        <div>
                            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2 mb-4">Participantes</span>
                            <div className="space-y-4">
                                {/* Solicitante */}
                                <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 shadow-sm">
                                    <div className="w-12 h-12 bg-slate-200 border border-slate-300 rounded-none overflow-hidden flex-none">
                                        {ticket.requester?.avatar_url ? <img src={ticket.requester.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500">{getRoleIcon(ticket.requester?.role, 18)}</div>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black text-[#002855] uppercase truncate">
                                            {ticket.requester?.full_name} {ticket.requester_id === user?.id && <span className="opacity-50 text-[9px] ml-1">(YO)</span>}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={onlineUsers.has(ticket.requester_id) ? 'text-emerald-500' : 'text-slate-400'}>
                                                {getRoleIcon(ticket.requester?.role, 14)}
                                            </div>
                                            {onlineUsers.has(ticket.requester_id) ? (
                                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                    En Línea
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Solicitante</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Técnico Asignado Principal */}
                                {ticket.attendant && (
                                    <div className="flex items-center gap-3 p-4 bg-[#002855] shadow-lg">
                                        <div className="w-12 h-12 bg-[#002855] border border-white/20 rounded-none overflow-hidden flex-none">
                                            {ticket.attendant?.avatar_url ? <img src={ticket.attendant.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white">{getRoleIcon(ticket.attendant?.role, 18)}</div>}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black text-white uppercase truncate">
                                                {ticket.attendant?.full_name} {ticket.assigned_to === user?.id && <span className="opacity-50 text-[9px] ml-1">(YO)</span>}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={onlineUsers.has(ticket.assigned_to) ? 'text-emerald-400' : 'text-slate-300'}>
                                                    {getRoleIcon(ticket.attendant?.role, 14)}
                                                </div>
                                                {onlineUsers.has(ticket.assigned_to) ? (
                                                    <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-400 tracking-widest">
                                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                                        En Línea
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Responsable</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Atender Ticket Button */}
                                {canAttendTicket && (
                                    <button onClick={handleAttendTicket} disabled={statusUpdating} className="w-full py-2 bg-[#002855] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors border border-[#002855]">
                                        Asignar a mí
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Equipo de Soporte */}
                        {getAssignedUsers().length > 0 && (
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2 mb-4">Personal en Sitio</span>
                                <div className="space-y-2">
                                    {getAssignedUsers().map((assignment: any) => (
                                        <div key={assignment.user_id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 shadow-sm">
                                            <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-none overflow-hidden flex-none">
                                                {assignment.user?.avatar_url ? <img src={assignment.user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400">{getRoleIcon(assignment.user?.role, 16)}</div>}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-tight">
                                                    {assignment.user?.full_name} {assignment.user_id === user?.id && <span className="text-[#002855] opacity-50 text-[8px] ml-1">(YO)</span>}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className={onlineUsers.has(assignment.user_id) ? 'text-emerald-500' : 'text-slate-400'}>
                                                        {getRoleIcon(assignment.user?.role, 14)}
                                                    </div>
                                                    {onlineUsers.has(assignment.user_id) && (
                                                        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500 tracking-widest">
                                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                            En Línea
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cronología */}
                        <div className="pt-4 border-t border-slate-200">
                            <div className="bg-white border border-slate-200 p-4">
                                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center font-mono">Referencia Temporal</p>
                                <p className="text-[17px] font-black text-[#002855] text-center mb-1">
                                    {(() => {
                                        const now = new Date();
                                        const created = new Date(ticket.created_at);
                                        const diffMs = now.getTime() - created.getTime();
                                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                        const diffDays = Math.floor(diffHours / 24);
                                        if (diffDays > 0) return `${diffDays}D ${diffHours % 24}H`;
                                        else if (diffHours > 0) return `${diffHours}H ${Math.floor((diffMs / (1000 * 60)) % 60)}M`;
                                        else return `${Math.floor(diffMs / (1000 * 60))} MIN`;
                                    })()}
                                </p>
                                <p className="text-[12px] text-slate-500 font-bold uppercase text-center">{new Date(ticket.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modals (Standardized) */}
            {showFinalizeConfirm && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-none border-2 border-[#002855] shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-none bg-rose-100 flex items-center justify-center text-rose-600">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest">Finalizar Ciclo</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">Acción irreversible en DB</p>
                            </div>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 p-4 mb-6">
                            <p className="text-[10px] text-rose-800 font-bold uppercase leading-relaxed">
                                El ticket será marcado como ARCHIVADO. No se admitirán nuevos registros ni cambios de estado.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowFinalizeConfirm(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button onClick={handleFinalizeTicket} disabled={statusUpdating} className="flex-1 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest border border-rose-600 hover:bg-rose-700 transition-colors shadow-lg">Finalizar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
