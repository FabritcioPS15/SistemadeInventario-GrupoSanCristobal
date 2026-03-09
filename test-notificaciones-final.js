// Script para probar el sistema de notificaciones con volumen máximo
// Ejecutar: node test-notificaciones-final.js

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

// Prueba de sonido directo (para pegar en consola del navegador)
const soundTestCode = `
// 🔊 PRUEBA DE SONIDO DIRECTO - VOLUMEN MÁXIMO
function testMaxVolumeSound() {
  try {
    console.log('🔊 Reproduciendo sonido con volumen máximo...');
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Frecuencia alta y volumen máximo
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.2);
    
    // VOLUMEN MÁXIMO = 1.0
    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Triple beep para máxima atención
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1500, audioContext.currentTime);
        gain2.gain.setValueAtTime(1.0, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.3);
      } catch (e) {}
    }, 600);
    
    setTimeout(() => {
      try {
        const osc3 = audioContext.createOscillator();
        const gain3 = audioContext.createGain();
        osc3.connect(gain3);
        gain3.connect(audioContext.destination);
        osc3.frequency.setValueAtTime(1000, audioContext.currentTime);
        gain3.gain.setValueAtTime(1.0, audioContext.currentTime);
        gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc3.start(audioContext.currentTime);
        osc3.stop(audioContext.currentTime + 0.2);
      } catch (e) {}
    }, 1000);
    
    console.log('✅ ¡Sonido de volumen máximo reproducido!');
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Ejecutar prueba
testMaxVolumeSound();
`;

console.log('🎵 Sistema de Notificaciones con Volumen Máximo');
console.log('==========================================');
console.log('');
console.log('Opciones de prueba:');
console.log('');
console.log('1. Ejecutar prueba completa para todos los roles');
console.log('2. Probar sonido directo en el navegador');
console.log('');

// Ejecutar prueba completa
testMultipleNotifications();

console.log('');
console.log('📋 Para prueba de sonido directo, copia y pega este código en la consola del navegador:');
console.log(soundTestCode);
