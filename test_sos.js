import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const envContent = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if(key && val.length) env[key.trim()] = val.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSOS() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@citizen.com',
        password: 'password123'
    });
    
    if (authError) {
        console.error("Auth failed:", authError);
        return;
    }
    
    console.log("Logged in user:", authData.user.id);
    
    const sosEvent = {
        user_id: authData.user.id,
        session_id: null,
        latitude: 12.9716,
        longitude: 77.5946,
        address: '',
        accuracy: 10,
        battery_level: 80,
        device: 'TestScript',
        status: 'active'
    };
    
    const { data, error } = await supabase
        .from('sos_events')
        .insert([sosEvent])
        .select()
        .single();
        
    if (error) {
        console.error("SOS Insert Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("SOS Insert Success:", data.id);
    }
}

testSOS();
