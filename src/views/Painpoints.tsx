import { useState } from 'react';
import { Zap, Plus, Search, Star, X } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';

export default function Painpoints() {
    const [searchTerm, setSearchTerm] = useState('');
    const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            {/* Standard Application Header (h-14) */}
            <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-4">
                    <div className="bg-[#f1f5f9] p-2 rounded-xl text-amber-600">
                        <Zap size={20} />
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider line-none">Painpoints</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
                            <span>Gestión de Críticos</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span>Dashboard GS</span>
                        </div>
                    </div>
                </div>

                {/* Integrated Search Bar in Header */}
                <div className="flex-1 max-w-md px-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar puntos críticos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
                        <button
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-amber-600 transition-colors"
                            title="Nuevo Painpoint"
                        >
                            <Plus size={22} />
                        </button>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
                        <Star size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-rose-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Standard Dashboard Content Layout */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">

                {/* Control Bar (Simplified) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 mb-6">
                    <div className="flex flex-wrap gap-3">
                        <button className="flex-1 sm:flex-none px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm text-center">Todos</button>
                        <button className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-400 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all text-center">Críticos</button>
                    </div>
                </div>

                {/* Empty State / Content Area */}
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-[#f1f5f9] rounded-2xl flex items-center justify-center text-amber-300 border-2 border-dashed border-slate-200 mb-6 group hover:scale-110 transition-transform duration-500">
                        <Zap size={32} />
                    </div>
                    <h3 className="text-lg font-black text-[#001529] uppercase tracking-tight mb-2">Módulo de Painpoints</h3>
                    <p className="text-slate-500 max-w-sm font-medium text-sm">
                        Estamos integrando este módulo con la base de datos para seguimiento de cuellos de botella.
                    </p>
                </div>
            </div>
        </div>
    );
}
