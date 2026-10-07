const fs = require('fs');
const path = require('path');

const keep = new Set([
  'favicon.png',
  'logo.png',
  'logo-mark.png',
  'full-logo.png',
  'full-logo-dark.png',
  'full-logo-light.png',
  'upskill-full-logo.png',
  'upskill-logo-mark.png',
  'nacos-logo.svg',
  'vite.svg',
  'og-image.png',
  'nacos_id_template_back.jpg',
  'nacos_id_template_frame.png',
  'nacos_id_template_master.jpg'
]);

// 1. Files where image imports need to be replaced with empty strings
const codeReplacements = [
  {
    file: 'apps/website/src/pages/Gallery.jsx',
    replaceRegex: /import\s+(galleryDeptFront|galleryStudentGroup|galleryTraditionalDay|galleryNatureHangout|nacos\d+)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/components/Home/NacosSection.jsx',
    replaceRegex: /import\s+([a-zA-Z0-9_]+Img)\s+from\s+['"]\.\.\/\.\.\/assets\/executives\/[^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/components/Home/NewSlider.jsx',
    replaceRegex: /import\s+slide1\s+from\s+['"][^'"]+header\.jpg['"];?/g,
    replacer: () => `const slide1 = '';`
  },
  {
    file: 'apps/website/src/pages/Administration.jsx',
    replaceRegex: /import\s+(hodStanleyImg|staffAdviserImg)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/pages/Alumni.jsx',
    replaceRegex: /import\s+(alumniImage|departmentImage|benitaImg|godfirstImg)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/pages/YellowPages.jsx',
    replaceRegex: /import\s+(flyerPeacemaker|flyerNiforix|flyerCypher|flyerNinasBraid|laptopImg)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/pages/About.jsx',
    replaceRegex: /import\s+departmentImage\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const departmentImage = '';`
  },
  {
    file: 'apps/website/src/pages/Academics.jsx',
    replaceRegex: /import\s+academicsImage\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const academicsImage = '';`
  },
  {
    file: 'apps/website/src/pages/Admissions.jsx',
    replaceRegex: /import\s+admissionsImage\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const admissionsImage = '';`
  },
  {
    file: 'apps/website/src/pages/CampusClubs.jsx',
    replaceRegex: /import\s+(clubsImage|laptopImage)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/pages/Clubs.jsx',
    replaceRegex: /import\s+clubsImage\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const clubsImage = '';`
  },
  {
    file: 'apps/website/src/pages/Contact.jsx',
    replaceRegex: /import\s+contactImage\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const contactImage = '';`
  },
  {
    file: 'apps/website/src/pages/Home.jsx',
    replaceRegex: /import\s+alumniHomeImg\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const alumniHomeImg = '';`
  },
  {
    file: 'apps/website/src/pages/NacosExecutives.jsx',
    replaceRegex: /import\s+execGroupImg\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const execGroupImg = '';`
  },
  {
    file: 'apps/website/src/pages/Research.jsx',
    replaceRegex: /import\s+researchImageFallback\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const researchImageFallback = '';`
  },
  {
    file: 'apps/website/src/pages/Resources.jsx',
    replaceRegex: /import\s+(libraryShelfCloseup|libraryHero)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website/src/pages/SpiritualLife.jsx',
    replaceRegex: /import\s+headerImg\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const headerImg = '';`
  },
  {
    file: 'apps/website/src/pages/StudentLife.jsx',
    replaceRegex: /import\s+studentLifeImageFallback\s+from\s+['"][^'"]+['"];?/g,
    replacer: () => `const studentLifeImageFallback = '';`
  },
  {
    file: 'apps/upskill-hub/src/pages/ResourcesPage.jsx',
    replaceRegex: /import\s+(libraryShelfCloseup|libraryHero)\s+from\s+['"][^'"]+['"];?/g,
    replacer: (match, p1) => `const ${p1} = '';`
  },
  {
    file: 'apps/website-admin/src/pages/AdminLogin.jsx',
    replaceRegex: /import\s+studentPhoto\s+from\s+['"][^'"]+gallery_student_group\.jpg['"];?/g,
    replacer: () => `const studentPhoto = '';`
  },
  {
    file: 'apps/portal/src/pages/Login.jsx',
    replaceRegex: /import\s+studentPhoto\s+from\s+['"][^'"]+gallery_student_group\.jpg['"];?/g,
    replacer: () => `const studentPhoto = '';`
  },
  {
    file: 'apps/portal/src/pages/Register.jsx',
    replaceRegex: /import\s+studentPhoto\s+from\s+['"][^'"]+gallery_student_group\.jpg['"];?/g,
    replacer: () => `const studentPhoto = '';`
  },
  {
    file: 'apps/portal/src/pages/ForgotPassword.jsx',
    replaceRegex: /import\s+studentPhoto\s+from\s+['"][^'"]+gallery_student_group\.jpg['"];?/g,
    replacer: () => `const studentPhoto = '';`
  },
  {
    file: 'apps/portal-admin/src/pages/PortalAdminLogin.jsx',
    replaceRegex: /import\s+studentPhoto\s+from\s+['"][^'"]+gallery_student_group\.jpg['"];?/g,
    replacer: () => `const studentPhoto = '';`
  }
];

console.log('=== 1. UPDATING CODE IMPORT STATEMENTS ===');
codeReplacements.forEach(({ file, replaceRegex, replacer }) => {
  const fullPath = path.resolve(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf-8');
  if (replaceRegex.test(content)) {
    content = content.replace(replaceRegex, replacer);
    fs.writeFileSync(fullPath, content);
    console.log(`✓ Updated imports in: ${file}`);
  }
});

// 2. Identify and delete non-branding images
console.log('\n=== 2. DELETING NON-BRANDING ASSET FILES ===');

const assetDirs = [
  'apps/website/src/assets',
  'apps/upskill-hub/src/assets',
  'apps/website-admin/src/assets',
  'apps/portal/src/assets',
  'apps/portal-admin/src/assets'
];

let deletedCount = 0;

function cleanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      cleanDir(full);
      // Remove empty directory
      try {
        if (fs.readdirSync(full).length === 0) {
          fs.rmdirSync(full);
          console.log(`  Removed empty directory: ${full}`);
        }
      } catch (e) {}
    } else {
      if (!keep.has(entry.name.toLowerCase())) {
        fs.unlinkSync(full);
        deletedCount++;
        console.log(`  Deleted: ${entry.name}`);
      }
    }
  }
}

assetDirs.forEach(cleanDir);
console.log(`\n✓ Total asset files deleted: ${deletedCount}`);
