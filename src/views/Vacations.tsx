import { Calendar, Star, X, Users } from 'lucide-react';

export default function Vacations() {
    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <div className="bg-white border-b border-[#e2e8f0] px-6 h-14 flex items-center justify-between shadow-sm sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="bg-[#f1f5f9] p-2 rounded-xl border border-[#e2e8f0]">
                        <Calendar className="text-[#002855]" size={20} />
                    </div>
                    <div>
                        <h1 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">GESTIÓN DE VACACIONES</h1>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#64748b] uppercase tracking-widest mt-0.5">
                            <span className="flex items-center gap-1"><Users size={10} /> CONTROL DE PERSONAL</span>
                            <span className="text-[#cbd5e1]">|</span>
                            <span className="bg-[#f1f5f9] px-2 py-0.5 rounded text-[#002855]">Próximamente</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Global Actions */}
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
                        <Star size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-[#002855] transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <Calendar size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-800 mb-2">Módulo en construcción</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Esta sección está siendo implementada. Próximamente podrás gestionar las solicitudes de vacaciones desde aquí.
                    </p>
                </div>
            </div>
        </div>
    );
}
