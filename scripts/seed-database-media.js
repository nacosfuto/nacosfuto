/**
 * NACOS FUTO: Seed Cloudinary Manifest into Supabase `media_assets` Table
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to parse env file
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

const websiteEnv = parseEnv(path.join(rootDir, 'apps/website/.env'));
const rootEnv = parseEnv(path.join(rootDir, '.env'));
const env = { ...process.env, ...rootEnv, ...websiteEnv };

const supabaseUrl = env.VITE_SUPABASE_URL || 'https://jvxbyataifjsotudtqly.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Error: VITE_SUPABASE_ANON_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const manifestPath = path.join(rootDir, 'packages/media/src/cloudinaryAssets.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Error: cloudinaryAssets.json not found.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const assets = manifest.assets || {};
  const assetKeys = Object.keys(assets);

  console.log(`\n======================================================`);
  console.log(`Seeding ${assetKeys.length} Cloudinary Assets -> Supabase media_assets`);
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`======================================================\n`);

  const recordsToInsert = assetKeys.map(key => {
    const item = assets[key];
    return {
      cloudinary_public_id: item.publicId,
      image_url: item.url,
      image_alt: `NACOS ${item.category}: ${key.replace(/_/g, ' ')}`,
      media_type: 'image',
      folder: item.folder,
      category: item.category,
      entity_type: item.category,
      entity_id: key,
      format: item.url.split('.').pop() || 'jpg',
      bytes: item.bytes || 0,
      width: item.width || 0,
      height: item.height || 0
    };
  });

  // Batch upsert in chunks of 20
  const chunkSize = 20;
  let totalInserted = 0;

  for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
    const chunk = recordsToInsert.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('media_assets')
      .upsert(chunk, { onConflict: 'cloudinary_public_id' });

    if (error) {
      console.error(`Error inserting chunk [${i} to ${i + chunk.length}]:`, error.message);
    } else {
      totalInserted += chunk.length;
      console.log(`  ✓ Synced ${totalInserted}/${recordsToInsert.length} assets`);
    }
  }

  // Verify total count
  const { count, error: countErr } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact', head: true });

  console.log(`\nDone! Total assets in Supabase media_assets table: ${count !== null ? count : totalInserted}`);
}

seed().catch(console.error);
