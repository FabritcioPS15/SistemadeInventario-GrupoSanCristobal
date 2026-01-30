import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

type TicketFormProps = {
    onClose: () => void;
    onSave: () => void;
};

export default function TicketForm({ onClose, onSave }: TicketFormProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
        location_id: ''
    });
    const [locations, setLocations] = useState<any[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        const { data } = await api.from('locations').select('id, name');
        if (data) setLocations(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: submitError } = await supabase
                .from('tickets')
                .insert([
                    {
                        ...formData,
                        requester_id: user?.id,
                        status: 'open'
                    }
                ]);

            if (submitError) throw submitError;
            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-[#001529]/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-white/20">
                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-[#001529] tracking-tight uppercase">Nuevo Caso de Soporte</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registro formal de incidencia técnica</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-rose-50 rounded-2xl transition-all text-slate-400 hover:text-rose-500">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {error && (
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 text-xs font-bold border border-rose-100">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-3 bg-blue-600 rounded-full"></div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Asunto del Problema</label>
                        </div>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 shadow-inner"
                            placeholder="Ej: Falla en Conectividad de Red Local"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Categorización</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 cursor-pointer shadow-inner appearance-none"
                            >
                                <option value="hardware">HARDWARE / EQUIPOS</option>
                                <option value="software">SOFTWARE / APPS</option>
                                <option value="network">RED / CONECTIVIDAD</option>
                                <option value="access">ACCESOS / CUENTAS</option>
                                <option value="other">OTROS TEMAS</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Nivel de Prioridad</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 cursor-pointer shadow-inner appearance-none"
                            >
                                <option value="low">BAJA (Consulta)</option>
                                <option value="medium">MEDIA (Operativa)</option>
                                <option value="high">ALTA (Restricción)</option>
                                <option value="critical">CRÍTICA (Bloqueo)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Ubicación / Sede Afectada</label>
                        <select
                            required
                            value={formData.location_id}
                            onChange={e => setFormData({ ...formData, location_id: e.target.value })}
                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 cursor-pointer shadow-inner appearance-none"
                        >
                            <option value="">SELECCIONE UNA SEDE...</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Descripción de la Incidencia</label>
                        <textarea
                            required
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700 resize-none shadow-inner"
                            placeholder="Describa el problema con precisión técnica..."
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Anular
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3 border border-blue-400/30"
                        >
                            {loading ? 'Procesando...' : (
                                <>
                                    <Save size={18} />
                                    Generar Ticket
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

