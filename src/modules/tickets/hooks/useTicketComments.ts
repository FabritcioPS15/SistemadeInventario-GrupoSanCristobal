// Hook personalizado para gestionar los comentarios de un ticket
// Maneja la carga de datos del ticket, sus comentarios, y la interacción con ellos
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../shared/services/supabase';

// Props que recibe el hook
// ticketId: ID del ticket a cargar
// user: Usuario actual para identificar sus comentarios
export interface UseTicketCommentsProps {
  ticketId: string | undefined;
  user?: any;
}

// Valores y funciones que expone el hook
// ticket: Datos completos del ticket con relaciones
// comments: Lista de comentarios del ticket
// loading: Estado de carga
// commentsEndRef: Referencia para scroll automático
// fetchTicket: Función para recargar datos del ticket
// fetchComments: Función para recargar comentarios
// addComment: Función para agregar un nuevo comentario
// scrollToBottom: Función para scroll al último comentario
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

  // Carga los datos del ticket desde Supabase
  // Incluye relaciones: solicitante, asignado, ubicación y asignaciones
  // También busca el ID de AnyDesk en los comentarios si existe
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

      // Buscar AnyDesk en los comentarios para mostrarlo en el detalle
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

  // Carga todos los comentarios del ticket ordenados cronológicamente
  // Incluye información del autor de cada comentario
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

  // Agrega un nuevo comentario al ticket
  // Recarga la lista de comentarios después de insertar
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

  // Hace scroll suave hasta el último comentario
  // Útil para mostrar nuevos comentarios automáticamente
  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Carga inicial del ticket y comentarios cuando cambia el ticketId
  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchComments();
    }
  }, [ticketId]);

  // Auto-scroll al fondo cuando se agregan nuevos comentarios
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
