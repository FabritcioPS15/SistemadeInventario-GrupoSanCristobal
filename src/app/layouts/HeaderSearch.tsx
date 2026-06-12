import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface HeaderSearchProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    placeholder?: string;
    onSearch?: (value: string) => void;
    variant?: 'dark' | 'light';
}

export default function HeaderSearch({
    searchTerm,
    setSearchTerm,
    placeholder = "Buscar...",
    onSearch,
    variant = 'dark'
}: HeaderSearchProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    const handleBlur = () => {
        if (!searchTerm) {
            setIsExpanded(false);
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        setIsExpanded(false);
    };

    const bgClass = variant === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200';
    const focusBgClass = variant === 'dark' ? 'focus:bg-white/10' : 'focus:bg-white';
    const textClass = variant === 'dark' ? 'text-white' : 'text-slate-900';
    const placeholderClass = variant === 'dark' ? 'placeholder:text-white/20' : 'placeholder:text-slate-400';
    const iconClass = variant === 'dark' ? 'text-white/40' : 'text-slate-400';
    const activeIconClass = variant === 'dark' ? 'group-focus-within:text-blue-400' : 'group-focus-within:text-[#002855]';

    return (
        <div className={`flex items-center transition-all duration-300 ease-in-out ${isExpanded ? 'flex-1 max-w-md mx-4' : 'w-10 overflow-hidden'}`}>
            {isExpanded ? (
                <div className="relative group w-full animate-in slide-in-from-right-2 duration-300">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconClass} ${activeIconClass} transition-colors`} size={16} />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch?.(searchTerm)}
                        className={`w-full pl-9 pr-9 py-1.5 ${bgClass} border rounded-xl ${focusBgClass} focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all text-xs ${textClass} ${placeholderClass} font-medium`}
                    />
                    <button
                        onClick={handleClear}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconClass} hover:${textClass} transition-colors p-1 rounded-md hover:bg-white/10`}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsExpanded(true)}
                    className={`w-10 h-10 rounded-xl ${bgClass} border flex items-center justify-center ${iconClass} hover:text-white hover:bg-white/10 transition-all active:scale-95`}
                    title="Buscar"
                >
                    <Search size={20} />
                </button>
            )}
        </div>
    );
}
