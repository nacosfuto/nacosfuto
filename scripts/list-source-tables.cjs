const { execSync } = require('child_process');

const raw = execSync('npx supabase db query --linked --project-ref hfaomycwsjgxgvdqqgwl "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\';"', { encoding: 'utf-8' });
const s = raw.indexOf('{');
const e = raw.lastIndexOf('}');
const tables = JSON.parse(raw.substring(s, e + 1)).rows.map(t => t.table_name);
console.log(`Total tables in source (${tables.length}):`);
console.log(tables);
