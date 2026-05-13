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

      // Si se proporcionó AnyDesk, agregarlo como comentario para que sea detectado por el modal
      if (ticketData && formData.anydesk.trim()) {
        await supabase
          .from('ticket_comments')
          .insert([{
            ticket_id: ticketData.id,
            user_id: user?.id,
            content: `Anydesk de mi PC: ${formData.anydesk.trim()}`
          }]);
      }

      // Auto-asignar el creador al ticket
      if (ticketData) {
        await supabase
          .from('ticket_assignments')
          .insert([{
            ticket_id: ticketData.id,
            user_id: user?.id,
            assigned_at: new Date().toISOString()
          }]);
      }

      // Enviar notificación de ticket creado
      if (ticketData) {
        console.log('🎫 Creando notificación para ticket:', ticketData.id);
        console.log('👤 Usuario:', user?.full_name, 'ID:', user?.id);
        console.log('📍 Ubicación:', locations.find(l => l.id === formData.location_id)?.name);
        
        const notificationResult = await notifyTicketCreated(
          ticketData.id,
          ticketData.title,
          user?.id || '',
          user?.full_name || 'Usuario',
          locations.find(l => l.id === formData.location_id)?.name || 'Sin ubicación'
        );
        
        console.log('📊 Resultado de notificación:', notificationResult);
        if (notificationResult) {
          console.log('✅ Notificación creada exitosamente');
        } else {
          console.log('❌ Error creando notificación');
        }
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
      <div className="absolute top-4 right-4 z-10 bg-slate-50 border border-slate-200 rounded-none px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#002855] rounded-none"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario:</span>
          <span className="text-[10px] font-black text-[#002855] uppercase tracking-tight">{user?.full_name}</span>
        </div>
        {user?.location_id ? (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede:</span>
            <span className="text-[10px] font-black text-[#002855] uppercase tracking-tight">
              {locations.find(loc => loc.id === user.location_id)?.name || 'Cargando...'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-none"></div>
            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Sin sede asignada</span>
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
        icon={<Send size={20} className="text-white" />}
      >
      {/* Section: Información del Ticket */}
      <FormSection title="Detalles del Incidente" color="blue">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Asunto o Título" required error={errors.title} className="h-12 pt-0">
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
                <div className="absolute top-full left-0 right-0 mt-0 bg-white border border-slate-200 shadow-2xl z-20 overflow-hidden py-0 animate-in fade-in slide-in-from-top-2">
                  {filteredSuggestions.map((issue, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectIssue(issue)}
                      className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between border-b border-slate-100 last:border-0"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-[#002855] uppercase">{issue.title}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{issue.description.slice(0, 60)}...</span>
                      </div>
                      <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-none uppercase tracking-widest">{issue.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <FormField label="Tipo de Categoría" required error={errors.category}>
            <FormSelect
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              error={errors.category}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label.toUpperCase()}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Prioridad Técnica" required error={errors.priority}>
            <FormSelect
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              required
              error={errors.priority}
            >
              {priorities.map((pri) => (
                <option key={pri.value} value={pri.value}>
                  {pri.label.toUpperCase()}
                </option>
              ))}
            </FormSelect>
          </FormField>

          <FormField label="Acceso AnyDesk" error={errors.anydesk}>
            <FormInput
              type="text"
              name="anydesk"
              value={formData.anydesk}
              onChange={handleChange}
              placeholder="ID de AnyDesk (si aplica)"
              error={errors.anydesk}
            />
          </FormField>
        </div>
      </FormSection>

      {/* Section: Información de Ubicación */}
      <FormSection title="Origen del Reporte" color="emerald">
        <FormField label="Sede de la Incidencia">
          <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-none text-[11px] font-black text-[#002855] uppercase tracking-tight">
            {locations.find(loc => loc.id === formData.location_id)?.name || 'ASIGNANDO SEDE...'}
          </div>
        </FormField>
      </FormSection>

      {/* Section: Descripción */}
      <FormSection title="Análisis y Descripción" color="emerald">
        <FormField label="Descripción Detallada del Fallo" required error={errors.description}>
          <FormTextarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe el problema, mensajes de error y pasos para reproducirlo..."
            rows={8}
            required
            error={errors.description}
          />
        </FormField>
      </FormSection>
    </BaseForm>

    </div>
  );
}
