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
      title={
        active
          ? selectedCount > 0
            ? `Desactivar modo selección (${selectedCount} seleccionados)`
            : 'Desactivar modo de selección'
          : 'Activar modo de selección'
      }
      className={`relative flex items-center justify-center p-3 border transition-all ${
        active
          ? 'bg-[#002855] text-white border-[#002855] shadow-sm'
          : 'bg-white text-slate-500 border-slate-200 hover:border-[#002855]/40 hover:text-[#002855]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {active ? <CheckSquare size={16} /> : <Square size={16} />}
      {active && selectedCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-sm">
          {selectedCount}
        </span>
      )}
    </button>
  );
}
