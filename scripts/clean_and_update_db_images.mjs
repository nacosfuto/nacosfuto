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

async function cleanDatabaseImages() {
  console.log('1. Updating store_alumni in id_card_settings...');
  const { data: alumniRow, error: aErr } = await supabase
    .from('id_card_settings')
    .select('academic_session')
    .eq('id', 'store_alumni')
    .single();

  if (!aErr && alumniRow?.academic_session) {
    const alumniList = JSON.parse(alumniRow.academic_session);
    let updatedAlumni = false;
    for (const alm of alumniList) {
      if (alm.image && alm.image.includes('unsplash.com')) {
        console.log(`Replacing Unsplash image for alumni ${alm.name || alm.id}`);
        alm.image = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569284/nacos/alumni/alumni.jpg';
        updatedAlumni = true;
      }
    }
    if (updatedAlumni) {
      const { error: saveErr } = await supabase
        .from('id_card_settings')
        .update({ academic_session: JSON.stringify(alumniList), updated_at: new Date().toISOString() })
        .eq('id', 'store_alumni');
      if (saveErr) console.error('Error updating store_alumni:', saveErr);
      else console.log('✅ store_alumni successfully updated in database!');
    }
  }

  console.log('\n2. Updating media_assets with Unsplash links...');
  const { data: mediaRows, error: mErr } = await supabase
    .from('media_assets')
    .select('*');

  if (!mErr && mediaRows) {
    for (const row of mediaRows) {
      if (row.image_url && row.image_url.includes('unsplash.com')) {
        let newUrl = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569339/nacos/gallery/research.jpg';
        if (row.category === 'alumni') {
          newUrl = 'https://res.cloudinary.com/a2mmcttn/image/upload/v1788569284/nacos/alumni/alumni.jpg';
        }
        console.log(`Updating media_assets ID ${row.id} (${row.category}) with ${newUrl}`);
        const { error: updErr } = await supabase
          .from('media_assets')
          .update({ image_url: newUrl, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (updErr) console.error(`Error updating media row ${row.id}:`, updErr);
        else console.log(`✅ media_assets ${row.id} updated!`);
      }
    }
  }
}

cleanDatabaseImages().then(() => {
  console.log('\nDatabase image cleanup complete.');
});
