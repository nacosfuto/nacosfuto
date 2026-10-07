const { execSync } = require('child_process');

const raw = execSync('npx supabase db query --linked --project-ref jvxbyataifjsotudtqly "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\';"', { encoding: 'utf-8' });
const s = raw.indexOf('{');
const e = raw.lastIndexOf('}');
const tables = JSON.parse(raw.substring(s, e + 1)).rows;
console.log('Total tables in public schema:', tables.length);
const withoutRls = tables.filter(t => !t.rowsecurity);
console.log('Tables without RLS:', withoutRls.length === 0 ? 'NONE (all have RLS enabled!)' : withoutRls.map(t => t.tablename));
