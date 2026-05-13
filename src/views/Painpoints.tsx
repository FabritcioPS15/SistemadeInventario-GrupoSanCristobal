import { useState } from 'react';
import { Zap, Plus, Star, X, LayoutGrid, List, AlertTriangle, ArrowRight } from 'lucide-react';
import { useHeaderVisible } from '../hooks/useHeaderVisible';
import HeaderSearch from '../components/layout/HeaderSearch';

export default function Painpoints() {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const isHeaderVisible = useHeaderVisible(localStorage.getItem('header_pinned') === 'true');

    // Mock data for the demonstration of the new UI
    const painpoints = [
        { id: 'PP-001', category: 'Infraestructura', title: 'Caída de Enlace Principal', location: 'Sede Ate', status: 'Crítico', date: '2024-04-06' },
        { id: 'PP-002', category: 'Equipamiento', title: 'Falla en Servidor de Cámaras', location: 'Sede Ica', status: 'Alto', date: '2024-04-05' },
        { id: 'PP-003', category: 'Seguridad', title: 'Vulnerabilidad en Acceso Biométrico', location: 'Sede Pro', status: 'Medio', date: '2024-04-04' }
    ];

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            <div className={`bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30 font-sans transition-transform duration-500 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex items-center gap-4">
                    <div className="bg-amber-600 p-2 text-white shadow-lg">
                        <Zap size={18} />
                    </div>
                    <div className="hidden lg:block">
                        <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-[0.15em] leading-none">Puntos Críticos</h2>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-[#64748b] uppercase tracking-widest mt-1">
                            <span>Seguimiento de Fallas</span>
                            <div className="w-1 h-1 bg-gray-300 rounded-none" />
                            <span>Dashboard Corporativo</span>
                        </div>
                    </div>
                </div>

                <HeaderSearch
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Filtrar incidencia..."
                    variant="light"
                />

                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-50 p-1 border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 transition-all ${viewMode === 'grid' ? 'bg-white text-amber-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 transition-all ${viewMode === 'list' ? 'bg-white text-amber-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>

                    <button className="px-5 py-2 bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all border border-amber-500 shadow-md flex items-center gap-2 group">
                        <Plus size={14} className="group-hover:rotate-90 transition-transform" />
                        NUEVO REPORTE
                    </button>
                </div>
            </div>

            <div className="p-8 space-y-8 flex-1 overflow-y-auto max-w-[1600px] mx-auto w-full">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-amber-600 rounded-none" />
                        <h3 className="text-[14px] font-black text-[#002855] uppercase tracking-[0.2em]">Registro de Incidencias</h3>
                        <span className="bg-amber-50 text-amber-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-amber-100">{painpoints.length} ACTIVOS</span>
                    </div>
                </div>

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {painpoints.map(pp => (
                            <div key={pp.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all duration-300 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-amber-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 italic px-2 py-0.5 bg-amber-50 border border-amber-100 inline-block w-fit">{pp.category}</span>
                                            <span className="text-[8px] font-mono text-slate-300 font-bold uppercase tracking-widest">REG: {pp.id}</span>
                                        </div>
                                        <div className="p-2 bg-slate-50 text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                            <AlertTriangle size={16} />
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-[15px] font-black text-[#002855] uppercase tracking-tight mb-4 leading-tight group-hover:text-amber-600 transition-colors">{pp.title}</h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-2">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest">Sede Afectada</span>
                                            <span className="font-black text-[#002855] uppercase">{pp.location}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-2">
                                            <span className="font-bold text-slate-400 uppercase tracking-widest">Prioridad Técnica</span>
                                            <span className={`font-black uppercase tracking-widest ${pp.status === 'Crítico' ? 'text-rose-600' : 'text-amber-600'}`}>{pp.status}</span>
                                        </div>
                                    </div>

                                    <button className="mt-8 w-full py-4 border border-slate-100 bg-slate-50 text-[10px] font-black text-[#002855] uppercase tracking-[0.2em] hover:bg-[#002855] hover:text-white transition-all flex items-center justify-center gap-2 group/btn">
                                        VER ANÁLISIS DE CAUSA
                                        <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">ID</th>
                                    <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Incidencia / Categoría</th>
                                    <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Ubicación</th>
                                    <th className="px-4 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Estado</th>
                                    <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Falla</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {painpoints.map(pp => (
                                    <tr key={pp.id} className="hover:bg-amber-50/30 cursor-pointer transition-all duration-200 group border-b border-slate-50 last:border-0">
                                        <td className="px-8 py-6">
                                            <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest">{pp.id}</span>
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black text-[#002855] uppercase tracking-tight group-hover:text-amber-600 transition-colors uppercase">{pp.title}</span>
                                                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1 italic">{pp.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6">
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{pp.location}</span>
                                        </td>
                                        <td className="px-4 py-6 text-center">
                                            <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest border ${pp.status === 'Crítico' ? 'border-rose-200 text-rose-600 bg-rose-50/50' : 'border-amber-200 text-amber-600 bg-amber-50/50'}`}>{pp.status}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="text-[10px] font-black text-[#002855] hover:text-amber-600 uppercase tracking-widest">VER DETALLE →</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

