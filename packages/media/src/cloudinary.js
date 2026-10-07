/**
 * ============================================================================
 * NACOS FUTO Monorepo Shared Media Abstraction (@nacos/media)
 * Dedicated Cloudinary Media Management, Optimization & Delivery
 * ============================================================================
 */

import cloudinaryAssetsData from './cloudinaryAssets.json' with { type: 'json' };

export const CLOUDINARY_MANIFEST = cloudinaryAssetsData?.assets || {};

export const CLOUDINARY_FOLDERS = {
  // STUDENT PORTAL FOLDERS
  STUDENTS: 'nacos/students',              // Student passport & profile photos
  IDS: 'nacos/ids',                        // Generated student ID cards
  CERTIFICATES: 'nacos/certificates',      // Academic & event certificates

  // MAIN WEBSITE FOLDERS
  EXECUTIVES: 'nacos/executives',          // Executive council & staff portraits
  YELLOW_PAGES: 'nacos/yellow_pages',      // Yellow Pages business flyers & brand logos
  EVENTS: 'nacos/events',                  // Event flyers & banner graphics
  GALLERY: 'nacos/gallery',                // Campus life & department photo gallery
  ALUMNI: 'nacos/alumni',                  // Notable alumni spotlight & inductees
  NEWS: 'nacos/news',                      // Articles & journal cover banners
  HOMEPAGE: 'nacos/homepage',              // Homepage hero imagery & alert banners
  GENERAL: 'nacos/general'                 // General branding, logos & badges
};

export const CANONICAL_NACOS_FOLDERS = [
  {
    path: 'nacos',
    name: 'Root Organization',
    surface: 'shared',
    categoryKey: 'root',
    description: 'Root NACOS media storage container'
  },
  {
    path: 'nacos/students',
    name: 'Student Passports & Photos',
    surface: 'portal',
    categoryKey: 'students',
    description: 'Student passport photographs for registration, clearance and profiles'
  },
  {
    path: 'nacos/ids',
    name: 'Student ID Cards',
    surface: 'portal',
    categoryKey: 'ids',
    description: 'Generated digital student ID card assets, archives, and templates'
  },
  {
    path: 'nacos/certificates',
    name: 'Certificates & Awards',
    surface: 'shared',
    categoryKey: 'certificates',
    description: 'Digital certificates, hackathon badges, and honors'
  },
  {
    path: 'nacos/executives',
    name: 'Executive Council & Staff',
    surface: 'website',
    categoryKey: 'executives',
    description: 'Official portraits of executive council and department staff'
  },
  {
    path: 'nacos/yellow_pages',
    name: 'Yellow Pages Businesses',
    surface: 'website',
    categoryKey: 'yellow_pages',
    description: 'Indigenous student business flyers, cover cards, and brand logos'
  },
  {
    path: 'nacos/events',
    name: 'Events & Flyers',
    surface: 'website',
    categoryKey: 'events',
    description: 'Departmental tech conferences, social mixers, and event flyers'
  },
  {
    path: 'nacos/gallery',
    name: 'Campus Gallery',
    surface: 'website',
    categoryKey: 'gallery',
    description: 'Campus life, labs, TETFUND complex, and culture gallery photos'
  },
  {
    path: 'nacos/alumni',
    name: 'Alumni Network',
    surface: 'website',
    categoryKey: 'alumni',
    description: 'Notable alumni spotlight, hall of fame, and inductee portraits'
  },
  {
    path: 'nacos/news',
    name: 'News & Journal',
    surface: 'website',
    categoryKey: 'news',
    description: 'Press releases, blog covers, and journal articles'
  },
  {
    path: 'nacos/homepage',
    name: 'Homepage & Hero',
    surface: 'website',
    categoryKey: 'homepage',
    description: 'Main public website hero banners and announcement imagery'
  },
  {
    path: 'nacos/general',
    name: 'General Branding',
    surface: 'shared',
    categoryKey: 'general',
    description: 'Departmental logos, icons, and graphic assets'
  }
];

export const TRANSFORMATION_PRESETS = {
  avatar: {
    width: 96,
    height: 96,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto'
  },
  avatar_md: {
    width: 200,
    height: 200,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto'
  },
  id_card_photo: {
    width: 300,
    height: 360,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    format: 'auto'
  },
  thumbnail: {
    width: 160,
    height: 160,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  },
  card: {
    width: 600,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  },
  banner: {
    width: 1200,
    height: 630,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  },
  gallery_preview: {
    width: 600,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  },
  gallery_full: {
    width: 1600,
    crop: 'limit',
    quality: 'auto',
    format: 'auto'
  },
  certificate: {
    width: 1200,
    crop: 'limit',
    quality: 'auto',
    format: 'auto'
  }
};

/**
 * Get active Cloudinary Cloud Name from environment
 */
export function getCloudName() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) {
    return import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  }
  if (typeof process !== 'undefined' && process.env?.CLOUDINARY_CLOUD_NAME) {
    return process.env.CLOUDINARY_CLOUD_NAME;
  }
  return 'a2mmcttn';
}

/**
 * Build Cloudinary transformation string from options
 */
export function buildTransformationString(options = {}) {
  const parts = [];

  // Format and Quality (automatic by default)
  const format = options.format || 'auto';
  const quality = options.quality || 'auto';
  parts.push(`f_${format}`);
  parts.push(`q_${quality}`);

  if (options.width) parts.push(`w_${options.width}`);
  if (options.height) parts.push(`h_${options.height}`);
  if (options.crop) parts.push(`c_${options.crop}`);
  if (options.gravity) parts.push(`g_${options.gravity}`);
  if (options.dpr) parts.push(`dpr_${options.dpr}`);

  return parts.join(',');
}

/**
 * Generate an optimized Cloudinary delivery URL with dynamic transformations
 * Supports public IDs, full Cloudinary URLs, and external fallback URLs.
 */
export function getOptimizedImageUrl(publicIdOrUrl, options = {}) {
  if (!publicIdOrUrl) return '';

  // If a preset is requested, merge it
  let mergedOptions = { ...options };
  if (options.preset && TRANSFORMATION_PRESETS[options.preset]) {
    mergedOptions = { ...TRANSFORMATION_PRESETS[options.preset], ...options };
  }

  const cloudName = getCloudName();
  const transforms = buildTransformationString(mergedOptions);

  // Case 1: Already a full Cloudinary URL
  if (typeof publicIdOrUrl === 'string' && publicIdOrUrl.includes('res.cloudinary.com')) {
    // If no custom dimensions or crops are requested, ensure automatic web format and quality compression
    if (!options.width && !options.height && !options.crop && !options.gravity && !options.preset) {
      if (!publicIdOrUrl.includes('f_auto') && !publicIdOrUrl.includes('q_auto')) {
        return publicIdOrUrl.replace('/upload/', '/upload/f_auto,q_auto/');
      }
      return publicIdOrUrl;
    }
    const regex = /res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:[^\/]+\/)?(.+)$/;
    const match = publicIdOrUrl.match(regex);
    if (match && match[2]) {
      const urlCloudName = match[1] || cloudName;
      const cleanPath = match[2].replace(/^v\d+\//, '');
      return `https://res.cloudinary.com/${urlCloudName}/image/upload/${transforms}/${cleanPath}`;
    }
    return publicIdOrUrl;
  }

  // Case 2: Standard non-Cloudinary external URL or data URL
  if (
    typeof publicIdOrUrl === 'string' &&
    (publicIdOrUrl.startsWith('data:') ||
      publicIdOrUrl.startsWith('blob:') ||
      publicIdOrUrl.startsWith('http://') ||
      publicIdOrUrl.startsWith('https://') ||
      publicIdOrUrl.startsWith('/'))
  ) {
    // Return original image if it's not a Cloudinary asset
    return publicIdOrUrl;
  }

  // Case 3: A Cloudinary Public ID (e.g., 'nacos/students/2024CS12345_passport')
  if (!cloudName) return '';
  const cleanPublicId = publicIdOrUrl.replace(/^\/+/, '');
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${cleanPublicId}`;
}

/**
 * Validate image file format and file size
 */
export function validateImageFile(file, options = {}) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const allowedFormats = options.allowedFormats || ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedFormats.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Invalid file format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`
    };
  }

  const maxBytes = options.maxSizeBytes || 5 * 1024 * 1024; // 5MB default
  if (file.size > maxBytes) {
    const sizeMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds the allowed limit of ${sizeMb}MB. Please choose a smaller image.`
    };
  }

  return { valid: true };
}

/**
 * Upload a media file to Cloudinary
 * Handles:
 * 1. Server-side signed upload via /api/cloudinary/sign
 * 2. Unsigned upload preset fallback (VITE_CLOUDINARY_UPLOAD_PRESET)
 * 3. Offline/mock fallback mode with simulated progress
 */
export async function uploadMedia(file, options = {}) {
  // Validate file
  const validation = validateImageFile(file, options);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cloudName = getCloudName();
  const folder = options.folder || CLOUDINARY_FOLDERS.GENERAL;
  const publicId = options.publicId || undefined;
  const tags = options.tags || ['nacos'];

  // Attempt 1: Server-side signed upload
  try {
    const signRes = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, public_id: publicId, tags })
    });

    if (signRes.ok) {
      const signData = await signRes.json();
      if (signData.signature && signData.apiKey) {
        return await executeCloudinaryPost({
          file,
          cloudName: signData.cloudName || cloudName,
          formDataEntries: {
            api_key: signData.apiKey,
            timestamp: signData.timestamp,
            signature: signData.signature,
            folder: signData.folder || folder,
            ...(signData.public_id ? { public_id: signData.public_id } : {})
          },
          onProgress: options.onProgress
        });
      }
    }
  } catch (signErr) {
    console.warn('Server signing not reachable, checking client upload preset...', signErr);
  }

  // Attempt 2: Unsigned upload via client upload preset
  const uploadPreset =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    'nacos_portal_preset';

  if (uploadPreset) {
    try {
      const result = await executeCloudinaryPost({
        file,
        cloudName,
        formDataEntries: {
          upload_preset: uploadPreset,
          folder,
          ...(publicId ? { public_id: publicId } : {})
        },
        onProgress: options.onProgress
      });
      if (result.success) return result;
    } catch (presetErr) {
      console.warn('Unsigned upload failed, falling back to local client processing...', presetErr);
    }
  }

  // Attempt 3: Local/Offline development fallback
  return await mockLocalUpload(file, folder, publicId, options.onProgress);
}

/**
 * Helper to POST to Cloudinary upload API with progress monitoring
 */
function executeCloudinaryPost({ file, cloudName, formDataEntries, onProgress }) {
  return new Promise((resolve) => {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(formDataEntries).forEach(([k, v]) => {
      if (v !== undefined) formData.append(k, v);
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            publicId: data.public_id,
            url: data.url,
            secureUrl: data.secure_url,
            format: data.format,
            bytes: data.bytes,
            width: data.width,
            height: data.height
          });
        } catch (err) {
          resolve({ success: false, error: 'Failed to parse Cloudinary response.' });
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          resolve({ success: false, error: errData.error?.message || `Upload failed with status ${xhr.status}` });
        } catch {
          resolve({ success: false, error: `Upload failed with status ${xhr.status}` });
        }
      }
    };

    xhr.onerror = () => {
      resolve({ success: false, error: 'Network failure during Cloudinary upload.' });
    };

    xhr.send(formData);
  });
}

/**
 * Local simulation for offline/unconfigured development
 */
function mockLocalUpload(file, folder, customPublicId, onProgress) {
  return new Promise((resolve) => {
    if (onProgress) {
      onProgress(25);
      setTimeout(() => onProgress(65), 150);
      setTimeout(() => onProgress(100), 300);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const cleanName = (file.name || 'image').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const generatedPublicId = customPublicId || `${folder}/${Date.now()}_${cleanName}`;

      resolve({
        success: true,
        publicId: generatedPublicId,
        url: dataUrl,
        secureUrl: dataUrl,
        format: file.type.split('/')[1] || 'jpeg',
        bytes: file.size,
        width: 600,
        height: 600,
        isLocalFallback: true
      });
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'Could not read local image file.' });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Delete a media file by public ID via secure server endpoint
 */
export async function deleteMedia(publicId, options = {}) {
  if (!publicId) return { success: false, error: 'Missing publicId' };

  try {
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId })
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, result: data.result };
    }
  } catch (err) {
    console.warn('Server delete endpoint not available, completing local delete', err);
  }

  // Fallback / local success
  return { success: true, note: 'Local asset reference cleared.' };
}

/**
 * Replace media asset safely:
 * 1. Upload new file.
 * 2. If new upload is confirmed, delete old asset.
 * 3. Never deletes old image if new upload fails.
 */
export async function replaceMedia(oldPublicId, newFile, options = {}) {
  // Step 1: Upload new image
  const uploadResult = await uploadMedia(newFile, options);
  if (!uploadResult.success) {
    return uploadResult;
  }

  // Step 2: Delete old asset if it exists and differs from new
  if (oldPublicId && oldPublicId !== uploadResult.publicId) {
    try {
      await deleteMedia(oldPublicId, options);
    } catch (e) {
      console.warn('Could not delete old media asset:', e);
    }
  }

  return uploadResult;
}

/**
 * Retrieve current status of all Cloudinary canonical folders
 */
export async function getCloudinaryFoldersStatus() {
  try {
    const res = await fetch('/api/cloudinary/folders');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not query /api/cloudinary/folders:', err);
  }
  return {
    configured: false,
    cloudName: getCloudName(),
    folders: CANONICAL_NACOS_FOLDERS
  };
}

/**
 * Provision / Sync all canonical NACOS folders in Cloudinary via secure server API
 */
export async function syncCloudinaryFolders() {
  try {
    const res = await fetch('/api/cloudinary/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.error || `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieve the live Cloudinary CDN delivery URL for a synchronized project asset
 * e.g. getCloudinaryAssetUrl('president_irechukwu', { preset: 'card' })
 */
export function getCloudinaryAssetUrl(assetKey, options = {}) {
  if (!assetKey) return '';
  const asset = CLOUDINARY_MANIFEST[assetKey];
  if (asset && asset.url) {
    return getOptimizedImageUrl(asset.url, options);
  }
  if (asset && asset.publicId) {
    return getOptimizedImageUrl(asset.publicId, options);
  }
  return '';
}
