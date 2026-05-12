import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos (VPS Setup)...');

  // 1. Crear Ubicaciones
  console.log('📍 Creando ubicaciones...');
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Sede Central - Lima',
        type: 'central',
        address: 'Av. Arequipa 1234, Lima',
        region: 'lima',
        notes: 'Sede principal de operaciones',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Sede Norte - Trujillo',
        type: 'central',
        address: 'Av. América 567, Trujillo',
        region: 'la_libertad',
        notes: 'Sede regional norte',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Sede Sur - Arequipa',
        type: 'central',
        address: 'Calles de Arequipa 890, Arequipa',
        region: 'arequipa',
        notes: 'Sede regional sur',
      },
    }),
    prisma.location.create({
      data: {
        name: 'Almacén Central',
        type: 'central',
        address: 'Av. Industrial 123, Lima',
        region: 'lima',
        notes: 'Almacén principal de equipamiento',
      },
    }),
  ]);

  // 2. Crear Áreas
  console.log('🏢 Creando áreas...');
  const areas = await Promise.all([
    prisma.area.create({
      data: {
        name: 'Administración',
        location_id: locations[0].id,
      },
    }),
    prisma.area.create({
      data: {
        name: 'Sistemas',
        location_id: locations[0].id,
      },
    }),
    prisma.area.create({
      data: {
        name: 'Contabilidad',
        location_id: locations[0].id,
      },
    }),
    prisma.area.create({
      data: {
        name: 'Operaciones',
        location_id: locations[1].id,
      },
    }),
    prisma.area.create({
      data: {
        name: 'Logística',
        location_id: locations[1].id,
      },
    }),
  ]);

  // 3. Crear Tipos de Activos
  console.log('📁 Creando tipos de activos...');
  const assetTypes = await Promise.all([
    prisma.assetType.create({
      data: {
        name: 'Equipos de Cómputo',
      },
    }),
    prisma.assetType.create({
      data: {
        name: 'Equipos de Red',
      },
    }),
    prisma.assetType.create({
      data: {
        name: 'Equipos de Seguridad',
      },
    }),
  ]);

  // 4. Crear Categorías
  console.log('📂 Creando categorías...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Computadoras',
        description: 'Equipos de cómputo de escritorio y portátiles',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Periféricos',
        description: 'Monitores, teclados, mouse, impresoras, etc.',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Redes',
        description: 'Equipos de conectividad y comunicación',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Servidores',
        description: 'Equipos servidor y almacenamiento',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Seguridad',
        description: 'Cámaras, DVRs y equipos de seguridad',
      },
    }),
  ]);

  // 5. Crear Subcategorías
  console.log('📋 Creando subcategorías...');
  const subcategories = await Promise.all([
    prisma.subcategory.create({
      data: {
        category_id: categories[0].id,
        name: 'Desktop',
      },
    }),
    prisma.subcategory.create({
      data: {
        category_id: categories[0].id,
        name: 'Laptop',
      },
    }),
    prisma.subcategory.create({
      data: {
        category_id: categories[1].id,
        name: 'Monitor',
      },
    }),
    prisma.subcategory.create({
      data: {
        category_id: categories[1].id,
        name: 'Impresora',
      },
    }),
    prisma.subcategory.create({
      data: {
        category_id: categories[2].id,
        name: 'Router/Switch',
      },
    }),
    prisma.subcategory.create({
      data: {
        category_id: categories[2].id,
        name: 'Access Point',
      },
    }),
  ]);

  // 6. Crear Usuarios
  console.log('👥 Creando usuarios...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const users = await Promise.all([
    // Super Administrador
    prisma.user.create({
      data: {
        email: 'admin@gruposancristobal.com',
        dni: '12345678',
        full_name: 'Administrador Principal',
        password: hashedPassword,
        role: 'super_admin',
        status: 'active',
        phone: '+51 1 2345678',
        location_id: locations[0].id,
      },
    }),
    // Gerente
    prisma.user.create({
      data: {
        email: 'gerente@gruposancristobal.com',
        dni: '87654321',
        full_name: 'Gerente General',
        password: hashedPassword,
        role: 'gerencia',
        status: 'active',
        phone: '+51 1 2345679',
        location_id: locations[0].id,
      },
    }),
    // Técnico de Sistemas
    prisma.user.create({
      data: {
        email: 'sistemas@gruposancristobal.com',
        dni: '11223344',
        full_name: 'Técnico Sistemas',
        password: hashedPassword,
        role: 'sistemas',
        status: 'active',
        phone: '+51 1 2345680',
        location_id: locations[0].id,
      },
    }),
    // Operador
    prisma.user.create({
      data: {
        email: 'operador@gruposancristobal.com',
        dni: '55667788',
        full_name: 'Operador de Trujillo',
        password: hashedPassword,
        role: 'administradores',
        status: 'active',
        phone: '+51 44 123458',
        location_id: locations[1].id,
      },
    }),
  ]);

  // 7. Crear Activos
  console.log('💻 Creando activos...');
  const assets = await Promise.all([
    // Desktop para Administración
    prisma.asset.create({
      data: {
        codigo_unico: 'PC-LIM-001',
        asset_type_id: assetTypes[0].id,
        category_id: categories[0].id,
        subcategory_id: subcategories[0].id,
        location_id: locations[0].id,
        area_id: areas[0].id,
        brand: 'HP',
        model: 'EliteDesk 800 G6',
        serial_number: 'SN001234567',
        status: 'active',
        anydesk_id: '123456789',
        ip_address: '192.168.1.100',
        phone_number: '+51 1 2345678',
        processor: 'Intel Core i5-10400',
        ram: '16GB DDR4',
        operating_system: 'Windows 11 Pro',
        almacenamiento: '512GB SSD',
        fecha_adquisicion: new Date('2023-01-15'),
        valor_estimado: 2500.00,
        descripcion: 'Desktop para área de administración',
        area_nombre: 'Sistemas',
      },
    }),
    // Laptop para Gerencia
    prisma.asset.create({
      data: {
        codigo_unico: 'LAP-LIM-001',
        asset_type_id: assetTypes[0].id,
        category_id: categories[0].id,
        subcategory_id: subcategories[1].id,
        location_id: locations[0].id,
        area_id: areas[0].id,
        brand: 'Dell',
        model: 'Latitude 7420',
        serial_number: 'SN001234568',
        status: 'active',
        anydesk_id: '987654321',
        ip_address: '192.168.1.101',
        processor: 'Intel Core i7-1260P',
        ram: '32GB DDR4',
        operating_system: 'Windows 11 Pro',
        almacenamiento: '1TB SSD',
        fecha_adquisicion: new Date('2023-02-20'),
        valor_estimado: 4500.00,
        descripcion: 'Laptop para gerencia',
        area_nombre: 'Gerencia',
      },
    }),
    // Servidor Principal
    prisma.asset.create({
      data: {
        codigo_unico: 'SRV-LIM-001',
        asset_type_id: assetTypes[1].id,
        category_id: categories[3].id,
        location_id: locations[0].id,
        brand: 'Dell PowerEdge',
        model: 'R740',
        serial_number: 'SN001234569',
        status: 'active',
        ip_address: '192.168.1.10',
        operating_system: 'Windows Server 2022',
        processor: 'Intel Xeon Silver 4210R',
        ram: '64GB DDR4',
        almacenamiento: '2x 1TB SSD RAID 1',
        fecha_adquisicion: new Date('2022-06-01'),
        valor_estimado: 12000.00,
        descripcion: 'Servidor principal de infraestructura',
        area_nombre: 'Sistemas',
      },
    }),
  ]);

  // 8. Crear Tickets
  console.log('🎫 Creando tickets...');
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        title: 'Laptop no enciende',
        description: 'La laptop Dell Latitude no enciende al presionar el botón de power. La luz de encendido parpadea en ámbar.',
        status: 'open',
        priority: 'high',
        category: 'hardware',
        requester_id: users[1].id,
        assigned_to: users[2].id,
        location_id: locations[0].id,
      },
    }),
    prisma.ticket.create({
      data: {
        title: 'Impresora no imprime',
        description: 'La impresora HP LaserJet no responde cuando se intenta imprimir desde cualquier computadora.',
        status: 'in_progress',
        priority: 'medium',
        category: 'hardware',
        requester_id: users[3].id,
        assigned_to: users[2].id,
        location_id: locations[1].id,
        attended_at: new Date(),
      },
    }),
  ]);

  // 9. Crear Comentarios de Tickets
  console.log('💬 Creando comentarios de tickets...');
  await Promise.all([
    prisma.ticketComment.create({
      data: {
        ticket_id: tickets[0].id,
        user_id: users[2].id,
        content: 'He revisado la laptop y parece ser un problema con la fuente de poder. Necesito realizar pruebas adicionales.',
      },
    }),
    prisma.ticketComment.create({
      data: {
        ticket_id: tickets[0].id,
        user_id: users[1].id,
        content: 'Por favor, manténme informado sobre el progreso. Es el equipo del gerente general.',
      },
    }),
  ]);

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📊 Resumen de datos creados:');
  console.log(`   - Ubicaciones: ${locations.length}`);
  console.log(`   - Áreas: ${areas.length}`);
  console.log(`   - Tipos de Activos: ${assetTypes.length}`);
  console.log(`   - Categorías: ${categories.length}`);
  console.log(`   - Subcategorías: ${subcategories.length}`);
  console.log(`   - Usuarios: ${users.length}`);
  console.log(`   - Activos: ${assets.length}`);
  console.log(`   - Tickets: ${tickets.length}`);
  console.log('');
  console.log('🔑 Credenciales de prueba:');
  console.log('   - Admin: admin@gruposancristobal.com / admin123');
  console.log('   - Gerente: gerente@gruposancristobal.com / admin123');
  console.log('   - Sistemas: sistemas@gruposancristobal.com / admin123');
  console.log('   - Operador: operador@gruposancristobal.com / admin123');
  console.log('');
  console.log('🚀 ¡Listo para producción en VPS!');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    if (e.message.includes('Authentication failed')) {
      console.log('💡 Error de conexión a la base de datos');
      console.log('   Verifica DATABASE_URL en tu archivo .env');
      console.log('   Formato: postgresql://usuario:password@host:5432/database');
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
