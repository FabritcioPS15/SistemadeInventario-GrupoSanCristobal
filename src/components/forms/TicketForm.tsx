import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BaseForm, { FormSection, FormField, FormInput, FormSelect, FormTextarea } from './BaseForm';
import { notifyTicketCreated } from '../../lib/notifications';

type TicketFormProps = {
  onClose: () => void;
  onSave: () => void;
};

const FREQUENT_ISSUES = [
  { title: 'Impresora no enciende / no imprime', category: 'hardware', priority: 'critical', description: 'La impresora de la sede no responde a los comandos de impresión o está apagada.' },
  { title: 'Olvidé mi contraseña de acceso del MTC / Correo', category: 'access', priority: 'high', description: 'Requiero un reset de contraseña para ingresar al sistema.' },
  { title: 'Sistema ERP está lento o se cierra', category: 'software', priority: 'high', description: 'El sistema principal presenta lentitud extrema o cierres inesperados.' },
  { title: 'Sin conexión a Internet en recepción', category: 'network', priority: 'critical', description: 'Toda el área de recepción está sin conexión a red.' },
  { title: 'Falla en cámara de seguridad', category: 'hardware', priority: 'medium', description: 'Una de las cámaras no muestra imagen en el monitor.' },
  { title: 'Configuración de correo corporativo', category: 'software', priority: 'low', description: 'Solicito apoyo para configurar mi firma o bandeja de entrada.' },
];

export default function TicketForm({ onClose, onSave }: TicketFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'hardware',
    location_id: user?.location_id || '',
    anydesk: ''
  });

  const priorities = [
    { value: 'critical', label: 'P1 - Crítica' },
    { value: 'high', label: 'P2 - Alta' },
    { value: 'medium', label: 'P3 - Media' },
    { value: 'low', label: 'P4 - Baja' },
  ];

  const categories = [
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'network', label: 'Red' },
    { value: 'access', label: 'Acceso' },
    { value: 'other', label: 'Otro' },
  ];

  useEffect(() => {
    fetchLocations();
  }, []);

  // Auto-asignar la sede del usuario
  useEffect(() => {
    if (user?.location_id && !formData.location_id) {
      setFormData(prev => ({
        ...prev,
        location_id: user.location_id || ''
      }));
    }
  }, [user?.location_id]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (!error && data) {
        setLocations(data);
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = FREQUENT_ISSUES.filter(issue =>
    issue.title.toLowerCase().includes(formData.title.toLowerCase())
  );

  const handleSelectIssue = (issue: typeof FREQUENT_ISSUES[0]) => {
    setFormData({
      ...formData,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority
    });
    setShowSuggestions(false);
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

    if (!formData.location_id) {
      newErrors.location_id = 'La ubicación es requerida';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      // Crear el ticket
      const { data: ticketData, error: submitError } = await supabase
        .from('tickets')
        .insert([
          {
            title: formData.title.trim(),
            description: formData.description.trim(),
            priority: formData.priority,
            category: formData.category,
            location_id: formData.location_id,
            requester_id: user?.id,
            status: 'open'
          }
        ])
        .select()
        .single();

      if (submitError) throw submitError;

      // Enviar notificación de ticket creado
      if (ticketData) {
        await notifyTicketCreated(
          ticketData.id,
          ticketData.title,
          user?.id || '',
          user?.full_name || 'Usuario',
          locations.find(l => l.id === formData.location_id)?.name || 'Sin ubicación'
        );
      }

      onSave();
      onClose();
    } catch (err: any) {
      setErrors({ submit: 'Error al crear el ticket: ' + err.message });
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

    // Mostrar sugerencias cuando se escribe en el título
    if (name === 'title') {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      {/* Información de usuario y ubicación fija en esquina superior derecha */}
      <div className="absolute top-4 right-4 z-10 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-xs font-semibold text-blue-700">Usuario:</span>
          <span className="text-xs font-bold text-blue-900">{user?.full_name}</span>
        </div>
        {user?.location_id ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-semibold text-blue-700">Sede:</span>
            <span className="text-xs font-bold text-blue-900">
              {locations.find(loc => loc.id === user.location_id)?.name || 'Cargando...'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-xs font-semibold text-orange-700">Sin sede asignada</span>
          </div>
        )}
      </div>

      <BaseForm
        title="Nuevo Reporte de Incidencia"
        subtitle="Mesa de Ayuda Técnica"
        onClose={onClose}
        onSubmit={handleSubmit}
        loading={loading}
        error={errors.submit}
        icon={<Send size={24} className="text-blue-600" />}
      >
      {/* Section: Información del Ticket */}
      <FormSection title="Información del Ticket" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Asunto de la Incidencia" required error={errors.title} className="h-12 pt-0">
            <div className="relative h-full mt-4" ref={suggestionRef}>
              <FormInput
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Ej. No funciona el sistema de ventas..."
                required
                error={errors.title}
                className="h-full pt-2"
              />

              {showSuggestions && formData.title && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl z-20 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2">
                  {filteredSuggestions.map((issue, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectIssue(issue)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                    >
                      <span className="text-xs font-black text-slate-700 uppercase">{issue.title}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{issue.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Categoría" required error={errors.category}>
            <FormSelect
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              error={errors.category}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
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
              {priorities.map((pri) => (
                <option key={pri.value} value={pri.value}>
                  {pri.label}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="AnyDesk" error={errors.anydesk}>
            <FormInput
              type="text"
              name="anydesk"
              value={formData.anydesk}
              onChange={handleChange}
              placeholder="ID de AnyDesk (opcional)"
              error={errors.anydesk}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Información de Ubicación */}
      <FormSection title="Información de Ubicación" color="emerald">
        <FormField label="Sede Asignada">
          <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
            {locations.find(loc => loc.id === formData.location_id)?.name || 'Cargando...'}
          </div>
        </FormField>
      </FormSection>

      {/* Section: Descripción */}
      <FormSection title="Descripción del Problema" color="emerald">
        <FormField label="Descripción Detallada" required error={errors.description}>
          <FormTextarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe detalladamente el problema que estás experimentando. Incluye los pasos para reproducirlo, mensajes de error que aparecen, y cualquier otra información relevante que pueda ayudar a resolverlo más rápidamente."
            rows={6}
            required
            error={errors.description}
          />
        </FormField>
      </FormSection>
    </BaseForm>
    </div>
  );
}
