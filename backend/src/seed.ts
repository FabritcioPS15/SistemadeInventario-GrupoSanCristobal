import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la creación del usuario administrador...');

  // Creamos el usuario administrador basado en tus datos de prueba
  const admin = await prisma.user.upsert({
    where: { dni: '72562172' },
    update: {},
    create: {
      dni: '72562172',
      email: 'admin@gsc.com',
      full_name: 'Administrador GSC',
      password_hash: '15042002', // Tu clave de prueba
      role: 'super_admin',
      status: 'active',
    },
  });

  console.log('✅ Usuario Administrador creado con éxito:', admin.full_name);
  console.log('🔑 DNI:', admin.dni);
  console.log('🔒 Contraseña: [La de siempre]');
}

main()
  .catch((e) => {
    console.error('❌ Error al crear el usuario:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
