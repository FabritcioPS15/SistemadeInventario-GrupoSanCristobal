// Script para probar la conexión con Supabase y suscripciones en tiempo real
// Copiar y pegar en la consola del navegador DENTRO del sistema

console.log('🔍 INICIANDO PRUEBA DE CONEXIÓN SUPABASE');
console.log('='.repeat(50));

// 1. Verificar configuración de Supabase
function checkSupabaseConfig() {
  console.log('🔧 Verificando configuración de Supabase...');
  
  if (typeof supabase === 'undefined') {
    console.log('❌ Supabase no está disponible');
    return false;
  }
  
  console.log('✅ Cliente Supabase disponible');
  
  // Verificar URL y clave
  try {
    console.log('📊 Supabase URL:', supabase.supabaseUrl);
    console.log('📊 Supabase Key presente:', supabase.supabaseKey ? 'Sí' : 'No');
  } catch (error) {
    console.log('❌ Error obteniendo configuración:', error);
  }
  
  return true;
}

// 2. Probar conexión básica con la base de datos
async function testDatabaseConnection() {
  console.log('🔌 Probando conexión con la base de datos...');
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Error de conexión:', error);
      return false;
    }
    
    console.log('✅ Conexión con base de datos exitosa');
    return true;
  } catch (error) {
    console.log('❌ Error en prueba de conexión:', error);
    return false;
  }
}

// 3. Probar suscripción en tiempo real simple
async function testRealtimeSubscription() {
  console.log('🔔 Probando suscripción en tiempo real...');
  
  try {
    const channel = supabase
      .channel('test-connection')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('🔔 RECIBIDO EVENTO EN TIEMPO REAL:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📊 Estado de suscripción de prueba:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción de prueba activada');
          
          // Crear una notificación de prueba
          setTimeout(async () => {
            console.log('📨 Creando notificación de prueba...');
            
            const { data, error } = await supabase
              .from('notifications')
              .insert({
                type: 'ticket_created',
                title: '🧪 Notificación de Prueba',
                message: 'Esta es una prueba de conexión en tiempo real',
                user_name: 'Sistema de Prueba',
                target_role: 'super_admin',
                read: false
              })
              .select();
            
            if (error) {
              console.log('❌ Error creando notificación de prueba:', error);
            } else {
              console.log('✅ Notificación de prueba creada:', data);
              console.log('🔊 Deberías recibir el evento en tiempo real ahora...');
            }
          }, 2000);
          
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.log('❌ Error en suscripción de prueba:', status);
        }
      });
    
    console.log('🔊 Canal de prueba creado:', channel);
    
    // Limpiar después de 10 segundos
    setTimeout(() => {
      console.log('🔌 Limpiando canal de prueba...');
      supabase.removeChannel(channel);
    }, 10000);
    
  } catch (error) {
    console.log('❌ Error en prueba de tiempo real:', error);
  }
}

// 4. Verificar estado del WebSocket
function checkWebSocketStatus() {
  console.log('🌐 Verificando estado del WebSocket...');
  
  try {
    // El cliente de Supabase tiene un WebSocket interno
    console.log('📊 Estado del cliente Supabase:', supabase.realtime?.status);
    console.log('📊 URL del WebSocket:', supabase.realtime?.endpoints?.ws);
  } catch (error) {
    console.log('❌ Error verificando WebSocket:', error);
  }
}

// Ejecutar todas las pruebas
async function runConnectionTest() {
  console.log('🚀 EJECUTANDO PRUEBA COMPLETA DE CONEXIÓN...');
  console.log('');
  
  const configOk = checkSupabaseConfig();
  console.log('');
  
  if (configOk) {
    const dbOk = await testDatabaseConnection();
    console.log('');
    
    if (dbOk) {
      checkWebSocketStatus();
      console.log('');
      
      await testRealtimeSubscription();
    }
  }
  
  console.log('');
  console.log('🎯 PRUEBA DE CONEXIÓN COMPLETADA');
  console.log('');
  console.log('📋 Resumen:');
  console.log('- Si ves "Suscripción de prueba activada": La conexión funciona');
  console.log('- Si recibes el evento: El tiempo real funciona');
  console.log('- Si no recibes nada: Hay un problema con el WebSocket o políticas RLS');
}

// Ejecutar prueba
runConnectionTest();
