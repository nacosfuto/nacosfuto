const fs = require('fs');
const { execSync } = require('child_process');

function query(ref, sql) {
  const raw = execSync(`npx supabase db query --linked --project-ref ${ref} "${sql}"`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024
  });
  const s = raw.indexOf('{');
  const e = raw.lastIndexOf('}');
  return JSON.parse(raw.substring(s, e + 1)).rows || [];
}

const srcCols = query('hfaomycwsjgxgvdqqgwl', "SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public';");
const destCols = query('jvxbyataifjsotudtqly', "SELECT table_name, column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema = 'public';");

const destMap = new Set(destCols.map(c => `${c.table_name}.${c.column_name}`));
const missing = srcCols.filter(c => !destMap.has(`${c.table_name}.${c.column_name}`));

console.log(`Found ${missing.length} missing columns to add to destination:`);
const alterStatements = [];

for (const m of missing) {
  let type = m.data_type.toUpperCase();
  if (type === 'USER-DEFINED') {
    type = m.udt_name;
  } else if (type === 'ARRAY') {
    type = `${m.udt_name.replace(/^_/, '')}[]`;
  }
  console.log(`  - Adding ${m.table_name}.${m.column_name} (${type})`);
  alterStatements.push(`ALTER TABLE public."${m.table_name}" ADD COLUMN IF NOT EXISTS "${m.column_name}" ${type};`);
}

const alterSql = alterStatements.join('\n');
fs.writeFileSync('./supabase-migration/sync_columns.sql', alterSql, 'utf-8');

console.log('Applying column additions to destination...');
execSync(`npx supabase db query --linked --project-ref jvxbyataifjsotudtqly --file "./supabase-migration/sync_columns.sql"`, {
  encoding: 'utf-8'
});

console.log('Columns successfully synchronized!');
