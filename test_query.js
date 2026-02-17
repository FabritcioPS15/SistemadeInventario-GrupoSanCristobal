import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testQuery() {
    console.log('Testing Assets query...');
    const { data, error } = await supabase
        .from('assets')
        .select('*, asset_types(*), locations(*), resource_credentials(*)')
        .limit(1);

    if (error) {
        console.error('❌ Assets query failed:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Assets query successful');
    }

    console.log('Testing MTC Accesos query...');
    const { data: data2, error: error2 } = await supabase
        .from('mtc_accesos')
        .select('*, resource_credentials(*)')
        .limit(1);

    if (error2) {
        console.error('❌ MTC query failed:', JSON.stringify(error2, null, 2));
    } else {
        console.log('✅ MTC query successful');
    }
}

testQuery();
