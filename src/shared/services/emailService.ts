import { supabase } from './supabase';

export interface EmailRecipients {
  to: string[];
  cc?: string[];
  bcc?: string[];
}

export interface EmailData {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions extends EmailRecipients, EmailData { }

// ============================================================
// Helpers de plantilla (compartidos por todos los correos)
// ============================================================

/**
 * Cuando tengas el logo listo, descomenta el bloque LOGO_HTML de abajo
 * y reemplaza la URL por la ruta pública en tu dominio, por ejemplo:
 * https://rtpsancristobal.pe/assets/logo-email.png
 * Recomendado: PNG con fondo transparente, ~160px de ancho, altura fija ~48px.
 */
const LOGO_HTML = '';
// const LOGO_HTML = `
//   <img src="https://rtpsancristobal.pe/assets/logo-email.png"
//        alt="Grupo San Cristóbal"
//        width="140"
//        style="display:block; margin: 0 auto 12px; height:auto; border:0;" />
// `;

/**
 * Envoltorio base de todos los correos: header de color con ícono
 * "marca de agua" a la derecha, tarjeta blanca con esquinas redondeadas
 * (sin fondo gris exterior ni sombra), y footer institucional.
 */
function renderEmailShell(opts: {
  headerColor: string;
  headerIcon?: string; // símbolo unicode, ej. '&#10003;'
  title: string;
  subtitle: string;
  bodyHtml: string;
}): string {
  const { headerColor, headerIcon = '', title, subtitle, bodyHtml } = opts;

  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">

      <!-- Header -->
      <div style="background: ${headerColor};">
        ${LOGO_HTML}
        <table role="presentation" width="100%" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 30px 8px 30px 28px; vertical-align: middle; text-align: left;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.02em;">
                ${title}
              </h1>
              <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">
                ${subtitle}
              </p>
            </td>
            ${headerIcon ? `
            <td style="padding: 0 28px 0 0; vertical-align: middle; text-align: right; width: 90px;">
              <span style="color: rgba(255,255,255,0.22); font-size: 56px; font-weight: bold; line-height: 1;">
                ${headerIcon}
              </span>
            </td>
            ` : ''}
          </tr>
        </table>
      </div>

      <!-- Body -->
      <div style="padding: 28px 24px; background: #ffffff;">
        ${bodyHtml}
      </div>

      <!-- Footer -->
      <div style="background: #002855; padding: 16px 24px; text-align: center;">
        <p style="color: #cbd5e1; margin: 0; font-size: 11px; letter-spacing: 0.03em;">
          Este es un mensaje automático del Sistema GSC
        </p>
        <p style="color: #7c93ad; margin: 4px 0 0; font-size: 10px; letter-spacing: 0.03em;">
          Área de TI y Soporte
        </p>
      </div>
    </div>
  `;
}

/**
 * Fila de datos tipo tabla (label / valor), reutilizada en las 3 plantillas.
 */
function renderRow(label: string, value: string, valueColor = '#1e293b'): string {
  return `
    <tr>
      <td style="padding: 12px 14px; background: #f8fafc; font-weight: 600; font-size: 13px; color: #475569; border-bottom: 1px solid #eef2f6; width: 40%;">
        ${label}
      </td>
      <td style="padding: 12px 14px; font-size: 13px; color: ${valueColor}; font-weight: 500; border-bottom: 1px solid #eef2f6;">
        ${value}
      </td>
    </tr>
  `;
}

function renderTable(rows: string): string {
  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 4px; border-radius: 8px; overflow: hidden; border: 1px solid #eef2f6;">
      ${rows}
    </table>
  `;
}

// ============================================================
// Servicio de envío de correos usando Supabase Edge Functions
// Requiere una Edge Function configurada en Supabase llamada 'send-email'
// ============================================================
export const emailService = {
  /**
   * Enviar correo electrónico
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: options.to,
          cc: options.cc || [],
          bcc: options.bcc || [],
          subject: options.subject,
          html: options.html,
          text: options.text || this.stripHtml(options.html),
        },
      });

      if (error) {
        console.error('Error al enviar correo:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error inesperado al enviar correo:', error);
      return { success: false, error: error.message || 'Error desconocido' };
    }
  },

  /**
   * Enviar notificación de mantenimiento
   */
  async sendMaintenanceNotification(data: {
    to: string[];
    cc?: string[];
    assetName: string;
    maintenanceType: string;
    description: string;
    technician?: string;
    scheduledDate?: string;
    location?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const bodyHtml = `
      <h2 style="color: #1e293b; font-size: 16px; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 2px solid #002855;">
        Detalles del Mantenimiento
      </h2>

      ${renderTable(
      renderRow('Activo', data.assetName) +
      renderRow('Tipo de Mantenimiento', data.maintenanceType) +
      renderRow('Ubicación', data.location || 'No especificada') +
      renderRow('Técnico', data.technician || 'No asignado') +
      renderRow('Fecha Programada', data.scheduledDate ? new Date(data.scheduledDate).toLocaleString('es-PE') : 'No programada')
    )}

      <div style="margin-top: 20px;">
        <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 8px;">Descripción</h3>
        <p style="color: #475569; line-height: 1.6; font-size: 13px; margin: 0;">${data.description}</p>
      </div>
    `;

    const html = renderEmailShell({
      headerColor: '#002855',
      headerIcon: '&#9881;', // ⚙ engranaje
      title: 'Notificación de Mantenimiento',
      subtitle: 'Sistema GSC',
      bodyHtml,
    });

    return this.sendEmail({
      to: data.to,
      cc: data.cc,
      subject: `Mantenimiento: ${data.maintenanceType} - ${data.assetName}`,
      html,
    });
  },

  /**
   * Enviar notificación de solicitud
   */
  async sendRequestNotification(data: {
    to: string[];
    cc?: string[];
    requestType: string;
    requestTitle: string;
    description: string;
    requester: string;
    priority: string;
    dueDate?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const priorityColors: Record<string, string> = {
      baja: '#22c55e',
      media: '#eab308',
      alta: '#f97316',
      urgente: '#ef4444',
    };
    const priorityColor = priorityColors[data.priority] || '#64748b';

    const bodyHtml = `
      <h2 style="color: #1e293b; font-size: 16px; margin: 0 0 12px; padding-bottom: 12px; border-bottom: 2px solid #002855;">
        ${data.requestTitle}
      </h2>

      <div style="margin: 0 0 16px;">
        <span style="display: inline-block; padding: 6px 14px; background: ${priorityColor}; color: white; border-radius: 999px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;">
          Prioridad: ${data.priority}
        </span>
      </div>

      ${renderTable(
      renderRow('Tipo de Solicitud', data.requestType) +
      renderRow('Solicitante', data.requester) +
      renderRow('Fecha Límite', data.dueDate ? new Date(data.dueDate).toLocaleDateString('es-PE') : 'No especificada')
    )}

      <div style="margin-top: 20px;">
        <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 8px;">Descripción</h3>
        <p style="color: #475569; line-height: 1.6; font-size: 13px; margin: 0;">${data.description}</p>
      </div>

      <div style="margin-top: 20px; padding: 14px 16px; background: #eff6ff; border-left: 4px solid #002855; border-radius: 6px;">
        <p style="margin: 0; color: #1e40af; font-size: 12.5px; line-height: 1.5;">
          <strong>Acción requerida:</strong> revisa esta solicitud en el sistema y procede con la aprobación correspondiente.
        </p>
      </div>
    `;

    const html = renderEmailShell({
      headerColor: '#002855',
      headerIcon: '&#33;', // ! (alerta)
      title: 'Nueva Solicitud Pendiente de Aprobación',
      subtitle: 'Sistema GSC',
      bodyHtml,
    });

    return this.sendEmail({
      to: data.to,
      cc: data.cc,
      subject: `Solicitud: ${data.requestType} - ${data.requestTitle}`,
      html,
    });
  },

  /**
   * Enviar notificación de aprobación/rechazo de solicitud
   */
  async sendRequestDecisionNotification(data: {
    to: string[];
    cc?: string[];
    requestTitle: string;
    decision: 'approved' | 'rejected';
    decisionMaker: string;
    comments?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const isApproved = data.decision === 'approved';
    const color = isApproved ? '#16a34a' : '#dc2626';
    const decisionText = isApproved ? 'APROBADA' : 'RECHAZADA';
    const icon = isApproved ? '&#10003;' : '&#10005;'; // ✓ / ✕ (símbolos, no emoji, para que hereden el color)

    const bodyHtml = `
      <h2 style="color: #1e293b; font-size: 16px; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 2px solid ${color};">
        ${data.requestTitle}
      </h2>

      ${renderTable(
      renderRow('Decisión', `<span style="font-weight: 700; color: ${color};">${decisionText}</span>`) +
      renderRow(isApproved ? 'Aprobado por' : 'Rechazado por', data.decisionMaker) +
      renderRow('Fecha', new Date().toLocaleString('es-PE'))
    )}

      ${data.comments ? `
        <div style="margin-top: 20px;">
          <h3 style="color: #1e293b; font-size: 14px; margin: 0 0 8px;">Comentarios</h3>
          <p style="color: #475569; line-height: 1.6; font-size: 13px; margin: 0; background: #f8fafc; padding: 12px 14px; border-radius: 6px; border: 1px solid #eef2f6;">
            ${data.comments}
          </p>
        </div>
      ` : ''}
    `;

    const html = renderEmailShell({
      headerColor: color,
      headerIcon: icon,
      title: `Solicitud ${decisionText}`,
      subtitle: 'Sistema GSC',
      bodyHtml,
    });

    return this.sendEmail({
      to: data.to,
      cc: data.cc,
      subject: `Solicitud ${decisionText}: ${data.requestTitle}`,
      html,
    });
  },

  /**
   * Utilidad para eliminar etiquetas HTML (para versión texto plano)
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  },
};