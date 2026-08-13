export type FieldType = 'text' | 'select' | 'boolean' | 'date' | 'number' | 'textarea' | 'file';

export interface CampoConfig {
  key: string;
  label: string;
  type: FieldType;
  opciones?: string[];
  required?: boolean;
  placeholder?: string;
  colSpan?: number;
}

export interface CategoriaConfig {
  key: string;
  label: string;
  tiposActivo: string[];
  camposCategoria: CampoConfig[];
  camposPorTipo: Record<string, CampoConfig[]>;
}

export const CATEGORIAS_CONFIG: CategoriaConfig[] = [
  {
    key: 'tecnologia',
    label: 'Tecnología',
    tiposActivo: ['Computadora', 'Laptop', 'Monitor', 'Teclado', 'Mouse', 'Impresora', 'Servidor', 'Celular', 'Tablet', 'Proyector', 'Router', 'Switch', 'Cable', 'Disco', 'Memoria', 'USB', 'Escáner', 'Teléfono', 'TV', 'Pantalla'],
    camposCategoria: [
      { key: 'conectado_a_red', label: 'Conectado a Red', type: 'boolean' }
    ],
    camposPorTipo: {
      'Computadora': [
        { key: 'procesador', label: 'Procesador', type: 'text' },
        { key: 'ram', label: 'RAM', type: 'text' },
        { key: 'almacenamiento', label: 'Almacenamiento', type: 'text' },
        { key: 'sistema_operativo', label: 'Sistema Operativo', type: 'text' },
        { key: 'direccion_ip', label: 'Dirección IP', type: 'text' },
        { key: 'usuario_anydesk', label: 'Acceso Anydesk', type: 'text' }
      ],
      'Laptop': [
        { key: 'procesador', label: 'Procesador', type: 'text' },
        { key: 'ram', label: 'RAM', type: 'text' },
        { key: 'almacenamiento', label: 'Almacenamiento', type: 'text' },
        { key: 'sistema_operativo', label: 'Sistema Operativo', type: 'text' },
        { key: 'direccion_ip', label: 'Dirección IP', type: 'text' },
        { key: 'usuario_anydesk', label: 'Acceso Anydesk', type: 'text' }
      ],
      'Servidor': [
        { key: 'procesador', label: 'Procesador', type: 'text' },
        { key: 'ram', label: 'RAM', type: 'text' },
        { key: 'almacenamiento', label: 'Almacenamiento', type: 'text' },
        { key: 'sistema_operativo', label: 'Sistema Operativo', type: 'text' },
        { key: 'direccion_ip', label: 'Dirección IP', type: 'text' },
        { key: 'usuario_anydesk', label: 'Acceso Anydesk', type: 'text' }
      ],
      'Celular': [
        { key: 'imei', label: 'IMEI', type: 'text' },
        { key: 'fecha_primer_uso', label: 'Fecha primer uso', type: 'date' },
        { key: 'numero_linea', label: 'Número de línea', type: 'text' },
        { key: 'sistema_operativo', label: 'Sistema Operativo', type: 'text' }
      ],
      'Tablet': [
        { key: 'imei', label: 'IMEI', type: 'text' },
        { key: 'fecha_primer_uso', label: 'Fecha primer uso', type: 'date' },
        { key: 'numero_linea', label: 'Número de línea', type: 'text' },
        { key: 'sistema_operativo', label: 'Sistema Operativo', type: 'text' }
      ],
      'Router': [
        { key: 'direccion_ip', label: 'Dirección IP', type: 'text' },
        { key: 'mac_address', label: 'MAC Address', type: 'text' },
        { key: 'numero_puertos', label: 'Número de Puertos', type: 'number' }
      ],
      'Switch': [
        { key: 'direccion_ip', label: 'Dirección IP', type: 'text' },
        { key: 'mac_address', label: 'MAC Address', type: 'text' },
        { key: 'numero_puertos', label: 'Número de Puertos', type: 'number' }
      ],
      'Impresora': [
        { key: 'tipo_conexion', label: 'Tipo Conexión', type: 'select', opciones: ['USB', 'Red'] },
        { key: 'direccion_ip', label: 'Dirección IP', type: 'text' }
      ],
      'Monitor': [
        { key: 'pulgadas', label: 'Pulgadas', type: 'number' },
        { key: 'resolucion', label: 'Resolución', type: 'text' }
      ],
      'TV': [
        { key: 'pulgadas', label: 'Pulgadas', type: 'number' },
        { key: 'resolucion', label: 'Resolución', type: 'text' }
      ],
      'Pantalla': [
        { key: 'pulgadas', label: 'Pulgadas', type: 'number' },
        { key: 'resolucion', label: 'Resolución', type: 'text' }
      ],
      'Disco': [
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'tipo_conexion', label: 'Tipo Conexión', type: 'text' }
      ],
      'Memoria': [
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'tipo_conexion', label: 'Tipo Conexión', type: 'text' }
      ],
      'USB': [
        { key: 'capacidad', label: 'Capacidad', type: 'text' },
        { key: 'tipo_conexion', label: 'Tipo Conexión', type: 'text' }
      ]
    }
  },
  {
    key: 'seguridad-control',
    label: 'Seguridad y Control',
    tiposActivo: ['Cámara', 'DVR', 'NVR', 'Biométrico', 'Huella', 'Alarma', 'Extintor', 'Vigilancia', 'Luces de Emergencia'],
    camposCategoria: [],
    camposPorTipo: {
      'Cámara': [
        { key: 'resolucion', label: 'Resolución', type: 'text' },
        { key: 'tipo_camara', label: 'Tipo Cámara', type: 'select', opciones: ['Domo', 'Bullet', 'PTZ'] },
        { key: 'ubicacion_camaras', label: 'Ubicación Cámaras', type: 'text' },
        { key: 'vision_nocturna', label: 'Visión Nocturna', type: 'boolean' }
      ],
      'DVR': [
        { key: 'numero_canales', label: 'Número Canales', type: 'number' },
        { key: 'capacidad_almacenamiento', label: 'Capacidad Almacenamiento', type: 'text' },
        { key: 'dias_grabacion', label: 'Días de Grabación', type: 'number' },
        { key: 'ip_acceso', label: 'IP Acceso', type: 'text' },
        { key: 'usuario_admin', label: 'Usuario Admin', type: 'text' },
        { key: 'software_vms', label: 'Software VMS', type: 'text' }
      ],
      'NVR': [
        { key: 'numero_canales', label: 'Número Canales', type: 'number' },
        { key: 'capacidad_almacenamiento', label: 'Capacidad Almacenamiento', type: 'text' },
        { key: 'dias_grabacion', label: 'Días de Grabación', type: 'number' },
        { key: 'ip_acceso', label: 'IP Acceso', type: 'text' },
        { key: 'usuario_admin', label: 'Usuario Admin', type: 'text' },
        { key: 'software_vms', label: 'Software VMS', type: 'text' }
      ],
      'Biométrico': [
        { key: 'capacidad_usuarios', label: 'Capacidad Usuarios', type: 'number' },
        { key: 'ip_acceso', label: 'IP Acceso', type: 'text' },
        { key: 'software_asociado', label: 'Software Asociado', type: 'text' }
      ],
      'Huella': [
        { key: 'capacidad_usuarios', label: 'Capacidad Usuarios', type: 'number' },
        { key: 'ip_acceso', label: 'IP Acceso', type: 'text' },
        { key: 'software_asociado', label: 'Software Asociado', type: 'text' }
      ],
      'Alarma': [
        { key: 'zonas_cubiertas', label: 'Zonas Cubiertas', type: 'text' },
        { key: 'central_monitoreo', label: 'Central de Monitoreo', type: 'text' }
      ],
      'Vigilancia': [
        { key: 'zonas_cubiertas', label: 'Zonas Cubiertas', type: 'text' },
        { key: 'central_monitoreo', label: 'Central de Monitoreo', type: 'text' }
      ],
      'Extintor': [
        { key: 'tipo_extintor', label: 'Tipo Extintor', type: 'select', opciones: ['PQS', 'CO2', 'Agua'] },
        { key: 'peso_kg', label: 'Peso (Kg)', type: 'number' },
        { key: 'fecha_vencimiento', label: 'Fecha Vencimiento', type: 'date' },
        { key: 'fecha_recarga', label: 'Fecha Recarga', type: 'date' }
      ],
      'Luces de Emergencia': [
        { key: 'autonomia_horas', label: 'Autonomía (Horas)', type: 'number' },
        { key: 'tipo_bateria', label: 'Tipo de Batería', type: 'text' }
      ]
    }
  },
  {
    key: 'herramientas-equipos',
    label: 'Herramientas y Equipos',
    tiposActivo: ['Alicate', 'Taladro', 'Destornillador', 'Llave', 'Martillo', 'Sierra', 'Pinza', 'Cutter', 'Cinta', 'Medidor', 'Nivel', 'Clavo', 'Tornillo', 'Broca', 'Lima', 'Soldadora', 'Amoladora', 'Esmeril'],
    camposCategoria: [
      { key: 'ubicacion_taller', label: 'Ubicación en Taller', type: 'text' }
    ],
    camposPorTipo: {
      'Taladro': [
        { key: 'voltaje', label: 'Voltaje', type: 'text' },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' },
        { key: 'ultimo_mantenimiento', label: 'Último Mantenimiento', type: 'date' },
        { key: 'proximo_mantenimiento', label: 'Próximo Mantenimiento', type: 'date' }
      ],
      'Soldadora': [
        { key: 'voltaje', label: 'Voltaje', type: 'text' },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' },
        { key: 'ultimo_mantenimiento', label: 'Último Mantenimiento', type: 'date' },
        { key: 'proximo_mantenimiento', label: 'Próximo Mantenimiento', type: 'date' }
      ],
      'Amoladora': [
        { key: 'voltaje', label: 'Voltaje', type: 'text' },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' },
        { key: 'ultimo_mantenimiento', label: 'Último Mantenimiento', type: 'date' },
        { key: 'proximo_mantenimiento', label: 'Próximo Mantenimiento', type: 'date' }
      ],
      'Esmeril': [
        { key: 'voltaje', label: 'Voltaje', type: 'text' },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' },
        { key: 'ultimo_mantenimiento', label: 'Último Mantenimiento', type: 'date' },
        { key: 'proximo_mantenimiento', label: 'Próximo Mantenimiento', type: 'date' }
      ],
      'Cinta': [
        { key: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'number' }
      ],
      'Clavo': [
        { key: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'number' }
      ],
      'Tornillo': [
        { key: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'number' }
      ],
      'Broca': [
        { key: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'number' }
      ]
    }
  },
  {
    key: 'instalaciones',
    label: 'Instalaciones',
    tiposActivo: ['Lámpara', 'Luz', 'Aire Acondicionado', 'Baño', 'Grifo', 'Tubería', 'Plomería', 'Electricidad', 'Ventilador', 'Extractor', 'Foco', 'Interruptor', 'Enchufe', 'Ventana', 'Puerta', 'Pintura', 'Tablero', 'Tanque', 'Calentador'],
    camposCategoria: [
      { key: 'ambiente', label: 'Ambiente', type: 'text' },
      { key: 'fecha_instalacion', label: 'Fecha de Instalación', type: 'date' },
      { key: 'empresa_instaladora', label: 'Empresa Instaladora', type: 'text' }
    ],
    camposPorTipo: {
      'Aire Acondicionado': [
        { key: 'capacidad_btu', label: 'Capacidad (BTU)', type: 'text' },
        { key: 'tipo_gas_refrigerante', label: 'Tipo Gas Refrigerante', type: 'text' },
        { key: 'ultimo_mantenimiento', label: 'Último Mantenimiento', type: 'date' }
      ],
      'Tablero': [
        { key: 'numero_circuitos', label: 'Número de Circuitos', type: 'number' },
        { key: 'amperaje', label: 'Amperaje', type: 'text' }
      ],
      'Calentador': [
        { key: 'capacidad_litros', label: 'Capacidad (Litros)', type: 'number' },
        { key: 'tipo_energia', label: 'Tipo Energía', type: 'select', opciones: ['Gas', 'Eléctrico', 'Solar'] }
      ],
      'Tanque': [
        { key: 'capacidad_litros', label: 'Capacidad (Litros)', type: 'number' },
        { key: 'tipo_energia', label: 'Tipo Energía', type: 'select', opciones: ['Gas', 'Eléctrico', 'Solar'] }
      ],
      'Lámpara': [
        { key: 'tipo_luminaria', label: 'Tipo Luminaria', type: 'select', opciones: ['LED', 'Fluorescente', 'Incandescente'] },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' }
      ],
      'Luz': [
        { key: 'tipo_luminaria', label: 'Tipo Luminaria', type: 'select', opciones: ['LED', 'Fluorescente', 'Incandescente'] },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' }
      ],
      'Foco': [
        { key: 'tipo_luminaria', label: 'Tipo Luminaria', type: 'select', opciones: ['LED', 'Fluorescente', 'Incandescente'] },
        { key: 'potencia_watts', label: 'Potencia (Watts)', type: 'number' }
      ]
    }
  },
  {
    key: 'mobiliario',
    label: 'Mobiliario',
    tiposActivo: ['Escritorio', 'Silla', 'Mesa', 'Estante', 'Armario', 'Mueble', 'Banca', 'Módulo', 'Pizarra', 'Biombo', 'Archivador', 'Gabinete'],
    camposCategoria: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'dimensiones', label: 'Dimensiones', type: 'text' },
      { key: 'cantidad_modulos', label: 'Cantidad de Módulos', type: 'number' },
      { key: 'color', label: 'Color', type: 'text' }
    ],
    camposPorTipo: {}
  },
  {
    key: 'equipos-revision',
    label: 'Equipos de Revisión (RTV/CITV)',
    tiposActivo: ['Opacímetro', 'Frenómetro', 'Alineador', 'Banco de Suspensión', 'Sonómetro', 'Gasómetro', 'Analizador de Gases', 'Luxómetro', 'Banco de Pruebas', 'PIT', 'Foso', 'Dinamómetro', 'Holgurómetro', 'Tacómetro', 'Detector de Holguras', 'Analizador Vehicular'],
    camposCategoria: [
      { key: 'certificado_calibracion', label: 'Certificado de Calibración', type: 'text' },
      { key: 'fecha_ultima_calibracion', label: 'Fecha Última Calibración', type: 'date' },
      { key: 'fecha_proxima_calibracion', label: 'Fecha Próxima Calibración', type: 'date' },
      { key: 'entidad_calibradora', label: 'Entidad Calibradora', type: 'text' },
      { key: 'norma_tecnica_aplicable', label: 'Norma Técnica Aplicable', type: 'text' },
      { key: 'numero_linea_inspeccion', label: 'Número Línea Inspección', type: 'text' },
      { key: 'software_asociado', label: 'Software Asociado', type: 'text' },
      { key: 'fecha_homologacion_mtc', label: 'Fecha Homologación MTC', type: 'date' }
    ],
    camposPorTipo: {}
  },
  {
    key: 'equipos-operativos',
    label: 'Equipos Operativos',
    tiposActivo: ['Analizador', 'Equipo de Diagnóstico', 'Estetoscopio', 'Tensiómetro', 'Oftalmoscopio', 'Balanza', 'Camilla', 'Equipo Médico', 'Equipo Clínico'],
    camposCategoria: [
      { key: 'certificado_sanitario', label: 'Certificado Sanitario', type: 'text' },
      { key: 'fecha_calibracion', label: 'Fecha Calibración', type: 'date' },
      { key: 'area_clinica_asignada', label: 'Área Clínica Asignada', type: 'text' }
    ],
    camposPorTipo: {
      'Balanza': [
        { key: 'capacidad_maxima_kg', label: 'Capacidad Máxima (Kg)', type: 'number' }
      ],
      'Camilla': [
        { key: 'capacidad_carga_kg', label: 'Capacidad de Carga (Kg)', type: 'number' }
      ]
    }
  },
  {
    key: 'utiles-suministros',
    label: 'Útiles y Suministros',
    tiposActivo: ['Lapicero', 'Lápiz', 'Papel', 'Carpeta', 'Grapadora', 'Tinta', 'Cartucho', 'Notas', 'Cinta Adhesiva', 'Sello', 'Tijera', 'Botiquín', 'Resma', 'Folders'],
    camposCategoria: [
      { key: 'unidad_medida', label: 'Unidad de Medida', type: 'text' },
      { key: 'cantidad', label: 'Cantidad', type: 'number' }
    ],
    camposPorTipo: {}
  },
  {
    key: 'infraestructura-ti',
    label: 'Infraestructura TI',
    tiposActivo: ['Rack', 'Patch Panel', 'UPS', 'Estabilizador', 'NAS', 'Storage', 'WiFi', 'Access Point', 'Cableado', 'Fibra', 'Servidor de Red', 'Switch de Red'],
    camposCategoria: [],
    camposPorTipo: {
      'UPS': [
        { key: 'capacidad_va', label: 'Capacidad VA', type: 'number' },
        { key: 'autonomia_minutos', label: 'Autonomía Minutos', type: 'number' }
      ],
      'Estabilizador': [
        { key: 'capacidad_va', label: 'Capacidad VA', type: 'number' },
        { key: 'autonomia_minutos', label: 'Autonomía Minutos', type: 'number' }
      ],
      'NAS': [
        { key: 'capacidad_almacenamiento', label: 'Capacidad Almacenamiento', type: 'text' },
        { key: 'numero_discos', label: 'Número de Discos', type: 'number' },
        { key: 'raid', label: 'Configuración RAID', type: 'text' }
      ],
      'Storage': [
        { key: 'capacidad_almacenamiento', label: 'Capacidad Almacenamiento', type: 'text' },
        { key: 'numero_discos', label: 'Número de Discos', type: 'number' },
        { key: 'raid', label: 'Configuración RAID', type: 'text' }
      ],
      'Rack': [
        { key: 'numero_ur', label: 'Número UR (Unidades de Rack)', type: 'number' },
        { key: 'ubicacion_fisica', label: 'Ubicación Física', type: 'text' }
      ],
      'Patch Panel': [
        { key: 'numero_puertos', label: 'Número de Puertos', type: 'number' }
      ],
      'Switch de Red': [
        { key: 'numero_puertos', label: 'Número de Puertos', type: 'number' }
      ],
      'WiFi': [
        { key: 'ip_gestion', label: 'IP de Gestión', type: 'text' },
        { key: 'ssid', label: 'SSID', type: 'text' },
        { key: 'cobertura_area', label: 'Cobertura (Área)', type: 'text' }
      ],
      'Access Point': [
        { key: 'ip_gestion', label: 'IP de Gestión', type: 'text' },
        { key: 'ssid', label: 'SSID', type: 'text' },
        { key: 'cobertura_area', label: 'Cobertura (Área)', type: 'text' }
      ],
      'Cableado': [
        { key: 'longitud_metros', label: 'Longitud (Metros)', type: 'number' },
        { key: 'categoria_cable', label: 'Categoría Cable', type: 'text' }
      ],
      'Fibra': [
        { key: 'longitud_metros', label: 'Longitud (Metros)', type: 'number' },
        { key: 'categoria_cable', label: 'Categoría Cable', type: 'text' }
      ]
    }
  },
  {
    key: 'otros-activos',
    label: 'Otros Activos',
    tiposActivo: ['Compresora', 'Aspiradora', 'Carretilla', 'Estructura', 'Instalación Especial'],
    camposCategoria: [
      { key: 'descripcion_detallada', label: 'Descripción Detallada', type: 'textarea' }
    ],
    camposPorTipo: {}
  }
];
