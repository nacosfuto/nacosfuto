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

cloudinary.config({
  cloud_name: destCloud,
  api_key: destKey,
  api_secret: destSecret,
  secure: true
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function organizeFolders() {
  console.log('=== ORGANIZING DESTINATION CLOUDINARY FOLDERS ===\n');

  // 1. Fetch all assets under 'nacos/' in destination
  let allAssets = [];
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
    allAssets = allAssets.concat(res.resources || []);
    nextCursor = res.next_cursor;
  } while (nextCursor);

  console.log(`Found ${allAssets.length} assets to organize under 'nacos/'.\n`);

  // 2. Identify all unique folders
  const folderSet = new Set();
  allAssets.forEach(a => {
    const parts = a.public_id.split('/');
    parts.pop(); // remove filename
    const folder = parts.join('/');
    if (folder) folderSet.add(folder);
  });

  const knownFolders = [
    'nacos/alumni',
    'nacos/certificates',
    'nacos/events',
    'nacos/executives',
    'nacos/gallery',
    'nacos/general',
    'nacos/homepage',
    'nacos/ids',
    'nacos/news',
    'nacos/students',
    'nacos/yellow_pages'
  ];
  knownFolders.forEach(f => folderSet.add(f));

  const folders = Array.from(folderSet).sort();
  console.log('Folders to ensure in Cloudinary Media Library:');
  folders.forEach(f => console.log(`  - ${f}`));
  console.log();

  // 3. Create folders explicitly via Cloudinary Admin API
  for (const folder of folders) {
    try {
      await cloudinary.api.create_folder(folder);
      console.log(`✓ Created/Confirmed folder: ${folder}`);
    } catch (err) {
      console.log(`  Folder ${folder} notice: ${err.message || 'ok'}`);
    }
  }

  // 4. Update each asset to assign its asset_folder and display_name
  console.log('\nAssigning assets to their respective folders:');
  let updatedCount = 0;
  for (let i = 0; i < allAssets.length; i++) {
    const asset = allAssets[i];
    const parts = asset.public_id.split('/');
    const filename = parts.pop();
    const targetFolder = parts.join('/');

    try {
      await cloudinary.api.update(asset.public_id, {
        asset_folder: targetFolder,
        display_name: filename
      });
      updatedCount++;
      if ((i + 1) % 10 === 0 || i === allAssets.length - 1) {
        console.log(`  [${i + 1}/${allAssets.length}] Assigned ${asset.public_id} -> folder: "${targetFolder}"`);
      }
    } catch (err) {
      console.error(`  ✗ Failed to update ${asset.public_id}: ${err.message}`);
    }
    // slight delay to respect rate limits
    await sleep(80);
  }

  console.log(`\n✓ Successfully organized ${updatedCount}/${allAssets.length} assets into folders.`);

  // 5. Verify subfolders under 'nacos'
  console.log('\n--- VERIFYING FOLDER STRUCTURE ---');
  try {
    const rootRes = await cloudinary.api.root_folders();
    console.log('Root folders in Media Library:', rootRes.folders.map(f => f.name));

    const subRes = await cloudinary.api.sub_folders('nacos');
    console.log('Subfolders in "nacos":', subRes.folders.map(f => f.name));
  } catch (err) {
    console.error('Verification error:', err.message);
  }
}

organizeFolders().catch(err => {
  console.error('Organization failed:', err);
  process.exit(1);
});
