import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'slate';
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    icon: 'text-blue-600',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-100',
    icon: 'text-green-600',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-100',
    icon: 'text-orange-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    icon: 'text-red-600',
  },
  slate: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-100',
    icon: 'text-slate-600',
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  onClick,
  className = '',
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-none p-4 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {label}
          </p>
          <p className="text-[24px] font-black text-[#002855] leading-none">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-[10px] font-bold ${
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-[9px] text-slate-400 font-semibold">
                vs mes anterior
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-none flex items-center justify-center ${colors.bg} ${colors.icon}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
