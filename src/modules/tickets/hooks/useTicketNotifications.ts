// =============================================================================
// useTicketNotifications.ts — Hook para notificaciones en tiempo real de tickets
// Funcionalidades:
//   - Escucha cambios de asignación de tickets al usuario actual
//   - Escucha cambios de estado de tickets asignados
//   - Escucha nuevos comentarios en tickets donde el usuario participa
//   - Muestra notificaciones toast para mantener al usuario informado
//   - Usa Supabase Realtime para actualizaciones instantáneas
// =============================================================================

import { useEffect, useCallback } from 'react';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthContext';
import { useNotify } from '../../../shared/hooks/useNotify';

// Hook principal de notificaciones de tickets
// Se suscribe a cambios en tiempo real y muestra alertas al usuario
export function useTicketNotifications() {
  const { user } = useAuth(); // Usuario actual para filtrar notificaciones
  const { toast: showToast, info: showInfo } = useNotify(); // Sistema de notificaciones UI

  // Muestra notificación cuando se asigna un ticket al usuario
  // Se activa cuando assigned_to cambia al ID del usuario actual
  const notifyNewAssignment = useCallback((ticketTitle: string) => {
    showToast(`Te asignaron al ticket: "${ticketTitle}"`, 'Nueva asignación');
  }, [showToast]);

  // Muestra notificación cuando alguien comenta en un ticket del usuario
  // Solo notifica si el usuario es el solicitante o el técnico asignado
  const notifyNewComment = useCallback((ticketTitle: string, authorName: string) => {
    showToast(`${authorName} comentó en: "${ticketTitle}"`, 'Nuevo comentario');
  }, [showToast]);

  // Muestra notificación cuando cambia el estado de un ticket asignado
  // Traduce el estado técnico a etiqueta legible para el usuario
  const notifyStatusChange = useCallback((ticketTitle: string, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      open: 'Pendiente',
      in_progress: 'En Proceso',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    };
    showInfo(
      `"${ticketTitle}" → ${statusLabels[newStatus] || newStatus}`,
      'Cambio de estado'
    );
  }, [showInfo]);

  // Suscripción a cambios en tiempo real de tickets
  // Se activa cuando el usuario está autenticado
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('ticket_notifications')
      // Suscripción 1: Cambios en tickets asignados al usuario
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Escucha actualizaciones de tickets
          schema: 'public',
          table: 'tickets',
          filter: `assigned_to=eq.${user.id}`, // Solo tickets donde el usuario es el técnico
        },
        async (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;

          // Detecta nueva asignación: assigned_to cambió al usuario actual
          if (oldData.assigned_to !== newData.assigned_to && newData.assigned_to === user.id) {
            notifyNewAssignment(newData.title);
          }

          // Detecta cambio de estado del ticket
          if (oldData.status !== newData.status) {
            notifyStatusChange(newData.title, newData.status);
          }
        }
      )
      // Suscripción 2: Nuevos comentarios en tickets del usuario
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Escucha nuevos comentarios
          schema: 'public',
          table: 'ticket_comments',
        },
        async (payload) => {
          const comment = payload.new as any;
          // No notificar si el comentario es del propio usuario
          if (comment.user_id === user.id) return;

          // Obtener datos del ticket para verificar participación
          const { data: ticket } = await supabase
            .from('tickets')
            .select('title, assigned_to, requester_id')
            .eq('id', comment.ticket_id)
            .single();

          if (!ticket) return;
          // Solo notificar si el usuario es el técnico o el solicitante
          if (ticket.assigned_to !== user.id && ticket.requester_id !== user.id) return;

          // Obtener nombre del autor del comentario
          const { data: author } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', comment.user_id)
            .single();

          notifyNewComment(ticket.title, author?.full_name || 'Alguien');
        }
      )
      .subscribe();

    // Limpieza: cancelar suscripción al desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, notifyNewAssignment, notifyNewComment, notifyStatusChange]);
}
