const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sourceUrl = 'https://hfaomycwsjgxgvdqqgwl.supabase.co';
const sourceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmYW9teWN3c2pneGd2ZHFxZ3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODU1NzA5MSwiZXhwIjoyMTA0MTMzMDkxfQ.ZueN-VX_cg5UNnVS5arxahhV2_BVU-rhj3woE2nV2yE';

const supabase = createClient(sourceUrl, sourceKey);
const outDir = path.resolve(__dirname, '..', 'supabase-migration');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function exportAll() {
  console.log('[1/4] Exporting Auth users...');
  const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) throw authErr;
  
  fs.writeFileSync(
    path.join(outDir, 'auth_users.json'),
    JSON.stringify(users, null, 2),
    'utf-8'
  );
  console.log(`Saved ${users.length} Auth users to auth_users.json`);

  const tables = [
    'academic_settings',
    'admin_scopes',
    'verified_students',
    'profiles',
    'otp_verifications',
    'verification_sessions',
    'otp_rate_limits',
    'account_recovery_requests',
    'courses',
    'results',
    'student_results',
    'departmental_dues',
    'payments',
    'id_card_applications',
    'id_card_settings',
    'resource_categories',
    'resources',
    'resource_tags',
    'resource_tag_links',
    'resource_downloads',
    'resource_views',
    'nacos_executives',
    'nacos_executives_settings',
    'news_articles',
    'website_events',
    'website_gallery',
    'yellow_pages',
    'announcements',
    'events',
    'gallery_items',
    'media_assets',
    'audit_logs',
    'webhook_events'
  ];

  const fullDataBackup = {};
  let sqlStatements = ['-- NACOS FUTO DATA DUMP', '-- Generated: ' + new Date().toISOString(), 'SET session_replication_role = replica;\n'];

  console.log('[2/4] Exporting table records...');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`Skipping ${table}: ${error.message}`);
        continue;
      }
      fullDataBackup[table] = data || [];
      console.log(`  Table [${table}]: ${data?.length || 0} rows`);

      if (data && data.length > 0) {
        sqlStatements.push(`-- Table: public.${table} (${data.length} rows)`);
        for (const row of data) {
          const cols = Object.keys(row);
          const colNames = cols.map(c => `"${c}"`).join(', ');
          const values = cols.map(c => escapeSqlValue(row[c])).join(', ');
          sqlStatements.push(`INSERT INTO public."${table}" (${colNames}) VALUES (${values}) ON CONFLICT DO NOTHING;`);
        }
        sqlStatements.push('');
      }
    } catch (e) {
      console.error(`Error on ${table}:`, e.message);
    }
  }

  sqlStatements.push('SET session_replication_role = DEFAULT;');

  console.log('[3/4] Writing data.sql and data_backup.json...');
  fs.writeFileSync(path.join(outDir, 'data.sql'), sqlStatements.join('\n'), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'data_backup.json'), JSON.stringify(fullDataBackup, null, 2), 'utf-8');

  console.log('[4/4] Writing roles.sql and schema.sql...');
  const rolesSql = `-- Roles definitions for Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT;
  END IF;
END $$;
`;
  fs.writeFileSync(path.join(outDir, 'roles.sql'), rolesSql, 'utf-8');

  const masterSchema = fs.readFileSync(path.resolve(__dirname, '..', 'supabase_schema.sql'), 'utf-8');
  fs.writeFileSync(path.join(outDir, 'schema.sql'), masterSchema, 'utf-8');

  console.log('Safe database backup completed successfully in supabase-migration/!');
}

exportAll().catch(err => {
  console.error('Migration backup failed:', err);
  process.exit(1);
});
