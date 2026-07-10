export interface InventoryColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export const INVENTORY_COLUMNS: InventoryColumn[] = [
  { key: 'codigo_unico', label: 'CÓDIGO', sortable: true, width: '15%' },
  { key: 'category', label: 'CATEGORÍA', sortable: true, width: '25%' },
  { key: 'subcategory', label: 'SUBCATEGORÍA', sortable: true, width: '25%' },
  { key: 'brand', label: 'MARCA', sortable: true, width: '15%' },
  { key: 'model', label: 'MODELO', sortable: true, width: '20%' },
  { key: 'serial_number', label: 'SERIE', sortable: true, width: '20%' },
  { key: 'location', label: 'SEDE', sortable: true, width: '25%' },
  { key: 'area', label: 'ÁREA', sortable: true, width: '20%' },
  { key: 'status', label: 'ESTADO', sortable: true, width: '15%' },
  { key: 'fecha_adquisicion', label: 'FECHA ADQUISICIÓN', sortable: true, width: '20%' },
];

export const STATUS_MAP: Record<string, { label: string, color: string }> = {
  Operativo: { label: 'Operativo', color: 'emerald' },
  Inoperativo: { label: 'Inoperativo', color: 'slate' },
  'En Reparación': { label: 'En Reparación', color: 'amber' },
  Baja: { label: 'De Baja', color: 'rose' },
  active: { label: 'Activo', color: 'emerald' },
  inactive: { label: 'Inactivo', color: 'slate' },
  maintenance: { label: 'Mantenimiento', color: 'amber' },
  extracted: { label: 'Extraído', color: 'rose' }
};

export const PATH_CATEGORY_MAP: Record<string, string> = {
  'computo-ti': 'Equipos de Cómputo y TI',
  'biometricos-control': 'Equipos Biométricos y Control',
  'equipos-medicos': 'Equipos Médicos',
  'mobiliario': 'Mobiliario',
  'seguridad': 'Seguridad',
  'utiles-oficina': 'Útiles de Oficina',
  'disco-extraido': 'EXTRAIDO'
};

export const SUBCATEGORY_SLUG_MAP: Record<string, string[]> = {
  'cpu': ['Computadoras (CPU)'],
  'monitores': ['Monitores'],
  'laptops': ['Laptops'],
  'perifericos': ['Teclados', 'Mouse'],
  'impresoras': ['Impresoras', 'Impresoras multifuncionales'],
  'redes': ['Redes (router y DVR)'],
  'lector': ['Biométricos'],
  'huella': ['Control de huella'],
  'diagnostico': ['Diagnóstico general'],
  'clinicos': ['Equipos clínicos'],
  'laboratorio': ['Laboratorio - Equipos de análisis', 'Laboratorio - Equipos de esterilización', 'Laboratorio - Equipos de muestras', 'Laboratorio - Equipos ópticos'],
  'evaluacion': ['Evaluación Técnica - Equipos de evaluación visual', 'Evaluación Técnica - Equipos de evaluación auditiva', 'Evaluación Técnica - Equipos psicotécnicos', 'Evaluación Técnica - Equipos de simulación o pruebas'],
  'oficina': ['Escritorios', 'Mesas', 'Sillas', 'Estantes', 'Armarios', 'Muebles de archivo', 'Módulos', 'Biombos'],
  'infraestructura': ['Infraestructura - Refrigeración', 'Infraestructura - Lavaderos', 'Infraestructura - Instalaciones de agua', 'Infraestructura - Dispensadores', 'Infraestructura - Ventilación', 'Infraestructura - Instalaciones del local'],
};
