import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const websiteDist = path.join(rootDir, 'apps', 'website', 'dist');
const websiteAdminDist = path.join(rootDir, 'apps', 'website-admin', 'dist');
const portalDist = path.join(rootDir, 'apps', 'portal', 'dist');
const portalAdminDist = path.join(rootDir, 'apps', 'portal-admin', 'dist');
const upskillHubDist = path.join(rootDir, 'apps', 'upskill-hub', 'dist');
const electraDist = path.join(rootDir, 'apps', 'electra', 'dist');
const electraAdminDist = path.join(rootDir, 'apps', 'electra-admin', 'dist');

const targetDist = path.join(rootDir, 'dist');
const targetWebsiteAdminDist = path.join(targetDist, 'admin');
const targetPortalDist = path.join(targetDist, 'portal');
const targetPortalAdminDist = path.join(targetDist, 'portal-admin');
const targetUpskillHubDist = path.join(targetDist, 'upskill-hub');
const targetElectraDist = path.join(targetDist, 'electra');
const targetElectraAdminDist = path.join(targetDist, 'electra-admin');
const targetAssetsDist = path.join(targetDist, 'assets');

console.log('[bundle-dist] Preparing unified root dist directory for all 7 applications...');

// Clean existing root dist if present
if (fs.existsSync(targetDist)) {
  fs.rmSync(targetDist, { recursive: true, force: true });
}

fs.mkdirSync(targetDist, { recursive: true });

// Helper to copy assets to root assets directory as safe fallback
function copyAssetsToRoot(sourceDir, label) {
  const assetsDir = path.join(sourceDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    fs.mkdirSync(targetAssetsDist, { recursive: true });
    fs.cpSync(assetsDir, targetAssetsDist, { recursive: true });
    console.log(`[bundle-dist] Copied ${label} assets to root /assets`);
  }
}

// 1. Copy website dist into root dist
if (fs.existsSync(websiteDist)) {
  console.log('[bundle-dist] 1/5 Copying apps/website/dist -> dist (Main Website)...');
  fs.cpSync(websiteDist, targetDist, { recursive: true });
} else {
  console.warn('[bundle-dist] Warning: apps/website/dist was not found.');
}

// 2. Copy website admin dist into dist/admin
if (fs.existsSync(websiteAdminDist)) {
  console.log('[bundle-dist] 2/5 Copying apps/website-admin/dist -> dist/admin (Website Admin)...');
  fs.mkdirSync(targetWebsiteAdminDist, { recursive: true });
  fs.cpSync(websiteAdminDist, targetWebsiteAdminDist, { recursive: true });
  copyAssetsToRoot(websiteAdminDist, 'website-admin');
} else {
  console.warn('[bundle-dist] Warning: apps/website-admin/dist was not found.');
}

// 3. Copy student portal dist into dist/portal
if (fs.existsSync(portalDist)) {
  console.log('[bundle-dist] 3/5 Copying apps/portal/dist -> dist/portal (Student Portal)...');
  fs.mkdirSync(targetPortalDist, { recursive: true });
  fs.cpSync(portalDist, targetPortalDist, { recursive: true });
  copyAssetsToRoot(portalDist, 'portal');

  const portalIndex = path.join(portalDist, 'index.html');
  if (fs.existsSync(portalIndex)) {
    fs.copyFileSync(portalIndex, path.join(targetDist, 'portal.html'));
  }
} else {
  console.warn('[bundle-dist] Warning: apps/portal/dist was not found.');
}

// 4. Copy portal admin dist into dist/portal-admin
if (fs.existsSync(portalAdminDist)) {
  console.log('[bundle-dist] 4/5 Copying apps/portal-admin/dist -> dist/portal-admin (Portal Admin)...');
  fs.mkdirSync(targetPortalAdminDist, { recursive: true });
  fs.cpSync(portalAdminDist, targetPortalAdminDist, { recursive: true });
  copyAssetsToRoot(portalAdminDist, 'portal-admin');
} else {
  console.warn('[bundle-dist] Warning: apps/portal-admin/dist was not found.');
}

// 5. Copy upskill hub dist into dist/upskill-hub
if (fs.existsSync(upskillHubDist)) {
  console.log('[bundle-dist] 5/7 Copying apps/upskill-hub/dist -> dist/upskill-hub (Upskill Hub)...');
  fs.mkdirSync(targetUpskillHubDist, { recursive: true });
  fs.cpSync(upskillHubDist, targetUpskillHubDist, { recursive: true });
  copyAssetsToRoot(upskillHubDist, 'upskill-hub');

  const upskillIndex = path.join(upskillHubDist, 'index.html');
  if (fs.existsSync(upskillIndex)) {
    fs.copyFileSync(upskillIndex, path.join(targetDist, 'upskill-hub.html'));
  }
} else {
  console.warn('[bundle-dist] Warning: apps/upskill-hub/dist was not found.');
}

// 6. Copy electra voter portal dist into dist/electra
if (fs.existsSync(electraDist)) {
  console.log('[bundle-dist] 6/7 Copying apps/electra/dist -> dist/electra (ELECTRA Voter Portal)...');
  fs.mkdirSync(targetElectraDist, { recursive: true });
  fs.cpSync(electraDist, targetElectraDist, { recursive: true });
  copyAssetsToRoot(electraDist, 'electra');

  const electraIndex = path.join(electraDist, 'index.html');
  if (fs.existsSync(electraIndex)) {
    fs.copyFileSync(electraIndex, path.join(targetDist, 'electra.html'));
  }
} else {
  console.warn('[bundle-dist] Warning: apps/electra/dist was not found.');
}

// 7. Copy electra admin commission dist into dist/electra-admin
if (fs.existsSync(electraAdminDist)) {
  console.log('[bundle-dist] 7/7 Copying apps/electra-admin/dist -> dist/electra-admin (ELECTRA Commission Admin)...');
  fs.mkdirSync(targetElectraAdminDist, { recursive: true });
  fs.cpSync(electraAdminDist, targetElectraAdminDist, { recursive: true });
  copyAssetsToRoot(electraAdminDist, 'electra-admin');

  const electraAdminIndex = path.join(electraAdminDist, 'index.html');
  if (fs.existsSync(electraAdminIndex)) {
    fs.copyFileSync(electraAdminIndex, path.join(targetDist, 'electra-admin.html'));
  }
} else {
  console.warn('[bundle-dist] Warning: apps/electra-admin/dist was not found.');
}

console.log('[bundle-dist] Successfully assembled unified output directory at ./dist');
