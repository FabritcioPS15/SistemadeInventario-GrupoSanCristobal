interface PageHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  countLabel?: string;
  actions?: React.ReactNode;
  showCountBadge?: boolean;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  count,
  countLabel,
  actions,
  showCountBadge = false,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-none p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm hover:shadow-md transition-all relative ${className}`}>
      {showCountBadge && count !== undefined && (
        <div className="absolute -top-3 -left-3">
          <div className="bg-[#002855] text-white px-3 py-1 text-[10px] font-black uppercase tracking-tight shadow-xl">
            {count} {countLabel || ''}
          </div>
        </div>
      )}
      
      <div className="flex-1">
        <h1 className="text-[13px] font-black text-[#002855] uppercase tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
            {subtitle}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
