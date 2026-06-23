import Swal from 'sweetalert2';

// Colores del diseño corporativo
const COLORS = {
  primary: '#002855', // Azul corporativo
  success: '#16a34a',
  error: '#dc2626',
  warning: '#f59e0b',
  cancel: '#64748b',
};

// Clases de Tailwind base para unificar bordes y fuentes
const baseConfig = {
  customClass: {
    popup: 'rounded-2xl',
    title: 'text-xl font-bold text-slate-800',
    confirmButton: 'rounded-xl font-bold tracking-wide px-6',
    cancelButton: 'rounded-xl font-bold tracking-wide px-6',
  }
};

/**
 * Hook de utilidad para disparar notificaciones SweetAlert2 fácilmente.
 * Usa: const { success, error, info, warning, confirm } = useNotify();
 */
export function useNotify() {
  const success = (message: string, title?: string) =>
    Swal.fire({
      ...baseConfig,
      title: title || '¡Éxito!',
      text: message,
      icon: 'success',
      confirmButtonColor: COLORS.success,
      confirmButtonText: 'OK',
      timer: 3500,
      timerProgressBar: true,
    });

  const error = (message: string, title?: string) =>
    Swal.fire({
      ...baseConfig,
      title: title || 'Error',
      text: message,
      icon: 'error',
      confirmButtonColor: COLORS.error,
      confirmButtonText: 'OK',
      timer: 5000,
      timerProgressBar: true,
    });

  const info = (message: string, title?: string) =>
    Swal.fire({
      ...baseConfig,
      title: title || 'Información',
      text: message,
      icon: 'info',
      confirmButtonColor: COLORS.primary,
      confirmButtonText: 'OK',
      timer: 4000,
      timerProgressBar: true,
    });

  const warning = (message: string, title?: string) =>
    Swal.fire({
      ...baseConfig,
      title: title || 'Advertencia',
      text: message,
      icon: 'warning',
      confirmButtonColor: COLORS.warning,
      confirmButtonText: 'OK',
      timer: 4500,
      timerProgressBar: true,
    });

  const confirm = async (message: string, title?: string): Promise<boolean> => {
    // Si el mensaje contiene "eliminar", usamos rojo, sino azul corporativo.
    const isDestructive = message.toLowerCase().includes('eliminar') || (title && title.toLowerCase().includes('eliminar'));
    
    // Usar SweetAlert2 para confirmaciones
    const result = await Swal.fire({
      ...baseConfig,
      title: title || '¿Confirmar?',
      text: message,
      icon: isDestructive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isDestructive ? COLORS.error : COLORS.primary,
      cancelButtonColor: COLORS.cancel,
      confirmButtonText: isDestructive ? 'Sí, eliminar' : 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      focusCancel: true,
    });
    return result.isConfirmed;
  };

  return { success, error, info, warning, confirm };
}
