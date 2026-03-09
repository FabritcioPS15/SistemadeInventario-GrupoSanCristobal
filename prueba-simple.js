// Prueba simple desde la consola del sistema
// Copiar y pegar en la consola DENTRO del sistema

console.log('🔍 PRUEBA SIMPLE DESDE EL SISTEMA');

// Verificar que estamos en el sistema correcto
if (typeof supabase !== 'undefined') {
  console.log('✅ Supabase disponible');
  console.log('📊 URL:', supabase.supabaseUrl);
  
  // Probar conexión
  supabase.from('notifications').select('count').limit(1).then(({ data, error }) => {
    if (error) {
      console.log('❌ Error conexión:', error);
    } else {
      console.log('✅ Conexión OK');
      
      // Probar suscripción
      const channel = supabase.channel('simple-test')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: 'target_role=eq.super_admin'
        }, (payload) => {
          console.log('🎉 ¡EVENTO RECIBIDO!', payload);
          console.log('🔊 ¡La suscripción funciona!');
          
          // Reproducir sonido manualmente
          if (typeof playNotificationSound === 'function') {
            playNotificationSound();
          }
        })
        .subscribe((status) => {
          console.log('📊 Estado suscripción:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Suscripción activada');
            
            // Crear notificación de prueba
            setTimeout(() => {
              console.log('📨 Creando notificación de prueba...');
              supabase.from('notifications').insert({
                type: 'ticket_created',
                title: '🧪 Prueba Simple',
                message: 'Prueba desde consola',
                user_name: 'Test User',
                target_role: 'super_admin',
                read: false
              }).then(({ data, error }) => {
                if (error) {
                  console.log('❌ Error creando notificación:', error);
                } else {
                  console.log('✅ Notificación creada:', data);
                  console.log('🔊 Deberías recibir el evento y escuchar el sonido...');
                }
              });
            }, 2000);
          }
        });
      
      console.log('🔊 Canal creado:', channel);
    }
  });
} else {
  console.log('❌ Supabase no disponible - abre el sistema primero');
}
