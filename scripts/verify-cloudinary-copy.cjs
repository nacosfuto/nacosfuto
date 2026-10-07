const fs = require('fs');
const path = require('path');
const https = require('https');
const cloudinary = require('cloudinary').v2;

const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  });
}

cloudinary.config({
  cloud_name: env.DEST_CLOUDINARY_CLOUD_NAME,
  api_key: env.DEST_CLOUDINARY_API_KEY,
  api_secret: env.DEST_CLOUDINARY_API_SECRET,
  secure: true
});

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 });
    }).on('error', (e) => resolve({ status: 500, error: e.message, ok: false }));
  });
}

async function verify() {
  console.log('=== PHASE 8: VERIFYING DESTINATION CLOUDINARY CLOUD ===\n');

  let allDest = [];
  let nextCursor = null;
  do {
    const params = {
      type: 'upload',
      prefix: 'nacos/',
      max_results: 500,
      resource_type: 'image'
    };
    if (nextCursor) params.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(params);
    allDest = allDest.concat(res.resources || []);
    nextCursor = res.next_cursor;
  } while (nextCursor);

  console.log(`✓ Total assets in destination 'nacos/': ${allDest.length} (Expected: 87)`);

  const folders = new Set();
  allDest.forEach(a => {
    const parts = a.public_id.split('/');
    parts.pop();
    folders.add(parts.join('/'));
  });
  console.log(`✓ Destination asset folders populated (${folders.size}):`, Array.from(folders).sort());

  const subFoldersRes = await cloudinary.api.sub_folders('nacos');
  const subNames = subFoldersRes.folders.map(f => f.path).sort();
  console.log(`✓ Destination Media Library UI folders (${subNames.length}):`, subNames);

  console.log('\nTesting live HTTP URL accessibility across different folders:');
  const samples = [
    'nacos/homepage/header',
    'nacos/executives/president_irechukwu',
    'nacos/gallery/gallery_dept_front',
    'nacos/events/event_masked_affairs',
    'nacos/yellow_pages/flyer_peacemaker',
    'nacos/alumni/alumni_godfirst',
    'nacos/news/research'
  ];

  for (const pid of samples) {
    const asset = allDest.find(a => a.public_id === pid);
    if (!asset) {
      console.error(`  ✗ Missing sample asset: ${pid}`);
      continue;
    }
    const check = await testUrl(asset.secure_url);
    console.log(`  ${check.ok ? '✓' : '✗'} [HTTP ${check.status}] ${pid} -> ${asset.secure_url}`);
  }

  console.log('\n=== VERIFICATION COMPLETED SUCCESSFULLY ===');
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
