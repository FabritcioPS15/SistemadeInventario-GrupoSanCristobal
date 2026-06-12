import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../shared/services/supabase';

export interface UseTicketCommentsProps {
  ticketId: string | undefined;
  user?: any;
}

export interface UseTicketCommentsReturn {
  ticket: any;
  comments: any[];
  loading: boolean;
  commentsEndRef: React.RefObject<HTMLDivElement>;
  fetchTicket: () => Promise<void>;
  fetchComments: () => Promise<void>;
  addComment: (content: string) => Promise<void>;
  scrollToBottom: () => void;
}

export function useTicketComments({ ticketId, user }: UseTicketCommentsProps): UseTicketCommentsReturn {
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const commentsEndRef = useRef<HTMLDivElement>(null);

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
        for (const comment of comments) {
          const anydeskMatch = comment.content.match(/anydesk de mi pc:\s*([a-zA-Z0-9]+)/i);
          if (anydeskMatch) {
            data.anydesk = anydeskMatch[1];
            data.anydesk_password = null;
            break;
          }
        }
      }

      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
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

  const addComment = async (content: string) => {
    if (!content.trim()) return;

    const { error } = await supabase
      .from('ticket_comments')
      .insert([{
        ticket_id: ticketId,
        user_id: user?.id,
        content: content
      }]);

    if (error) throw error;
    await fetchComments();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchComments();
    }
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  return {
    ticket,
    comments,
    loading,
    commentsEndRef,
    fetchTicket,
    fetchComments,
    addComment,
    scrollToBottom,
  };
}
