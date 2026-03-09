import { supabase } from './supabase';

type NotificationData = {
  type: 'ticket_created' | 'ticket_attended' | 'ticket_resolved' | 'ticket_closed';
  title: string;
  message: string;
  ticket_id?: string;
  user_id: string; 
  user_name: string;
  location_id?: string;
  location_name?: string;
};

// Roles que deben recibir notificaciones
const NOTIFICATION_ROLES = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];

export async function createNotification(data: NotificationData) {
  console.log('📨 createNotification llamado con:', data);
  
  try {
    // Primero verificar si la tabla existe
    console.log('🔍 Verificando si existe la tabla notifications...');
    const { error: tableError } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('❌ La tabla notifications no existe:', tableError);
      return false;
    }
    
    console.log('✅ Tabla notifications existe');
    
    // Crear notificaciones para cada rol que debe recibirlas
    const notifications = NOTIFICATION_ROLES.map(role => ({
      type: data.type,
      title: data.title,
      message: data.message,
      ticket_id: data.ticket_id,
      user_name: data.user_name,
      location_name: data.location_name,
      target_role: role, // Rol objetivo de la notificación
      read: false,
      created_at: new Date().toISOString()
    }));
    
    console.log('📝 Notificaciones a crear:', notifications);

    const { data: insertedData, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('❌ Error insertando notificaciones:', error);
      return false;
    }

    console.log('✅ Notificaciones insertadas exitosamente:', insertedData);
    return true;
  } catch (error) {
    console.error('❌ Error en createNotification:', error);
    return false;
  }
}

export async function notifyTicketCreated(ticketId: string, ticketTitle: string, userId: string, userName: string, locationName?: string) {
  console.log('🎫 notifyTicketCreated llamado con:');
  console.log('  - ticketId:', ticketId);
  console.log('  - ticketTitle:', ticketTitle);
  console.log('  - userId:', userId);
  console.log('  - userName:', userName);
  console.log('  - locationName:', locationName);
  console.log('  - NOTIFICATION_ROLES:', NOTIFICATION_ROLES);
  
  try {
    const result = await createNotification({
      type: 'ticket_created',
      title: '🎫 Nuevo Ticket Creado',
      message: `Se ha creado un nuevo ticket: "${ticketTitle}"`,
      ticket_id: ticketId,
      user_id: userId,
      user_name: userName,
      location_name: locationName
    });
    
    console.log('📊 Resultado de createNotification:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en notifyTicketCreated:', error);
    return false;
  }
}

export async function notifyTicketAttended(ticketId: string, ticketTitle: string, userId: string, userName: string, locationName?: string) {
  return createNotification({
    type: 'ticket_attended',
    title: '⏰ Ticket en Atención',
    message: `El ticket "${ticketTitle}" está siendo atendido`,
    ticket_id: ticketId,
    user_id: userId,
    user_name: userName,
    location_name: locationName
  });
}

export async function notifyTicketResolved(ticketId: string, ticketTitle: string, userId: string, userName: string, locationName?: string) {
  return createNotification({
    type: 'ticket_resolved',
    title: '✅ Ticket Resuelto',
    message: `El ticket "${ticketTitle}" ha sido resuelto`,
    ticket_id: ticketId,
    user_id: userId,
    user_name: userName,
    location_name: locationName
  });
}

// Función para crear múltiples notificaciones a la vez
export async function createNotificationBatch(notifications: Array<{
  type: 'ticket_created' | 'ticket_attended' | 'ticket_resolved' | 'ticket_closed' | 'sutran_visit_scheduled' | 'sutran_visit_completed';
  title: string;
  message: string;
  ticket_id?: string;
  user_name: string;
  location_name?: string;
  target_role: string;
}>) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createNotificationBatch:', error);
    throw error;
  }
}

// Funciones para notificaciones de SUTRAN
export async function notifyTicketClosed(ticketId: string, ticketTitle: string, userId: string, userName: string, locationName?: string) {
  return createNotification({
    type: 'ticket_closed',
    title: '🔒 Ticket Cerrado',
    message: `El ticket "${ticketTitle}" ha sido cerrado correctamente`,
    ticket_id: ticketId,
    user_id: userId,
    user_name: userName,
    location_name: locationName
  });
}

export async function notifySutranVisitScheduled(locationName: string, visitDate: string, inspectorName: string) {
  const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];
  
  const notifications = notificationRoles.map(role => ({
    type: 'sutran_visit_scheduled' as const,
    title: '📅 Visita SUTRAN Programada',
    message: `Se ha programado una visita SUTRAN para ${locationName} el ${new Date(visitDate).toLocaleDateString('es-ES')}`,
    user_name: inspectorName,
    location_name: locationName,
    target_role: role
  }));

  return createNotificationBatch(notifications);
}

export async function notifySutranVisitCompleted(locationName: string, inspectorName: string, findings?: string) {
  const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];
  
  const notifications = notificationRoles.map(role => ({
    type: 'sutran_visit_completed' as const,
    title: '✅ Visita SUTRAN Completada',
    message: `Se ha completado la visita SUTRAN en ${locationName}${findings ? '. Hallazgos: ' + findings : ''}`,
    user_name: inspectorName,
    location_name: locationName,
    target_role: role
  }));

  return createNotificationBatch(notifications);
}
