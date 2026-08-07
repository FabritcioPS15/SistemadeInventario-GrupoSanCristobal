import React, { useState, useRef, useEffect } from 'react';
import { Settings2, X } from 'lucide-react';

interface ActionToolbarProps {
  searchComponent: React.ReactNode;
  children: React.ReactNode;
  totalItems?: number;
  label?: string;
}

export default function ActionToolbar({ searchComponent, children, totalItems, label }: ActionToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative">
      {totalItems !== undefined && (
        <div className="absolute -top-3 -left-3 hidden md:block">
          <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-tight shadow-xl">
            {totalItems} {label || 'Registros'}
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-2 w-full">
        <div className="flex-1 relative">
          {searchComponent}
        </div>
        
        {/* Botón Herramientas (Solo Móvil) */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex-shrink-0 px-4 py-3 bg-[#002855] text-white rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          {isOpen ? <X size={18} /> : <Settings2 size={18} />}
        </button>
      </div>

      {/* Controles: En desktop se ven en fila (flex), en móvil aparecen en un menú flotante cuando isOpen es true */}
      <div 
        ref={menuRef}
        className={`md:flex md:flex-wrap md:items-center md:gap-2 md:relative md:bg-transparent md:border-0 md:p-0 md:shadow-none md:mt-0 z-50
          ${isOpen 
            ? 'flex flex-col items-stretch absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl p-4 mt-2 rounded-b-lg' 
            : 'hidden'
          }`}
      >
        {children}
      </div>
    </div>
  );
}
