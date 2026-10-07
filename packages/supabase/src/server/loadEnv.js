import fs from 'fs';
import path from 'path';

/**
 * Synchronously loads root .env into process.env if in Node.js
 */
export function ensureEnvLoaded() {
  if (typeof process === 'undefined') return;

  const candidateDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '../../'),
    path.resolve(process.cwd(), '../'),
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../')
  ];

  for (const dir of candidateDirs) {
    const cleanDir = dir.replace(/^\/([a-zA-Z]:)/, '$1'); // Fix Windows leading slash if any
    const envPath = path.resolve(cleanDir, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return;
          const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
        break;
      } catch (_) {}
    }
  }
}

ensureEnvLoaded();
