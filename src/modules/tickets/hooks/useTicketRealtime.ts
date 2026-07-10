// =============================================================================
// useTicketRealtime.ts — Hook para tiempo real con Supabase Realtime
// Suscripciones que maneja:
//   1. Canal "ticket-status-{id}": escucha UPDATE en la tabla 'tickets'
//      (cambios de estado, asignaciones, etc.)
//   2. Canal "comments-feed-{id}": escucha INSERT en 'ticket_comments'
//      (nuevos mensajes en el chat)
//   3. Canal "presence-ticket-{id}": rastrea qué usuarios están online
//      en el ticket actual (basado en el channel de presencia de Supabase)
// =============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';

// Props que recibe el hook
// ticketId: ID del ticket a escuchar en tiempo real
// user: Usuario actual para rastrear su presencia
// onTicketUpdate: Callback cuando el ticket se actualiza
// onCommentsUpdate: Callback cuando se agregan comentarios
export interface UseTicketRealtimeProps {
  ticketId: string | undefined;
  user?: any;
  onTicketUpdate?: () => void;
  onCommentsUpdate?: () => void;
}

// Valores que expone el hook
// onlineUsers: Set de IDs de usuarios actualmente en el ticket
// isSubscribed: Indica si está suscrito a los canales de realtime
export interface UseTicketRealtimeReturn {
  onlineUsers: Set<string>;
  isSubscribed: boolean;
}

export function useTicketRealtime({ 
  ticketId, 
  user, 
  onTicketUpdate, 
  onCommentsUpdate 
}: UseTicketRealtimeProps): UseTicketRealtimeReturn {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Suscribe a cambios en tiempo real del ticket y sus comentarios
  // - Escucha actualizaciones del ticket (cambios de estado, asignaciones)
  // - Escucha inserciones de nuevos comentarios
  // Limpia las suscripciones cuando el componente se desmonta
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
        if (onTicketUpdate) {
          await onTicketUpdate();
        }
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
        if (onCommentsUpdate) {
          onCommentsUpdate();
        }
      })
      .subscribe();

    setIsSubscribed(true);

    return () => {
      supabase.removeChannel(ticketSubscription);
      supabase.removeChannel(commentsSubscription);
      setIsSubscribed(false);
    };
  }, [ticketId, onTicketUpdate, onCommentsUpdate]);

  // Rastrea la presencia de usuarios en el ticket
// Muestra quién está viendo el ticket en tiempo real
// Usa el canal de presencia de Supabase
  useEffect(() => {
    if (!ticketId || !user) return;

    const presenceChannel = supabase.channel(`presence-ticket-${ticketId}`, {
      config: { presence: { key: user.id } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
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

  return {
    onlineUsers,
    isSubscribed,
  };
}
