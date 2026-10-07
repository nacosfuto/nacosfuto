import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL
    : (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL : '');

const supabaseAnonKey = 
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY : '');

const defaultUrl = 'https://jvxbyataifjsotudtqly.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eGJ5YXRhaWZqc290dWR0cWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTczNTksImV4cCI6MjEwNjg5MzM1OX0.rqE9EmdZLiHFTKmznpCXmurn8NHnt0jF6vm2Fa6YaOM';

export const supabase = createClient(supabaseUrl || defaultUrl, supabaseAnonKey || defaultKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
