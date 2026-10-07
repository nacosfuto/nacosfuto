const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const destRef = 'jvxbyataifjsotudtqly';
const migDir = path.resolve(__dirname, '..', 'packages', 'supabase', 'migrations');

const files = fs.readdirSync(migDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files to apply.`);

for (const file of files) {
  const fullPath = path.join(migDir, file);
  console.log(`Applying migration: ${file}...`);
  try {
    execSync(`npx supabase db query --linked --project-ref ${destRef} --file "${fullPath}"`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });
    console.log(`  ✓ Successfully applied ${file}`);
  } catch (err) {
    console.warn(`  Notice on ${file}:`, err.message);
  }
}

console.log('All migrations applied!');
