import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../../app/providers/AuthContext';
import { useNotify } from './useNotify';

// Mantenemos un único AudioContext para notificaciones de chat
let _chatAudioCtx: AudioContext | null = null;
const getChatAudioContext = (): AudioContext => {
  if (!_chatAudioCtx) {
    _chatAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _chatAudioCtx;
};

const playChatSound = () => {
  try {
    const ctx = getChatAudioContext();
    const fire = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(fire).catch(() => {});
    } else {
      fire();
    }
  } catch (err) {
    console.warn('Audio play failed', err);
  }
};

export function useChatNotifications() {
  const { user } = useAuth();
  const { toast } = useNotify();

  useEffect(() => {
    if (!user) return;

    // Cache de IDs de tickets del usuario para evitar consultar la BD en CADA comentario global
    const myTicketIds = new Set<string>();

    const fetchMyTickets = async () => {
      const { data } = await supabase
        .from('tickets')
        .select('id')
        .or(`requester_id.eq.${user.id},assigned_to.eq.${user.id}`);
      
      if (data) {
        data.forEach(t => myTicketIds.add(t.id));
      }
    };
    
    fetchMyTickets();

    // Desbloquear audio al hacer click en la app
    const unlockAudio = () => {
        try {
            getChatAudioContext().resume();
            document.removeEventListener('click', unlockAudio);
        } catch (e) {}
    };
    document.addEventListener('click', unlockAudio);

    // Mantener actualizado el caché de tickets si me asignan a uno nuevo o creo uno
    const ticketSub = supabase
        .channel('my-tickets-sync')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'tickets'
        }, (payload) => {
            const t = payload.new as any;
            if (t && (t.requester_id === user.id || t.assigned_to === user.id)) {
                myTicketIds.add(t.id);
            }
        }).subscribe();

    const subscription = supabase
      .channel('global-chat-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_comments',
      }, async (payload) => {
        const comment = payload.new;
        // Ignorar mis propios mensajes
        if (comment.user_id === user.id) return;

        // FILTRO SÚPER EFICIENTE: Solo hacemos la consulta a la BD si el ticket está en nuestra caché local
        if (!myTicketIds.has(comment.ticket_id)) return;

        // Verificar si este ticket me pertenece o lo estoy atendiendo
        const { data: ticket } = await supabase
            .from('tickets')
            .select('id, title, requester_id, assigned_to')
            .eq('id', comment.ticket_id)
            .single();

        if (ticket && (ticket.requester_id === user.id || ticket.assigned_to === user.id)) {
            // Obtener info del autor
            const { data: author } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', comment.user_id)
                .single();

            playChatSound();

            const isStatusChange = comment.content.includes('Cambió el estado a:');
            const authorName = author?.full_name?.split(' ')[0] || 'Alguien';

            if (isStatusChange) {
                toast(
                    comment.content.replace(/\*\*/g, ''), 
                    `🔄 Actualización de ${authorName}`
                );
            } else {
                toast(
                    comment.content.startsWith('![imagen]') ? '📷 Imagen adjunta' : comment.content,
                    `💬 Nuevo mensaje de ${authorName}`
                );
            }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      supabase.removeChannel(ticketSub);
      document.removeEventListener('click', unlockAudio);
    };
  }, [user?.id]);
}
