import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { supabase, Location, BranchAudit } from '../../lib/supabase';
import { AUDIT_QUESTIONS } from '../../lib/auditQuestions';

type AuditFormProps = {
    onClose: () => void;
    onSave: () => void;
    editAudit?: BranchAudit;
};

export default function AuditForm({ onClose, onSave, editAudit }: AuditFormProps) {
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        location_id: editAudit?.location_id || '',
        auditor_name: editAudit?.auditor_name || '',
        administrator_name: editAudit?.administrator_name || '',
        audit_date: editAudit?.audit_date || new Date().toISOString().split('T')[0],
        status: editAudit?.status || 'good' as any,
        score: editAudit?.score || 0,
        observations: editAudit?.observations || '',
        responses: editAudit?.responses || {}
    });

    const selectedLocation = locations.find(l => l.id === formData.location_id);
    const questions = selectedLocation ? AUDIT_QUESTIONS[selectedLocation.type as keyof typeof AUDIT_QUESTIONS] : [];

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        if (questions.length > 0) {
            const responseValues = Object.values(formData.responses) as number[];
            const totalPoints = responseValues.reduce((sum, val) => sum + val, 0);
            const maxPoints = questions.length * 5;
            const calculatedScore = Math.round((totalPoints / maxPoints) * 100);

            let calculatedStatus = 'good';
            if (calculatedScore >= 90) calculatedStatus = 'excellent';
            else if (calculatedScore >= 70) calculatedStatus = 'good';
            else if (calculatedScore >= 50) calculatedStatus = 'regular';
            else calculatedStatus = 'critical';

            setFormData(prev => ({
                ...prev,
                score: calculatedScore,
                status: calculatedStatus as any
            }));
        }
    }, [formData.responses, formData.location_id]);

    const fetchLocations = async () => {
        const { data } = await supabase
            .from('locations')
            .select('*')
            .order('name');
        if (data) setLocations(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (!formData.location_id) {
            setErrors(prev => ({ ...prev, location_id: 'La sede es requerida' }));
            return;
        }
        if (!formData.auditor_name.trim()) {
            setErrors(prev => ({ ...prev, auditor_name: 'El nombre del auditor es requerido' }));
            return;
        }
        if (!formData.administrator_name?.trim()) {
            setErrors(prev => ({ ...prev, administrator_name: 'El nombre del administrador es requerido' }));
            return;
        }

        setLoading(true);

        try {
            if (editAudit) {
                const { error } = await supabase
                    .from('branch_audits')
                    .update(formData)
                    .eq('id', editAudit.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('branch_audits')
                    .insert([formData]);

                if (error) throw error;
            }

            onSave();
        } catch (err: any) {
            console.error('Error saving audit:', err);
            setErrors({ submit: 'Error al guardar la auditoría: ' + err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'score' ? parseInt(value) || 0 : value
        }));
    };

    return (
        <div className="w-full">
            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                        {editAudit ? 'Edición de Registro de Auditoría' : 'Nuevo Registro de Auditoría'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6">
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3 text-red-700">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{errors.submit}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Sede / Planta Certificadora *
                            </label>
                            <select
                                name="location_id"
                                value={formData.location_id}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm font-medium"
                            >
                                <option value="">Seleccionar Sede</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                            {errors.location_id && <p className="text-red-600 text-[10px] mt-1 font-bold uppercase">{errors.location_id}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Fecha de Inspección *
                            </label>
                            <input
                                type="date"
                                name="audit_date"
                                value={formData.audit_date}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Nombre del Auditor Responsable *
                            </label>
                            <input
                                type="text"
                                name="auditor_name"
                                value={formData.auditor_name}
                                onChange={handleChange}
                                required
                                placeholder="Nombre y Apellidos"
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Nombre del Administrador (Evaluado) *
                            </label>
                            <input
                                type="text"
                                name="administrator_name"
                                value={formData.administrator_name}
                                onChange={handleChange}
                                required
                                placeholder="Nombre del Administrador"
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    {questions.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.2em] mb-4">Evaluación de Cumplimiento</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {questions.map(q => (
                                    <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-sm font-medium text-slate-700">{q.text}</span>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        responses: { ...prev.responses, [q.id]: val }
                                                    }))}
                                                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all ${formData.responses[q.id] === val
                                                        ? 'bg-slate-800 text-white scale-110 shadow-md'
                                                        : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200'
                                                        }`}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div className="p-4 bg-slate-900 rounded-lg text-white">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                Puntaje Calculado
                            </label>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-black leading-none">{formData.score}%</span>
                                <span className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                                    {formData.status === 'excellent' ? 'Excelente' :
                                        formData.status === 'good' ? 'Satisfactorio' :
                                            formData.status === 'regular' ? 'Regular' : 'Crítico'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                                Calificación Manual (Opcional)
                            </label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm font-medium"
                            >
                                <option value="excellent">Excelente</option>
                                <option value="good">Bueno</option>
                                <option value="regular">Regular</option>
                                <option value="critical">Crítico</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                            Observaciones Detalladas y Hallazgos
                        </label>
                        <textarea
                            name="observations"
                            value={formData.observations}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Describa de manera técnica los hallazgos encontrados..."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 transition-all text-sm font-medium resize-none"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 disabled:opacity-50 font-bold text-[10px] uppercase tracking-widest transition-all order-2 sm:order-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3 sm:py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm order-1 sm:order-2"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {editAudit ? 'Actualizar Registro' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
