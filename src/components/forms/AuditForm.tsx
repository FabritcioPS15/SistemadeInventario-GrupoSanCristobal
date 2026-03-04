import { useState, useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { supabase, Location, BranchAudit } from '../../lib/supabase';
import { AUDIT_QUESTIONS } from '../../lib/auditQuestions';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

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

    const fetchLocations = async () => {
        const { data } = await supabase
            .from('locations')
            .select('*')
            .order('name');
        if (data) setLocations(data);
    };

    const handleResponseChange = (questionId: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            responses: {
                ...prev.responses,
                [questionId]: value
            }
        }));
    };

    const calculateScore = () => {
        if (!questions.length) return 0;
        
        let totalScore = 0;
        let maxScore = 0;

        questions.forEach(question => {
            const response = formData.responses[question.id];
            if (response) {
                const points = (question as any).points || 10;
                if (response === 'yes') totalScore += points;
                if (response === 'partial') totalScore += Math.floor(points * 0.5);
                maxScore += points;
            }
        });

        return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Record<string, string> = {};

        if (!formData.location_id) {
            newErrors.location_id = 'La ubicación es requerida';
        }

        if (!formData.auditor_name.trim()) {
            newErrors.auditor_name = 'El nombre del auditor es requerido';
        }

        if (!formData.administrator_name.trim()) {
            newErrors.administrator_name = 'El nombre del administrador es requerido';
        }

        if (!formData.audit_date) {
            newErrors.audit_date = 'La fecha de auditoría es requerida';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            return;
        }

        setLoading(true);

        const score = calculateScore();
        const status = score >= 80 ? 'good' : score >= 60 ? 'regular' : 'bad';

        const dataToSave = {
            location_id: formData.location_id,
            auditor_name: formData.auditor_name.trim(),
            administrator_name: formData.administrator_name.trim(),
            audit_date: formData.audit_date,
            status,
            score,
            observations: formData.observations.trim() || null,
            responses: formData.responses,
            updated_at: new Date().toISOString(),
        };

        try {
            if (editAudit) {
                const { error } = await supabase
                    .from('branch_audits')
                    .update(dataToSave)
                    .eq('id', editAudit.id);

                if (error) {
                    setErrors({ submit: 'Error al actualizar la auditoría: ' + error.message });
                    setLoading(false);
                    return;
                }
            } else {
                const { error } = await supabase
                    .from('branch_audits')
                    .insert([dataToSave]);

                if (error) {
                    setErrors({ submit: 'Error al crear la auditoría: ' + error.message });
                    setLoading(false);
                    return;
                }
            }

            setLoading(false);
            onSave();
        } catch (err: any) {
            setErrors({ submit: 'Error inesperado: ' + err });
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <BaseForm
            title={editAudit ? 'Editar Auditoría' : 'Nueva Auditoría'}
            subtitle="Módulo de Auditoría de Sedes"
            onClose={onClose}
            onSubmit={handleSubmit}
            loading={loading}
            error={errors.submit}
            icon={<ClipboardList size={24} className="text-blue-600" />}
        >
            {/* Section: Información Principal */}
            <FormSection title="Información de la Auditoría" color="blue">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField label="Ubicación" required error={errors.location_id}>
                        <FormSelect
                            name="location_id"
                            value={formData.location_id}
                            onChange={handleChange}
                            required
                            error={errors.location_id}
                        >
                            <option value="">Seleccionar ubicación</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </FormSelect>
                    </FormField>

                    <FormField label="Nombre del Auditor" required error={errors.auditor_name}>
                        <FormInput
                            type="text"
                            name="auditor_name"
                            value={formData.auditor_name}
                            onChange={handleChange}
                            placeholder="Nombre completo del auditor"
                            required
                            error={errors.auditor_name}
                        />
                    </FormField>

                    <FormField label="Nombre del Administrador" required error={errors.administrator_name}>
                        <FormInput
                            type="text"
                            name="administrator_name"
                            value={formData.administrator_name}
                            onChange={handleChange}
                            placeholder="Nombre del administrador de la sede"
                            required
                            error={errors.administrator_name}
                        />
                    </FormField>

                    <FormField label="Fecha de Auditoría" required error={errors.audit_date}>
                        <FormInput
                            type="date"
                            name="audit_date"
                            value={formData.audit_date}
                            onChange={handleChange}
                            required
                            error={errors.audit_date}
                        />
                    </FormField>
                </div>
            </FormSection>

            {/* Section: Preguntas de Auditoría */}
            {selectedLocation && questions.length > 0 && (
                <FormSection title={`Preguntas de Auditoría - ${selectedLocation.name}`} color="emerald">
                    <div className="space-y-6">
                        {questions.map((question, index) => (
                            <div key={question.id} className="bg-white border rounded-lg p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 mb-2">{question.text}</h4>
                                        <div className="flex gap-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={`response-${question.id}`}
                                                    value="yes"
                                                    checked={formData.responses[question.id] === 'yes'}
                                                    onChange={() => handleResponseChange(question.id, 'yes')}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">Sí</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={`response-${question.id}`}
                                                    value="partial"
                                                    checked={formData.responses[question.id] === 'partial'}
                                                    onChange={() => handleResponseChange(question.id, 'partial')}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">Parcial</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={`response-${question.id}`}
                                                    value="no"
                                                    checked={formData.responses[question.id] === 'no'}
                                                    onChange={() => handleResponseChange(question.id, 'no')}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={`response-${question.id}`}
                                                    value="na"
                                                    checked={formData.responses[question.id] === 'na'}
                                                    onChange={() => handleResponseChange(question.id, 'na')}
                                                    className="mr-2"
                                                />
                                                <span className="text-sm">N/A</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-blue-900">Puntuación Estimada:</span>
                                <span className="text-2xl font-bold text-blue-900">{calculateScore()}%</span>
                            </div>
                        </div>
                    </div>
                </FormSection>
            )}

            {/* Section: Observaciones */}
            <FormSection title="Observaciones y Recomendaciones" color="amber">
                <FormField label="Observaciones" error={errors.observations}>
                    <FormTextarea
                        name="observations"
                        value={formData.observations}
                        onChange={handleChange}
                        placeholder="Detalles adicionales de la auditoría, hallazgos, recomendaciones, acciones correctivas..."
                        rows={6}
                        error={errors.observations}
                    />
                </FormField>
            </FormSection>
        </BaseForm>
    );
}
