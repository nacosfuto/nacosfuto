const fs = require('fs');
const path = require('path');
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

const destCloud = env.DEST_CLOUDINARY_CLOUD_NAME;
const destKey = env.DEST_CLOUDINARY_API_KEY;
const destSecret = env.DEST_CLOUDINARY_API_SECRET;

if (!destCloud || !destKey || !destSecret) {
  console.error('[Error] Missing destination Cloudinary credentials in .env.');
  process.exit(1);
}

// Configure destination Cloudinary client
cloudinary.config({
  cloud_name: destCloud,
  api_key: destKey,
  api_secret: destSecret,
  secure: true
});

const inventoryPath = path.resolve(__dirname, '..', 'supabase-migration', 'cloudinary_inventory.json');
if (!fs.existsSync(inventoryPath)) {
  console.error('[Error] Inventory file not found. Run inventory first.');
  process.exit(1);
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));
const assets = inventory.assets;

console.log(`[Cloudinary Migration] Starting Cloud-to-Cloud copy of ${assets.length} assets...`);
console.log(`Source Cloud: ${inventory.cloudName} -> Destination Cloud: ${destCloud}\n`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkExistsOnDest(publicId, resourceType) {
  try {
    const res = await cloudinary.api.resource(publicId, { resource_type: resourceType });
    return res;
  } catch (err) {
    if (err && (err.http_code === 404 || err.message?.includes('not found') || err.error?.http_code === 404)) {
      return null;
    }
    // If rate limit or other error, return null to attempt upload
    return null;
  }
}

async function uploadWithRetry(asset, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const uploadOptions = {
        public_id: asset.public_id,
        resource_type: asset.resource_type || 'image',
        overwrite: false,
        use_filename: false,
        unique_filename: false
      };

      if (asset.tags && asset.tags.length > 0) {
        uploadOptions.tags = asset.tags;
      }
      if (asset.context && Object.keys(asset.context).length > 0) {
        uploadOptions.context = asset.context;
      }

      const res = await cloudinary.uploader.upload(asset.secure_url, uploadOptions);
      return { success: true, result: res };
    } catch (err) {
      if (attempt === maxRetries) {
        return { success: false, error: err.message || JSON.stringify(err) };
      }
      console.warn(`    Retry ${attempt}/${maxRetries} for ${asset.public_id} after error: ${err.message || 'error'}`);
      await sleep(1500 * attempt);
    }
  }
}

async function runMigration() {
  const stats = {
    total: assets.length,
    copied: 0,
    skipped: 0,
    duplicates: 0,
    failed: [],
    details: []
  };

  let count = 0;
  for (const asset of assets) {
    count++;
    const progress = `[${count}/${assets.length}]`;

    // 1. Check duplicate on destination
    const existing = await checkExistsOnDest(asset.public_id, asset.resource_type);
    if (existing) {
      console.log(`${progress} DUPLICATE: ${asset.public_id} already exists on destination. Skipping.`);
      stats.duplicates++;
      stats.skipped++;
      stats.details.push({
        public_id: asset.public_id,
        status: 'duplicate',
        destination_url: existing.secure_url
      });
      continue;
    }

    // 2. Cloud-to-Cloud Upload
    console.log(`${progress} COPYING: ${asset.public_id} (${asset.format}, ${(asset.bytes / 1024).toFixed(1)} KB)...`);
    const res = await uploadWithRetry(asset);

    if (res.success) {
      stats.copied++;
      stats.details.push({
        public_id: asset.public_id,
        status: 'copied',
        destination_url: res.result.secure_url,
        bytes: res.result.bytes
      });
    } else {
      console.error(`  ✗ FAILED: ${asset.public_id} - ${res.error}`);
      stats.failed.push({
        public_id: asset.public_id,
        error: res.error
      });
      stats.details.push({
        public_id: asset.public_id,
        status: 'failed',
        error: res.error
      });
    }

    // Gentle throttle to respect Cloudinary concurrency limits
    await sleep(250);
  }

  const outReportPath = path.resolve(__dirname, '..', 'supabase-migration', 'cloudinary_migration_report.json');
  fs.writeFileSync(outReportPath, JSON.stringify(stats, null, 2), 'utf-8');

  console.log('\n================ MIGRATION COMPLETE ================');
  console.log(`Total Assets Processed: ${stats.total}`);
  console.log(`Successfully Copied:   ${stats.copied}`);
  console.log(`Duplicates / Skipped:  ${stats.duplicates}`);
  console.log(`Failed:                ${stats.failed.length}`);
  console.log(`Detailed report saved to: ${outReportPath}`);
}

runMigration().catch(err => {
  console.error('[Fatal Error] Migration stopped:', err);
  process.exit(1);
});
