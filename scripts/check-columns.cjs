const fs = require('fs');
const { execSync } = require('child_process');

const backup = JSON.parse(fs.readFileSync('./supabase-migration/data_backup.json', 'utf-8'));
const destColsRaw = execSync('npx supabase db query --linked --project-ref jvxbyataifjsotudtqly "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = \'public\';"', { encoding: 'utf-8' });
const jsonStart = destColsRaw.indexOf('{');
const jsonEnd = destColsRaw.lastIndexOf('}');
const destCols = JSON.parse(destColsRaw.substring(jsonStart, jsonEnd + 1)).rows;

const colMap = {};
for (const r of destCols) {
  if (!colMap[r.table_name]) colMap[r.table_name] = new Set();
  colMap[r.table_name].add(r.column_name);
}

const missing = [];
for (const [table, rows] of Object.entries(backup)) {
  if (rows && rows.length > 0) {
    const keys = Object.keys(rows[0]);
    for (const k of keys) {
      if (colMap[table] && !colMap[table].has(k)) {
        missing.push({ table, column: k });
      }
    }
  }
}
console.log('Missing columns on destination:', missing);
