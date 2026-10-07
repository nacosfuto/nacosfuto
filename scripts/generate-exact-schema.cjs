const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function query(ref, sql) {
  const tmpFile = path.resolve(__dirname, '..', 'supabase-migration', `_tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`);
  fs.writeFileSync(tmpFile, sql, 'utf-8');
  try {
    const raw = execSync(`npx supabase db query --linked --project-ref ${ref} --file "${tmpFile}"`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    return JSON.parse(raw.substring(s, e + 1)).rows || [];
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

const srcRef = 'hfaomycwsjgxgvdqqgwl';
const destRef = 'jvxbyataifjsotudtqly';

console.log('Fetching columns from source and destination...');
const srcCols = query(srcRef, `
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  ORDER BY table_name, ordinal_position;
`);

const destCols = query(destRef, `
  SELECT table_name, column_name 
  FROM information_schema.columns 
  WHERE table_schema = 'public';
`);

const destTables = new Set(destCols.map(c => c.table_name));
const destColMap = new Set(destCols.map(c => `${c.table_name}.${c.column_name}`));

// Group source columns by table
const srcTableCols = {};
for (const col of srcCols) {
  if (!srcTableCols[col.table_name]) srcTableCols[col.table_name] = [];
  srcTableCols[col.table_name].push(col);
}

function resolveType(c) {
  let type = c.data_type.toUpperCase();
  if (type === 'USER-DEFINED') {
    return c.udt_name;
  }
  if (type === 'ARRAY') {
    return `${c.udt_name.replace(/^_/, '')}[]`;
  }
  if (type === 'CHARACTER VARYING') {
    return 'VARCHAR';
  }
  if (type === 'TIMESTAMP WITH TIME ZONE') {
    return 'TIMESTAMPTZ';
  }
  if (type === 'TIMESTAMP WITHOUT TIME ZONE') {
    return 'TIMESTAMP';
  }
  return type;
}

const sqlStatements = [];

// 1. Create missing tables
for (const [table, cols] of Object.entries(srcTableCols)) {
  if (!destTables.has(table)) {
    console.log(`Creating missing table: ${table}`);
    const colDefs = cols.map(c => {
      let def = `"${c.column_name}" ${resolveType(c)}`;
      if (c.column_name === 'id') {
        def += ' PRIMARY KEY';
        if (c.data_type === 'uuid') {
          def += ' DEFAULT gen_random_uuid()';
        }
      } else if (c.column_default && !c.column_default.includes('nextval')) {
        def += ` DEFAULT ${c.column_default}`;
      }
      return def;
    });
    sqlStatements.push(`CREATE TABLE IF NOT EXISTS public."${table}" (\n  ${colDefs.join(',\n  ')}\n);`);
    sqlStatements.push(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;`);
    sqlStatements.push(`DROP POLICY IF EXISTS "Public access ${table}" ON public."${table}";`);
    sqlStatements.push(`CREATE POLICY "Public access ${table}" ON public."${table}" FOR ALL USING (true);`);
    sqlStatements.push('');
  }
}

// 2. Add missing columns to existing tables
for (const [table, cols] of Object.entries(srcTableCols)) {
  if (destTables.has(table)) {
    for (const c of cols) {
      if (!destColMap.has(`${table}.${c.column_name}`)) {
        console.log(`Adding missing column: ${table}.${c.column_name}`);
        let def = `"${c.column_name}" ${resolveType(c)}`;
        if (c.column_default && !c.column_default.includes('nextval')) {
          def += ` DEFAULT ${c.column_default}`;
        }
        sqlStatements.push(`ALTER TABLE public."${table}" ADD COLUMN IF NOT EXISTS ${def};`);
      }
    }
  }
}

const outSql = sqlStatements.join('\n');
fs.writeFileSync('./supabase-migration/schema_sync_all.sql', outSql, 'utf-8');
console.log(`Generated ${sqlStatements.length} DDL statements in schema_sync_all.sql`);

console.log('Executing DDL against destination project...');
execSync(`npx supabase db query --linked --project-ref ${destRef} --file "./supabase-migration/schema_sync_all.sql"`, {
  encoding: 'utf-8',
  maxBuffer: 50 * 1024 * 1024
});

console.log('All missing tables and columns successfully created on destination!');
