import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="hidden md:block overflow-hidden relative group/table">
      <div className="overflow-x-auto">
        <table className={`w-full text-left border-collapse border-spacing-0 ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <thead className={`bg-slate-50/70 border-b border-slate-200/80 backdrop-blur-sm ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '', onClick, onDoubleClick }: { children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void; onDoubleClick?: (e: React.MouseEvent) => void }) {
  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`hover:bg-slate-50/80 transition-colors duration-150 group relative border-b border-slate-100 last:border-0 odd:bg-white even:bg-slate-50/20 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({ 
  children, 
  className = '', 
  sortable, 
  isSorted, 
  sortDirection, 
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string; 
  sortable?: boolean; 
  isSorted?: boolean; 
  sortDirection?: 'asc' | 'desc'; 
  onClick?: () => void;
}) {
  return (
    <th className={`px-4 py-4 text-left whitespace-nowrap overflow-hidden text-ellipsis ${className}`}>
      {sortable ? (
        <button 
          onClick={onClick} 
          className="flex items-center gap-1.5 hover:text-[#002855] text-slate-400 transition-colors"
        >
          <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">{children}</span>
          {isSorted ? (
            <span className="text-[#002855] text-[10px]">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          ) : (
            <span className="text-slate-300 text-[10px] opacity-50">▲▼</span>
          )}
        </button>
      ) : (
        <span className="text-[11px] font-black text-[#002855] uppercase tracking-[0.15em]">{children}</span>
      )}
    </th>
  );
}

export function TableCell({ children, className = '', colSpan, onClick, noTruncate }: { children: React.ReactNode; className?: string; colSpan?: number; onClick?: (e: React.MouseEvent) => void; noTruncate?: boolean }) {
  return (
    <td colSpan={colSpan} onClick={onClick} className={`px-4 py-4 text-left ${className}`}>
      <div className={noTruncate ? '' : 'truncate max-w-[200px]'}>
        {children}
      </div>
    </td>
  );
}
