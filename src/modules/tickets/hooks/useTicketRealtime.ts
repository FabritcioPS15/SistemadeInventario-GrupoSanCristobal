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
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set()); // Set de IDs de usuarios online en el ticket
  const [isSubscribed, setIsSubscribed] = useState(false); // Indicador de suscripción activa a canales de realtime

  // Suscribe a cambios en tiempo real del ticket y sus comentarios
  // - Escucha actualizaciones del ticket (cambios de estado, asignaciones)
  // - Escucha inserciones de nuevos comentarios
  // Limpia las suscripciones cuando el componente se desmonta
  useEffect(() => {
    if (!ticketId) return;

  // Suscripción 1: Escucha actualizaciones del ticket (cambios de estado, asignaciones)
    // Cuando el ticket cambia en la DB, ejecuta el callback onTicketUpdate
    const ticketSubscription = supabase
      .channel(`ticket-status-${ticketId}`)
      .on('postgres_changes', {
        event: 'UPDATE', // Solo actualizaciones, no inserciones
        schema: 'public',
        table: 'tickets',
        filter: `id=eq.${ticketId}` // Solo este ticket específico
      }, async () => {
        if (onTicketUpdate) {
          await onTicketUpdate(); // Recargar datos del ticket
        }
      })
      .subscribe();

    // Suscripción 2: Escucha inserciones de nuevos comentarios
    // Cuando alguien agrega un comentario, ejecuta el callback onCommentsUpdate
    const commentsSubscription = supabase
      .channel(`comments-feed-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT', // Solo inserciones, no actualizaciones
        schema: 'public',
        table: 'ticket_comments',
        filter: `ticket_id=eq.${ticketId}` // Solo comentarios de este ticket
      }, () => {
        if (onCommentsUpdate) {
          onCommentsUpdate(); // Recargar lista de comentarios
        }
      })
      .subscribe();

    setIsSubscribed(true);

    // Limpieza: cancelar suscripciones al desmontar el componente
    // Esto evita memory leaks y conexiones abiertas innecesarias
    return () => {
      supabase.removeChannel(ticketSubscription);
      supabase.removeChannel(commentsSubscription);
      setIsSubscribed(false);
    };
  }, [ticketId, onTicketUpdate, onCommentsUpdate]);

  // Rastrea la presencia de usuarios en el ticket usando Supabase Presence
  // Muestra quién está viendo el ticket en tiempo real
  // Cada usuario se une al canal con su ID como clave de presencia
  useEffect(() => {
    if (!ticketId || !user) return;

    // Crea el canal de presencia con el ID del usuario como clave
    // Esto permite identificar quién está online
    const presenceChannel = supabase.channel(`presence-ticket-${ticketId}`, {
      config: { presence: { key: user.id } }
    });

    // Evento 'sync': se dispara cuando el estado de presencia se sincroniza
    // Extrae los IDs de todos los usuarios online y actualiza el estado
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds = new Set(Object.keys(state));
        setOnlineUsers(onlineIds);
      })
      // Suscribe al canal y rastrea la presencia del usuario actual
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Registra al usuario como presente con timestamp
          await presenceChannel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    // Limpieza: cancelar el canal de presencia al desmontar
    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [ticketId, user]);

  return {
    onlineUsers,
    isSubscribed,
  };
}
