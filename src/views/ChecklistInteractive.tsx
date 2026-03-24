import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Calendar, User, MapPin, FileText, Save, Eye, Plus, History, CheckSquare, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TemplateManager from '../components/TemplateManager';

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
    description: 'Checklist de verificación integral para Escuela de Conductores',
    items: [
      // Personal(Conectar con la DB Que se tenía)
      { id: 'DNI', category: 'Personal', title: 'Documento de Identidad (DNI)', description: 'Verificar DNI vigente, legible y sin deterioro', required: true, order: 1 },
      { id: 'Nombre', category: 'Personal', title: 'Nombre', description: 'Nombre completo del colaborador', required: true, order: 2 },
      { id: 'Cargo', category: 'Personal', title: 'Cargo', description: 'Cargo que ocupa en la empresa', required: true, order: 3 },


      // Flota Vehicular (directamente vinculada con la flota vehicular, solo tiene que ser observable)
      { id: 'Flota vehicular activa', category: 'Flota Vehicular', title: 'Flota vehicular activa', description: 'Flota vehicular activa', required: true, order: 4 },
      { id: 'certificados_cursos', category: 'Documentación Académica', title: 'Certificados de Cursos', description: 'Cursos de actualización y capacitación', required: false, order: 5 },
      { id: 'registro_mtc', category: 'Documentación Académica', title: 'Registro MTC', description: 'Registro en Ministerio de Transportes', required: true, order: 6 },

      // Equipamiento y Uniforme (Para marcar completo excepto caso de CITV)
      { id: 'uniforme_completo', category: 'Equipamiento', title: 'Uniforme Completo', description: 'Uniforme reglamentario completo y en buen estado', required: true, order: 7 },
      { id: 'calzado_seguridad', category: 'Equipamiento', title: 'Calzado de Seguridad', description: 'Zapatos de seguridad adecuados y en buen estado', required: true, order: 8 },
      { id: 'identificacion_visible', category: 'Equipamiento', title: 'Identificación Visible', description: 'Gafete o identificación visible y legible', required: true, order: 9 },
      { id: 'material_didactico', category: 'Equipamiento', title: 'Material Didáctico', description: 'Material de enseñanza disponible y organizado', required: true, order: 10 },

      // Instalaciones y Seguridad
      { id: 'aula_enseñanza', category: 'Instalaciones', title: 'Aula de Enseñanza', description: 'Aula limpia, ordenada y en buen estado', required: true, order: 13 },
      { id: 'extintores', category: 'Instalaciones', title: 'Extintores', description: 'Extintores cargados y con certificado vigente', required: true, order: 14 },
      { id: 'señalizacion_seguridad', category: 'Instalaciones', title: 'Señalización de Seguridad', description: 'Salidas de emergencia y rutas señalizadas', required: true, order: 15 },
      { id: 'iluminacion_adequada', category: 'Instalaciones', title: 'Iluminación Adecuada', description: 'Iluminación suficiente en todas las áreas', required: true, order: 16 },

      // Evaluación Práctica
      { id: 'estado_fisico', category: 'Evaluación Práctica', title: 'Estado Físico', description: 'Evaluación del estado físico del instructor', required: true, order: 17 },
      { id: 'practica_manejo', category: 'Evaluación Práctica', title: 'Evaluación de Manejo', description: 'Evaluación práctica de habilidades de conducción', required: true, order: 18 },
      { id: 'conocimiento_normas', category: 'Evaluación Práctica', title: 'Conocimiento de Normas', description: 'Evaluación de conocimiento de reglas de tránsito', required: true, order: 19 },
      { id: 'habilidades_pedagogicas', category: 'Evaluación Práctica', title: 'Habilidades Pedagógicas', description: 'Capacidad de enseñanza y comunicación', required: true, order: 20 }
    ]
  },
  ecsal: {
    id: 'ecsal',
    name: 'ECSAL - Policlínico',
    type: 'ecsal',
    description: 'Checklist de verificación integral para Policlínico Médico',
    items: [
      // Licencias y Certificaciones
      { id: 'licencia_funcionamiento', category: 'Licencias y Certificaciones', title: 'Licencia de Funcionamiento', description: 'Licencia municipal de funcionamiento vigente', required: true, order: 1 },
      { id: 'certificado_sanitario', category: 'Licencias y Certificaciones', title: 'Certificado Sanitario', description: 'Certificado sanitario del establecimiento', required: true, order: 2 },
      { id: 'registro_digit', category: 'Licencias y Certificaciones', title: 'Registro DIGEMID', description: 'Registro en Dirección de Medicamentos', required: true, order: 3 },
      { id: 'certificados_profesionales', category: 'Licencias y Certificaciones', title: 'Certificados Profesionales', description: 'Certificados del personal médico', required: true, order: 4 },

      // Personal Médico
      { id: 'personal_medico', category: 'Personal', title: 'Personal Médico Completo', description: 'Médicos y especialistas disponibles', required: true, order: 5 },
      { id: 'enfermeria', category: 'Personal', title: 'Personal de Enfermería', description: 'Enfermeras certificadas y disponibles', required: true, order: 6 },
      { id: 'personal_administrativo', category: 'Personal', title: 'Personal Administrativo', description: 'Personal de atención y administración', required: true, order: 7 },
      { id: 'capacitacion_personal', category: 'Personal', title: 'Capacitación del Personal', description: 'Capacitación continua y actualizada', required: true, order: 8 },

      // Equipamiento Médico
      { id: 'equipamiento_basico', category: 'Equipamiento Médico', title: 'Equipamiento Básico', description: 'Equipo médico básico completo y funcional', required: true, order: 9 },
      { id: 'equipamiento_especializado', category: 'Equipamiento Médico', title: 'Equipamiento Especializado', description: 'Equipos especializados en buen estado', required: true, order: 10 },
      { id: 'equipamiento_laboratorio', category: 'Equipamiento Médico', title: 'Laboratorio', description: 'Equipos de laboratorio calibrados', required: true, order: 11 },
      { id: 'equipamiento_emergencia', category: 'Equipamiento Médico', title: 'Equipos de Emergencia', description: 'Carro de paro y equipos de emergencia', required: true, order: 12 },

      // Medicamentos e Insumos
      { id: 'medicamentos_basicos', category: 'Medicamentos e Insumos', title: 'Medicamentos Básicos', description: 'Stock adecuado de medicamentos esenciales', required: true, order: 13 },
      { id: 'medicamentos_controlados', category: 'Medicamentos e Insumos', title: 'Medicamentos Controlados', description: 'Control y registro de medicamentos controlados', required: true, order: 14 },
      { id: 'insumos_medicos', category: 'Medicamentos e Insumos', title: 'Insumos Médicos', description: 'Insumos y materiales médicos suficientes', required: true, order: 15 },
      { id: 'vacunas', category: 'Medicamentos e Insumos', title: 'Vacunas', description: 'Stock de vacunas y cadena de frío', required: true, order: 16 },

      // Instalaciones Físicas
      { id: 'consulta_externa', category: 'Instalaciones', title: 'Consulta Externa', description: 'Consultorios limpios y equipados', required: true, order: 17 },
      { id: 'area_emergencia', category: 'Instalaciones', title: 'Área de Emergencia', description: 'Área de emergencia señalizada y equipada', required: true, order: 18 },
      { id: 'laboratorio_clinico', category: 'Instalaciones', title: 'Laboratorio Clínico', description: 'Laboratorio con condiciones adecuadas', required: true, order: 19 },
      { id: 'farmacia', category: 'Instalaciones', title: 'Farmacia', description: 'Área de farmacia organizada y segura', required: true, order: 20 },

      // Seguridad e Higiene
      { id: 'bioseguridad', category: 'Seguridad e Higiene', title: 'Protocolos de Bioseguridad', description: 'Protocolos de bioseguridad implementados', required: true, order: 21 },
      { id: 'manejo_residuos', category: 'Seguridad e Higiene', title: 'Manejo de Residuos', description: 'Clasificación y disposición de residuos', required: true, order: 22 },
      { id: 'limpieza_esterilizacion', category: 'Seguridad e Higiene', title: 'Limpieza y Esterilización', description: 'Procedimientos de limpieza adecuados', required: true, order: 23 },
      { id: 'control_plagas', category: 'Seguridad e Higiene', title: 'Control de Plagas', description: 'Programa de control de plagas', required: true, order: 24 },

      // Procedimientos Médicos
      { id: 'protocolos_emergencia', category: 'Procedimientos Médicos', title: 'Protocolos de Emergencia', description: 'Protocolos actualizados y accesibles', required: true, order: 25 },
      { id: 'procedimientos_quirurgicos', category: 'Procedimientos Médicos', title: 'Procedimientos Quirúrgicos Menores', description: 'Protocolos para procedimientos menores', required: true, order: 26 },
      { id: 'triage', category: 'Procedimientos Médicos', title: 'Sistema de Triaje', description: 'Sistema de clasificación de pacientes', required: true, order: 27 },
      { id: 'referencia_contra', category: 'Procedimientos Médicos', title: 'Sistema de Referencia', description: 'Procedimientos de referencia y contra-referencia', required: true, order: 28 },

      // Historia Clínica y Registros
      { id: 'historia_clinica', category: 'Historia Clínica', title: 'Historia Clínica', description: 'Registros médicos actualizados y completos', required: true, order: 29 },
      { id: 'estadisticas_salud', category: 'Historia Clínica', title: 'Estadísticas de Salud', description: 'Sistema de registro de estadísticas', required: true, order: 30 },
      { id: 'consentimiento_informado', category: 'Historia Clínica', title: 'Consentimiento Informado', description: 'Formularios de consentimiento disponibles', required: true, order: 31 },
      { id: 'libro_reclamaciones', category: 'Historia Clínica', title: 'Libro de Reclamaciones', description: 'Libro de reclamaciones disponible', required: true, order: 32 }
    ]
  },
  citv: {
    id: 'citv',
    name: 'CITV - Revisión Técnica Vehicular',
    type: 'citv',
    description: 'Checklist de verificación integral para Revisión Técnica Vehicular',
    items: [
      // Documentación del Vehículo
      { id: 'tarjeta_propiedad', category: 'Documentación', title: 'Tarjeta de Propiedad', description: 'Tarjeta de propiedad original y vigente', required: true, order: 1 },
      { id: 'soat_vigente', category: 'Documentación', title: 'SOAT Vigente', description: 'Seguro obligatorio actualizado', required: true, order: 2 },
      { id: 'revision_tecnica_anterior', category: 'Documentación', title: 'Revisión Técnica Anterior', description: 'Certificado de revisión anterior', required: false, order: 3 },
      { id: 'documentacion_importacion', category: 'Documentación', title: 'Documentación de Importación', description: 'Documentos de importación si aplica', required: false, order: 4 },

      // Identificación del Vehículo
      { id: 'numero_motor', category: 'Identificación', title: 'Número de Motor', description: 'Número de motor legible y coincide con documentación', required: true, order: 5 },
      { id: 'numero_chasis', category: 'Identificación', title: 'Número de Chasis', description: 'Número de chasis legible y coincide', required: true, order: 6 },
      { id: 'placa_vehiculo', category: 'Identificación', title: 'Placa del Vehículo', description: 'Placa en buen estado y visible', required: true, order: 7 },
      { id: 'vin_vehiculo', category: 'Identificación', title: 'VIN del Vehículo', description: 'VIN visible y legible', required: true, order: 8 },

      // Sistema de Frenos
      { id: 'frenos_delanteros', category: 'Sistema de Frenos', title: 'Frenos Delanteros', description: 'Discos y pastillas en buen estado', required: true, order: 9 },
      { id: 'frenos_traseros', category: 'Sistema de Frenos', title: 'Frenos Traseros', description: 'Tambores o discos traseros funcionales', required: true, order: 10 },
      { id: 'freno_emergencia', category: 'Sistema de Frenos', title: 'Freno de Emergencia', description: 'Freno de mano funcional y ajustado', required: true, order: 11 },
      { id: 'liquido_frenos', category: 'Sistema de Frenos', title: 'Líquido de Frenos', description: 'Nivel y estado del líquido de frenos', required: true, order: 12 },
      { id: 'abs_funcional', category: 'Sistema de Frenos', title: 'Sistema ABS', description: 'Sistema ABS funcional si aplica', required: true, order: 13 },

      // Sistema Eléctrico
      { id: 'luces_delanteras', category: 'Sistema Eléctrico', title: 'Luces Delanteras', description: 'Luces altas y bajas funcionando', required: true, order: 14 },
      { id: 'luces_traseras', category: 'Sistema Eléctrico', title: 'Luces Traseras', description: 'Luces de freno y reversa funcionando', required: true, order: 15 },
      { id: 'luces_direccionales', category: 'Sistema Eléctrico', title: 'Luces Direccionales', description: 'Intermitentes funcionando correctamente', required: true, order: 16 },
      { id: 'luces_emergencia', category: 'Sistema Eléctrico', title: 'Luces de Emergencia', description: 'Intermitentes de emergencia funcionando', required: true, order: 17 },
      { id: 'sistema_ignicion', category: 'Sistema Eléctrico', title: 'Sistema de Ignición', description: 'Sistema de encendido funcional', required: true, order: 18 },
      { id: 'bateria_vehiculo', category: 'Sistema Eléctrico', title: 'Batería', description: 'Batería en buen estado y cargada', required: true, order: 19 },

      // Neumáticos y Ruedas
      { id: 'neumaticos_delanteros', category: 'Neumáticos', title: 'Neumáticos Delanteros', description: 'Estado y presión correctos', required: true, order: 20 },
      { id: 'neumaticos_traseros', category: 'Neumáticos', title: 'Neumáticos Traseros', description: 'Estado y presión correctos', required: true, order: 21 },
      { id: 'neumatico_repuesto', category: 'Neumáticos', title: 'Neumático de Repuesto', description: 'Repuesto en buen estado y con presión', required: true, order: 22 },
      { id: 'valvulas_neumaticos', category: 'Neumáticos', title: 'Válvulas de Neumáticos', description: 'Válvulas en buen estado y sin fugas', required: true, order: 23 },
      { id: 'alineacion_balanceo', category: 'Neumáticos', title: 'Alineación y Balanceo', description: 'Alineación y balanceo correctos', required: true, order: 24 },

      // Motor y Transmisión
      { id: 'motor_funcionamiento', category: 'Motor y Transmisión', title: 'Funcionamiento del Motor', description: 'Motor funciona sin ruidos anormales', required: true, order: 25 },
      { id: 'niveles_fluidos', category: 'Motor y Transmisión', title: 'Niveles de Fluidos', description: 'Aceite, refrigerante y otros fluidos', required: true, order: 26 },
      { id: 'sistema_transmision', category: 'Motor y Transmisión', title: 'Sistema de Transmisión', description: 'Cambio de marchas suave y sin ruidos', required: true, order: 27 },
      { id: 'sistema_escape', category: 'Motor y Transmisión', title: 'Sistema de Escape', description: 'Escape sin fugas y silencioso', required: true, order: 28 },
      { id: 'sistema_enfriamiento', category: 'Motor y Transmisión', title: 'Sistema de Enfriamiento', description: 'Sistema de refrigeración funcional', required: true, order: 29 },

      // Emisiones Ambientales
      { id: 'gases_escape', category: 'Emisiones', title: 'Gases de Escape', description: 'Niveles de emisiones dentro de límites', required: true, order: 30 },
      { id: 'control_polucion', category: 'Emisiones', title: 'Sistema de Control de Contaminación', description: 'Catalizador y sistemas de control', required: true, order: 31 },
      { id: 'filtro_aire', category: 'Emisiones', title: 'Filtro de Aire', description: 'Filtro de aire limpio y en buen estado', required: true, order: 32 },
      { id: 'sistema_pcv', category: 'Emisiones', title: 'Sistema PCV', description: 'Sistema de ventilación del cárter', required: true, order: 33 },

      // Sistema de Dirección
      { id: 'direccion_mecanica', category: 'Sistema de Dirección', title: 'Dirección Mecánica', description: 'Dirección sin juego excesivo', required: true, order: 34 },
      { id: 'direccion_hidraulica', category: 'Sistema de Dirección', title: 'Dirección Hidráulica', description: 'Sistema hidráulico sin fugas', required: true, order: 35 },
      { id: 'bomba_direccion', category: 'Sistema de Dirección', title: 'Bomba de Dirección', description: 'Bomba de dirección funcionando', required: true, order: 36 },
      { id: 'alineacion_direccion', category: 'Sistema de Dirección', title: 'Alineación de Dirección', description: 'Alineación de dirección correcta', required: true, order: 37 },

      // Suspensión
      { id: 'amortiguadores_delanteros', category: 'Suspensión', title: 'Amortiguadores Delanteros', description: 'Amortiguadores en buen estado', required: true, order: 38 },
      { id: 'amortiguadores_traseros', category: 'Suspensión', title: 'Amortiguadores Traseros', description: 'Amortiguadores traseros funcionales', required: true, order: 39 },
      { id: 'resortes_suspension', category: 'Suspensión', title: 'Resortes de Suspensión', description: 'Resortes sin deformaciones', required: true, order: 40 },
      { id: 'brazos_control', category: 'Suspensión', title: 'Brazos de Control', description: 'Brazos de control y bujes en buen estado', required: true, order: 41 },

      // Seguridad Pasiva
      { id: 'cinturones_seguridad', category: 'Seguridad Pasiva', title: 'Cinturones de Seguridad', description: 'Cinturones funcionales y sin daños', required: true, order: 42 },
      { id: 'airbags', category: 'Seguridad Pasiva', title: 'Airbags', description: 'Sistema de airbags operativo', required: true, order: 43 },
      { id: 'apoyacabezas', category: 'Seguridad Pasiva', title: 'Apoyacabezas', description: 'Apoyacabezas regulables y en buen estado', required: true, order: 44 },
      { id: 'parachoques', category: 'Seguridad Pasiva', title: 'Parachoques', description: 'Parachoques fijos y sin daños graves', required: true, order: 45 },

      // Seguridad Activa
      { id: 'espejos_retrovisores', category: 'Seguridad Activa', title: 'Espejos Retrovisores', description: 'Espejos completos y ajustables', required: true, order: 46 },
      { id: 'limpiaparabrisas', category: 'Seguridad Activa', title: 'Limpiaparabrisas', description: 'Limpiaparabrisas funcionando', required: true, order: 47 },
      { id: 'sistema_lavado', category: 'Seguridad Activa', title: 'Sistema de Lavado', description: 'Sistema de lavaparabrisas funcional', required: true, order: 48 },
      { id: 'claxon_bocina', category: 'Seguridad Activa', title: 'Claxon/Bocina', description: 'Bocina funcionando correctamente', required: true, order: 49 },

      // Chasis y Carrocería
      { id: 'estructura_chasis', category: 'Chasis y Carrocería', title: 'Estructura del Chasis', description: 'Chasis sin deformaciones ni corrosión', required: true, order: 50 },
      { id: 'carroceria_puertas', category: 'Chasis y Carrocería', title: 'Carrocería y Puertas', description: 'Puertas abren y cierran correctamente', required: true, order: 51 },
      { id: 'vidrios_ventanillas', category: 'Chasis y Carrocería', title: 'Vidrios y Ventanillas', description: 'Vidrios sin grietas y funcionales', required: true, order: 52 },
      { id: 'sellado_cajuela', category: 'Chasis y Carrocería', title: 'Sellado de Cajuela', description: 'Cajuela cierra correctamente y sella', required: true, order: 53 },

      // Accesorios y Equipamiento
      { id: 'tablero_instrumentos', category: 'Accesorios', title: 'Tablero de Instrumentos', description: 'Indicadores funcionando correctamente', required: true, order: 54 },
      { id: 'acondicionado_aire', category: 'Accesorios', title: 'Aire Acondicionado', description: 'Sistema de aire a/c funcionando', required: false, order: 55 },
      { id: 'sistema_audio', category: 'Accesorios', title: 'Sistema de Audio', description: 'Sistema de audio funcional si aplica', required: false, order: 56 },
      { id: 'triangulo_seguridad', category: 'Accesorios', title: 'Triángulo de Seguridad', description: 'Triángulo y kit de emergencia', required: true, order: 57 },
      { id: 'extintor_vehiculo', category: 'Accesorios', title: 'Extintor de Vehículo', description: 'Extintor cargado y vigente', required: true, order: 58 }
    ]
  }
};

export default function ChecklistInteractive() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [selectedType, setSelectedType] = useState<'escon' | 'ecsal' | 'citv'>('escon');
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistResponse | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<ChecklistResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [templates, setTemplates] = useState(checklistTemplates);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const startNewChecklist = () => {
    const template = templates[selectedType];
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
      const template = checklistTemplates[currentChecklist.checklist_id];
      const isComplete = Object.values(responses).every((response: any) => response.completed);

      // Validaciones específicas por tipo
      const validationResult = validateChecklist(currentChecklist.checklist_id, responses, template);
      if (!validationResult.valid) {
        alert(validationResult.message);
        setSaving(false);
        return;
      }

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

  const validateChecklist = (checklistId: string, responses: Record<string, any>, template: ChecklistTemplate): { valid: boolean; message: string } => {
    const requiredItems = template.items.filter(item => item.required);
    const completedRequired = requiredItems.filter(item => responses[item.id]?.completed);

    if (completedRequired.length < requiredItems.length) {
      const missingItems = requiredItems.filter(item => !responses[item.id]?.completed).map(item => item.title);
      return {
        valid: false,
        message: `Faltan ítems requeridos obligatorios:\n\n${missingItems.join('\n')}\n\nPor favor complete todos los ítems requeridos antes de guardar.`
      };
    }

    // Validaciones específicas por tipo
    if (checklistId === 'escon') {
      // Validar que todos los documentos legales estén completos
      const legalDocs = ['doc_identidad', 'licencia_conducir', 'certificado_medico', 'antecedentes_penales'];
      const missingLegalDocs = legalDocs.filter(doc => !responses[doc]?.completed);

      if (missingLegalDocs.length > 0) {
        return {
          valid: false,
          message: 'Para ESCON es obligatorio completar toda la Documentación Legal antes de finalizar el checklist.'
        };
      }
    }

    if (checklistId === 'ecsal') {
      // Validar licencias y certificaciones
      const licenses = ['licencia_funcionamiento', 'certificado_sanitario', 'registro_digit'];
      const missingLicenses = licenses.filter(license => !responses[license]?.completed);

      if (missingLicenses.length > 0) {
        return {
          valid: false,
          message: 'Para ECSAL es obligatorio tener todas las Licencias y Certificaciones al día.'
        };
      }
    }

    if (checklistId === 'citv') {
      // Validar documentación básica del vehículo
      const basicDocs = ['tarjeta_propiedad', 'soat_vigente'];
      const missingBasicDocs = basicDocs.filter(doc => !responses[doc]?.completed);

      if (missingBasicDocs.length > 0) {
        return {
          valid: false,
          message: 'Para CITV es obligatorio tener la Tarjeta de Propiedad y SOAT vigentes.'
        };
      }

      // Validar sistemas críticos de seguridad
      const criticalSystems = ['frenos_delanteros', 'luces_delanteras', 'neumaticos_delanteros', 'cinturones_seguridad'];
      const missingCriticalSystems = criticalSystems.filter(system => !responses[system]?.completed);

      if (missingCriticalSystems.length > 0) {
        return {
          valid: false,
          message: 'Sistemas críticos de seguridad incompletos. Es obligatorio verificar:\n- Sistema de frenos\n- Sistema de luces\n- Neumáticos\n- Cinturones de seguridad'
        };
      }
    }

    return { valid: true, message: '' };
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
    const template = templates[selectedType];
    return template.items.filter(item => item.category === category);
  };

  const categories = Array.from(new Set(templates[selectedType].items.map(item => item.category)));

  const handleSaveTemplate = (templateId: string, updatedTemplate: ChecklistTemplate) => {
    setTemplates(prev => ({
      ...prev,
      [templateId]: updatedTemplate
    }));
    alert('Plantilla guardada exitosamente');
  };

  const canManageTemplates = hasPermission('checklist-edit');

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
            {canManageTemplates && (
              <button
                onClick={() => setShowTemplateManager(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Gestionar Plantillas
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'new'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
                }`}
            >
              <Plus className="w-4 h-4" />
              Nuevo Checklist
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'history'
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
                  {Object.entries(templates).map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedType(key as 'escon' | 'ecsal' | 'citv')}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedType === key
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
                                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${response.completed
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
                  const template = templates[checklist.checklist_id as keyof typeof templates];
                  const completed = Object.values(checklist.responses).filter((response: any) => response.completed).length;
                  const total = Object.keys(checklist.responses).length;
                  const percentage = Math.round((completed / total) * 100);

                  return (
                    <div key={checklist.id} className="border border-slate-200 rounded-xl p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-black text-lg">{template?.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${checklist.status === 'completed'
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

      {/* Template Manager Modal */}
      {showTemplateManager && (
        <TemplateManager
          templates={templates}
          onSaveTemplate={handleSaveTemplate}
          onClose={() => setShowTemplateManager(false)}
        />
      )}
    </div>
  );
}
