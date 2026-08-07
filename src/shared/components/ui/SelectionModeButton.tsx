import { CheckSquare, Square } from 'lucide-react';

interface SelectionModeButtonProps {
  active: boolean;
  onClick: () => void;
  selectedCount?: number;
  disabled?: boolean;
}

export default function SelectionModeButton({ active, onClick, selectedCount = 0, disabled }: SelectionModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={active ? 'Desactivar modo de selección' : 'Activar modo de selección'}
      className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${
        active
          ? 'bg-[#002855] text-white border-[#002855] shadow-sm'
          : 'bg-white text-slate-500 border-slate-200 hover:border-[#002855]/40 hover:text-[#002855]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {active ? <CheckSquare size={14} /> : <Square size={14} />}
      {active && selectedCount > 0 ? `Seleccionados (${selectedCount})` : 'Seleccionar'}
    </button>
  );
}
