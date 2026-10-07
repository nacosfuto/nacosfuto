const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcRef = 'hfaomycwsjgxgvdqqgwl';
const destRef = 'jvxbyataifjsotudtqly';
const outSqlPath = path.resolve(__dirname, '..', 'supabase-migration', 'auth_migration.sql');

function runQuery(ref, query) {
  // Use JSON output
  const raw = execSync(`npx supabase db query --linked --project-ref ${ref} "${query}"`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024
  });
  
  // Find json block between lines
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Invalid query response: ' + raw);
  }
  const parsed = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));
  return parsed.rows || [];
}

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  console.log('[Auth] 1. Extracting auth.users from source project...');
  const users = runQuery(srcRef, "SELECT * FROM auth.users ORDER BY created_at ASC;");
  console.log(`[Auth] Retrieved ${users.length} users.`);

  console.log('[Auth] 2. Extracting auth.identities from source project...');
  const identities = runQuery(srcRef, "SELECT * FROM auth.identities ORDER BY created_at ASC;");
  console.log(`[Auth] Retrieved ${identities.length} identities.`);

  let sqlLines = [
    '-- Supabase Auth Migration',
    '-- Generated: ' + new Date().toISOString(),
    'BEGIN;'
  ];

  // Insert users
  for (const u of users) {
    const cols = Object.keys(u).filter(c => c !== 'confirmed_at');
    const colList = cols.map(c => `"${c}"`).join(', ');
    const valList = cols.map(c => escapeSql(u[c])).join(', ');
    sqlLines.push(`INSERT INTO auth.users (${colList}) VALUES (${valList}) ON CONFLICT (id) DO NOTHING;`);
  }

  // Insert identities
  for (const iden of identities) {
    const cols = Object.keys(iden).filter(c => c !== 'email');
    const colList = cols.map(c => `"${c}"`).join(', ');
    const valList = cols.map(c => escapeSql(iden[c])).join(', ');
    sqlLines.push(`INSERT INTO auth.identities (${colList}) VALUES (${valList}) ON CONFLICT (id) DO NOTHING;`);
  }

  sqlLines.push('COMMIT;');

  fs.writeFileSync(outSqlPath, sqlLines.join('\n'), 'utf-8');
  console.log(`[Auth] 3. Written migration SQL to: ${outSqlPath}`);

  console.log('[Auth] 4. Executing auth migration on destination project...');
  // Read sql in chunks or direct execution
  execSync(`npx supabase db query --linked --project-ref ${destRef} --file "${outSqlPath}"`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024
  });

  console.log('[Auth] 5. Verifying migrated users on destination project...');
  const destUsers = runQuery(destRef, "SELECT id, email, created_at FROM auth.users;");
  console.log(`[Auth] Destination project now has ${destUsers.length} auth users.`);
  destUsers.forEach(u => console.log(`   - Verified user: ${u.email} (${u.id})`));
}

main().catch(e => {
  console.error('[Auth] Error migrating Auth:', e.message);
  process.exit(1);
});
