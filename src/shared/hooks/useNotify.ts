import Swal from 'sweetalert2';

/**
 * Hook de utilidad para disparar notificaciones SweetAlert2 fácilmente.
 * Usa: const { success, error, info, warning, confirm } = useNotify();
 */
export function useNotify() {
  const success = (message: string, title?: string) =>
    Swal.fire({
      title: title || '¡Éxito!',
      text: message,
      icon: 'success',
      confirmButtonColor: '#16a34a',
      confirmButtonText: 'OK',
      timer: 3500,
      timerProgressBar: true,
    });

  const error = (message: string, title?: string) =>
    Swal.fire({
      title: title || 'Error',
      text: message,
      icon: 'error',
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'OK',
      timer: 5000,
      timerProgressBar: true,
    });

  const info = (message: string, title?: string) =>
    Swal.fire({
      title: title || 'Información',
      text: message,
      icon: 'info',
      confirmButtonColor: '#002855',
      confirmButtonText: 'OK',
      timer: 4000,
      timerProgressBar: true,
    });

  const warning = (message: string, title?: string) =>
    Swal.fire({
      title: title || 'Advertencia',
      text: message,
      icon: 'warning',
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'OK',
      timer: 4500,
      timerProgressBar: true,
    });

  const confirm = async (message: string, title?: string): Promise<boolean> => {
    // Usar SweetAlert2 para confirmaciones
    const result = await Swal.fire({
      title: title || '¿Confirmar?',
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#002855',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      focusCancel: true,
    });
    return result.isConfirmed;
  };

  return { success, error, info, warning, confirm };
}

