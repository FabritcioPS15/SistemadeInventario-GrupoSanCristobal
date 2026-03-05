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
    <div className="fixed inset-0 bg-[#001529]/85 backdrop-blur-md flex items-center justify-center p-0 md:p-8 z-[100] animate-in fade-in duration-300">
      <div className={`bg-white w-full h-full md:h-[85vh] ${maxWidthClass} rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10`}>
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
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-gray-50/50">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-center gap-3 text-rose-800">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
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
              className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar'}
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
    <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-50 pb-4">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-6 ${colorClasses[color]} rounded-full`}></div>
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">{title}</h3>
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
}: { 
  className?: string; 
  error?: string;
  [key: string]: any;
}) {
  const baseClasses = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900 placeholder-gray-400";
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
}: { 
  className?: string; 
  error?: string;
  children: ReactNode;
  [key: string]: any;
}) {
  const baseClasses = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900";
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
}: { 
  className?: string; 
  error?: string;
  rows?: number;
  [key: string]: any;
}) {
  const baseClasses = "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-900 placeholder-gray-400 resize-none";
  const errorClasses = error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "";
  
  return (
    <textarea 
      rows={rows}
      className={`${baseClasses} ${errorClasses} ${className}`}
      {...props}
    />
  );
}
