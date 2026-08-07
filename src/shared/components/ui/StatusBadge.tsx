/**
 * Badge de estado con colores predefinidos.
 *
 * CÓMO AGREGAR UN NUEVO ESTADO:
 * 1. Agrega la entrada a defaultStatusMap (ej: "mi_estado": { label: "Mi Estado", color: "blue" })
 * 2. Asegúrate de que el color esté en colorClasses
 * 3. Si el color no existe, agrégalo: { bg, text, border, dot }
 *
 * TIP: usa customMap cuando el mapeo sea específico de un módulo
 * y no deba compartirse globalmente.
 */

interface StatusBadgeProps {
  status: string;
  customMap?: Record<string, { label: string; color: string }>;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const colorClasses: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[8px]',
  md: 'px-2 py-1 text-[9px]',
  lg: 'px-3 py-1.5 text-[10px]',
};

const defaultStatusMap: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'emerald' },
  activa: { label: 'Activa', color: 'emerald' },
  inactive: { label: 'Inactivo', color: 'slate' },
  inactiva: { label: 'Inactiva', color: 'slate' },
  maintenance: { label: 'Mantenimiento', color: 'amber' },
  extracted: { label: 'Extraído', color: 'rose' },
  pending: { label: 'Pendiente', color: 'orange' },
  in_progress: { label: 'En Proceso', color: 'blue' },
  en_proceso: { label: 'En Proceso', color: 'blue' },
  resolved: { label: 'Resuelto', color: 'emerald' },
  closed: { label: 'Cerrado', color: 'slate' },
  open: { label: 'Pendiente', color: 'orange' },
  shipped: { label: 'Enviado', color: 'blue' },
  in_transit: { label: 'En Tránsito', color: 'amber' },
  delivered: { label: 'Entregado', color: 'emerald' },
  returned: { label: 'Devuelto', color: 'rose' },
  completed: { label: 'Completado', color: 'emerald' },
  waiting_parts: { label: 'Espera Repuestos', color: 'orange' },
  damaged: { label: 'Dañado', color: 'red' },
  Operativo: { label: 'Operativo', color: 'emerald' },
  Inoperativo: { label: 'Inoperativo', color: 'slate' },
  'En Reparación': { label: 'En Reparación', color: 'amber' },
  Baja: { label: 'Baja', color: 'rose' },
};

export default function StatusBadge({
  status,
  customMap,
  size = 'md',
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const config = customMap?.[status] || defaultStatusMap[status] || { label: status, color: 'slate' };
  const colors = colorClasses[config.color] || colorClasses.slate;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-widest border rounded-none ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />}
      {config.label}
    </span>
  );
}
