// Script para probar el sonido de notificaciones
// Puedes ejecutar esto en la consola del navegador para probar

export function testNotificationSound() {
  try {
    // Crear un sonido de notificación usando Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Crear un oscilador para el sonido
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Conectar nodos
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configurar el sonido (un beep suave)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frecuencia inicial
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1); // Bajar frecuencia
    
    // Configurar volumen (suave pero audible)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    // Reproducir
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Segundo beep para más atención
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(800, audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.log('Error en segundo beep:', e);
      }
    }, 200);
    
    console.log('✅ Sonido de notificación reproducido');
  } catch (error) {
    console.log('❌ No se pudo reproducir sonido:', error);
  }
}

// Función para probar notificación completa (sonido + notificación del navegador)
export function testFullNotification() {
  // Reproducir sonido
  testNotificationSound();
  
  // Mostrar notificación del navegador
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('🔔 Notificación de Prueba', {
        body: 'Esta es una notificación de prueba del sistema Grupo San Cristobal',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification'
      });
      console.log('✅ Notificación del navegador mostrada');
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          testFullNotification();
        } else {
          console.log('❌ Permiso de notificación denegado');
        }
      });
    } else {
      console.log('❌ Permiso de notificación denegado');
    }
  } else {
    console.log('❌ El navegador no soporta notificaciones');
  }
}

// Hacer disponible globalmente para pruebas en consola
if (typeof window !== 'undefined') {
  window.testNotificationSound = testNotificationSound;
  window.testFullNotification = testFullNotification;
  
  console.log('🔔 Funciones de prueba de notificaciones disponibles:');
  console.log('- testNotificationSound() - Prueba solo el sonido');
  console.log('- testFullNotification() - Prueba sonido + notificación del navegador');
}
