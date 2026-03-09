// Script para probar notificaciones para un rol específico
// Ejecutar: node test-rol-notificaciones.cjs

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fxyqkxwzjvznmqsmfgr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4eXFreHd6anZ6bm1xc21mZ3IiLCJpYXQiOjE3MzY0OTI5MTksImV4cCI6MjA1MjA2ODkxOX0.lE6Lb3m8Q6J-4qUqN1uQn7I2xg1kqJ9w3cY-1k8k9M'
);

async function testNotificationForAllRoles() {
  console.log('🔔 Probando notificaciones para TODOS los roles...');
  console.log('');
  
  // Todos los roles posibles en el sistema
  const allRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores', 'administradores', 'personalizado'];
  
  for (const role of allRoles) {
    console.log(`📧 Enviando notificación para rol: ${role}`);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          type: 'ticket_created',
          title: `🎫 Test para ${role}`,
          message: `Esta es una prueba de notificación para el rol: ${role}. Si puedes leer esto, ¡el sistema funciona!`,
          user_name: 'Sistema de Prueba',
          target_role: role,
          ticket_id: null,
          read: false
        })
        .select();

      if (error) {
        console.error(`❌ Error para ${role}:`, error);
      } else {
        console.log(`✅ Notificación creada para ${role}:`, data);
      }
    } catch (error) {
      console.error(`❌ Error en prueba para ${role}:`, error);
    }
    
    // Pequeña pausa entre notificaciones
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('🎯 Prueba completada!');
  console.log('');
  console.log('🔍 Para verificar tu rol específico:');
  console.log('1. Abre el sistema');
  console.log('2. Ve a tu perfil o revisa el console.log con: console.log(user.role)');
  console.log('3. Compara con los roles que recibieron notificaciones');
  console.log('');
  console.log('🔊 Si escuchaste el sonido, ¡el sistema funciona!');
}

async function checkUserRole() {
  console.log('🔍 Verificando roles de usuarios en el sistema...');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, full_name, role, email')
      .eq('status', 'active')
      .limit(10);
    
    if (error) {
      console.error('❌ Error obteniendo usuarios:', error);
      return;
    }
    
    console.log('📋 Usuarios activos y sus roles:');
    users.forEach(user => {
      console.log(`  👤 ${user.full_name} (${user.email}) - Rol: ${user.role}`);
    });
    
    console.log('');
    console.log('🎯 Roles configurados para recibir notificaciones:');
    const notificationRoles = ['super_admin', 'gerencia', 'sistemas', 'supervisores', 'administradores', 'personalizado'];
    notificationRoles.forEach(role => {
      const hasRole = users.some(u => u.role === role);
      console.log(`  ${hasRole ? '✅' : '❌'} ${role}`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando usuarios:', error);
  }
}

// Ejecutar ambas pruebas
async function runAllTests() {
  console.log('🚀 Iniciando diagnóstico completo de notificaciones...');
  console.log('='.repeat(60));
  console.log('');
  
  await checkUserRole();
  console.log('');
  await testNotificationForAllRoles();
  
  console.log('');
  console.log('🎉 Diagnóstico completado!');
  console.log('');
  console.log('📝 Resumen:');
  console.log('- Si ves notificaciones en la UI pero no suena: problema de sonido');
  console.log('- Si no ves notificaciones: problema de permisos de rol');
  console.log('- Si ves todo: ¡el sistema funciona perfectamente!');
}

runAllTests();
