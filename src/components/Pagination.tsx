import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
    children?: React.ReactNode;
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    children,
}: PaginationProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="bg-[#002855] px-6 py-4 border-t border-white/10 relative">
            <div className="flex flex-col xl:flex-row items-center justify-between gap-6 relative z-10">
                {/* Left Section: Info & Items Per Page */}
                <div className="flex flex-col sm:flex-row items-center gap-6 w-full xl:w-auto">
                    {/* Item count info */}
                    <div className="flex items-center gap-3 bg-white px-4 py-2 border border-blue-900/50 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                            Mostrando <span className="text-[#002855] text-[11px] font-black">{startItem}</span> - <span className="text-[#002855] text-[11px] font-black px-2">{endItem}</span>
                            EN TOTAL: <span className="text-[#002855] text-[11px] font-black ml-1">{totalItems}</span>
                        </p>
                    </div>

                    {/* Items per page selector */}
                    <div className="flex items-center gap-3">
                        <label htmlFor="itemsPerPage" className="text-[10px] font-black text-white/50 uppercase tracking-widest">
                            Por página:
                        </label>
                        <select
                            id="itemsPerPage"
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                            className="bg-white border-transparent text-[11px] font-black text-[#002855] px-4 py-2 hover:bg-slate-50 transition-all outline-none cursor-pointer shadow-sm"
                        >
                            <option value={10}>10 REGISTROS</option>
                            <option value={20}>20 REGISTROS</option>
                            <option value={50}>50 REGISTROS</option>
                            <option value={100}>100 REGISTROS</option>
                        </select>
                    </div>
                </div>

                {/* Right Section: Pagination Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2 w-full xl:w-auto">
                    {children}

                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#002855] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 group shadow-sm"
                    >
                        <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="hidden lg:flex items-center gap-1.5 mx-2">
                        {getPageNumbers().map((page, index) => (
                            <button
                                key={index}
                                onClick={() => typeof page === 'number' && onPageChange(page)}
                                disabled={page === '...'}
                                className={`w-10 h-10 flex items-center justify-center text-[11px] font-black transition-all shadow-sm ${page === currentPage
                                    ? 'bg-white text-[#002855] scale-110 z-10 shadow-lg'
                                    : page === '...'
                                        ? 'text-white/20 cursor-default cursor-not-allowed'
                                        : 'text-[#002855] bg-white border-transparent hover:bg-blue-50'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <div className="lg:hidden px-4 py-2.5 bg-white shadow-sm text-[10px] font-black text-[#002855] uppercase tracking-widest">
                        {currentPage} <span className="opacity-20 mx-1">/</span> {totalPages}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#002855] bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 group shadow-sm"
                    >
                        <span className="hidden sm:inline">Siguiente</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
