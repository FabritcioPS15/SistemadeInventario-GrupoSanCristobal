/**
 * Configuración central de roles y permisos por defecto.
 *
 * - ROLE_PERMISSIONS: mapa de permisos por defecto de cada rol predefinido.
 *   Se usa cuando un usuario NO tiene permisos personalizados (permissions vacío).
 * - Los permisos personalizados de un usuario (columna `users.permissions`)
 *   tienen prioridad sobre los permisos del rol.
 *
 * ⚠️ REGLA: Todo módulo nuevo debe registrarse aquí (si aplica a roles) y en
 *            el árbol de permisos del formulario de usuarios (UserForm).
 */

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // Super Admin: Acceso absoluto a todo
  super_admin: [
    'dashboard-view', 'dashboard-edit',

    'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
    'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',

    'checklist-view', 'checklist-edit', 'checklist-create',
    'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
    'checklist-interactive-view',

    'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
    'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
    'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
    'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
    'inventory-disco-extraido-view', 'inventory-maquinaria-view',

    'cameras-view', 'cameras-edit',
    'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',

    'maintenance-view', 'maintenance-create', 'maintenance-edit',
    'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',

    'flota-vehicular-view', 'flota-vehicular-edit',

    'infraestructura-ti-view', 'infraestructura-ti-edit',
    'herramientas-equipos-view', 'herramientas-equipos-edit',
    'instalaciones-view', 'instalaciones-edit',

    'requests-view', 'requests-create', 'requests-edit', 'requests-delete',
    'quotations-view', 'quotations-edit',

    'users-view', 'users-create', 'users-edit', 'users-delete',
    'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
    'companies-view', 'companies-create', 'companies-edit', 'companies-delete',
    'sutran-view', 'sutran-edit',
    'mtc-view', 'mtc-edit',
    'servers-view', 'servers-edit',
    'painpoint-view', 'painpoint-create', 'painpoint-edit',
    'titulos-habilitantes-view', 'titulos-habilitantes-edit',
    'planos-defensa-civil-view', 'planos-defensa-civil-edit',
    'sent-view', 'sent-create', 'sent-edit',
    'sent-lima-view', 'sent-provincias-view',

    'reports-view', 'vacations-view',
    'audit-view', 'audit-export', 'cvs-view',
  ],

  // Gerencia: Acceso completo a todo excepto configuración crítica del sistema
  gerencia: [
    'dashboard-view', 'dashboard-edit',

    'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
    'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',

    'checklist-view', 'checklist-edit', 'checklist-create',
    'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
    'checklist-interactive-view',

    'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
    'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
    'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
    'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
    'inventory-disco-extraido-view', 'inventory-maquinaria-view',

    'cameras-view', 'cameras-edit',
    'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',

    'maintenance-view', 'maintenance-create', 'maintenance-edit',
    'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',

    'flota-vehicular-view', 'flota-vehicular-edit',

    'infraestructura-ti-view', 'infraestructura-ti-edit',
    'herramientas-equipos-view', 'herramientas-equipos-edit',
    'instalaciones-view', 'instalaciones-edit',

    'requests-view', 'requests-create', 'requests-edit', 'requests-delete',
    'quotations-view', 'quotations-edit',

    'users-view', 'users-create', 'users-edit', 'users-delete',
    'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
    'companies-view', 'companies-create', 'companies-edit', 'companies-delete',
    'sutran-view', 'sutran-edit',
    'mtc-view', 'mtc-edit',
    'painpoint-view', 'painpoint-create', 'painpoint-edit',
    'sent-view', 'sent-create', 'sent-edit',
    'sent-lima-view', 'sent-provincias-view',

    'reports-view', 'vacations-view',
    'audit-view', 'audit-export', 'cvs-view',
    'titulos-habilitantes-view',
  ],

  // Sistemas: Acceso completo a todo lo técnico y configuración
  sistemas: [
    'dashboard-view', 'dashboard-edit',

    'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
    'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',

    'checklist-view', 'checklist-edit', 'checklist-create',
    'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
    'checklist-interactive-view',

    'inventory-view', 'inventory-create', 'inventory-edit', 'inventory-delete',
    'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
    'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
    'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
    'inventory-disco-extraido-view', 'inventory-maquinaria-view',

    'cameras-view', 'cameras-edit',
    'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',

    'maintenance-view', 'maintenance-create', 'maintenance-edit',
    'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',

    'flota-vehicular-view', 'flota-vehicular-edit',

    'infraestructura-ti-view', 'infraestructura-ti-edit',
    'herramientas-equipos-view', 'herramientas-equipos-edit',
    'instalaciones-view', 'instalaciones-edit',

    'requests-view', 'requests-create', 'requests-edit', 'requests-delete',
    'quotations-view', 'quotations-edit',

    'users-view', 'users-create', 'users-edit', 'users-delete',
    'locations-view', 'locations-create', 'locations-edit', 'locations-delete',
    'companies-view', 'companies-create', 'companies-edit', 'companies-delete',
    'sutran-view', 'sutran-edit',
    'mtc-view', 'mtc-edit',
    'servers-view', 'servers-edit',
    'painpoint-view', 'painpoint-create', 'painpoint-edit',
    'sent-view', 'sent-create', 'sent-edit',
    'sent-lima-view', 'sent-provincias-view',

    'reports-view', 'vacations-view',
    'audit-view', 'audit-export', 'cvs-view',
    'titulos-habilitantes-view',
    'planos-defensa-civil-view',
  ],

  // Supervisores: Acceso limitado (sin Usuarios, Sedes, Servidores, Painpoints, Enviados, Inventario y Mantenimiento)
  supervisores: [
    'dashboard-view', 'dashboard-edit',
    'tickets-view', 'tickets-create', 'tickets-edit', 'tickets-delete',
    'tickets-dashboard-view', 'tickets-mine-view', 'tickets-reports-view', 'tickets-history-view',
    'checklist-view', 'checklist-edit', 'checklist-create',
    'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
    'checklist-interactive-view',
    'cameras-view', 'cameras-edit',
    'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
    'flota-vehicular-view', 'flota-vehicular-edit',
    'sutran-view', 'sutran-edit',
    'mtc-view', 'mtc-edit',
    'audit-view', 'audit-export', 'cvs-view',
  ],

  // Administradores: Acceso limitado - solo visualización y gestión básica
  administradores: [
    'dashboard-view',
    'tickets-view', 'tickets-create', 'tickets-edit',
    'tickets-dashboard-view', 'tickets-mine-view',
    'checklist-view', 'checklist-edit',
    'checklist-escon-view', 'checklist-ecsal-view', 'checklist-citv-view',
    'inventory-view', 'inventory-create', 'inventory-edit',
    'spare-parts-view', 'inventory-pc-view', 'inventory-celular-view', 'inventory-dvr-view', 'inventory-impresora-view',
    'inventory-escaner-view', 'inventory-monitor-view', 'inventory-laptop-view', 'inventory-proyector-view', 'inventory-switch-view',
    'inventory-chip-view', 'inventory-tinte-view', 'inventory-fuente-view', 'inventory-ram-view', 'inventory-disco-view',
    'inventory-disco-extraido-view', 'inventory-maquinaria-view',
    'cameras-view',
    'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view',
    'maintenance-view', 'maintenance-create', 'maintenance-edit',
    'maintenance-pending-view', 'maintenance-in-progress-view', 'maintenance-completed-view',
    'titulos-habilitantes-view',
    'requests-view', 'requests-create', 'requests-edit',
  ],

  // Área Legal: Acceso a legal, flota, sutran, mtc, etc.
  area_legal: [
    'dashboard-view',
    'tickets-view', 'tickets-create', 'tickets-edit',
    'tickets-dashboard-view', 'tickets-mine-view',
    'locations-view',
    'sutran-view', 'sutran-edit',
    'mtc-view', 'mtc-edit',
    'flota-vehicular-view', 'flota-vehicular-edit',
    'audit-view',
  ],

  // Área Contable: Cámaras, tickets, flota, sedes
  area_contable: [
    'dashboard-view',
    'tickets-view', 'tickets-create', 'tickets-edit',
    'tickets-dashboard-view', 'tickets-mine-view',
    'cameras-view',
    'cameras-revision-view', 'cameras-escuela-view', 'cameras-policlinico-view', 'cameras-circuito-view',
    'flota-vehicular-view',
    'locations-view',
  ],

  // Personalizado: debe configurarse manualmente; por defecto tickets básicos
  personalizado: ['tickets-view', 'tickets-edit'],
};
