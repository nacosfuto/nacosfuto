const fs = require('fs');
const path = require('path');

const targetFiles = [
  'apps/website/src/components/Home/Hero.jsx',
  'apps/website/src/components/Home/HeroCarousel.jsx',
  'apps/website/src/components/TechTeamSection.jsx',
  'apps/website/src/pages/Events.jsx',
  'apps/website/src/pages/Home.jsx',
  'apps/website/src/pages/News.jsx',
  'apps/website-admin/src/pages/AdminEvents.jsx',
  'apps/website-admin/src/pages/AdminGallery.jsx',
  'apps/website-admin/src/pages/AdminNews.jsx',
  'packages/config/idCardTemplate.js',
  'packages/media/src/cloudinaryAssets.json',
  'packages/supabase/src/administrationService.js',
  'packages/supabase/src/directoryService.js',
  'packages/supabase/src/eventsService.js',
  'packages/supabase/src/executivesService.js',
  'packages/supabase/src/galleryService.js',
  'packages/supabase/src/newsService.js'
];

const matchingManifestPath = path.resolve(__dirname, '..', 'supabase-migration', 'cloudinary_link_matching.json');
const matchingData = fs.existsSync(matchingManifestPath) ? JSON.parse(fs.readFileSync(matchingManifestPath, 'utf-8')) : { assets: [] };

const registry = [];

// Helper to find matching asset in manifest
function findAssetForUrl(url) {
  if (!url) return null;
  // Match by public_id
  for (const a of matchingData.assets) {
    if (url.includes(a.public_id)) return a;
  }
  if (matchingData.extra_templates) {
    for (const e of matchingData.extra_templates) {
      if (url.includes(e.public_id)) return e;
    }
  }
  return null;
}

console.log('=== 1. CATALOGING ALL CODEBASE CLOUDINARY LINKS ===');

targetFiles.forEach(relPath => {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (line.includes('res.cloudinary.com')) {
      const match = line.match(/https:\/\/res\.cloudinary\.com\/[^\s\"\'\`]+/);
      const url = match ? match[0] : null;
      const assetMatch = findAssetForUrl(url);

      registry.push({
        file: relPath,
        line: idx + 1,
        originalSnippet: line.trim(),
        capturedUrl: url,
        matchedAsset: assetMatch ? {
          public_id: assetMatch.public_id,
          source_url: assetMatch.source_url,
          destination_url: assetMatch.destination_url,
          folder: assetMatch.folder
        } : null
      });
    }
  });
});

console.log(`Found and cataloged ${registry.length} link locations in codebase.`);
const registryPath = path.resolve(__dirname, '..', 'supabase-migration', 'codebase_links_registry.json');
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`Saved registry to: ${registryPath}`);

console.log('\n=== 2. REMOVING OLD CLOUDINARY LINKS FROM CODEBASE ===');

// 1. Process cloudinaryAssets.json
const assetsJsonPath = path.resolve(__dirname, '..', 'packages/media/src/cloudinaryAssets.json');
if (fs.existsSync(assetsJsonPath)) {
  const assetsJson = JSON.parse(fs.readFileSync(assetsJsonPath, 'utf-8'));
  let clearedCount = 0;
  for (const key of Object.keys(assetsJson.assets)) {
    if (assetsJson.assets[key].url) {
      assetsJson.assets[key].url = "";
      clearedCount++;
    }
  }
  fs.writeFileSync(assetsJsonPath, JSON.stringify(assetsJson, null, 2) + '\n');
  console.log(`✓ Cleared ${clearedCount} URLs in packages/media/src/cloudinaryAssets.json`);
}

// 2. Process JS/JSX files: replace https://res.cloudinary.com/... occurrences with empty string ""
targetFiles.forEach(relPath => {
  if (relPath.endsWith('.json')) return;
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf-8');
  const regex = /https:\/\/res\.cloudinary\.com\/[^\s\"\'\`]+/g;
  const matches = content.match(regex);
  if (matches) {
    content = content.replace(regex, '');
    fs.writeFileSync(fullPath, content);
    console.log(`✓ Removed ${matches.length} Cloudinary URL(s) from ${relPath}`);
  }
});

console.log('\n=== LINK REMOVAL COMPLETE ===');
