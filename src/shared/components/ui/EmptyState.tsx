import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Ícono de Lucide para mostrar */
  icon: LucideIcon;
  /** Título principal */
  title: string;
  /** Subtítulo (mensaje secundario) */
  subtitle?: string;
  /** Botón de acción opcional */
  action?: React.ReactNode;
  /** Clases adicionales del contenedor */
  className?: string;
}

/**
 * Estado vacío unificado para todas las páginas de la app.
 * 
 * Uso:
 * <EmptyState
 *   icon={Wrench}
 *   title="Sin mantenimientos"
 *   subtitle="Aún no se han registrado mantenimientos"
 * />
 */
export default function EmptyState({ icon: Icon, title, subtitle, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-none bg-slate-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-[#002855] opacity-30" />
      </div>
      <p className="text-[#002855] font-semibold uppercase text-xs tracking-widest mb-2">{title}</p>
      {subtitle && (
        <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-tight max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
