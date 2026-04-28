// Test script for notifications
// Run this in browser console to test notifications

import { supabase } from './src/lib/supabase.js';

async function testNotifications() {
  console.log('🧪 Testing notifications system...');
  
  // 1. Check if table exists
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1);
    
    console.log('📊 Table check:', { data, error });
    
    if (error) {
      console.error('❌ Table does not exist or no permissions:', error);
      return;
    }
  } catch (err) {
    console.error('❌ Error checking table:', err);
    return;
  }
  
  // 2. Try to insert a test notification
  try {
    const testNotification = {
      type: 'ticket_created',
      title: '🧪 Test Notification',
      message: 'This is a test notification to verify the system works',
      user_name: 'Test User',
      target_role: 'super_admin',
      read: false
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select();
    
    console.log('📝 Insert test:', { insertData, insertError });
    
    if (insertError) {
      console.error('❌ Cannot insert notification:', insertError);
    } else {
      console.log('✅ Test notification created successfully!');
    }
  } catch (err) {
    console.error('❌ Error inserting test notification:', err);
  }
  
  // 3. Try to fetch notifications
  try {
    const { data: fetchData, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('target_role', 'super_admin')
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('📥 Fetch test:', { fetchData, fetchError });
    
    if (fetchError) {
      console.error('❌ Cannot fetch notifications:', fetchError);
    } else {
      console.log('✅ Notifications fetched successfully:', fetchData);
    }
  } catch (err) {
    console.error('❌ Error fetching notifications:', err);
  }
}

// Run the test
testNotifications();
