import { useState, useEffect } from 'react';
import { FileText, X, HelpCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SutranVisit, Location } from '../../lib/supabase';
import { notifySutranVisitScheduled } from '../../lib/notifications';
import { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';

interface SutranVisitFormProps {
  visit?: SutranVisit;
  onSave: () => void;
  onClose: () => void;
}

export default function SutranVisitForm({ visit, onSave, onClose }: SutranVisitFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    visit_date: visit?.visit_date || '',
    visit_type: visit?.visit_type || '',
    inspector_name: visit?.inspector_name || '',
    inspector_email: visit?.inspector_email || '',
    inspector_phone: visit?.inspector_phone || '',
    status: visit?.status || 'scheduled',
    location_id: visit?.location_id || '',
    observations: visit?.observations || '',
    findings: visit?.findings || '',
    recommendations: visit?.recommendations || '',
    documents: visit?.documents || []
  });

  const [newDocument, setNewDocument] = useState('');

  const visitTypes = [
    { value: 'programada', label: 'Visita Programada' },
    { value: 'no_programada', label: 'Visita No Programada' },
    { value: 'de_gabinete', label: 'Visita de Gabinete' }
  ];

  const statuses = [
    { value: 'scheduled', label: 'Programada' },
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
        status: visit.status || 'scheduled',
        location_id: visit.location_id || '',
        observations: visit.observations || '',
        findings: visit.findings || '',
        recommendations: visit.recommendations || '',
        documents: visit.documents || []
      });
    } else {
      setFormData({
        visit_date: '',
        visit_type: '',
        inspector_name: '',
        inspector_email: '',
        inspector_phone: '',
        status: 'scheduled',
        location_id: '',
        observations: '',
        findings: '',
        recommendations: '',
        documents: []
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

    // Inspector data is optional - only validate if provided
    if (formData.inspector_name.trim() && !formData.inspector_email.trim()) {
      newErrors.inspector_email = 'Si ingresa el nombre del inspector, debe ingresar el email';
    } else if (formData.inspector_email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.inspector_email)) {
      newErrors.inspector_email = 'El email no es válido';
    }

    if (formData.inspector_name.trim() && !formData.inspector_phone.trim()) {
      newErrors.inspector_phone = 'Si ingresa el nombre del inspector, debe ingresar el teléfono';
    } else if (formData.inspector_phone.trim() && !/^9\d{8}$/.test(formData.inspector_phone.replace(/\s/g, ''))) {
      newErrors.inspector_phone = 'El teléfono debe tener 9 dígitos empezando con 9';
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
    <div className="fixed inset-0 bg-[#001529]/85 backdrop-blur-md flex items-start justify-start p-0 md:items-center md:justify-center md:p-8 z-[999] animate-in fade-in duration-300">
      <div
        className="bg-white absolute top-0 left-0 w-screen h-screen md:relative md:w-full md:h-[85vh] md:max-w-6xl md:mx-auto md:rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10"
      >
        {/* Header Corporativo (Cuadrado) */}
        <div className="bg-[#001529] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-none flex items-center justify-center border border-blue-500/20">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] leading-tight">
                {visit ? 'Editar Visita SUTRAN' : 'Nueva Visita SUTRAN'}
              </h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">
                Módulo de Gestión de Visitas SUTRAN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col min-h-0 bg-gray-50/50">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
            {/* Help Section */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <HelpCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-900">Guía de Visitas SUTRAN</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Fecha:</strong> Seleccione la fecha programada para la visita</li>
                    <li>• <strong>Inspector:</strong> Datos opcionales. Si ingresa nombre, incluya email y teléfono válidos</li>
                    <li>• <strong>Documentos:</strong> Agregue todos los documentos relevantes</li>
                    <li>• <strong>Hallazgos:</strong> Documente no conformidades y oportunidades de mejora</li>
                    <li>• <strong>Recomendaciones:</strong> Incluya acciones correctivas y plazos</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-900">Error</h4>
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              </div>
            )}

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

            {/* Section: Información del Inspector */}
            <FormSection title="Información del Inspector" color="emerald">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField label="Nombre del Inspector" error={errors.inspector_name}>
                  <FormInput
                    type="text"
                    name="inspector_name"
                    value={formData.inspector_name}
                    onChange={handleChange}
                    placeholder="Nombre completo del inspector (opcional)"
                    error={errors.inspector_name}
                  />
                </FormField>

                <FormField label="Email del Inspector" error={errors.inspector_email}>
                  <FormInput
                    type="email"
                    name="inspector_email"
                    value={formData.inspector_email}
                    onChange={handleChange}
                    placeholder="inspector@ejemplo.com (opcional)"
                    error={errors.inspector_email}
                  />
                  <p className="text-xs text-gray-500 mt-1">Email oficial del inspector SUTRAN (opcional)</p>
                </FormField>

                <FormField label="Teléfono del Inspector" error={errors.inspector_phone}>
                  <FormInput
                    type="tel"
                    name="inspector_phone"
                    value={formData.inspector_phone}
                    onChange={handleChange}
                    placeholder="987654321 (opcional)"
                    error={errors.inspector_phone}
                  />
                  <p className="text-xs text-gray-500 mt-1">Celular peruano (opcional)</p>
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
          </div>

          {/* Submit Button */}
          <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-400 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 text-sm font-bold text-white bg-[#001529] rounded-lg hover:bg-[#002855] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {visit ? 'Actualizar Visita' : 'Crear Visita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
