import { useState, useEffect, useRef } from 'react';
import { X, Send, AlertCircle, Building2, Sparkles, Plus, Search, MonitorSmartphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type TicketFormProps = {
    onClose: () => void;
    onSave: () => void;
};

const FREQUENT_ISSUES = [
    { title: 'Impresora no enciende / no imprime', category: 'hardware', priority: 'medium', description: 'La impresora de la sede no responde a los comandos de impresión o está apagada.' },
    { title: 'Olvidé mi contraseña de acceso del MTC / Correo', category: 'access', priority: 'high', description: 'Requiero un reset de contraseña para ingresar al sistema.' },
    { title: 'Sistema ERP está lento o se cierra', category: 'software', priority: 'high', description: 'El sistema principal presenta lentitud extrema o cierres inesperados.' },
    { title: 'Sin conexión a Internet en recepción', category: 'network', priority: 'critical', description: 'Toda el área de recepción está sin conexión a red.' },
    { title: 'Falla en cámara de seguridad', category: 'hardware', priority: 'medium', description: 'Una de las cámaras no muestra imagen en el monitor.' },
    { title: 'Configuración de correo corporativo', category: 'software', priority: 'low', description: 'Solicito apoyo para configurar mi firma o bandeja de entrada.' },
];

export default function TicketForm({ onClose, onSave }: TicketFormProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        category: 'hardware',
        location_id: '',
        anydesk: ''
    });
    const [locations, setLocations] = useState<any[]>([]);
    const [userLocationName, setUserLocationName] = useState('');
    const [error, setError] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchLocations();
        if (user?.location_id) {
            setFormData(prev => ({ ...prev, location_id: user.location_id || '' }));
            fetchLocationName(user.location_id);
        }
    }, [user]);

    // Cerrar sugerencias al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchLocations = async () => {
        const { data } = await supabase.from('locations').select('id, name');
        if (data) setLocations(data);
    };

    const fetchLocationName = async (id: string) => {
        const { data } = await supabase.from('locations').select('name').eq('id', id).single();
        if (data) setUserLocationName(data.name);
    };

    const handleSelectIssue = (issue: typeof FREQUENT_ISSUES[0]) => {
        setFormData(prev => ({
            ...prev,
            title: issue.title,
            category: issue.category,
            priority: issue.priority,
            description: issue.description
        }));
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.location_id) {
            setError('Por favor, selecciona una sede para continuar.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const finalDescription = formData.description;

            const { data: ticketData, error: submitError } = await supabase
                .from('tickets')
                .insert([
                    {
                        title: formData.title,
                        description: finalDescription,
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

            if (formData.anydesk.trim()) {
                await supabase.from('ticket_comments').insert([
                    {
                        ticket_id: ticketData.id,
                        user_id: user?.id,
                        content: `Buen día este es el anydesk de mi pc: ${formData.anydesk.trim()}`
                    }
                ]);
            }

            onSave();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredSuggestions = FREQUENT_ISSUES.filter(issue =>
        issue.title.toLowerCase().includes(formData.title.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-[#001529]/85 backdrop-blur-md flex items-center justify-center p-0 md:p-8 z-[100] animate-in fade-in duration-300">
            <div className="bg-white w-full h-full md:max-w-6xl md:h-[85vh] rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
                {/* Header Corporativo (Cuadrado) */}
                <div className="bg-[#001529] px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-none flex items-center justify-center border border-blue-500/20">
                            <Plus className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] leading-tight">Nuevo Reporte de Incidencia</h2>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">Mesa de Ayuda Técnica</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all text-white/40">
                        <X size={24} />
                    </button>
                </div>

                {/* Formato Horizontal (Desktop) */}
                <div className="flex flex-1 flex-col md:flex-row overflow-hidden bg-white">

                    {/* Lateral Izquierdo: Casos Frecuentes (Siempre Visible) */}
                    <div className="w-full md:w-[350px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                        <div className="p-6 bg-white border-b border-slate-200">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={16} className="text-amber-500" />
                                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Casos Frecuentes</h3>
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plantillas rápidas recomendadas</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                            {FREQUENT_ISSUES.map((issue, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectIssue(issue)}
                                    className="w-full text-left p-4 bg-white border border-slate-200 rounded-none hover:border-blue-500 hover:shadow-lg transition-all group flex flex-col"
                                >
                                    <p className="text-[11px] font-black text-slate-700 group-hover:text-blue-600 leading-snug mb-3 line-clamp-2 uppercase tracking-tight">{issue.title}</p>
                                    <div className="mt-auto inline-block">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 px-2 py-1 bg-slate-50 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600">
                                            {issue.category}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Panel Derecho: Formulario Principal */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 text-rose-600 flex items-center gap-3 text-xs font-bold border-l-4 border-rose-500 animate-in shake duration-500">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Punto de Atención */}
                            <div className="px-6 py-5 bg-[#001529] border border-[#001529] shadow-lg flex items-center justify-between text-white">
                                <div className="flex items-center gap-4">
                                    <Building2 size={24} className="text-blue-400" />
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Punto de Atención Confirmado</p>
                                        <p className="text-sm font-black text-white uppercase tracking-wider">
                                            {user?.location_id ? (userLocationName || 'Cargando...') : 'Sede no asignada'}
                                        </p>
                                    </div>
                                </div>
                                {!user?.location_id && (
                                    <select
                                        required
                                        value={formData.location_id}
                                        onChange={e => setFormData({ ...formData, location_id: e.target.value })}
                                        className="px-4 py-2 bg-amber-500 text-[#001529] font-black text-[10px] uppercase outline-none focus:ring-4 focus:ring-amber-500/30"
                                    >
                                        <option value="">+ Seleccionar Sede</option>
                                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                    </select>
                                )}
                            </div>

                            {/* Asunto */}
                            <div className="space-y-3 relative" ref={suggestionRef}>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-none"></div>
                                    Asunto de la Incidencia / Problema
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={e => {
                                            setFormData({ ...formData, title: e.target.value });
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-black text-slate-800 uppercase text-xs"
                                        placeholder="EJ. NO FUNCIONA EL SISTEMA DE VENTAS..."
                                    />
                                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />

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
                            </div>

                            {/* Módulo y Prioridad */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-none"></div>
                                        Módulo Recomendado
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-slate-400 outline-none font-black text-xs text-slate-700 uppercase tracking-widest cursor-pointer"
                                    >
                                        <option value="hardware">HARDWARE / EQUIPOS</option>
                                        <option value="software">SOFTWARE / SISTEMAS</option>
                                        <option value="network">REDES / INTERNET</option>
                                        <option value="access">ACCESOS / PERFILES</option>
                                        <option value="other">OTROS REQUERIMIENTOS</option>
                                    </select>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-none"></div>
                                        Nivel de Urgencia
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                        className={`w-full px-5 py-4 border-2 outline-none font-black text-xs uppercase tracking-[0.2em] transition-colors cursor-pointer
                                            ${formData.priority === 'critical' ? 'bg-rose-50 border-rose-500 text-rose-700' :
                                                formData.priority === 'high' ? 'bg-orange-50 border-orange-400 text-orange-700' :
                                                    'bg-white border-slate-200 text-slate-700'}`}
                                    >
                                        <option value="low">BAJA (No afecta el trabajo)</option>
                                        <option value="medium">MEDIA (Afecta parcialmente)</option>
                                        <option value="high">ALTA (Operación detenida)</option>
                                        <option value="critical">CRÍTICA (Emergencia General)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Descripción */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-none"></div>
                                    Descripción Detallada
                                </label>
                                <textarea
                                    required
                                    rows={5}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700 resize-none text-sm leading-relaxed"
                                    placeholder="Proporcione todos los detalles que ayuden a resolver el problema más rápido..."
                                />
                            </div>

                            {/* AnyDesk ID */}
                            <div className="space-y-3 bg-blue-50/50 p-6 border border-blue-100">
                                <label className="text-[10px] font-black text-blue-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <MonitorSmartphone size={16} className="text-blue-500" />
                                    Acceso Remoto AnyDesk (Opcional)
                                </label>
                                <p className="text-[10px] font-medium text-slate-500 mb-2">Ayuda a soporte técnico a conectarse a tu equipo rápidamente.</p>
                                <input
                                    type="text"
                                    value={formData.anydesk || ''}
                                    onChange={e => setFormData({ ...formData, anydesk: e.target.value })}
                                    className="w-full px-5 py-4 bg-white border border-blue-200 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 font-black tracking-[0.2em] text-blue-900"
                                    placeholder="EJ. 123 456 789"
                                />
                            </div>

                            {/* Acciones del Formulario */}
                            <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-8 py-5 border-2 border-slate-200 font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-all text-center"
                                >
                                    Cancelar Registro
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 py-5 font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                                        ${loading ? 'bg-slate-200 text-slate-500 border-none' : 'bg-[#002855] text-white hover:bg-blue-600 shadow-[0_10px_30px_rgba(0,40,85,0.3)] hover:scale-[1.02]'}`}
                                >
                                    {loading ? 'Procesando...' : (
                                        <>
                                            <Send size={18} />
                                            Confirmar y Enviar Incidencia
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
