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

cloudinary.config({
  cloud_name: env.DEST_CLOUDINARY_CLOUD_NAME,
  api_key: env.DEST_CLOUDINARY_API_KEY,
  api_secret: env.DEST_CLOUDINARY_API_SECRET,
  secure: true
});

async function buildManifest() {
  const inventoryPath = path.resolve(__dirname, '..', 'supabase-migration', 'cloudinary_inventory.json');
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

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

  console.log(`Loaded ${inventory.assets.length} source assets and ${allDest.length} destination assets.`);

  const destMap = new Map();
  allDest.forEach(d => destMap.set(d.public_id, d));

  const matching = [];

  for (const src of inventory.assets) {
    const dest = destMap.get(src.public_id);
    const destUrl = dest ? dest.secure_url : `https://res.cloudinary.com/${env.DEST_CLOUDINARY_CLOUD_NAME}/image/upload/${src.public_id}.${src.format}`;

    matching.push({
      public_id: src.public_id,
      folder: path.dirname(src.public_id).replace(/\\/g, '/'),
      filename: path.basename(src.public_id),
      format: src.format,
      bytes: src.bytes,
      source_cloud: 'z3wgqisj',
      source_url: src.secure_url,
      destination_cloud: env.DEST_CLOUDINARY_CLOUD_NAME,
      destination_url: destUrl,
      verified_destination: !!dest
    });
  }

  // Also include template images that were in idCardTemplate.js if any outside nacos
  const extraImages = [
    {
      public_id: 'B_cld0wm',
      folder: 'root',
      filename: 'B_cld0wm.jpg',
      format: 'jpg',
      source_cloud: 'z3wgqisj',
      source_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788570571/B_cld0wm.jpg',
      destination_cloud: env.DEST_CLOUDINARY_CLOUD_NAME,
      destination_url: `https://res.cloudinary.com/${env.DEST_CLOUDINARY_CLOUD_NAME}/image/upload/v1788570571/B_cld0wm.jpg`,
      note: 'ID Card Master Front Template'
    },
    {
      public_id: 'NACOS_ID_CARD_PHASE_1_zodyod',
      folder: 'root',
      filename: 'NACOS_ID_CARD_PHASE_1_zodyod.jpg',
      format: 'jpg',
      source_cloud: 'z3wgqisj',
      source_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788571061/NACOS_ID_CARD_PHASE_1_zodyod.jpg',
      destination_cloud: env.DEST_CLOUDINARY_CLOUD_NAME,
      destination_url: `https://res.cloudinary.com/${env.DEST_CLOUDINARY_CLOUD_NAME}/image/upload/v1788571061/NACOS_ID_CARD_PHASE_1_zodyod.jpg`,
      note: 'ID Card Master Back Template'
    },
    {
      public_id: '20250304_223205_Destiny_Eke_ce1a4da154_hxay39',
      folder: 'root',
      filename: '20250304_223205_Destiny_Eke_ce1a4da154_hxay39.jpg',
      format: 'jpg',
      source_cloud: 'z3wgqisj',
      source_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1789824604/20250304_223205_Destiny_Eke_ce1a4da154_hxay39.jpg',
      destination_cloud: env.DEST_CLOUDINARY_CLOUD_NAME,
      destination_url: `https://res.cloudinary.com/${env.DEST_CLOUDINARY_CLOUD_NAME}/image/upload/v1789824604/20250304_223205_Destiny_Eke_ce1a4da154_hxay39.jpg`,
      note: 'Hero fallback photo'
    }
  ];

  const fullMapping = {
    generated_at: new Date().toISOString(),
    total_assets: matching.length,
    source_cloud: 'z3wgqisj',
    destination_cloud: env.DEST_CLOUDINARY_CLOUD_NAME,
    assets: matching,
    extra_templates: extraImages
  };

  const outputPath = path.resolve(__dirname, '..', 'supabase-migration', 'cloudinary_link_matching.json');
  fs.writeFileSync(outputPath, JSON.stringify(fullMapping, null, 2));
  console.log(`Saved matching manifest to: ${outputPath}`);

  // Summary by folder
  const folderCounts = {};
  matching.forEach(m => {
    folderCounts[m.folder] = (folderCounts[m.folder] || 0) + 1;
  });
  console.log('Matching breakdown by folder:');
  Object.keys(folderCounts).sort().forEach(f => {
    console.log(`  ${f}: ${folderCounts[f]} items`);
  });
}

buildManifest().catch(console.error);
