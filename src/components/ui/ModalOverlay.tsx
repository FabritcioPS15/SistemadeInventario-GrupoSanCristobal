import { ReactNode, useEffect } from 'react';
import { useLayoutInset } from '../../contexts/LayoutContext';

type ModalOverlayProps = {
  children: ReactNode;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  lockScroll?: boolean;
  className?: string;
};

/**
 * Fondo de modal alineado al área de contenido (respeta sidebar expandido/colapsado).
 */
export default function ModalOverlay({
  children,
  onClose,
  closeOnBackdrop = false,
  lockScroll = true,
  className = 'bg-slate-900/60 backdrop-blur-sm',
}: ModalOverlayProps) {
  const inset = useLayoutInset();

  useEffect(() => {
    if (!lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lockScroll]);

  return (
    <div
      className={`${inset} flex items-stretch sm:items-center justify-center p-0 sm:p-3 md:p-5 lg:p-6 animate-in fade-in duration-300 sm:overflow-y-auto ${className}`}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}
