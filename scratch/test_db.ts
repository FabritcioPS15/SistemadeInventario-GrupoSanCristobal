import { supabase } from '../src/lib/supabase';

async function checkDatabaseRoles() {
  console.log('--- CONSULTANDO BASE DE DATOS SUPABASE ---');
  console.log('Obteniendo los roles asignados actualmente en la tabla "users"...\n');

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role, full_name, email');

    if (error) {
      console.error('Error al realizar la consulta a Supabase:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No se encontraron usuarios en la tabla.');
      return;
    }

    // 1. Encontrar roles únicos
    const roles = Array.from(new Set(data.map(u => u.role).filter(Boolean)));
    console.log('📋 Roles únicos que existen actualmente en la tabla "users":');
    console.log(roles);

    // 2. Conteo de usuarios por cada rol
    const counts: Record<string, number> = {};
    data.forEach(u => {
      const r = u.role || 'sin_rol';
      counts[r] = (counts[r] || 0) + 1;
    });

    console.log('\n📊 Cantidad de usuarios por rol:');
    Object.entries(counts).forEach(([role, count]) => {
      console.log(`  • ${role}: ${count} usuario(s)`);
    });

    // 3. Muestra de los primeros usuarios para referencia rápida
    console.log('\n🔍 Muestra de usuarios y sus roles asignados (primeros 5):');
    data.slice(0, 5).forEach(u => {
      console.log(`  • [${u.role || 'SIN ROL'}] ${u.full_name} (${u.email})`);
    });

  } catch (err: any) {
    console.error('Ocurrió un error inesperado:', err.message);
  }
}

checkDatabaseRoles();
