// Create a test notification directly
// Run this in browser console to test

// First, import the notification function
import { notifyTicketCreated } from './src/lib/notifications.js';

// Test function
async function createTestNotification() {
  console.log('🧪 Creating test notification...');
  
  const result = await notifyTicketCreated(
    'test-123',
    'Ticket de Prueba Manual',
    'test-user-id',
    'Usuario de Prueba',
    'Sede Principal'
  );
  
  console.log('📤 Test notification result:', result);
  
  if (result) {
    console.log('✅ Test notification created successfully!');
    console.log('🔄 Refresh the page to see it in notifications');
  } else {
    console.log('❌ Test notification failed');
    console.log('🔧 Check the console for detailed error messages');
  }
}

// Execute the test
createTestNotification();
