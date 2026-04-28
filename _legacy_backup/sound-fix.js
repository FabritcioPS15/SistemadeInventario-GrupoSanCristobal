// SOLUCIÓN TEMPORAL - Agregar sonido al sistema existente
// Copiar y pegar en la consola del navegador

console.log('🔧 IMPLEMENTANDO SOLUCIÓN TEMPORAL DE SONIDO...');

// 1. Crear función de sonido
window.playNotificationSound = function() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Segundo beep
    setTimeout(() => {
      try {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1200, audioContext.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(900, audioContext.currentTime + 0.1);
        gain2.gain.setValueAtTime(1.0, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.2);
      } catch (e) {}
    }, 400);
    
    console.log('✅ Sonido reproducido');
  } catch (error) {
    console.error('❌ Error en sonido:', error);
  }
};

// 2. Crear observador para el badge
const notificationButton = document.querySelector('button[title="Notificaciones"]');
if (notificationButton) {
  console.log('✅ Botón de notificaciones encontrado');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node.tagName === 'SPAN' || node.className?.includes('badge'))) {
            console.log('🔔 ¡Badge detectado - Reproduciendo sonido!');
            window.playNotificationSound();
          }
        });
      }
      
      if (mutation.type === 'attributes' && mutation.attributeName === 'textContent') {
        const target = mutation.target;
        if (target.tagName === 'SPAN' && target.textContent) {
          const count = parseInt(target.textContent);
          if (!isNaN(count) && count > 0) {
            console.log('🔔 ¡Badge actualizado - Reproduciendo sonido!');
            window.playNotificationSound();
          }
        }
      }
    });
  });
  
  observer.observe(notificationButton, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['textContent'],
    characterData: true
  });
  
  console.log('✅ Observador creado');
} else {
  console.log('❌ Botón de notificaciones no encontrado');
}

// 3. Probar sonido
console.log('🧪 Probando sonido...');
window.playNotificationSound();

console.log('🎉 SOLUCIÓN TEMPORAL ACTIVA');
console.log('📝 Ahora crea un ticket y debería sonar automáticamente');
