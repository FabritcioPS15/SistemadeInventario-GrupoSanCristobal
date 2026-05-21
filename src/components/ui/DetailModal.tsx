import { ReactNode } from 'react';
import ModalOverlay from './ModalOverlay';

type MaxWidth = 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '7xl';

const maxWidthClass: Record<MaxWidth, string> = {
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
  '7xl': 'sm:max-w-7xl',
};

type DetailModalProps = {
  children: ReactNode;
  maxWidth?: MaxWidth;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
};

/**
 * Shell responsivo para modales de detalle.
 * Móvil: pantalla completa bajo el header. Desktop: caja centrada con scroll interno.
 */
export default function DetailModal({
  children,
  maxWidth = '5xl',
  onClose,
  closeOnBackdrop = false,
}: DetailModalProps) {
  return (
    <ModalOverlay onClose={onClose} closeOnBackdrop={closeOnBackdrop}>
      <div
        className={`bg-white border-0 sm:border border-slate-200 shadow-2xl w-full min-w-0 ${maxWidthClass[maxWidth]} h-full sm:h-auto sm:max-h-[min(92vh,calc(100dvh-3.5rem-1.5rem))] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 mx-auto sm:rounded-sm`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </ModalOverlay>
  );
}

export function DetailModalHeader({
  children,
  className = 'bg-[#002855]',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`${className} px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5 flex items-start sm:items-center justify-between gap-2 sm:gap-3 shrink-0 relative`}
    >
      {children}
    </div>
  );
}

export function DetailModalBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-5 md:p-6 lg:p-8 min-h-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function DetailModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-50 border-t border-slate-200 px-3 py-3 sm:px-5 sm:py-4 md:px-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
      {children}
    </div>
  );
}

type GridLayout = 'default' | 'stack-until-xl';

/** Grilla de columnas: por defecto 1→2→3; stack-until-xl mantiene 1 columna hasta pantallas anchas */
export function DetailModalGrid({
  children,
  layout = 'default',
}: {
  children: ReactNode;
  layout?: GridLayout;
}) {
  const gridClass =
    layout === 'stack-until-xl'
      ? 'grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-5 md:gap-6 min-w-0'
      : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 md:gap-6 lg:gap-8 min-w-0';

  return <div className={gridClass}>{children}</div>;
}

/** Título de sección dentro del modal */
export function DetailModalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 sm:space-y-4 min-w-0">
      <div className="border-b border-slate-100 pb-1.5 sm:pb-2 flex items-center gap-2">
        <div className="w-1 h-3.5 sm:h-4 bg-blue-600 shrink-0" />
        <h3 className="text-[10px] sm:text-[11px] font-black text-[#002855] uppercase tracking-wide sm:tracking-widest">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/** Tarjeta interna con padding responsivo */
export function DetailModalCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-3 sm:p-4 bg-slate-50 border border-slate-100 min-w-0 ${className}`}>
      {children}
    </div>
  );
}

/** Fila etiqueta / valor apilada en móvil */
export function DetailModalRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center sm:gap-2">
      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <div className="min-w-0 sm:text-right">{children}</div>
    </div>
  );
}
