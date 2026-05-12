import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos (Ultra Simple)...');

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
  ]);

  // 2. Crear Usuarios
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

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📊 Resumen de datos creados:');
  console.log(`   - Ubicaciones: ${locations.length}`);
  console.log(`   - Usuarios: ${users.length}`);
  console.log('');
  console.log('🔑 Credenciales de prueba:');
  console.log('   - Admin: admin@gruposancristobal.com / admin123');
  console.log('   - Gerente: gerente@gruposancristobal.com / admin123');
  console.log('');
  console.log('🚀 Instrucciones para migrar a VPS:');
  console.log('   1. Configurar DATABASE_URL en .env');
  console.log('   2. Ejecutar: npx prisma db push');
  console.log('   3. Ejecutar: npm run seed');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    if (e.message.includes('Authentication failed')) {
      console.log('💡 Solución: Verifica DATABASE_URL en .env');
      console.log('   Formato: postgresql://user:password@host:5432/database');
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
