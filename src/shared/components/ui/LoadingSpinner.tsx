interface LoadingSpinnerProps {
  /** Altura mínima del contenedor. Default: '40vh' */
  minHeight?: string;
  /** Tamaño del spinner en px. Default: 48 */
  size?: number;
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * Spinner de carga unificado.
 * Reemplaza todas las instancias de:
 *   <div className="flex items-center justify-center min-h-[40vh]">
 *     <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
 *   </div>
 */
export default function LoadingSpinner({ minHeight = '40vh', size = 48, className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center w-full ${className}`}
      style={{ minHeight }}
    >
      <div
        className="animate-spin rounded-full border-4 border-slate-200 border-t-[#002855]"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
