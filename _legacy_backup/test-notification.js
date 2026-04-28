// Script para probar notificaciones con sonido
// Ejecutar: node test-notification.js

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fxyqkxwzjvznmqsmfgr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4eXFreHd6anZ6bm1xc21mZ3IiLCJpYXQiOjE3MzY0OTI5MTksImV4cCI6MjA1MjA2ODkxOX0.lE6Lb3m8Q6J-4qUqN1uQn7I2xg1kqJ9w3cY-1k8k9M'
);

async function testNotification() {
  console.log('🔔 Creando notificación de prueba...');
  
  try {
    // Insertar notificación de prueba
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        type: 'ticket_created',
        title: '🎫 Ticket de Prueba',
        message: 'Este es un ticket de prueba para verificar el sistema de notificaciones con sonido',
        user_name: 'Sistema de Prueba',
        target_role: 'super_admin',
        ticket_id: null,
        read: false
      })
      .select();

    if (error) {
      console.error('❌ Error creando notificación:', error);
    } else {
      console.log('✅ Notificación creada exitosamente:', data);
      console.log('🔊 Deberías escuchar el sonido en el Dashboard ahora');
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Probar también sonido directo
function testSoundOnly() {
  console.log('🔊 Probando sonido directo...');
  
  // Código para probar sonido (copiar y pegar en consola del navegador)
  const soundTestCode = `
function testNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
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
      } catch (e) {}
    }, 200);
    
    console.log('✅ Sonido de notificación reproducido');
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

testNotificationSound();
  `;
  
  console.log('📋 Copia y pega este código en la consola del navegador:');
  console.log(soundTestCode);
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas de notificaciones...');
console.log('');
console.log('Opción 1: Crear notificación en la base de datos');
console.log('Opción 2: Probar solo el sonido');
console.log('');

// Descomentar la prueba que quieres ejecutar
testNotification(); // Crea notificación real
// testSoundOnly(); // Muestra código para probar sonido
