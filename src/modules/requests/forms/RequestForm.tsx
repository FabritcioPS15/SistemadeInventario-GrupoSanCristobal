import { useState, useEffect } from 'react';
import { FileText, Mail, Plus, X, MapPin } from 'lucide-react';
import { supabase } from '../../../shared/services/supabase';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from '../../../shared/components/forms/BaseForm';
import { emailService } from '../../../shared/services/emailService';
import { RequestFormData, RequestCategory, RequestPriority } from '../../../shared/types/requests.types';
import { useAuth } from '../../../app/providers/AuthContext';

type RequestFormProps = {
  onClose: () => void;
  onSave: () => void;
};

const categoryLabels: Record<RequestCategory, string> = {
  equipamiento: 'Equipamiento',
  mantenimiento: 'Mantenimiento',
  software: 'Software',
  infraestructura: 'Infraestructura',
  otro: 'Otro',
};

const priorityLabels: Record<RequestPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

export default function RequestForm({ onClose, onSave }: RequestFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendEmail, setSendEmail] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState({
    to: [] as string[],
    cc: [] as string[],
  });
  const [newEmailTo, setNewEmailTo] = useState('');
  const [newEmailCc, setNewEmailCc] = useState('');
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState<RequestFormData>({
    title: '',
    description: '',
    category: 'otro',
    priority: 'media',
    department: '',
    location_id: '',
    due_date: '',
    estimated_cost: undefined,
    requester_email: user?.email || '',
    sendEmail: false,
    emailRecipients: { to: [], cc: [] },
  });

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, requester_email: user.email }));
    }
  }, [user]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .order('name');
      if (data) setLocations(data);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
    }

    if (!formData.priority) {
      newErrors.priority = 'La prioridad es requerida';
    }

    if (sendEmail && emailRecipients.to.length === 0) {
      newErrors.email = 'Debe agregar al menos un destinatario principal';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    const dataToSave = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      status: 'pending' as const,
      requester_id: user?.id || '',
      requester_name: user?.full_name || user?.email || 'Usuario',
      requester_email: formData.requester_email || user?.email,
      department: formData.department?.trim() || null,
      location_id: formData.location_id || null,
      due_date: formData.due_date || null,
      estimated_cost: formData.estimated_cost ? Number(formData.estimated_cost) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('requests').insert([dataToSave]);

      if (error) {
        setErrors({ submit: 'Error al crear la solicitud: ' + error.message });
        setLoading(false);
        return;
      }

      // Enviar correo si está habilitado y hay destinatarios
      if (sendEmail && emailRecipients.to.length > 0) {
        const emailResult = await emailService.sendRequestNotification({
          to: emailRecipients.to,
          cc: emailRecipients.cc,
          requestType: categoryLabels[formData.category],
          requestTitle: formData.title,
          description: formData.description,
          requester: dataToSave.requester_name,
          priority: priorityLabels[formData.priority],
          dueDate: formData.due_date,
        });

        if (!emailResult.success) {
          console.error('Error al enviar correo:', emailResult.error);
          setErrors({ submit: 'Solicitud creada pero error al enviar correo: ' + emailResult.error });
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
      title="Nueva Solicitud"
      subtitle="Módulo de Gestión de Solicitudes"
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      error={errors.submit}
      icon={<FileText size={24} className="text-blue-600" />}
    >
      {/* Section: Información Principal */}
      <FormSection title="Información de la Solicitud" color="blue" columns={3}>
          <FormField label="Título" required error={errors.title} className="sm:col-span-2 lg:col-span-3">
            <FormInput
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Título descriptivo de la solicitud..."
              required
              error={errors.title}
            />
          </FormField>

          <FormField label="Categoría" required error={errors.category}>
            <FormSelect
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              error={errors.category}
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Prioridad" required error={errors.priority}>
            <FormSelect
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
              error={errors.priority}
            >
              {Object.entries(priorityLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Departamento/Área" error={errors.department}>
            <FormInput
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Ej: Sistemas, RRHH, Operaciones..."
              error={errors.department}
            />
          </FormField>

          <FormField label="Sede" error={errors.location_id}>
            <FormSelect
              name="location_id"
              value={formData.location_id}
              onChange={handleChange}
              error={errors.location_id}
            >
              <option value="">Seleccionar sede...</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Fecha Límite" error={errors.due_date}>
            <FormInput
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              error={errors.due_date}
            />
          </FormField>

          <FormField label="Costo Estimado (S/)" error={errors.estimated_cost}>
            <FormInput
              type="number"
              step="0.01"
              name="estimated_cost"
              value={formData.estimated_cost}
              onChange={handleChange}
              placeholder="0.00"
              error={errors.estimated_cost}
            />
          </FormField>

          <FormField label="Correo del Solicitante" error={errors.requester_email}>
            <FormInput
              type="email"
              name="requester_email"
              value={formData.requester_email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              error={errors.requester_email}
            />
          </FormField>
      </FormSection>


      {/* Section: Descripción */}
      <FormSection title="Descripción Detallada" color="emerald">
        <FormField label="Descripción" required error={errors.description}>
          <FormTextarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describa detalladamente la solicitud, justificación, beneficios esperados..."
            rows={6}
            required
            error={errors.description}
          />
        </FormField>
      </FormSection>

      {/* Section: Notificación por Correo */}
      <FormSection title="Notificación por Correo Electrónico" color="indigo">
        <FormField label="Enviar notificación por correo" error={errors.email}>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="sendEmail" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Mail size={16} className="text-indigo-600" />
              Notificar a aprobadores por correo electrónico
            </label>
          </div>
        </FormField>

        {sendEmail && (
          <div className="space-y-6 mt-6">
            {/* Destinatarios Principales (TO) */}
            <FormField label="Destinatarios Principales (Para)" required error={errors.email}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmailTo}
                    onChange={(e) => setNewEmailTo(e.target.value)}
                    placeholder="gerencia@rtpsancristobal.pe"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEmailTo && !emailRecipients.to.includes(newEmailTo)) {
                        setEmailRecipients(prev => ({
                          ...prev,
                          to: [...prev.to, newEmailTo]
                        }));
                        setNewEmailTo('');
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-600 text-white rounded-none hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>
              <div className="flex flex-wrap gap-2">
                {emailRecipients.to.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-none text-sm"
                  >
                    <Mail size={14} className="text-indigo-600" />
                    {email}
                    <button
                      type="button"
                      onClick={() => setEmailRecipients(prev => ({
                        ...prev,
                        to: prev.to.filter((_, i) => i !== index)
                      }))}
                      className="hover:text-indigo-600 hover:bg-indigo-100 p-1 rounded transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              </div>
            </FormField>

            {/* Destinatarios en Copia (CC) */}
            <FormField label="Copia (CC) - Otros interesados">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmailCc}
                    onChange={(e) => setNewEmailCc(e.target.value)}
                    placeholder="sistemas@rtpsancristobal.pe"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newEmailCc && !emailRecipients.cc.includes(newEmailCc)) {
                        setEmailRecipients(prev => ({
                          ...prev,
                          cc: [...prev.cc, newEmailCc]
                        }));
                        setNewEmailCc('');
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-none hover:bg-slate-300 transition-colors flex items-center gap-2 text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emailRecipients.cc.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-none text-sm"
                    >
                      <Mail size={14} className="text-slate-500" />
                      {email}
                      <button
                        type="button"
                        onClick={() => setEmailRecipients(prev => ({
                          ...prev,
                          cc: prev.cc.filter((_, i) => i !== index)
                        }))}
                        className="hover:text-slate-600 hover:bg-slate-100 p-1 rounded transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </FormField>

            {emailRecipients.to.length === 0 && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ Debe agregar al menos un aprobador (destinatario principal) para enviar el correo.
              </p>
            )}
          </div>
        )}
      </FormSection>
    </BaseForm>
  );
}
