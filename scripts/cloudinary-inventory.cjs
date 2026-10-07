const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        env[k] = v;
      }
    }
  });
}

const cloudName = env.SOURCE_CLOUDINARY_CLOUD_NAME;
const apiKey = env.SOURCE_CLOUDINARY_API_KEY;
const apiSecret = env.SOURCE_CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('[Error] Missing source Cloudinary credentials in .env.');
  console.error('Please configure SOURCE_CLOUDINARY_CLOUD_NAME, SOURCE_CLOUDINARY_API_KEY, and SOURCE_CLOUDINARY_API_SECRET in your .env file.');
  process.exit(1);
}

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true
});

async function getAssetsForType(resourceType) {
  let allResources = [];
  let nextCursor = null;

  do {
    const params = {
      type: 'upload',
      prefix: 'nacos/',
      max_results: 500,
      resource_type: resourceType,
      tags: true,
      context: true
    };
    if (nextCursor) params.next_cursor = nextCursor;

    const res = await cloudinary.api.resources(params);
    if (res.resources) {
      allResources = allResources.concat(res.resources);
    }
    nextCursor = res.next_cursor;
  } while (nextCursor);

  return allResources;
}

async function listSubFolders(parent) {
  let folders = [];
  try {
    const res = await cloudinary.api.sub_folders(parent);
    for (const f of res.folders || []) {
      folders.push(f.path);
      const sub = await listSubFolders(f.path);
      folders = folders.concat(sub);
    }
  } catch (err) {
    // If folder doesn't exist or not supported
  }
  return folders;
}

async function runInventory() {
  console.log(`[Phase 1] Inspecting source Cloudinary cloud: ${cloudName} (prefix: nacos/)...`);
  
  console.log('Fetching image assets...');
  const images = await getAssetsForType('image');
  console.log(`Found ${images.length} images.`);

  console.log('Fetching video assets...');
  const videos = await getAssetsForType('video');
  console.log(`Found ${videos.length} videos.`);

  console.log('Fetching raw assets...');
  const rawFiles = await getAssetsForType('raw');
  console.log(`Found ${rawFiles.length} raw files.`);

  console.log('Discovering folders...');
  let folders = await listSubFolders('nacos');
  if (folders.length === 0) {
    // Extract folders from public IDs
    const derived = new Set();
    [...images, ...videos, ...rawFiles].forEach(a => {
      const parts = a.public_id.split('/');
      parts.pop();
      if (parts.length > 0) derived.add(parts.join('/'));
    });
    folders = Array.from(derived).sort();
  }

  const allAssets = [...images, ...videos, ...rawFiles];
  const summary = {
    cloudName,
    inspectedAt: new Date().toISOString(),
    totalAssets: allAssets.length,
    counts: {
      images: images.length,
      videos: videos.length,
      raw: rawFiles.length
    },
    folders: folders,
    assets: allAssets.map(a => ({
      public_id: a.public_id,
      format: a.format,
      resource_type: a.resource_type,
      bytes: a.bytes,
      created_at: a.created_at,
      secure_url: a.secure_url,
      tags: a.tags || [],
      context: a.context || {}
    }))
  };

  const outDir = path.resolve(__dirname, '..', 'supabase-migration');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'cloudinary_inventory.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8');

  console.log(`\n=== INVENTORY COMPLETED ===`);
  console.log(`Source Cloud: ${cloudName}`);
  console.log(`Total Assets: ${summary.totalAssets}`);
  console.log(` - Images: ${images.length}`);
  console.log(` - Videos: ${videos.length}`);
  console.log(` - Raw files: ${rawFiles.length}`);
  console.log(`Folders (${folders.length}):`, folders);
  console.log(`Inventory saved to: ${outPath}`);
}

runInventory().catch(err => {
  console.error('[Error] Inventory scan failed:', err.message);
  process.exit(1);
});
