// Script para diagnosticar el sistema de audio
// Copiar y pegar en la consola del navegador

console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DE AUDIO');
console.log('='.repeat(50));

// 1. Verificar estado del AudioContext
function checkAudioContext() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('🎵 AudioContext creado');
    console.log('📊 Estado:', audioContext.state);
    console.log('📊 Sample Rate:', audioContext.sampleRate);
    console.log('📊 Base Latency:', audioContext.baseLatency);
    console.log('📊 Output Latency:', audioContext.outputLatency);
    
    if (audioContext.state === 'suspended') {
      console.log('⏸️ AudioContext está SUSPENDIDO');
      console.log('🔧 Intentando reanudar...');
      audioContext.resume().then(() => {
        console.log('✅ AudioContext reanudado:', audioContext.state);
      }).catch(err => {
        console.error('❌ Error reanudando:', err);
      });
    } else {
      console.log('✅ AudioContext está ACTIVO');
    }
    
    return audioContext;
  } catch (error) {
    console.error('❌ Error creando AudioContext:', error);
    return null;
  }
}

// 2. Probar sonido básico
function testBasicSound() {
  console.log('🔊 Probando sonido básico...');
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Crear oscilador simple
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configuración simple
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // Nota A4
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    console.log('✅ Sonido básico iniciado - Deberías escuchar un tono de 440Hz');
  } catch (error) {
    console.error('❌ Error en sonido básico:', error);
  }
}

// 3. Verificar notificaciones del navegador
function checkBrowserNotifications() {
  console.log('🔔 Verificando notificaciones del navegador...');
  console.log('📊 Notification API disponible:', 'Notification' in window);
  
  if ('Notification' in window) {
    console.log('📊 Permiso actual:', Notification.permission);
    
    if (Notification.permission === 'granted') {
      console.log('✅ Permisos concedidos');
      // Probar notificación
      new Notification('🧪 Prueba de Diagnóstico', {
        body: 'Esta es una prueba de notificación',
        icon: '/favicon.ico'
      });
      console.log('✅ Notificación de prueba enviada');
    } else if (Notification.permission === 'default') {
      console.log('⏳ Permisos pendientes - Solicitando...');
      Notification.requestPermission().then(permission => {
        console.log('📊 Nuevo permiso:', permission);
      });
    } else {
      console.log('❌ Permisos denegados');
    }
  }
}

// 4. Verificar si el usuario está logueado y su rol
function checkUserAuth() {
  console.log('👤 Verificando autenticación...');
  
  // Intentar obtener información del usuario desde localStorage
  try {
    const authData = localStorage.getItem('supabase.auth.token');
    if (authData) {
      const parsed = JSON.parse(authData);
      console.log('👤 Usuario encontrado:', parsed.user?.email);
      console.log('👤 Rol:', parsed.user?.user_metadata?.role || parsed.user?.app_metadata?.role);
      console.log('👤 ID:', parsed.user?.id);
    } else {
      console.log('❌ No se encontraron datos de autenticación');
    }
  } catch (error) {
    console.error('❌ Error leyendo auth:', error);
  }
}

// 5. Verificar conexión con Supabase
function checkSupabaseConnection() {
  console.log('🔌 Verificando conexión Supabase...');
  
  // Intentar crear un cliente Supabase simple para probar conexión
  try {
    // Esto es solo para verificar que el objeto supabase existe
    if (typeof supabase !== 'undefined') {
      console.log('✅ Cliente Supabase disponible');
      
      // Verificar suscripción activa
      console.log('📊 Verificando suscripciones activas...');
    } else {
      console.log('❌ Cliente Supabase no disponible');
    }
  } catch (error) {
    console.error('❌ Error verificando Supabase:', error);
  }
}

// 6. Simular una notificación
function simulateNotification() {
  console.log('🎭 Simulando notificación...');
  
  // Crear un evento de notificación simulado
  const mockNotification = {
    new: {
      id: 'test-' + Date.now(),
      type: 'ticket_created',
      title: '🎫 Ticket de Prueba',
      message: 'Este es un ticket de prueba simulado',
      user_name: 'Sistema de Prueba',
      target_role: 'super_admin',
      read: false,
      created_at: new Date().toISOString()
    }
  };
  
  console.log('📨 Notificación simulada:', mockNotification);
  
  // Intentar reproducir sonido
  if (typeof playNotificationSound === 'function') {
    console.log('🔊 Llamando a playNotificationSound...');
    playNotificationSound();
  } else {
    console.log('❌ playNotificationSound no está disponible');
  }
}

// Ejecutar todas las pruebas
function runFullDiagnosis() {
  console.log('🚀 EJECUTANDO DIAGNÓSTICO COMPLETO...');
  console.log('');
  
  checkAudioContext();
  console.log('');
  
  testBasicSound();
  console.log('');
  
  checkBrowserNotifications();
  console.log('');
  
  checkUserAuth();
  console.log('');
  
  checkSupabaseConnection();
  console.log('');
  
  simulateNotification();
  console.log('');
  
  console.log('🎯 DIAGNÓSTICO COMPLETADO');
  console.log('');
  console.log('📋 Resumen:');
  console.log('- Si escuchaste el tono de 440Hz: El audio funciona');
  console.log('- Si viste la notificación: Las notificaciones del navegador funcionan');
  console.log('- Si playNotificationSound se ejecutó: El sistema está conectado');
  console.log('- Si no escuchaste nada: El navegador está bloqueando el audio');
}

// Ejecutar diagnóstico
runFullDiagnosis();
