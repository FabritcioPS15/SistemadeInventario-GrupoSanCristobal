// =============================================================================
// useTicketComments.ts — Hook para gestionar datos y comentarios de un ticket
// Responsabilidades:
//   - Carga el ticket completo con relaciones (solicitante, técnico, ubicación,
//     asignaciones múltiples)
//   - Busca ID de AnyDesk en los comentarios existentes (para mostrarlo en UI)
//   - Carga todos los comentarios del ticket ordenados cronológicamente
//   - Agrega nuevos comentarios a la base de datos
//   - Auto-scroll al último comentario
// =============================================================================

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
  const [ticket, setTicket] = useState<any>(null); // Datos completos del ticket con relaciones
  const [comments, setComments] = useState<any[]>([]); // Lista de comentarios del ticket
  const [loading, setLoading] = useState(true); // Indicador de carga inicial
  const commentsEndRef = useRef<HTMLDivElement>(null); // Referencia para scroll automático al último comentario

  // Carga los datos del ticket desde Supabase
  // Incluye relaciones: solicitante, asignado, ubicación y asignaciones múltiples
  // También busca el ID de AnyDesk en los comentarios existentes (formato: "Anydesk de mi PC: XXXXXX")
  // El ID de AnyDesk se extrae y se agrega al objeto ticket para mostrarlo en la UI
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

      // Buscar AnyDesk en los comentarios para mostrarlo en el detalle del ticket
      // Busca comentarios que contengan la palabra "anydesk" (case-insensitive)
      // Extrae el ID usando regex: "anydesk de mi pc: XXXXXX"
      const { data: comments } = await supabase
        .from('ticket_comments')
        .select('content')
        .eq('ticket_id', ticketId)
        .ilike('content', '%anydesk%');

      if (comments && comments.length > 0) {
        // Itera sobre los comentarios buscando el patrón de AnyDesk
        for (const comment of comments) {
          const anydeskMatch = comment.content.match(/anydesk de mi pc:\s*([a-zA-Z0-9]+)/i);
          if (anydeskMatch) {
            // Agrega el ID de AnyDesk al objeto ticket para mostrarlo en la UI
            data.anydesk = anydeskMatch[1];
            data.anydesk_password = null; // La contraseña no se guarda por seguridad
            break; // Solo toma el primer ID encontrado
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
  // Incluye información completa del autor de cada comentario (nombre, email, avatar, rol)
  // Orden ascendente: comentarios más antiguos primero
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
  // Valida que el contenido no esté vacío antes de insertar
  // Recarga la lista de comentarios después de insertar para mostrar el nuevo mensaje
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
  // Usa un pequeño delay (100ms) para asegurar que el DOM se actualizó
  // Útil para mostrar nuevos comentarios automáticamente cuando se reciben en tiempo real
  const scrollToBottom = () => {
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Carga inicial del ticket y comentarios cuando cambia el ticketId
  // Se ejecuta al montar el componente y cuando el usuario navega a otro ticket
  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchComments();
    }
  }, [ticketId]);

  // Auto-scroll al fondo cuando se agregan nuevos comentarios
  // Esto asegura que el usuario siempre vea el mensaje más reciente
  // Se activa cada vez que cambia la lista de comentarios
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
