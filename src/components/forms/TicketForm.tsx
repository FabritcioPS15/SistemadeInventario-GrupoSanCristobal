import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
        const { data } = await supabase.from('locations').select('id, name');
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-slate-800">Nuevo Ticket de Soporte</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título del Problema</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                            placeholder="Ej: No conecta a internet"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                            >
                                <option value="hardware">Hardware</option>
                                <option value="software">Software</option>
                                <option value="network">Red / Internet</option>
                                <option value="access">Accesos / Cuentas</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</label>
                            <select
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sede Afectada</label>
                        <select
                            value={formData.location_id}
                            onChange={e => setFormData({ ...formData, location_id: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        >
                            <option value="">Seleccionar Sede...</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción Detallada</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium resize-none"
                            placeholder="Describa el problema con el mayor detalle posible..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-[#002855] text-white rounded-xl font-bold hover:bg-[#002855]/90 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Guardando...' : (
                                <>
                                    <Save size={18} />
                                    Crear Ticket
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
