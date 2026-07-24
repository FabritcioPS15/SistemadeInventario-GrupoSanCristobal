# Documentación del Módulo de Tickets

## 📋 Índice
- [Overview](#overview)
- [Arquitectura](#arquitectura)
- [Estructura de Archivos](#estructura-de-archivos)
- [Tipos y Datos](#tipos-y-datos)
- [Componentes de UI](#componentes-de-ui)
- [Hooks Personalizados](#hooks-personalizados)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Tiempo Real](#tiempo-real)
- [Automatización](#automatización)
- [SLA y Prioridades](#sla-y-prioridades)
- [Permisos y Roles](#permisos-y-roles)

---

## Overview

El módulo de tickets es un sistema completo de gestión de incidencias de soporte técnico que permite:
- Crear y gestionar tickets de soporte
- Asignar técnicos a incidentes
- Chat en tiempo real entre solicitantes y técnicos
- Seguimiento de estado con automatización
- Reportes y exportación a PDF/Excel
- Historial de tickets archivados
- Notificaciones en tiempo real

---

## Arquitectura

```
src/modules/tickets/
├── tickets.types.ts           # Definiciones de tipos y constantes
├── pages/
│   ├── TicketsPage.tsx       # Dashboard principal con Kanban
│   ├── TicketDetailPage.tsx   # Vista detallada de un ticket
│   ├── TicketHistoryPage.tsx # Historial de tickets archivados
│   └── TicketForm.tsx        # Formulario de creación (en forms/)
├── components/
│   └── TicketDetailModal.tsx # Modal compacto de detalle
├── hooks/
│   ├── useTicketComments.ts  # Gestión de comentarios y datos
│   ├── useTicketRealtime.ts  # Suscripciones en tiempo real
│   └── useTicketNotifications.ts # Notificaciones push
└── forms/
    └── TicketForm.tsx        # Formulario de creación de tickets
```

---

## Estructura de Archivos

### 1. tickets.types.ts
Define todas las estructuras de datos del sistema:

**Tipos principales:**
- `TicketPriority`: Niveles de prioridad (critical, high, medium, low)
- `TicketStatus`: Estados del ciclo de vida (open, in_progress, resolved, closed, archived)
- `TicketCategory`: Categorías de tickets (sistemas, contable, legal, operaciones)

**Interfaces:**
- `Ticket`: Estructura principal de un ticket
- `TicketComment`: Comentarios del chat
- `TicketAssignment`: Asignaciones múltiples de usuarios
- `TicketFormData`: Datos del formulario de creación
- `SLAConfig`: Configuración de tiempos de respuesta

**Constantes:**
- `SLA_LIMITS`: Límites de tiempo por prioridad (4h, 8h, 24h, 72h)
- `PRIORITY_LABELS`: Etiquetas legibles para UI
- `STATUS_LABELS`: Etiquetas de estados para UI

---

## Tipos y Datos

### Prioridades y SLA

| Prioridad | Etiqueta | SLA | Uso |
|-----------|----------|-----|-----|
| critical | P1 - Crítica | 4 horas | Problemas que afectan operaciones vitales |
| high | P2 - Alta | 8 horas | Problemas importantes en funcionalidad principal |
| medium | P3 - Media | 24 horas | Problemas con workaround disponible |
| low | P4 - Baja | 72 horas | Problemas menores sin impacto inmediato |

### Estados del Ticket

| Estado | Etiqueta | Descripción | Transición automática |
|--------|----------|-------------|----------------------|
| open | Pendiente | Ticket creado, espera atención | → in_progress (manual) |
| in_progress | En Proceso | Técnico asignado y trabajando | → resolved (manual) |
| resolved | Resuelto | Solución implementada | → closed (3 min) |
| closed | Cerrado | Validado por usuario | → archived (10 min) |
| archived | Archivado | Almacenado en historial | - |

---

## Componentes de UI

### 1. TicketsPage.tsx
**Dashboard principal del sistema de tickets**

**Funcionalidades:**
- Vista Kanban con columnas por estado
- Filtros por búsqueda, fecha y estado
- Pestañas: Dashboard, Mis Tickets, Reportes
- Drag & drop para cambiar estado de tickets
- Métricas en tiempo real (tasa de resolución, tiempo promedio)
- Exportación a PDF y Excel
- Automatización de estados (resolved→closed→archived)

**Estado local:**
- `tickets`: Lista de todos los tickets
- `searchTerm`: Término de búsqueda
- `activeTab`: Pestaña activa
- `startDate/endDate`: Rango de fechas para reportes

**Funciones clave:**
- `fetchTickets()`: Carga tickets con relaciones
- `handleAutomation()`: Procesa cambios automáticos de estado
- `filteredTickets`: Filtra y categoriza tickets
- `metricsData`: Calcula métricas del periodo
- `generatePDF()` / `generateExcel()`: Exporta reportes

---

### 2. TicketDetailPage.tsx
**Vista detallada de un ticket individual**

**Funcionalidades:**
- Chat en tiempo real con editor de texto enriquecido
- Gestión de estado (atender, resolver, cerrar, finalizar)
- Panel de participantes y asignaciones
- Subida de imágenes con pegado desde portapapeles
- Detección de @menciones para notificaciones
- Reapertura de tickets cerrados
- Contacto por WhatsApp para prioridades altas
- Auto-asignación de técnicos
- Eliminación con limpieza de adjuntos

**Estado local:**
- `newComment`: Texto del comentario en edición
- `sending`: Indicador de envío
- `showEmojiPicker`: Visibilidad del selector de emojis
- `activeFormats`: Formatos activos del editor
- `mobileTab`: Pestaña activa en móvil

**Funciones clave:**
- `uploadFile()`: Sube imágenes al storage
- `handleCommentSubmit()`: Envía comentarios
- `htmlToMarkdown()`: Convierte HTML a Markdown
- `renderMarkdown()`: Renderiza Markdown a HTML seguro
- `addEmoji()`: Inserta emojis en el editor

---

### 3. TicketHistoryPage.tsx
**Historial de tickets archivados**

**Funcionalidades:**
- Lista de tickets con estado "archived"
- Filtros por búsqueda, prioridad y rango de fechas
- Exportación a PDF y Excel del historial
- Cálculo de tiempo de resolución por ticket
- Refresco manual de datos

**Estado local:**
- `archivedTickets`: Lista de tickets archivados
- `searchTerm`: Término de búsqueda
- `filterPriority`: Filtro por prioridad
- `filterDateRange`: Rango de fechas predefinido
- `startDate/endDate`: Rango personalizado

**Funciones clave:**
- `fetchArchivedTickets()`: Carga tickets archivados
- `filteredTickets`: Filtra por múltiples criterios
- `getTimeToClose()`: Calcula tiempo de resolución
- `generateHistoryPDF()` / `generateHistoryExcel()`: Exporta

---

### 4. TicketForm.tsx
**Formulario de creación de nuevos tickets**

**Funcionalidades:**
- Campos: título, descripción, prioridad, categoría, sede, AnyDesk
- Auto-sugerencia de problemas frecuentes
- Auto-asignación de sede del usuario
- Validación de campos obligatorios
- Guarda AnyDesk como comentario inicial
- Auto-asigna al creador via ticket_assignments
- Notifica a roles correspondientes

**Estado local:**
- `formData`: Datos del formulario
- `locations`: Lista de sedes disponibles
- `errors`: Errores de validación
- `showSuggestions`: Visibilidad de sugerencias

**Funciones clave:**
- `fetchLocations()`: Carga sedes desde DB
- `handleSelectIssue()`: Selecciona sugerencia
- `handleSubmit()`: Crea ticket con validación
- `handleChange()`: Maneja cambios en campos

---

### 5. TicketDetailModal.tsx
**Modal compacto de detalle de ticket**

**Funcionalidades:**
- Vista compacta con pestañas (detalles/chat)
- Chat en tiempo real básico
- Gestión de estado del ticket
- Subida de imágenes
- Eliminación de ticket
- Diseñado para uso desde listas (no desde página completa)

**Estado local:**
- `currentTicket`: Datos del ticket actual
- `comments`: Lista de comentarios
- `newComment`: Texto en edición
- `activeTab`: Pestaña activa en móvil

**Funciones clave:**
- `uploadFile()`: Sube imágenes
- `handleSendComment()`: Envía comentarios
- `handleDeleteTicket()`: Elimina con permisos
- `handleStatusUpdate()`: Cambia estado

---

## Hooks Personalizados

### 1. useTicketComments.ts
**Gestiona datos y comentarios de un ticket**

**Responsabilidades:**
- Carga ticket completo con relaciones
- Busca ID de AnyDesk en comentarios
- Carga comentarios ordenados cronológicamente
- Agrega nuevos comentarios
- Auto-scroll al último comentario

**Retorna:**
```typescript
{
  ticket: any;              // Datos del ticket
  comments: any[];          // Lista de comentarios
  loading: boolean;         // Estado de carga
  commentsEndRef: RefObject; // Referencia para scroll
  fetchTicket: () => Promise<void>;   // Recargar ticket
  fetchComments: () => Promise<void>; // Recargar comentarios
  addComment: (content: string) => Promise<void>; // Agregar comentario
  scrollToBottom: () => void; // Scroll al final
}
```

**Funciones clave:**
- `fetchTicket()`: Carga ticket + AnyDesk de comentarios
- `fetchComments()`: Carga comentarios con autores
- `addComment()`: Inserta nuevo comentario
- `scrollToBottom()`: Auto-scroll suave

---

### 2. useTicketRealtime.ts
**Suscripciones en tiempo real con Supabase**

**Responsabilidades:**
- Escucha cambios en el ticket (estado, asignaciones)
- Escucha nuevos comentarios
- Rastrea presencia de usuarios online

**Retorna:**
```typescript
{
  onlineUsers: Set<string>;  // IDs de usuarios online
  isSubscribed: boolean;    // Estado de suscripción
}
```

**Suscripciones:**
1. **ticket-status-{id}**: Escucha UPDATE en tabla 'tickets'
2. **comments-feed-{id}**: Escucha INSERT en 'ticket_comments'
3. **presence-ticket-{id}**: Rastrea usuarios online

**Funciones clave:**
- Suscripción a cambios de ticket
- Suscripción a nuevos comentarios
- Sistema de presencia con Supabase Presence

---

### 3. useTicketNotifications.ts
**Notificaciones push para tickets**

**Responsabilidades:**
- Escucha asignaciones de tickets al usuario
- Escucha nuevos comentarios en tickets del usuario
- Escucha cambios de estado de tickets asignados
- Muestra notificaciones toast

**Funciones clave:**
- `notifyNewAssignment()`: Notifica nueva asignación
- `notifyNewComment()`: Notifica nuevo comentario
- `notifyStatusChange()`: Notifica cambio de estado

**Suscripciones:**
- UPDATE en 'tickets' donde assigned_to = user.id
- INSERT en 'ticket_comments' donde usuario participa

---

## Flujo de Trabajo

### 1. Creación de Ticket

```
Usuario → TicketForm.tsx
  ↓
Validación de campos
  ↓
Insert en tabla 'tickets' (status: 'open')
  ↓
Insert en 'ticket_comments' (si hay AnyDesk)
  ↓
Insert en 'ticket_assignments' (auto-asignación creador)
  ↓
Notificación a roles correspondientes
  ↓
Redirección a TicketDetailPage.tsx
```

### 2. Gestión de Estado

```
Técnico → TicketDetailPage.tsx
  ↓
Clic en botón de estado (ej. "Atender")
  ↓
UPDATE en 'tickets' (status: 'in_progress', assigned_to: técnico)
  ↓
Insert en 'ticket_comments' (registro automático de cambio)
  ↓
Notificación en tiempo real a participantes
  ↓
Actualización de UI vía Supabase Realtime
```

### 3. Chat en Tiempo Real

```
Usuario → TicketDetailPage.tsx
  ↓
Escribe comentario + envía
  ↓
INSERT en 'ticket_comments'
  ↓
Supabase Realtime detecta inserción
  ↓
useTicketRealtime dispara onCommentsUpdate
  ↓
useTicketComments recarga comentarios
  ↓
Auto-scroll al último mensaje
```

---

## Tiempo Real

### Supabase Realtime Channels

**Canal 1: ticket-status-{id}**
- Evento: UPDATE
- Tabla: tickets
- Filtro: id = ticket_id
- Callback: onTicketUpdate()

**Canal 2: comments-feed-{id}**
- Evento: INSERT
- Tabla: ticket_comments
- Filtro: ticket_id = ticket_id
- Callback: onCommentsUpdate()

**Canal 3: presence-ticket-{id}**
- Tipo: Presence
- Key: user.id
- Evento: sync
- Callback: Actualiza onlineUsers

### Flujo de Actualización

```
Cambio en DB → Supabase Realtime
  ↓
Payload recibido en cliente
  ↓
Callback ejecutado (onTicketUpdate/onCommentsUpdate)
  ↓
Recarga de datos (fetchTicket/fetchComments)
  ↓
Actualización de estado local
  ↓
Re-render de componente
```

---

## Automatización

### Cambios Automáticos de Estado

**Resuelto → Cerrado (3 minutos)**
```
useEffect en TicketsPage.tsx (cada 1 minuto)
  ↓
Busca tickets con status = 'resolved' y resolved_at > 3 min
  ↓
UPDATE status = 'closed', closed_at = NOW()
```

**Cerrado → Archivado (10 minutos)**
```
useEffect en TicketsPage.tsx (cada 1 minuto)
  ↓
Busca tickets con status = 'closed' y closed_at > 10 min
  ↓
UPDATE status = 'archived'
  ↓
DELETE archivos adjuntos del storage
```

### Limpieza de Storage

```
Tickets archivados → Limpieza de adjuntos
  ↓
List archivos en bucket 'chat-attachments/ticket_{id}'
  ↓
DELETE todos los archivos del ticket
  ↓
Libera espacio de storage
```

---

## SLA y Prioridades

### Cálculo de SLA

```typescript
// Límites de tiempo por prioridad
const SLA_LIMITS = {
  critical: { hours: 4, label: '4h' },
  high: { hours: 8, label: '8h' },
  medium: { hours: 24, label: '24h' },
  low: { hours: 72, label: '72h' }
};

// Tiempo restante = SLA - (NOW - created_at)
const timeRemaining = SLA_LIMITS[priority].hours - hoursElapsed;
```

### Alertas de SLA

- **Crítico**: Alerta si > 2 horas sin atención
- **Alto**: Alerta si > 4 horas sin atención
- **Medio**: Alerta si > 12 horas sin atención
- **Bajo**: Alerta si > 48 horas sin atención

---

## Permisos y Roles

### Roles del Sistema

| Rol | Permisos en Tickets |
|-----|---------------------|
| super_admin | Todo (crear, editar, eliminar, asignar) |
| sistemas | Todo (crear, editar, eliminar, asignar) |
| gerencia | Ver, asignar, cambiar estado |
| supervisores | Ver, asignar, cambiar estado |
| administradores | Ver, crear, cambiar estado propio |
| personalizado | Ver, crear tickets propios |

### Reglas de Eliminación

**Puede eliminar ticket si:**
- Es staff (super_admin, sistemas, gerencia, supervisores)
- Es creador y han pasado ≤ 3 minutos desde creación

**Proceso de eliminación:**
1. Verificar permisos
2. Confirmación del usuario
3. Limpiar archivos adjuntos del storage
4. DELETE en tabla 'tickets'
5. Notificar a participantes

---

## Exportación de Datos

### PDF (generatePDF)

**Incluye:**
- N°, ID del ticket
- Título del incidente
- Solicitante y técnico asignado
- Ubicación y prioridad
- Fechas de creación y cierre
- Tiempo de resolución

**Utilidad:** `src/shared/utils/exportUtils.ts`

### Excel (generateExcel)

**Incluye:**
- Todo lo del PDF +
- Descripción completa
- Todas las fechas en formato local
- Más columnas de detalle

**Utilidad:** `src/shared/utils/exportUtils.ts`

---

## Buenas Prácticas

### Para Desarrolladores

1. **Usar los hooks personalizados:**
   - `useTicketComments` para datos del ticket
   - `useTicketRealtime` para tiempo real
   - `useTicketNotifications` para notificaciones

2. **Mantener comentarios actualizados:**
   - Cada función debe tener un comentario explicativo
   - Documentar lógica de negocio compleja
   - Explicar por qué se toman ciertas decisiones

3. **Manejo de errores:**
   - Siempre usar try-catch en operaciones async
   - Mostrar notificaciones al usuario
   - Loggear errores en consola

4. **Tiempo real:**
   - Limpiar suscripciones al desmontar
   - Usar filtros específicos en canales
   - Evitar suscripciones duplicadas

### Para Usuarios

1. **Crear tickets:**
   - Usar títulos descriptivos
   - Incluir detalles del problema
   - Proporcionar ID de AnyDesk si aplica
   - Seleccionar prioridad adecuada

2. **Gestión de tickets:**
   - Atender tickets críticos primero
   - Actualizar estado al progresar
   - Documentar soluciones en comentarios
   - Cerrar tickets cuando estén resueltos

---

## Troubleshooting

### Problema: El chat no se actualiza en tiempo real

**Solución:**
1. Verificar que Supabase Realtime esté habilitado
2. Revisar que el usuario tenga permisos de lectura
3. Comprobar que el canal tenga el filtro correcto
4. Verificar que el callback se esté ejecutando

### Problema: Los estados no cambian automáticamente

**Solución:**
1. Verificar que el useEffect de automatización esté activo
2. Comprobar que los timestamps sean correctos
3. Revisar logs de consola para errores
4. Verificar permisos de escritura en DB

### Problema: Las notificaciones no llegan

**Solución:**
1. Verificar permisos de notificación del navegador
2. Comprobar que el usuario esté suscrito al canal correcto
3. Revisar que el filtro de usuario sea correcto
4. Verificar configuración de Supabase Realtime

---

## Futuras Mejoras

- [ ] Dashboard de métricas avanzadas
- [ ] Reportes personalizados
- [ ] Integración con WhatsApp Business
- [ ] Sistema de encuestas de satisfacción
- [ ] Plantillas de respuestas predefinidas
- [ ] Análisis de tendencias de incidentes
- [ ] Integración con sistemas externos (Jira, ServiceNow)
- [ ] Móvil nativo (React Native)
- [ ] Chat con voz y video
- [ ] Sistema de conocimiento base (KB)

---

## Contacto

Para preguntas o sugerencias sobre el módulo de tickets, contactar al equipo de desarrollo.

**Última actualización:** Julio 2026
**Versión:** 1.0.0
