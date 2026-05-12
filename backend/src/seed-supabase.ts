import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos (Supabase)...');

  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Conexión a base de datos establecida');
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error);
    console.log('💡 Asegúrate de que DATABASE_URL en .env apunte a tu base de datos Supabase');
    process.exit(1);
  }

  // Limpiar datos existentes (con cuidado en producción)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Limpiando datos existentes...');
    
    // Delete en orden correcto para evitar problemas de claves foráneas
    const deletePromises = [];
    
    // Solo intentamos eliminar tablas que existen
    try {
      deletePromises.push(prisma.notification.deleteMany());
    } catch (e) { console.log('Tabla notifications no existe'); }
    
    try {
      deletePromises.push(prisma.ticketComment.deleteMany());
    } catch (e) { console.log('Tabla ticket_comments no existe'); }
    
    try {
      deletePromises.push(prisma.ticketAssignment.deleteMany());
    } catch (e) { console.log('Tabla ticket_assignments no existe'); }
    
    try {
      deletePromises.push(prisma.ticketCannedResponse.deleteMany());
    } catch (e) { console.log('Tabla ticket_canned_responses no existe'); }
    
    try {
      deletePromises.push(prisma.ticket.deleteMany());
    } catch (e) { console.log('Tabla tickets no existe'); }
    
    try {
      deletePromises.push(prisma.maintenanceRecord.deleteMany());
    } catch (e) { console.log('Tabla maintenance_records no existe'); }
    
    try {
      deletePromises.push(prisma.inventoryMovement.deleteMany());
    } catch (e) { console.log('Tabla inventory_movements no existe'); }
    
    try {
      deletePromises.push(prisma.shipment.deleteMany());
    } catch (e) { console.log('Tabla shipments no existe'); }
    
    try {
      deletePromises.push(prisma.checklist.deleteMany());
    } catch (e) { console.log('Tabla checklists no existe'); }
    
    try {
      deletePromises.push(prisma.branchAudit.deleteMany());
    } catch (e) { console.log('Tabla branch_audits no existe'); }
    
    try {
      deletePromises.push(prisma.sutranVisit.deleteMany());
    } catch (e) { console.log('Tabla sutran_visits no existe'); }
    
    try {
      deletePromises.push(prisma.message.deleteMany());
    } catch (e) { console.log('Tabla messages no existe'); }
    
    try {
      deletePromises.push(prisma.conversationParticipant.deleteMany());
    } catch (e) { console.log('Tabla conversation_participants no existe'); }
    
    try {
      deletePromises.push(prisma.conversation.deleteMany());
    } catch (e) { console.log('Tabla conversations no existe'); }
    
    try {
      deletePromises.push(prisma.auditLog.deleteMany());
    } catch (e) { console.log('Tabla audit_logs no existe'); }
    
    try {
      deletePromises.push(prisma.storedDisk.deleteMany());
    } catch (e) { console.log('Tabla stored_disks no existe'); }
    
    try {
      deletePromises.push(prisma.cameraDisk.deleteMany());
    } catch (e) { console.log('Tabla camera_disks no existe'); }
    
    try {
      deletePromises.push(prisma.camera.deleteMany());
    } catch (e) { console.log('Tabla cameras no existe'); }
    
    try {
      deletePromises.push(prisma.vehicle.deleteMany());
    } catch (e) { console.log('Tabla vehicles no existe'); }
    
    try {
      deletePromises.push(prisma.asset.deleteMany());
    } catch (e) { console.log('Tabla assets no existe'); }
    
    try {
      deletePromises.push(prisma.subcategory.deleteMany());
    } catch (e) { console.log('Tabla subcategories no existe'); }
    
    try {
      deletePromises.push(prisma.category.deleteMany());
    } catch (e) { console.log('Tabla categories no existe'); }
    
    try {
      deletePromises.push(prisma.area.deleteMany());
    } catch (e) { console.log('Tabla areas no existe'); }
    
    try {
      deletePromises.push(prisma.assetType.deleteMany());
    } catch (e) { console.log('Tabla asset_types no existe'); }
    
    try {
      deletePromises.push(prisma.serverCredential.deleteMany());
    } catch (e) { console.log('Tabla server_credentials no existe'); }
    
    try {
      deletePromises.push(prisma.server.deleteMany());
    } catch (e) { console.log('Tabla servers no existe'); }
    
    try {
      deletePromises.push(prisma.mtcAcceso.deleteMany());
    } catch (e) { console.log('Tabla mtc_accesos no existe'); }
    
    try {
      deletePromises.push(prisma.user.deleteMany());
    } catch (e) { console.log('Tabla users no existe'); }
    
    try {
      deletePromises.push(prisma.location.deleteMany());
    } catch (e) { console.log('Tabla locations no existe'); }

    await Promise.all(deletePromises.filter(p => p));
  }

  // 1. Crear Ubicaciones (solo campos básicos que existen en Supabase)
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
  ]);

  // 3. Crear Usuarios (con campos que existen en Supabase)
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
  ]);

  // 3.5. Crear Tipos de Activos
  console.log('🏷️ Creando tipos de activos...');
  const assetTypes = await Promise.all([
    prisma.assetType.create({
      data: {
        name: 'Computadora',
      },
    }),
    prisma.assetType.create({
      data: {
        name: 'Laptop',
      },
    }),
    prisma.assetType.create({
      data: {
        name: 'Impresora',
      },
    }),
  ]);

  // 4. Crear Activos básicos
  console.log('💻 Creando activos...');
  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        asset_type_id: assetTypes[0].id, // Required field
        codigo_unico: 'PC-LIM-001',
        category_id: null, // Opcional para empezar
        location_id: locations[0].id,
        area_id: areas[0].id,
        brand: 'HP',
        model: 'EliteDesk 800 G6',
        serial_number: 'SN001234567',
        status: 'active',
        ip_address: '192.168.1.100',
        processor: 'Intel Core i5-10400',
        ram: '16GB DDR4',
        almacenamiento: '512GB SSD',
        fecha_adquisicion: new Date('2023-01-15'),
        valor_estimado: 2500.00,
        descripcion: 'Desktop para área de administración',
      },
    }),
  ]);

  // 5. Crear Tickets básicos
  console.log('🎫 Creando tickets...');
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        title: 'Laptop no enciende',
        description: 'La laptop Dell Latitude no enciende al presionar el botón de power.',
        status: 'open',
        priority: 'high',
        category: 'hardware',
        requester_id: users[1].id,
        assigned_to: users[0].id,
        location_id: locations[0].id,
      },
    }),
  ]);

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📊 Resumen de datos creados:');
  console.log(`   - Ubicaciones: ${locations.length}`);
  console.log(`   - Áreas: ${areas.length}`);
  console.log(`   - Usuarios: ${users.length}`);
  console.log(`   - Activos: ${assets.length}`);
  console.log(`   - Tickets: ${tickets.length}`);
  console.log('');
  console.log('🔑 Credenciales de prueba:');
  console.log('   - Admin: admin@gruposancristobal.com / admin123');
  console.log('   - Gerente: gerente@gruposancristobal.com / admin123');
  console.log('');
  console.log('📋 Para migrar a VPS:');
  console.log('   1. Actualiza DATABASE_URL en .env con las credenciales del VPS');
  console.log('   2. Ejecuta: npm run db:push (para crear tablas)');
  console.log('   3. Ejecuta: npm run seed (para poblar datos)');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
