import { Calendar } from 'lucide-react';

export default function Vacations() {
    return (
        <div className="w-full px-4 py-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">Vacaciones</h2>
                <p className="text-slate-600">Gestión de vacaciones y ausencias del personal</p>
            </div>

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
    );
}
