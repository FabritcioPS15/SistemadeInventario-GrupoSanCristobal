// Script de prueba final para el sistema de notificaciones
// Copiar y pegar en la consola del navegador DENTRO del sistema

console.log('🚀 INICIANDO PRUEBA FINAL DEL SISTEMA');
console.log('='.repeat(50));

// 1. Verificar que estamos en el sistema
function checkSystem() {
  console.log('🔍 Verificando sistema...');
  
  // Verificar si playNotificationSound está disponible
  if (typeof playNotificationSound === 'function') {
    console.log('✅ playNotificationSound disponible globalmente');
  } else {
    console.log('❌ playNotificationSound NO disponible');
    console.log('📝 Asegúrate de estar en el Dashboard o una página con el componente NotificationsFinal');
  }
  
  // Verificar si supabase está disponible
  if (typeof supabase !== 'undefined') {
    console.log('✅ Cliente Supabase disponible');
  } else {
    console.log('❌ Cliente Supabase NO disponible');
  }
  
  // Verificar usuario autenticado
  try {
    const user = supabase.auth.getUser();
    console.log('👤 Verificando usuario...');
    user.then(({ data: { user } }) => {
      if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        console.log('👤 Rol:', user.user_metadata?.role || user.app_metadata?.role);
      } else {
        console.log('❌ Usuario NO autenticado');
      }
    });
  } catch (error) {
    console.log('❌ Error verificando usuario:', error);
  }
}

// 2. Probar sonido
function testSound() {
  console.log('🔊 Probando sonido...');
  
  if (typeof playNotificationSound === 'function') {
    try {
      playNotificationSound();
      console.log('✅ Sonido ejecutado - Deberías escuchar dos beeps fuertes');
    } catch (error) {
      console.error('❌ Error ejecutando sonido:', error);
    }
  } else {
    console.log('❌ playNotificationSound no disponible');
  }
}

// 3. Probar notificación del navegador
function testBrowserNotification() {
  console.log('🔔 Probando notificación del navegador...');
  
  if ('Notification' in window) {
    console.log('📊 Permiso actual:', Notification.permission);
    
    if (Notification.permission === 'granted') {
      new Notification('🧪 Prueba del Sistema', {
        body: 'Esta es una prueba de notificación del sistema',
        icon: '/favicon.ico'
      });
      console.log('✅ Notificación enviada');
    } else if (Notification.permission === 'default') {
      console.log('⏳ Solicitando permisos...');
      Notification.requestPermission().then(permission => {
        console.log('📊 Nuevo permiso:', permission);
        if (permission === 'granted') {
          new Notification('🧪 Prueba del Sistema', {
            body: '¡Permisos concedidos! El sistema funciona.',
            icon: '/favicon.ico'
          });
        }
      });
    } else {
      console.log('❌ Permisos denegados - No se pueden mostrar notificaciones');
    }
  } else {
    console.log('❌ Notification API no disponible');
  }
}

// 4. Crear notificación de prueba en la base de datos
async function createTestNotification() {
  console.log('📨 Creando notificación de prueba...');
  
  if (typeof supabase !== 'undefined') {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          type: 'ticket_created',
          title: '🎫 Ticket de Prueba Final',
          message: 'Esta es una prueba final del sistema de notificaciones con sonido',
          user_name: 'Sistema de Prueba',
          target_role: 'super_admin',
          ticket_id: null,
          read: false
        })
        .select();

      if (error) {
        console.error('❌ Error creando notificación:', error);
      } else {
        console.log('✅ Notificación creada:', data);
        console.log('🔊 Deberías escuchar el sonido automáticamente');
      }
    } catch (error) {
      console.error('❌ Error en prueba:', error);
    }
  } else {
    console.log('❌ Supabase no disponible');
  }
}

// 5. Verificar suscripción en tiempo real
function checkRealtimeSubscription() {
  console.log('🔌 Verificando suscripción en tiempo real...');
  
  // Esto es más difícil de verificar desde fuera, pero podemos intentar
  console.log('📝 Para verificar la suscripción en tiempo real:');
  console.log('   1. Crea un ticket nuevo');
  console.log('   2. Mira la consola para ver si aparece "NUEVA NOTIFICACIÓN RECIBIDA"');
  console.log('   3. Deberías escuchar el sonido automáticamente');
}

// Ejecutar todas las pruebas
async function runFinalTest() {
  console.log('🎯 EJECUTANDO PRUEBA FINAL COMPLETA...');
  console.log('');
  
  checkSystem();
  console.log('');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  testSound();
  console.log('');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  testBrowserNotification();
  console.log('');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await createTestNotification();
  console.log('');
  
  checkRealtimeSubscription();
  console.log('');
  
  console.log('🎉 PRUEBA FINAL COMPLETADA');
  console.log('');
  console.log('📋 Resumen:');
  console.log('- Si escuchaste los beeps: El sonido funciona');
  console.log('- Si viste la notificación: Las notificaciones del navegador funcionan');
  console.log('- Si la notificación se creó: La base de datos funciona');
  console.log('- Si todo funciona: ¡El sistema está listo!');
  console.log('');
  console.log('🎯 Prueba final: Crea un ticket real y verifica que suene automáticamente');
}

// Ejecutar prueba final
runFinalTest();
