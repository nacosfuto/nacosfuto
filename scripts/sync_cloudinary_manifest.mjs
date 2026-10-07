import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
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

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const manifestPath = path.resolve(__dirname, '../packages/media/src/cloudinaryAssets.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

async function syncManifest() {
  console.log('Fetching media assets from Supabase...');
  const { data: assets, error } = await supabase.from('media_assets').select('*');
  if (error) {
    console.error('Failed to fetch media assets:', error);
    process.exit(1);
  }

  console.log(`Fetched ${assets.length} assets from Supabase.`);

  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'a2mmcttn';
  manifest.cloudName = cloudName;
  manifest.syncedAt = new Date().toISOString();

  // Create lookup by entity_id, public_id, and filename
  const assetMap = {};
  for (const a of assets) {
    const url = a.image_url || a.asset_url;
    if (!url || !url.includes('cloudinary.com/a2mmcttn')) continue;

    if (a.entity_id) assetMap[a.entity_id] = url;
    if (a.cloudinary_public_id) {
      assetMap[a.cloudinary_public_id] = url;
      const baseName = a.cloudinary_public_id.split('/').pop();
      if (baseName) assetMap[baseName] = url;
    }
  }

  let updatedCount = 0;
  for (const [key, item] of Object.entries(manifest.assets)) {
    let matchedUrl = null;

    if (assetMap[key]) {
      matchedUrl = assetMap[key];
    } else if (item.publicId && assetMap[item.publicId]) {
      matchedUrl = assetMap[item.publicId];
    } else if (item.publicId) {
      const baseName = item.publicId.split('/').pop();
      if (assetMap[baseName]) {
        matchedUrl = assetMap[baseName];
      }
    }

    if (!matchedUrl && item.publicId) {
      // Fallback to canonical Cloudinary URL
      matchedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${item.publicId}`;
    }

    if (matchedUrl) {
      item.url = matchedUrl;
      updatedCount++;
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Successfully updated ${updatedCount} assets in cloudinaryAssets.json with cloudName: ${cloudName}!`);
}

syncManifest();
