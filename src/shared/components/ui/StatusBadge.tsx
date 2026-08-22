/**
 * Badge de estado con fondo suave resaltado.
 *
 * CÓMO AGREGAR UN NUEVO ESTADO:
 * 1. Agrega la entrada a defaultStatusMap (ej: "mi_estado": { label: "Mi Estado", color: "blue" })
 * 2. Asegúrate de que el color esté en colorClasses
 * 3. Si el color no existe, agrégalo al mapa colorClasses
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

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  slate: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-100 text-violet-700',
  teal: 'bg-teal-100 text-teal-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
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
  className = '',
}: StatusBadgeProps) {
  const config = customMap?.[status] || defaultStatusMap[status] || { label: status, color: 'slate' };
  const colorClass = colorClasses[config.color] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`text-[14px] font-semibold ${colorClass} ${className}`}>
      {config.label}
    </span>
  );
}
