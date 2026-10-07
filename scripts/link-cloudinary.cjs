const fs = require('fs');
const path = require('path');

const fromCloud = 'z3wgqisj';
const toCloud = 'a2mmcttn';

const filesToUpdate = [
  'packages/media/src/cloudinaryAssets.json',
  'packages/supabase/src/newsService.js',
  'packages/supabase/src/galleryService.js',
  'packages/supabase/src/executivesService.js',
  'packages/supabase/src/directoryService.js',
  'packages/supabase/src/eventsService.js',
  'packages/supabase/src/administrationService.js',
  'packages/config/idCardTemplate.js',
  'apps/website-admin/src/pages/AdminEvents.jsx',
  'apps/website-admin/src/pages/AdminGallery.jsx',
  'apps/website-admin/src/pages/AdminNews.jsx',
  'apps/website/src/components/Home/Hero.jsx',
  'apps/website/src/components/Home/HeroCarousel.jsx',
  'apps/website/src/components/TechTeamSection.jsx',
  'apps/website/src/pages/Events.jsx',
  'apps/website/src/pages/Home.jsx',
  'apps/website/src/pages/News.jsx',
  '.env'
];

console.log(`Linking Cloudinary references from ${fromCloud} to ${toCloud}...`);

for (const rel of filesToUpdate) {
  const p = path.resolve(__dirname, '..', rel);
  if (!fs.existsSync(p)) continue;
  let content = fs.readFileSync(p, 'utf-8');
  let count = 0;
  
  if (content.includes(`cloudName": "${fromCloud}"`)) {
    content = content.replace(`cloudName": "${fromCloud}"`, `cloudName": "${toCloud}"`);
    count++;
  }
  if (content.includes(`res.cloudinary.com/${fromCloud}`)) {
    const matches = content.split(`res.cloudinary.com/${fromCloud}`).length - 1;
    content = content.split(`res.cloudinary.com/${fromCloud}`).join(`res.cloudinary.com/${toCloud}`);
    count += matches;
  }
  if (rel === '.env') {
    content = content.replace(/VITE_CLOUDINARY_CLOUD_NAME=.*/g, `VITE_CLOUDINARY_CLOUD_NAME=${toCloud}`);
    content = content.replace(/CLOUDINARY_CLOUD_NAME=.*/g, `CLOUDINARY_CLOUD_NAME=${toCloud}`);
    count++;
  }

  if (count > 0) {
    fs.writeFileSync(p, content, 'utf-8');
    console.log(`  ✓ Updated ${rel} (${count} replacements)`);
  }
}

console.log('\nAll application Cloudinary links successfully updated to destination cloud!');
