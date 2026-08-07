export type CategoryRecommendation = {
  slug: string;
  keywords: string[];
  examples: string[];
  description: string;
};

export const CATEGORY_RECOMMENDATIONS: CategoryRecommendation[] = [
  {
    slug: 'tecnologia',
    keywords: ['computadora', 'laptop', 'monitor', 'teclado', 'mouse', 'impresora', 'servidor', 'celular', 'tablet', 'proyector', 'router', 'switch', 'cable', 'disco', 'memoria', 'usb', 'escaner', 'telefono', 'tv', 'pantalla'],
    examples: ['Computadoras', 'Laptops', 'Monitores', 'Impresoras', 'Celulares'],
    description: 'Equipos de cómputo, electrónicos y redes',
  },
  {
    slug: 'seguridad-control',
    keywords: ['camara', 'dvr', 'nvr', 'biometrico', 'huella', 'alarma', 'extintor', 'seguridad', 'vigilancia', 'camaras', 'luces de emergencia'],
    examples: ['Cámaras', 'DVR/NVR', 'Biométricos', 'Alarmas', 'Extintores'],
    description: 'Sistemas de seguridad y control de acceso',
  },
  {
    slug: 'herramientas-equipos',
    keywords: ['alicate', 'talero', 'destornillador', 'llave', 'martillo', 'sierra', 'taladro', 'herramienta', 'pinza', 'cutter', 'cinta', 'medidor', 'nivel', 'clavo', 'tornillo', 'broca', 'lima', 'serrat', 'inglete', 'soldadora', 'amoladora', 'esmeril'],
    examples: ['Alicates', 'Taleros', 'Destornilladores', 'Llaves', 'Martillos'],
    description: 'Herramientas manuales, eléctricas y equipos de trabajo',
  },
  {
    slug: 'instalaciones',
    keywords: ['lampara', 'luz', 'aire', 'acondicionado', 'baño', 'grifo', 'tuberia', 'plomeria', 'electricidad', 'ventilador', 'extractor', 'foco', 'interruptor', 'enchufe', 'base', 'ampolleta', 'ventana', 'puerta', 'cerámica', 'pintura', 'tablero', 'llave de paso', 'tanque', 'calentador'],
    examples: ['Aire acondicionado', 'Lámparas', 'Baños', 'Ventilación', 'Eléctrico'],
    description: 'Instalaciones eléctricas, sanitarias, iluminación y climatización',
  },
  {
    slug: 'mobiliario',
    keywords: ['escritorio', 'silla', 'mesa', 'estante', 'armario', 'mueble', 'banca', 'modulo', 'pizarra', 'biombo', 'archivador', 'carpetas', 'gabinete'],
    examples: ['Escritorios', 'Sillas', 'Mesas', 'Estantes', 'Archivadores'],
    description: 'Muebles de oficina y equipamiento',
  },
  {
    slug: 'equipos-revision',
    keywords: [
      'opacimetro', 'frenometro', 'alineador', 'banco de suspension', 'sonometro',
      'gasometro', 'analizador de gases', 'comprobador', 'luxometro', 'verificador',
      'banco de pruebas', 'pit', 'foso', 'linea de inspeccion', 'maquina de revision',
      'equipo de revision', 'dinamometro', 'ruleta de velocidad', 'holgurometro',
      'tacometro', 'presion neumaticos', 'detector de holguras', 'analizador vehicular',
      'revision tecnica', 'inspeccion tecnica', 'rtv', 'citv',
    ],
    examples: ['Opacímetros', 'Frenómetros', 'Alineadores', 'Analizadores de gases', 'Sonómetros'],
    description: 'Maquinaria y equipos para revisiones técnicas vehiculares (RTV/CITV)',
  },
  {
    slug: 'equipos-operativos',
    keywords: ['analizador', 'diagnostico', 'clinico', 'laboratorio', 'evaluacion', 'estetoscopio', 'tensiómetro', 'oftalmoscopio', 'balanza', 'camilla', 'equipo medico', 'equipo clinico', 'evaluacion medica'],
    examples: ['Analizadores', 'Equipos clínicos', 'Equipos de diagnóstico', 'Balanzas médicas'],
    description: 'Equipos médicos, clínicos y de evaluación de salud',
  },
  {
    slug: 'utiles-suministros',
    keywords: ['lapicero', 'lapiz', 'papel', 'carpeta', 'grapadora', 'tinta', 'cartucho', 'notas', 'cinta adhesiva', 'sello', 'tijera', 'botiquin', 'resma', 'folders', 'archivador'],
    examples: ['Lapiceros', 'Papel', 'Carpetas', 'Grapadoras', 'Tintas'],
    description: 'Material de oficina y suministros administrativos',
  },

  {
    slug: 'infraestructura-ti',
    keywords: ['rack', 'patch', 'ups', 'estabilizador', 'nas', 'storage', 'torre', 'wifi', 'access point', 'cableado', 'fiber', 'fibra', 'servidor de red', 'switch de red'],
    examples: ['Servidores', 'Racks', 'UPS', 'Switches de red', 'NAS'],
    description: 'Infraestructura de servidores, redes y comunicaciones',
  },
  {
    slug: 'otros-activos',
    keywords: ['compresora', 'aspiradora', 'carretilla', 'estructura', 'instalacion especial'],
    examples: ['Compresoras', 'Aspiradoras', 'Carretillas', 'Herramientas especiales'],
    description: 'Equipos diversos, herramientas especiales y estructuras',
  },
];

export function detectCategory(itemName: string): string | null {
  const lower = itemName.toLowerCase().trim();
  if (!lower) return null;

  for (const rec of CATEGORY_RECOMMENDATIONS) {
    if (rec.keywords.some(kw => lower.includes(kw))) {
      return rec.slug;
    }
  }
  return null;
}

export function getCategoryBySlug(slug: string): CategoryRecommendation | undefined {
  return CATEGORY_RECOMMENDATIONS.find(r => r.slug === slug);
}
