// Script para probar el sistema de notificaciones con volumen máximo
// Ejecutar: node test-notificaciones-final.cjs

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fxyqkxwzjvznmqsmfgr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4eXFreHd6anZ6bm1xc21mZ3IiLCJpYXQiOjE3MzY0OTI5MTksImV4cCI6MjA1MjA2ODkxOX0.lE6Lb3m8Q6J-4qUqN1uQn7I2xg1kqJ9w3cY-1k8k9M'
);

async function testNotificationForRole(role) {
  console.log(`🔔 Creando notificación de prueba para rol: ${role}`);
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: 'ticket_created',
        title: '🎫 Ticket de Prueba - Volumen Máximo',
        message: `Notificación de prueba con volumen máximo para el rol: ${role}. ¡Deberías escuchar un sonido fuerte!`,
        user_name: 'Sistema de Prueba',
        target_role: role,
        ticket_id: null,
        read: false
      })
      .select();

    if (error) {
      console.error('❌ Error creando notificación:', error);
    } else {
      console.log('✅ Notificación creada exitosamente:', data);
      console.log('🔊🔊 ¡Deberías escuchar un sonido fuerte y claro ahora!');
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

async function testMultipleNotifications() {
  console.log('🚀 Iniciando prueba de notificaciones con volumen máximo...');
  console.log('');
  
  // Probar para diferentes roles
  const roles = ['super_admin', 'gerencia', 'sistemas', 'supervisores'];
  
  for (const role of roles) {
    await testNotificationForRole(role);
    // Esperar 2 segundos entre notificaciones para escuchar claramente
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('');
  console.log('🎯 Prueba completada. Si no escuchaste nada:');
  console.log('   1. Verifica que el volumen del sistema esté alto');
  console.log('   2. Verifica que el navegador tenga permisos de audio');
  console.log('   3. Abre la consola para ver errores');
}

// Ejecutar prueba
testMultipleNotifications();
