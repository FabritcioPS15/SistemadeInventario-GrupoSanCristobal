import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
    console.log('Testing Assets query...');
    const { data, error } = await supabase
        .from('assets')
        .select('*, asset_types(*), locations(*), resource_credentials(*)')
        .limit(1);

    if (error) {
        console.error('❌ Assets query failed:', error);
    } else {
        console.log('✅ Assets query successful');
    }

    console.log('Testing MTC Accesos query...');
    const { data: data2, error: error2 } = await supabase
        .from('mtc_accesos')
        .select('*, resource_credentials(*)')
        .limit(1);

    if (error2) {
        console.error('❌ MTC query failed:', error2);
    } else {
        console.log('✅ MTC query successful');
    }
}

testQuery();
