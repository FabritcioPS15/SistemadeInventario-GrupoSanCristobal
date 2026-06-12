import { useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';

export interface UseTicketRealtimeProps {
  ticketId: string | undefined;
  user?: any;
  onTicketUpdate?: () => void;
  onCommentsUpdate?: () => void;
}

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
