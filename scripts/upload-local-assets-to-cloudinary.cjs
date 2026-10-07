const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

const uploadList = [
  { gitPath: 'apps/portal/src/assets/sample_student_passport.jpg', folder: 'nacos/students', public_id: 'nacos/students/sample_student_passport' },
  { gitPath: 'apps/website/src/assets/clubs.jpg', folder: 'nacos/general', public_id: 'nacos/general/clubs' },
  { gitPath: 'apps/website/src/assets/contact.jpg', folder: 'nacos/general', public_id: 'nacos/general/contact' },
  { gitPath: 'apps/website/src/assets/courses.png', folder: 'nacos/general', public_id: 'nacos/general/courses' },
  { gitPath: 'apps/website/src/assets/faculty.png', folder: 'nacos/general', public_id: 'nacos/general/faculty' },
  { gitPath: 'apps/website/src/assets/resources.png', folder: 'nacos/general', public_id: 'nacos/general/resources' },
  { gitPath: 'apps/website/src/assets/upcoming.png', folder: 'nacos/general', public_id: 'nacos/general/upcoming' },
  { gitPath: 'apps/website/src/assets/admissions.jpg', folder: 'nacos/general', public_id: 'nacos/general/admissions' },
  { gitPath: 'apps/website/src/assets/single.png', folder: 'nacos/general', public_id: 'nacos/general/single' },
  { gitPath: 'apps/website/src/assets/double.png', folder: 'nacos/general', public_id: 'nacos/general/double' },
  { gitPath: 'apps/website/src/assets/triple.png', folder: 'nacos/general', public_id: 'nacos/general/triple' },
  { gitPath: 'apps/website/src/assets/academics.jpg', folder: 'nacos/general', public_id: 'nacos/general/academics' }
];

async function main() {
  console.log('=== UPLOADING EXTRA LOCAL ASSETS TO DESTINATION CLOUDINARY ===\n');

  const tempDir = path.resolve(__dirname, '..', '.temp_upload');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const newRecords = [];

  for (const item of uploadList) {
    try {
      const ext = path.extname(item.gitPath);
      const tempFile = path.join(tempDir, path.basename(item.gitPath));

      // Extract file from previous commit HEAD~1
      const fileBuffer = execSync(`git show HEAD~1:${item.gitPath}`);
      fs.writeFileSync(tempFile, fileBuffer);

      console.log(`Uploading ${item.gitPath} -> ${item.public_id}...`);
      const res = await cloudinary.uploader.upload(tempFile, {
        public_id: item.public_id,
        asset_folder: item.folder,
        display_name: path.basename(item.public_id),
        resource_type: 'image',
        overwrite: true
      });

      console.log(`  ✓ Uploaded: ${res.secure_url}`);
      newRecords.push({
        public_id: item.public_id,
        folder: item.folder,
        filename: path.basename(item.public_id),
        format: res.format,
        bytes: res.bytes,
        source_cloud: 'local_repository',
        source_url: `local://${item.gitPath}`,
        destination_cloud: env.DEST_CLOUDINARY_CLOUD_NAME,
        destination_url: res.secure_url,
        verified_destination: true
      });

      fs.unlinkSync(tempFile);
    } catch (err) {
      console.error(`  ✗ Error uploading ${item.gitPath}:`, err.message);
    }
  }

  // Remove temp dir
  if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);

  // Update matching manifest
  const manifestPath = path.resolve(__dirname, '..', 'supabase-migration', 'cloudinary_link_matching.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    // Merge new records without duplicates
    newRecords.forEach(nr => {
      const existingIdx = manifest.assets.findIndex(a => a.public_id === nr.public_id);
      if (existingIdx !== -1) {
        manifest.assets[existingIdx] = nr;
      } else {
        manifest.assets.push(nr);
      }
    });
    manifest.total_assets = manifest.assets.length;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✓ Updated manifest with new assets. Total assets now: ${manifest.total_assets}`);
  }

  console.log('\n=== ALL LOCAL ASSETS MOVED TO CLOUDINARY SUCCESSFULLY ===');
}

main().catch(console.error);
