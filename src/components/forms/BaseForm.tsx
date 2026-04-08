import { ReactNode } from 'react';
import { X, AlertCircle, Loader2 } from 'lucide-react';

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
  showChangesWarning = false
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
    '6xl': 'max-w-full sm:max-w-6xl',
    '7xl': 'max-w-full sm:max-w-7xl'
  }[maxWidth];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 md:p-8 z-[100] animate-in fade-in duration-300">
      <div className={`bg-white w-full h-full md:h-[90vh] ${maxWidthClass} rounded-none shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200`}>
        {/* Header Corporativo (Cuadrado) */}
        <div className="bg-[#001529] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="w-10 h-10 bg-blue-500/10 rounded-none flex items-center justify-center border border-blue-500/20">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] leading-tight">{title}</h2>
              {subtitle && <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-none transition-all"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-gray-50/50">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-none p-4 flex items-center gap-3 text-rose-800">
                <AlertCircle size={20} />
                <p className="text-[11px] font-black uppercase tracking-widest">{error}</p>
              </div>
            )}

            {children}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 bg-white border border-slate-200 rounded-none hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-none hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Procesando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Form Section Component
export function FormSection({
  title,
  children,
  color = 'blue',
  className = '',
  titleRight
}: {
  title: string;
  children: ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo';
  className?: string;
  titleRight?: ReactNode;
}) {
  const colorClasses = {
    blue: 'bg-blue-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500'
  };

  return (
    <section className={`bg-white rounded-none border border-slate-100 p-8 space-y-8 ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-50 pb-5">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-5 ${colorClasses[color]}`}></div>
          <h3 className="text-[11px] font-black text-[#002855] uppercase tracking-[0.2em]">{title}</h3>
        </div>
        {titleRight && (
          <div className="flex items-center">
            {titleRight}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

// Form Field Component
export function FormField({
  label,
  required = false,
  error,
  children,
  className = '',
  gridCols = 1
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
    <div className={`space-y-1.5 ${className} ${gridClass}`}>
      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-[10px] font-semibold mt-1 ml-1">{error}</p>
      )}
    </div>
  );
}

// Input Component
export function FormInput({
  className = '',
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const baseClasses = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-xs font-bold text-[#002855] uppercase tracking-wider placeholder:text-slate-300";
  const errorClasses = error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "";

  return (
    <input
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
}

// Select Component
export function FormSelect({
  className = '',
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  const baseClasses = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-xs font-bold text-[#002855] uppercase tracking-wider";
  const errorClasses = error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "";

  return (
    <select
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// Textarea Component
export function FormTextarea({
  className = '',
  error,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  const baseClasses = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-xs font-bold text-[#002855] uppercase tracking-wider placeholder:text-slate-300 resize-none";
  const errorClasses = error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "";

  return (
    <textarea
      rows={rows}
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
}
