import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la creación del usuario administrador...');

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { dni: '72562172' },
    update: {},
    create: {
      dni: '72562172',
      email: 'admin@gsc.com',
      full_name: 'Administrador GSC',
      password_hash: '15042002', 
      role: 'super_admin',
      status: 'active',
    },
  });

  console.log('✅ Usuario Administrador creado con éxito:', admin.full_name);

  // 2. Default Categories and Subcategories
  console.log('🌱 Inicializando categorías y subcategorías...');

  const structure = [
    {
      name: 'Equipos de Cómputo y TI',
      subcategories: [
        'Computadoras (CPU)', 'Monitores', 'Laptops', 'Teclados', 'Mouse',
        'Impresoras', 'Impresoras multifuncionales', 'Estabilizadores',
        'Proyectores', 'Audio (parlantes y micrófonos)', 'Redes (router y DVR)',
        'Cámaras', 'Accesorios TI'
      ]
    },
    {
      name: 'Equipos Biométricos y Control',
      subcategories: [
        'Biométricos', 'Control de huella', 'Accesorios biométricos (tampón y tampón de huella)'
      ]
    },
    {
      name: 'Equipos Médicos',
      subcategories: [
        'Diagnóstico general', 'Equipos de medición', 'Equipos clínicos',
        'Equipos de oftalmología', 'Equipos de otorrinolaringología',
        'Equipos psicotécnicos', 'Instrumentos médicos',
        'Laboratorio - Equipos de análisis', 'Laboratorio - Equipos de esterilización',
        'Laboratorio - Equipos de muestras', 'Laboratorio - Equipos ópticos',
        'Evaluación Técnica - Equipos de evaluación visual',
        'Evaluación Técnica - Equipos de evaluación auditiva',
        'Evaluación Técnica - Equipos psicotécnicos',
        'Evaluación Técnica - Equipos de simulación o pruebas'
      ]
    },
    {
      name: 'Mobiliario',
      subcategories: [
        'Escritorios', 'Mesas', 'Sillas', 'Estantes', 'Armarios',
        'Muebles de archivo', 'Módulos', 'Biombos',
        'Infraestructura - Refrigeración', 'Infraestructura - Lavaderos',
        'Infraestructura - Instalaciones de agua', 'Infraestructura - Dispensadores',
        'Infraestructura - Ventilación', 'Infraestructura - Instalaciones del local'
      ]
    },
    {
      name: 'Seguridad',
      subcategories: [
        'Extintores', 'Detectores de humo', 'Luces de emergencia',
        'Botiquines', 'Seguridad electrónica (cámaras)'
      ]
    },
    {
      name: 'Útiles de Oficina',
      subcategories: [
        'Herramientas de oficina', 'Organización de escritorio', 'Papelería', 'Accesorios'
      ]
    },
    {
      name: 'Herramientas',
      subcategories: [
        'Herramienta manual', 'Herramienta eléctrica'
      ]
    },
    {
      name: 'Repuestos',
      subcategories: [
        'Repuesto para equipos electrónicos', 'Repuesto para maquinaria Línea',
        'Repuesto para equipos de oficina', 'Repuesto para equipos médicos',
        'Repuesto para equipos de seguridad', 'Repuesto para equipos de transporte',
        'Repuesto para equipos de telecomunicaciones', 'Repuesto para equipos de audio y video',
        'Repuesto para equipos de instrumentos medicos'
      ]
    }
  ];

  for (const item of structure) {
    let category = await prisma.category.findFirst({ where: { name: item.name } });
    if (!category) {
      category = await prisma.category.create({ data: { name: item.name } });
    }

    for (const subName of item.subcategories) {
      const sub = await prisma.subcategory.findFirst({
        where: { name: subName, category_id: category.id }
      });
      if (!sub) {
        await prisma.subcategory.create({
          data: { name: subName, category_id: category.id }
        });
      }
    }
  }

  console.log('✅ Categorías y subcategorías inicializadas.');
}

main()
  .catch((e) => {
    console.error('❌ Error al crear el usuario:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
