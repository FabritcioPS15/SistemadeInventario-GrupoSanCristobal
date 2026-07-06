import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  viewMode: 'grid' | 'table';
  onChange: (mode: 'grid' | 'table') => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex bg-slate-100 p-1 border border-slate-200 w-full md:w-auto justify-center">
      <button
        type="button"
        onClick={() => onChange('grid')}
        title="Vista Cuadrícula"
        className={`flex-1 md:flex-none p-1.5 flex items-center justify-center transition-all ${
          viewMode === 'grid'
            ? 'bg-white text-[#002855] shadow-sm'
            : 'text-slate-400 hover:text-[#002855]'
        }`}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        title="Vista Tabla"
        className={`flex-1 md:flex-none p-1.5 flex items-center justify-center transition-all ${
          viewMode === 'table'
            ? 'bg-white text-[#002855] shadow-sm'
            : 'text-slate-400 hover:text-[#002855]'
        }`}
      >
        <List size={16} />
      </button>
    </div>
  );
}
