import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  iconStyle?: 'arrows' | 'characters';
  className?: string;
}

export default function SortableTableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  iconStyle = 'characters',
  className = '',
}: SortableTableHeaderProps) {
  const isSorted = sortConfig?.key === sortKey;
  const direction = sortConfig?.direction;

  const renderSortIcon = () => {
    if (iconStyle === 'arrows') {
      if (isSorted) {
        return direction === 'asc' ? (
          <ChevronUp size={12} className="text-[#002855]" />
        ) : (
          <ChevronDown size={12} className="text-[#002855]" />
        );
      }
      return <ArrowUpDown size={12} className="text-slate-300 opacity-50" />;
    }

    // characters style
    if (isSorted) {
      return (
        <span className="text-[#002855] text-[10px]">
          {direction === 'asc' ? '▲' : '▼'}
        </span>
      );
    }
    return <span className="text-slate-300 text-[10px] opacity-50">▲▼</span>;
  };

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1.5 hover:text-[#002855] text-slate-400 transition-colors ${className}`}
    >
      <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">
        {label}
      </span>
      {renderSortIcon()}
    </button>
  );
}
