import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Calendar, User, MapPin, FileText, Save, Eye, Plus, History, CheckSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type ChecklistItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
};

type ChecklistResponse = {
  id: string;
  checklist_id: string;
  user_id: string;
  location_id: string;
  responses: Record<string, any>;
  status: 'in_progress' | 'completed' | 'pending';
  started_at: string;
  completed_at?: string;
  created_at: string;
  locations?: { name: string };
  users?: { full_name: string };
};

type ChecklistTemplate = {
  id: string;
  name: string;
  type: 'escon' | 'ecsal' | 'citv';
  description: string;
  items: ChecklistItem[];
};

const checklistTemplates: Record<string, ChecklistTemplate> = {
  escon: {
    id: 'escon',
    name: 'ESCON - Escuela de Conductores',
    type: 'escon',
    description: 'Checklist de verificación para Escuela de Conductores',
    items: [
      { id: 'doc_identidad', category: 'Documentación', title: 'Documento de Identidad', description: 'Verificar que el conductor tenga su DNI vigente', required: true, order: 1 },
      { id: 'licencia_conducir', category: 'Documentación', title: 'Licencia de Conducir', description: 'Verificar licencia de conducir vigente y categoría correcta', required: true, order: 2 },
      { id: 'certificado_medico', category: 'Documentación', title: 'Certificado Médico', description: 'Certificado de aptitud física y mental', required: true, order: 3 },
      { id: 'antecedentes', category: 'Documentación', title: 'Antecedentes Policiales', description: 'Certificado de antecedentes penales', required: true, order: 4 },
      { id: 'uniforme_completo', category: 'Presentación', title: 'Uniforme Completo', description: 'Verificar que el uniforme esté completo y en buen estado', required: true, order: 5 },
      { id: 'calzado_adecuado', category: 'Presentación', title: 'Calzado Adecuado', description: 'Zapatos de seguridad reglamentarios', required: true, order: 6 },
      { id: 'estado_fisico', category: 'Evaluación', title: 'Estado Físico', description: 'Evaluación del estado físico del conductor', required: true, order: 7 },
      { id: 'practica_manejo', category: 'Evaluación', title: 'Práctica de Manejo', description: 'Evaluación práctica de habilidades de conducción', required: true, order: 8 },
    ]
  },
  ecsal: {
    id: 'ecsal',
    name: 'ECSAL - Policlínico',
    type: 'ecsal',
    description: 'Checklist de verificación para Policlínico',
    items: [
      { id: 'equipamiento_medico', category: 'Equipamiento', title: 'Equipamiento Médico', description: 'Verificar equipo médico completo y funcional', required: true, order: 1 },
      { id: 'medicamentos_basicos', category: 'Equipamiento', title: 'Medicamentos Básicos', description: 'Stock de medicamentos esenciales', required: true, order: 2 },
      { id: 'historial_pacientes', category: 'Documentación', title: 'Historial de Pacientes', description: 'Registros actualizados de pacientes', required: true, order: 3 },
      { id: 'protocolos_emergencia', category: 'Procedimientos', title: 'Protocolos de Emergencia', description: 'Protocolos actualizados y accesibles', required: true, order: 4 },
      { id: 'limpieza_esterilizacion', category: 'Procedimientos', title: 'Limpieza y Esterilización', description: 'Procedimientos de limpieza adecuados', required: true, order: 5 },
      { id: 'condiciones_sanitarias', category: 'Instalaciones', title: 'Condiciones Sanitarias', description: 'Mantenimiento de condiciones higiénicas', required: true, order: 6 },
      { id: 'equipamiento_emergencia', category: 'Instalaciones', title: 'Equipamiento de Emergencia', description: 'Equipos de emergencia operativos', required: true, order: 7 },
    ]
  },
  citv: {
    id: 'citv',
    name: 'CITV - Revisión Técnica',
    type: 'citv',
    description: 'Checklist de verificación para Revisión Técnica Vehicular',
    items: [
      { id: 'documentacion_vehiculo', category: 'Documentación', title: 'Documentación del Vehículo', description: 'Tarjeta de propiedad y SOAT vigentes', required: true, order: 1 },
      { id: 'frenos', category: 'Sistema de Frenos', title: 'Sistema de Frenos', description: 'Estado y funcionamiento de frenos', required: true, order: 2 },
      { id: 'luces', category: 'Sistema Eléctrico', title: 'Luces y Señalización', description: 'Funcionamiento de todas las luces', required: true, order: 3 },
      { id: 'neumaticos', category: 'Sistema de Frenos', title: 'Neumáticos', description: 'Estado y presión de neumáticos', required: true, order: 4 },
      { id: 'motor', category: 'Mecánica', title: 'Motor y Transmisión', description: 'Revisión del motor y transmisión', required: true, order: 5 },
      { id: 'emisiones', category: 'Mecánica', title: 'Control de Emisiones', description: 'Niveles de emisiones contaminantes', required: true, order: 6 },
      { id: 'cinturones', category: 'Seguridad', title: 'Cinturones de Seguridad', description: 'Estado y funcionamiento de cinturones', required: true, order: 7 },
      { id: 'airbags', category: 'Seguridad', title: 'Airbags y Sistemas de Retención', description: 'Sistemas de seguridad pasiva', required: true, order: 8 },
    ]
  }
};

export default function ChecklistInteractive() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedType, setSelectedType] = useState<'escon' | 'ecsal' | 'citv'>('escon');
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistResponse | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<ChecklistResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const startNewChecklist = () => {
    const template = checklistTemplates[selectedType];
    const initialResponses: Record<string, any> = {};
    
    template.items.forEach(item => {
      initialResponses[item.id] = {
        completed: false,
        notes: '',
        images: [],
        timestamp: null
      };
    });

    setResponses(initialResponses);
    setCurrentChecklist({
      id: '',
      checklist_id: template.id,
      user_id: user?.id || '',
      location_id: user?.location_id || '',
      responses: initialResponses,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('checklist_responses')
        .select('*, locations(name), users(full_name)')
        .order('created_at', { ascending: false });

      if (user?.role === 'administradores' && user?.location_id) {
        query = query.eq('location_id', user.location_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setHistory(data as ChecklistResponse[]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveChecklist = async () => {
    if (!currentChecklist) return;

    setSaving(true);
    try {
      const isComplete = Object.values(responses).every((response: any) => response.completed);
      const status = isComplete ? 'completed' : 'in_progress';

      const checklistData = {
        checklist_id: currentChecklist.checklist_id,
        user_id: user?.id,
        location_id: user?.location_id,
        responses,
        status,
        started_at: currentChecklist.started_at,
        completed_at: isComplete ? new Date().toISOString() : null
      };

      if (currentChecklist.id) {
        // Update existing
        const { error } = await supabase
          .from('checklist_responses')
          .update(checklistData)
          .eq('id', currentChecklist.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('checklist_responses')
          .insert(checklistData);

        if (error) throw error;
      }

      const updatedChecklistData = {
        ...checklistData,
        user_id: checklistData.user_id || '',
        location_id: checklistData.location_id || '',
        status: (checklistData.status as 'in_progress' | 'completed' | 'pending'),
        completed_at: checklistData.completed_at || undefined
      };
      
      setCurrentChecklist(prev => prev ? { ...prev, ...updatedChecklistData } : null);
    } catch (error) {
      console.error('Error saving checklist:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateResponse = (itemId: string, field: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const loadChecklist = async (checklist: ChecklistResponse) => {
    setCurrentChecklist(checklist);
    setResponses(checklist.responses);
    setActiveTab('new');
    const type = checklist.checklist_id as 'escon' | 'ecsal' | 'citv';
    setSelectedType(type);
  };

  const getProgress = () => {
    if (!currentChecklist) return 0;
    const total = Object.keys(responses).length;
    const completed = Object.values(responses).filter((response: any) => response.completed).length;
    return (completed / total) * 100;
  };

  const getCategoryItems = (category: string) => {
    const template = checklistTemplates[selectedType];
    return template.items.filter(item => item.category === category);
  };

  const categories = Array.from(new Set(checklistTemplates[selectedType].items.map(item => item.category)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-[#002855]">Checklist Interactivo</h1>
                <p className="text-sm text-slate-600">Complete formularios paso a paso y revise el historial</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/checklist')}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Volver al Checklist tradicional
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                activeTab === 'new' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              Nuevo Checklist
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all ${
                activeTab === 'history' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              Historial
            </button>
          </div>
        </div>

        {activeTab === 'new' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel - Type Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
                <h3 className="text-lg font-black text-[#002855] mb-4">Tipo de Checklist</h3>
                
                <div className="space-y-3">
                  {Object.entries(checklistTemplates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedType(key as 'escon' | 'ecsal' | 'citv')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedType === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-black text-sm mb-1">{template.name}</div>
                      <div className="text-xs text-slate-600">{template.description}</div>
                    </button>
                  ))}
                </div>

                {currentChecklist && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-black text-slate-700">Progreso</span>
                        <span className="text-sm font-bold text-blue-600">{Math.round(getProgress())}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgress()}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={saveChecklist}
                      disabled={saving}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar Checklist'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Checklist Form */}
            <div className="lg:col-span-2">
              {!currentChecklist ? (
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
                  <CheckSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-700 mb-2">Seleccione un tipo de checklist</h3>
                  <p className="text-slate-600 mb-6">Para comenzar, elija un tipo de checklist de la izquierda</p>
                  <button
                    onClick={startNewChecklist}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-colors"
                  >
                    Comenzar Nuevo Checklist
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {categories.map(category => (
                    <div key={category} className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
                      <h4 className="text-lg font-black text-[#002855] mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        {category}
                      </h4>
                      
                      <div className="space-y-4">
                        {getCategoryItems(category).map(item => {
                          const response = responses[item.id] || { completed: false, notes: '', images: [] };
                          return (
                            <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => updateResponse(item.id, 'completed', !response.completed)}
                                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    response.completed
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-slate-300 hover:border-blue-400'
                                  }`}
                                >
                                  {response.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </button>
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-black text-sm">{item.title}</h5>
                                    {item.required && (
                                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-lg">Requerido</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 mb-3">{item.description}</p>
                                  
                                  <textarea
                                    value={response.notes || ''}
                                    onChange={(e) => updateResponse(item.id, 'notes', e.target.value)}
                                    placeholder="Añadir notas..."
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-[#002855]">Historial de Checklists</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4" />
                {history.length} registros encontrados
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Cargando historial...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h4 className="text-lg font-black text-slate-700 mb-2">No hay checklists completados</h4>
                <p className="text-slate-600">Comience un nuevo checklist para ver el historial aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map(checklist => {
                  const template = checklistTemplates[checklist.checklist_id as keyof typeof checklistTemplates];
                  const completed = Object.values(checklist.responses).filter((response: any) => response.completed).length;
                  const total = Object.keys(checklist.responses).length;
                  const percentage = Math.round((completed / total) * 100);

                  return (
                    <div key={checklist.id} className="border border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-black text-lg">{template?.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              checklist.status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : checklist.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {checklist.status === 'completed' ? 'Completado' : 
                               checklist.status === 'in_progress' ? 'En Progreso' : 'Pendiente'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{checklist.users?.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{checklist.locations?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(checklist.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{completed}/{total} completado ({percentage}%)</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => loadChecklist(checklist)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
