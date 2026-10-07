import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProfiles() {
  console.log('\n--- 1. PROFILES TABLE (Student Portal Login) ---');
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log(`Found ${data.length} profiles:`);
  for (const p of data) {
    console.log(`- ID: ${p.id}`);
    console.log(`  Reg No: ${p.registration_number}`);
    console.log(`  Email: ${p.email}`);
    console.log(`  Name: ${p.first_name || p.full_name || ''} ${p.last_name || ''}`);
    console.log(`  Active: ${p.is_active}`);
    console.log(`  Password Hash: ${p.password_hash}`);
  }
}

async function testAdminScopes() {
  console.log('\n--- 2. ADMIN_SCOPES TABLE (Website Admin & Portal Admin Login) ---');
  const { data, error } = await supabase.from('admin_scopes').select('*');
  if (error) {
    console.error('Error fetching admin_scopes:', error);
    return;
  }
  console.log(`Found ${data.length} admin accounts:`);
  for (const a of data) {
    console.log(`- Email: ${a.email} | Scope: ${a.scope} | Role: ${a.role} | Active: ${a.is_active}`);
    console.log(`  Password Hash: ${a.password_hash}`);
  }
}

async function testMediaAssets() {
  console.log('\n--- 3. MEDIA_ASSETS TABLE ---');
  const { data, error, count } = await supabase.from('media_assets').select('*', { count: 'exact' });
  if (error) {
    console.error('Error fetching media_assets:', error);
    return;
  }
  console.log(`Total media assets in database: ${count || data.length}`);
  const nonNull = data.filter(m => m.asset_url || m.public_id || m.image_url);
  console.log(`Assets with non-null URLs/IDs: ${nonNull.length}`);
  
  // Group by category/folder
  const folders = {};
  for (const m of data) {
    const f = m.folder || m.category || 'unknown';
    folders[f] = (folders[f] || 0) + 1;
  }
  console.log('Media assets distribution by folder/category:', folders);

  console.log('\nSample populated media assets (first 10):');
  for (const m of nonNull.slice(0, 10)) {
    console.log(`- Folder: ${m.folder} | Title: ${m.title || m.caption || 'N/A'} | Public ID: ${m.public_id} | URL: ${m.asset_url || m.image_url}`);
  }
}

async function testIdCardSettings() {
  console.log('\n--- 4. ID_CARD_SETTINGS (Settings / Stores) ---');
  const { data, error } = await supabase.from('id_card_settings').select('*');
  if (error) {
    console.error('Error fetching id_card_settings:', error);
    return;
  }
  console.log(`Found ${data.length} settings rows:`);
  for (const s of data) {
    console.log(`- Key: ${s.id}`);
  }
}

async function main() {
  await testProfiles();
  await testAdminScopes();
  await testMediaAssets();
  await testIdCardSettings();
}

main();
