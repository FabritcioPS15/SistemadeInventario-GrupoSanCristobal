import { Plus, type LucideIcon } from 'lucide-react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ícono opcional (por defecto Plus) */
  icon?: LucideIcon;
  /** Texto del botón */
  children: React.ReactNode;
  /** Variante de color. Default: 'primary' */
  variant?: 'primary' | 'danger' | 'secondary';
  /** Si es true, ocupa todo el ancho en mobile */
  fullWidthMobile?: boolean;
}

const variantClasses = {
  primary: 'bg-[#002855] text-white hover:bg-blue-800',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
  secondary: 'bg-slate-700 text-white hover:bg-slate-800',
};

/**
 * Botón de acción principal unificado.
 * Reemplaza los 15+ botones bg-[#002855] idénticos en todas las páginas.
 *
 * Uso:
 * <PrimaryButton icon={Plus} onClick={...}>Nuevo Registro</PrimaryButton>
 * <PrimaryButton icon={Trash2} variant="danger">Eliminar</PrimaryButton>
 */
export default function PrimaryButton({
  icon: Icon = Plus,
  children,
  variant = 'primary',
  fullWidthMobile = true,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      {...props}
      className={`
        ${fullWidthMobile ? 'w-full md:w-auto' : ''}
        flex items-center justify-center gap-2
        px-4 py-3
        text-[10px] font-black uppercase tracking-widest
        transition-all shadow-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
