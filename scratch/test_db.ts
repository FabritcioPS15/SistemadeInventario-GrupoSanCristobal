import { supabase } from '../src/lib/supabase';

async function testInsert() {
  const { data, error } = await supabase
    .from('camera_disks')
    .insert([{
      disk_number: 99,
      total_capacity_gb: 1000,
      used_space_gb: 500,
      remaining_capacity_gb: 500,
      disk_type: 'HDD',
      status: 'extracted',
      serial_number: 'TEST-123'
    }])
    .select();
  
  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert successful:', data);
    // Cleanup
    await supabase.from('camera_disks').delete().eq('id', data[0].id);
  }
}

testInsert();
