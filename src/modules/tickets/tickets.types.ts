// Niveles de prioridad de los tickets
// critical: P1 - Problemas críticos que afectan operaciones vitales
// high: P2 - Problemas importantes que afectan funcionalidad principal
// medium: P3 - Problemas moderados con workaround disponible 
// low: P4 - Problemas menores sin impacto inmediato 
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
// Estados del ciclo de vida de un ticket
// open: Pendiente - Ticket creado y esperando atención
// in_progress: En Proceso - Técnico asignado y trabajando en el ticket
// resolved: Resuelto - Solución implementada, espera validación del usuario (3 min → closed)
// closed: Cerrado - Ticket validado y finalizado (10 min → archived)
// archived: Archivado - Ticket almacenado en historial para referencia futura
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'archived';
// Categorías de tickets para clasificación y routing
// sistemas: Problemas de tecnología, software, hardware, redes
// contable: Problemas de facturación, pagos, contabilidad
// legal: Problemas legales, contratos, documentación
// operaciones: Problemas operativos, logística, procesos
export type TicketCategory = 'sistemas' | 'contable' | 'legal' | 'operaciones';

// Información básica de un usuario relacionado con un ticket
// Se usa para solicitante (requester) y técnico asignado (attendant)
export interface TicketUser {
  full_name: string; // Nombre completo del usuario
  avatar_url?: string; // URL de la foto de perfil (opcional)
}

// Información de la ubicación/sede donde ocurrió el incidente
export interface TicketLocation {
  name: string; // Nombre de la sede (ej. "Sede Central", "Sucursal Norte")
}

// Estructura principal de un ticket de soporte
// Contiene toda la información del incidente y su estado actual
export interface Ticket {
  id: string; // ID único del ticket (UUID)
  title: string; // Título breve del incidente
  description?: string; // Descripción detallada del problema
  status: TicketStatus; // Estado actual del ticket
  priority: TicketPriority; // Nivel de prioridad para SLA
  category?: TicketCategory; // Categoría para routing
  location_id?: string; // ID de la sede donde ocurrió
  requester_id?: string; // ID del usuario que creó el ticket
  assigned_to?: string; // ID del técnico asignado (técnico principal)
  created_at: string; // Timestamp de creación del ticket
  updated_at: string; // Timestamp de última actualización
  attended_at?: string; // Timestamp de primera atención (cuando pasa a in_progress)
  resolved_at?: string; // Timestamp cuando se marca como resuelto
  closed_at?: string; // Timestamp cuando se cierra el ticket
  requester?: TicketUser; // Datos del solicitante (relación)
  attendant?: TicketUser; // Datos del técnico asignado (relación)
  locations?: TicketLocation; // Datos de la ubicación (relación)
}

// Comentario o mensaje en el chat de un ticket
// Soporta texto plano, markdown básico y referencias a imágenes
export interface TicketComment {
  id: string; // ID único del comentario
  ticket_id: string; // ID del ticket al que pertenece
  user_id: string; // ID del usuario que escribió el comentario
  content: string; // Contenido del mensaje (puede incluir markdown)
  created_at: string; // Timestamp de creación del comentario
  author?: TicketUser; // Datos del autor (relación)
}

// Asignación de un usuario a un ticket
// Permite multi-colaboración (máximo 4 personas por ticket)
// Diferente de assigned_to: este es para colaboradores adicionales
export interface TicketAssignment {
  id: string; // ID único de la asignación
  ticket_id: string; // ID del ticket asignado
  user_id: string; // ID del usuario asignado
  assigned_at: string; // Timestamp de la asignación
}

// Datos del formulario para crear un nuevo ticket
// Validados antes de insertar en la base de datos
export interface TicketFormData {
  title: string; // Título del incidente (requerido)
  description: string; // Descripción detallada (requerido)
  category: TicketCategory; // Categoría del ticket (requerido)
  priority: TicketPriority; // Prioridad técnica (requerido)
  anydesk?: string; // ID de AnyDesk para acceso remoto (opcional)
  location_id?: string; // ID de la sede (requerido, auto-asignado del usuario)
}

// Configuración de SLA (Service Level Agreement)
// Define tiempos máximos de respuesta según prioridad
export interface SLAConfig {
  critical: { hours: number; label: string }; // 4 horas para críticos
  high: { hours: number; label: string }; // 8 horas para alta
  medium: { hours: number; label: string }; // 24 horas para media
  low: { hours: number; label: string }; // 72 horas para baja
}

// Límites de tiempo SLA para cada nivel de prioridad
// Usados para calcular tiempo restante y mostrar alertas
export const SLA_LIMITS: SLAConfig = {
  critical: { hours: 4, label: '4h' }, // Máximo 4 horas para responder
  high: { hours: 8, label: '8h' }, // Máximo 8 horas para responder
  medium: { hours: 24, label: '24h' }, // Máximo 24 horas para responder
  low: { hours: 72, label: '72h' }, // Máximo 72 horas para responder
};

// Etiquetas legibles para mostrar en la UI
// Formato estándar: P[Nivel] - Descripción
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: 'P1 - Crítica', // Prioridad más alta
  high: 'P2 - Alta', // Segunda prioridad
  medium: 'P3 - Media', // Prioridad normal
  low: 'P4 - Baja', // Prioridad más baja
};

// Etiquetas legibles para los estados en la UI
// Usadas en badges, filtros y reportes
export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Pendiente', // Ticket creado sin atención
  in_progress: 'En Proceso', // Técnico trabajando
  resolved: 'Resuelto', // Solución implementada
  closed: 'Cerrado', // Validado por usuario
  archived: 'Archivado', // Almacenado en historial
};
