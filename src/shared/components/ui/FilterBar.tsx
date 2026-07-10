import { X, LucideIcon } from 'lucide-react';
import FilterSelect from './FilterSelect';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  placeholder: string;
  icon?: LucideIcon;
  iconClassName?: string;
  wrapperClassName?: string;
  multiple?: boolean;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string | string[]>;
  onChange: (key: string, value: string | string[]) => void;
  onClearAll?: () => void;
  hideClearButton?: boolean;
}

export default function FilterBar({
  filters,
  values,
  onChange,
  onClearAll,
  hideClearButton = false,
}: FilterBarProps) {
  const hasActiveFilters = filters.some(f => {
    const v = values[f.key];
    if (Array.isArray(v)) return v.length > 0;
    return v !== '' && v !== undefined && v !== null;
  });

  return (
    <>
      {filters.map(f => (
        <FilterSelect
          key={f.key}
          icon={f.icon}
          iconClassName={f.iconClassName}
          value={values[f.key] ?? (f.multiple ? [] : '')}
          onChange={(e) => onChange(f.key, e.target.value)}
          wrapperClassName={f.wrapperClassName}
          multiple={f.multiple}
        >
          <option value="">{f.placeholder}</option>
          {f.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </FilterSelect>
      ))}
      {!hideClearButton && hasActiveFilters && onClearAll && (
        <button
          onClick={onClearAll}
          className="w-full md:w-auto flex items-center justify-center p-3 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
          title="Limpiar Filtros"
        >
          <X size={18} className="md:block hidden" />
          <span className="md:hidden text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><X size={14} /> Limpiar Filtros</span>
        </button>
      )}
    </>
  );
}
