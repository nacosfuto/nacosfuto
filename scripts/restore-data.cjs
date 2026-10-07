const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const destUrl = 'https://jvxbyataifjsotudtqly.supabase.co';
const destKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eGJ5YXRhaWZqc290dWR0cWx5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTMxNzM1OSwiZXhwIjoyMTA2ODkzMzU5fQ.5JG68_PfITdSYpknuggaI5KHM6ZxLuybbdOrd_OeQV0';

const sb = createClient(destUrl, destKey);
const backupPath = path.resolve(__dirname, '..', 'supabase-migration', 'data_backup.json');
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

// Insertion order respecting foreign keys
const tableOrder = [
  'academic_settings',
  'admin_scopes',
  'verified_students',
  'profiles',
  'resource_categories',
  'resources',
  'id_card_settings',
  'id_card_applications',
  'payments',
  'webhook_events',
  'media_assets',
  'nacos_executives',
  'news_articles',
  'website_events',
  'website_gallery',
  'yellow_pages',
  'student_results',
  'resource_downloads',
  'resource_views'
];

async function restore() {
  console.log('[Restore] Starting data restoration into destination project...');
  const results = {};

  // Clear boilerplate resource_categories before inserting original categories
  console.log('[Restore] Preparing resource_categories (clearing boilerplate)...');
  await sb.from('resource_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Clear boilerplate id_card_settings
  console.log('[Restore] Preparing id_card_settings (clearing boilerplate)...');
  await sb.from('id_card_settings').delete().neq('id', '__dummy__');

  for (const table of tableOrder) {
    const rows = backupData[table] || [];
    if (rows.length === 0) {
      results[table] = { source: 0, destination: 0 };
      continue;
    }

    console.log(`[Restore] Restoring ${table} (${rows.length} rows)...`);
    
    // Batch in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await sb.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) {
        console.error(`  Error inserting into ${table} (chunk ${i}):`, error.message);
        throw error;
      }
    }

    // Verify row count
    const { count, error: countErr } = await sb.from(table).select('*', { count: 'exact', head: true });
    if (countErr) {
      console.warn(`  Warning counting ${table}:`, countErr.message);
    } else {
      console.log(`  Table [${table}] successfully restored: ${count} rows.`);
      results[table] = { source: rows.length, destination: count };
    }
  }

  console.log('\n[Restore Summary Table]:');
  console.table(results);
}

restore().catch(err => {
  console.error('[Restore] Restoration failed:', err);
  process.exit(1);
});
