import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL
    : (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL : '');

const supabaseAnonKey = 
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY : '');

const dummyUrl = 'https://unconfigured-project.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== dummyUrl);

export const supabase = createClient(supabaseUrl || dummyUrl, supabaseAnonKey || dummyKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
