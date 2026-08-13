import { useState, useEffect } from 'react';
import { FileText} from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import type { SutranVisit, Location } from '../../../shared/services/supabase';
import { notifySutranVisitScheduled } from '../../../shared/services/notifications';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import { useNotify } from '../../../shared/hooks/useNotify';

interface SutranVisitFormProps {
  visit?: SutranVisit;
  onSave: () => void;
  onClose: () => void;
}

export default function SutranVisitForm({ visit, onSave, onClose }: SutranVisitFormProps) {
  const { success: notifySuccess } = useNotify();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    visit_date: visit?.visit_date || '',
    visit_type: visit?.visit_type || '',
    inspector_name: visit?.inspector_name || '',
    inspector_email: visit?.inspector_email || '',
    inspector_phone: visit?.inspector_phone || '',
    status: visit?.status || 'pending',
    location_id: visit?.location_id || '',
    observations: visit?.observations || '',
    findings: visit?.findings || '',
    recommendations: visit?.recommendations || '',
    documents: visit?.documents || [],
    evidence_url: visit?.evidence_url || '',
    estimated_duration: visit?.estimated_duration || '',
    estimated_cost: visit?.estimated_cost || ''
  });

  const [newDocument, setNewDocument] = useState('');

  const visitTypes = [
    { value: 'programada', label: 'Visita Programada' },
    { value: 'no_programada', label: 'Visita No Programada' },
    { value: 'de_gabinete', label: 'Visita de Gabinete' }
  ];

  const statuses = [
    { value: 'pending', label: 'Programada' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (visit) {
      setFormData({
        visit_date: visit.visit_date || '',
        visit_type: visit.visit_type || '',
        inspector_name: visit.inspector_name || '',
        inspector_email: visit.inspector_email || '',
        inspector_phone: visit.inspector_phone || '',
        status: visit.status || 'pending',
        location_id: visit.location_id || '',
        observations: visit.observations || '',
        findings: visit.findings || '',
        recommendations: visit.recommendations || '',
        documents: visit.documents || [],
        evidence_url: visit.evidence_url || '',
        estimated_duration: visit.estimated_duration || '',
        estimated_cost: visit.estimated_cost || ''
      });
    } else {
      setFormData({
        visit_date: '',
        visit_type: '',
        inspector_name: '',
        inspector_email: '',
        inspector_phone: '',
        status: 'pending',
        location_id: '',
        observations: '',
        findings: '',
        recommendations: '',
        documents: [],
        evidence_url: '',
        estimated_duration: '',
        estimated_cost: ''
      });
    }
    setNewDocument('');
    setErrors({});
  }, [visit]);

  const fetchLocations = async () => {
    try {
      const { error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (!error) {
        const { data } = await supabase
          .from('locations')
          .select('*')
          .order('name');

        if (data) {
          setLocations(data);
        }
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.visit_date) {
      newErrors.visit_date = 'La fecha de visita es requerida';
    }

    if (!formData.location_id) {
      newErrors.location_id = 'La ubicación es requerida';
    }

    if (!formData.visit_type) {
      newErrors.visit_type = 'El tipo de visita es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const location = locations.find(loc => loc.id === formData.location_id);

      const payload: any = {
        ...formData,
        location_id: formData.location_id || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost.toString()) : null,
        updated_at: new Date().toISOString(),
        ...(visit ? {} : { created_at: new Date().toISOString() }),
        location_name: location?.name || 'Sede desconocida'
      };

      if (visit) {
        const { error } = await supabase
          .from('sutran_visits')
          .update(payload)
          .eq('id', visit.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('sutran_visits')
          .insert([payload as any])
          .select()
          .single();

        if (error) throw error;

        // Enviar notificación de visita SUTRAN programada
        if (data) {
          await notifySutranVisitScheduled(
            location?.name || 'Sede desconocida',
            payload.visit_date,
            payload.inspector_name
          );
        }
      }

      notifySuccess(visit ? 'Visita SUTRAN actualizada correctamente' : 'Visita SUTRAN programada correctamente', visit ? 'Actualizada' : 'Programada');
      onSave();
    } catch (error: any) {
      console.error('Error al guardar visita:', error);
      setErrors({ submit: error.message || 'Error al guardar la visita' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addDocument = () => {
    if (newDocument.trim()) {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, newDocument.trim()]
      }));
      setNewDocument('');
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  return (
    <BaseForm
      title={visit ? 'Editar Visita SUTRAN' : 'Nueva Visita SUTRAN'}
      subtitle="Módulo de Gestión de Visitas SUTRAN"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      maxWidth="6xl"
      icon={<FileText size={18} className="text-white" />}
    >

            {/* Section: Información de la Visita */}
            <FormSection title="Información de la Visita" color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField label="Fecha de Visita" required error={errors.visit_date}>
                  <FormInput
                    type="date"
                    name="visit_date"
                    value={formData.visit_date}
                    onChange={handleChange}
                    required
                    error={errors.visit_date}
                  />
                </FormField>

                <FormField label="Tipo de Visita" required error={errors.visit_type}>
                  <FormSelect
                    name="visit_type"
                    value={formData.visit_type}
                    onChange={handleChange}
                    required
                    error={errors.visit_type}
                  >
                    <option value="">Seleccionar tipo</option>
                    {visitTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField label="Estado" required error={errors.status}>
                  <FormSelect
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    error={errors.status}
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>

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
              </div>
            </FormSection>



            {/* Section: Documentos */}
            <FormSection title="Documentos de la Visita" color="amber">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <FormInput
                    type="text"
                    value={newDocument}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDocument(e.target.value)}
                    placeholder="Nombre del documento..."
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={addDocument}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Agregar
                  </button>
                </div>

                {formData.documents.length > 0 && (
                  <div className="space-y-2">
                    {formData.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{doc}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormSection>

            {/* Section: Evidencias */}
            <FormSection title="Evidencias" color="indigo">
              <div className="space-y-4">
                <FormField label="Enlace de Evidencias (Google Drive, OneDrive, etc.)" error={errors.evidence_url}>
                  <FormInput
                    type="url"
                    name="evidence_url"
                    value={formData.evidence_url}
                    onChange={handleChange}
                    placeholder="https://drive.google.com/..."
                    error={errors.evidence_url}
                  />
                  <p className="text-xs text-gray-500 mt-1">Pegue el enlace a la carpeta de evidencias</p>
                </FormField>
              </div>
            </FormSection>

            {/* Section: Observaciones y Hallazgos */}
            <FormSection title="Observaciones y Hallazgos" color="purple">
              <div className="space-y-6">
                <FormField label="Observaciones" error={errors.observations}>
                  <FormTextarea
                    name="observations"
                    value={formData.observations}
                    onChange={handleChange}
                    placeholder="Observaciones generales de la visita, condiciones encontradas, etc..."
                    rows={4}
                    error={errors.observations}
                  />
                </FormField>

                <FormField label="Hallazgos" error={errors.findings}>
                  <FormTextarea
                    name="findings"
                    value={formData.findings}
                    onChange={handleChange}
                    placeholder="Hallazgos durante la inspección, no conformidades detectadas, etc..."
                    rows={4}
                    error={errors.findings}
                  />
                </FormField>

                <FormField label="Recomendaciones" error={errors.recommendations}>
                  <FormTextarea
                    name="recommendations"
                    value={formData.recommendations}
                    onChange={handleChange}
                    placeholder="Recomendaciones para corregir hallazgos, acciones correctivas, plazos, etc..."
                    rows={4}
                    error={errors.recommendations}
                  />
                </FormField>
              </div>
            </FormSection>
    </BaseForm>
  );
}
