import React from 'react';
import { Search } from 'lucide-react';

type Stat = {
    label: string;
    value: string | number;
    color?: string;
};

type ViewHeaderProps = {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    stats?: Stat[];
    searchTerm: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    isHeaderVisible?: boolean;
    children?: React.ReactNode;
};

export default function ViewHeader({
    icon,
    title,
    subtitle,
    stats = [],
    searchTerm,
    onSearchChange,
    searchPlaceholder = "Buscar...",
    isHeaderVisible = true,
    children
}: ViewHeaderProps) {
    return (
        <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="flex items-center gap-4">
                <div className="bg-[#f1f5f9] p-2 rounded-xl text-[#002855] border border-[#e2e8f0]">
                    {icon}
                </div>
                <div className="hidden lg:block">
                    <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider leading-none">{title}</h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-1">
                        <span>{subtitle}</span>
                        {stats.length > 0 && stats[0] && (
                            <>
                                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                <span>{stats[0].value} {stats[0].label}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Integrated Stats in Header */}
            {stats.length > 1 && (
                <div className="hidden xl:flex items-center gap-4 mx-6 border-l border-r border-slate-100 px-6">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="flex flex-col items-center">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{stat.label}</span>
                            <span className={`text-sm font-black leading-none mt-0.5 ${stat.color || 'text-gray-900'}`}>{stat.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Integrated Search Bar */}
            <div className="flex-1 max-w-md px-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#002855] transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    );
}
