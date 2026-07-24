/**
 * Formulario modal de un solo paso.
 *
 * ⚠️ Para formularios con 2+ pasos usa MultiStepForm (más moderno).
 * ⚠️ BaseForm se mantiene para formularios simples.
 *
 * Componentes exportados:
 *   FormGrid    — cuadrícula responsiva (columns={1|2|3|4})
 *   FormSection — sección con título y colores
 *   FormField   — label + required + error wrapper
 *   FormInput   — input estilizado
 *   FormSelect  — select estilizado
 *   FormTextarea — textarea estilizado
 *
 * PATRÓN: Todos los módulos usan estos componentes de formulario
 * para mantener consistencia visual.
 */

import { ReactNode } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import ModalOverlay from '../ui/ModalOverlay';
import { DetailModalHeader, DetailModalBody } from '../ui/DetailModal';

type BaseFormProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  children: ReactNode;
  error?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  icon?: ReactNode;
  showChangesWarning?: boolean;
  headerActions?: ReactNode;
};

export default function BaseForm({
  title,
  subtitle,
  onClose,
  onSubmit,
  loading = false,
  children,
  error,
  maxWidth = '6xl',
  icon,
  showChangesWarning = false,
  headerActions,
}: BaseFormProps) {
  const maxWidthClass = {
    sm: 'max-w-full sm:max-w-sm',
    md: 'max-w-full sm:max-w-md',
    lg: 'max-w-full sm:max-w-lg',
    xl: 'max-w-full sm:max-w-xl',
    '2xl': 'max-w-full sm:max-w-2xl',
    '3xl': 'max-w-full sm:max-w-3xl',
    '4xl': 'max-w-full sm:max-w-4xl',
    '5xl': 'max-w-full sm:max-w-5xl',
    // Updated width for modern SaaS modal (approx 1000px)
    '6xl': 'max-w-full sm:max-w-[1000px]',
    '7xl': 'max-w-full sm:max-w-7xl',
  }[maxWidth];

  return (
    <ModalOverlay className="bg-slate-900/40 backdrop-blur-sm">
      <div
        className={`bg-white w-full sm:max-h-[90vh] ${maxWidthClass} rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <DetailModalHeader>
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-1">
            {icon && (
              <div className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 bg-white/10 border border-white/20 flex items-center justify-center text-white">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-base md:text-[18px] font-black text-white tracking-tight leading-snug line-clamp-2 sm:line-clamp-1">{title}</h2>
              {subtitle && (
                <p className="text-[9px] sm:text-[10px] font-bold text-blue-200 tracking-wide mt-1 flex items-start sm:items-center gap-1.5">
                  <span className="line-clamp-2 sm:truncate">{subtitle}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-white/50 hover:text-white hover:bg-white/10 transition-all -mr-1 rounded-none"
              disabled={loading}
              aria-label="Cerrar detalle"
            >
              <X size={22} />
            </button>
          </div>
        </DetailModalHeader>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <DetailModalBody>
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 flex items-center gap-3 text-rose-800">
                <AlertCircle size={20} />
                <p className="text-[11px] font-black tracking-widest">{error}</p>
              </div>
            )}
            {children}
          </DetailModalBody>

          <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {showChangesWarning && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle size={14} />
                <span className="text-[10px] font-black tracking-widest">Cambios sin guardar</span>
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 sm:py-2.5 min-h-[44px] text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 bg-slate-200 hover:bg-slate-300 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 sm:py-2.5 min-h-[44px] text-[10px] font-black uppercase tracking-[0.2em] text-white bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Procesando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ─── FormGrid ─────────────────────────────────────────────────────────────────
// Componente de cuadrícula reutilizable. Úsalo dentro de FormSection para
// distribuir campos en 1, 2, 3 o 4 columnas de manera responsiva.
export function FormGrid({
  children,
  columns = 3,
  className = '',
}: {
  children: ReactNode;
  /** Número de columnas en pantallas grandes (≥ lg). Responsivo automático. */
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const gridClass: Record<1 | 2 | 3 | 4, string> = {
    1: 'grid grid-cols-1 gap-4',
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
    4: 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  };
  return <div className={`${gridClass[columns]} ${className}`}>{children}</div>;
}

// ─── FormSection ──────────────────────────────────────────────────────────────
// Form Section Component
export function FormSection({
  title,
  children,
  color = 'blue',
  className = '',
  titleRight,
  icon,
  columns,
}: {
  title: string;
  children: ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';
  className?: string;
  titleRight?: ReactNode;
  icon?: ReactNode;
  /** Si se indica, los hijos se envuelven automáticamente en un FormGrid con ese número de columnas.
   *  Útil para no tener que escribir <div className="grid ..."> en cada sección. */
  columns?: 1 | 2 | 3 | 4;
}) {
  const colorClasses = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <section className={`bg-white rounded-lg border border-slate-100 p-4 space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-5 ${colorClasses[color]}`}></div>
          {icon && <span className="text-slate-400">{icon}</span>}
          <h3 className="text-[11px] font-black text-blue-900 tracking-[0.2em]">{title}</h3>
        </div>
        {titleRight && (
          <div className="flex items-center">
            {titleRight}
          </div>
        )}
      </div>
      {columns !== undefined ? (
        <FormGrid columns={columns}>{children}</FormGrid>
      ) : (
        children
      )}
    </section>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
// Form Field Component
export function FormField({
  label,
  required = false,
  error,
  children,
  className = '',
  gridCols = 1,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
  gridCols?: number;
}) {
  const gridClass = gridCols > 1 ? `md:col-span-${gridCols}` : '';

  return (
    <div className={`flex flex-col ${className} ${gridClass}`}>
      <label className="flex items-end text-[9px] font-black text-gray-400 mb-1.5 ml-1 h-[24px]">
        <span className="line-clamp-2 leading-tight">
          {label} {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      </label>
      <div className="relative w-full">
        {children}
      </div>
      {error && (
        <p className="text-red-500 text-[10px] font-semibold mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
}

// ─── FormInput ────────────────────────────────────────────────────────────────
// Input Component
export function FormInput({
  className = '',
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const baseClasses = 'w-full px-3 py-2 h-10 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-[11px] font-black text-[#002855] tracking-[0.1em] placeholder:text-slate-300';
  const errorClasses = error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : '';
  return (
    <input
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
}

// ─── FormSelect ───────────────────────────────────────────────────────────────
// Select Component
export function FormSelect({
  className = '',
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  const baseClasses = 'w-full px-3 py-2 h-10 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-[11px] font-black text-[#002855] tracking-[0.1em] appearance-none cursor-pointer';
  const errorClasses = error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : '';

  return (
    <div className="relative">
      <select
        className={`${baseClasses} ${errorClasses} ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ─── FormTextarea ─────────────────────────────────────────────────────────────
// Textarea Component
export function FormTextarea({
  className = '',
  error,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  const baseClasses = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-[11px] font-black text-[#002855] tracking-[0.1em] placeholder:text-slate-300 resize-none';
  const errorClasses = error ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : '';

  return (
    <textarea
      rows={rows}
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
}
