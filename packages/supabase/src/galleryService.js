/**
 * galleryService.js
 * Centralized service for NACOS FUTO Website Gallery.
 * Synchronizes between Supabase `website_gallery` table, local storage, and Cloudinary media assets.
 */

import { supabase, isSupabaseConfigured } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { recordAdminAction } from './adminAuth.js';
import { CLOUDINARY_FOLDERS } from '@nacos/media';

export const GALLERY_STORAGE_KEY = 'nacos_website_gallery_store';

export const INITIAL_GALLERY = [];

function normalizeItem(item) {
  return {
    ...item,
    src: item.image_url || item.src,
    image_url: item.image_url || item.src,
    publicId: item.cloudinary_public_id || item.publicId,
    cloudinary_public_id: item.cloudinary_public_id || item.publicId,
    title: item.title || item.caption?.slice(0, 50) || 'Campus Moment',
    caption: item.caption || item.title || 'Campus Moment'
  };
}

/**
 * Get current gallery items from local storage with fallback to INITIAL_GALLERY
 */
export function getGalleryItems() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];

    if (!list || !Array.isArray(list)) {
      list = [];
    }

    return list.map(normalizeItem);
  } catch (err) {
    console.warn('Error reading gallery storage:', err);
    return [];
  }
}

export function saveLocalGalleryItems(items) {
  if (typeof window === 'undefined') return;
  const normalized = items.map(normalizeItem);
  localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('nacos_website_gallery_updated'));
}

/**
 * Fetch gallery items from Supabase `website_gallery` with local storage fallback
 */
export async function fetchGalleryFromSupabase() {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    if (supabase) {
      // 1. Authoritative check on live Supabase store_gallery row
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_gallery')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveLocalGalleryItems(parsed);
            return parsed;
          }
        } catch (e) {}
      }

      // 2. Fetch from media_assets where category = 'gallery' (universal multi-device sync)
      const { data: mediaItems, error: mediaError } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'gallery')
        .order('created_at', { ascending: false });

      if (!mediaError && mediaItems && mediaItems.length > 0) {
        const parsedItems = [];
        for (const m of mediaItems) {
          try {
            if (m.image_alt && m.image_alt.startsWith('{')) {
              const obj = JSON.parse(m.image_alt);
              parsedItems.push(normalizeItem({
                ...obj,
                id: obj.id || m.entity_id || m.id,
                image_url: m.image_url || obj.image_url,
                cloudinary_public_id: m.cloudinary_public_id || obj.cloudinary_public_id
              }));
            } else {
              parsedItems.push(normalizeItem({
                id: m.entity_id || m.id,
                title: m.image_alt || 'NACOS Gallery',
                caption: m.image_alt || '',
                image_url: m.image_url,
                cloudinary_public_id: m.cloudinary_public_id,
                category: 'Campus Life',
                is_featured: false,
                created_at: m.created_at
              }));
            }
          } catch (e) {}
        }

        if (parsedItems.length > 0) {
          const remoteIds = new Set(parsedItems.map(p => p.cloudinary_public_id || p.id));
          const localInitials = INITIAL_GALLERY.map(normalizeItem).filter(l => !remoteIds.has(l.cloudinary_public_id || l.id));
          const merged = [...parsedItems, ...localInitials];

          saveLocalGalleryItems(merged);
          return merged;
        }
      }

      // 3. Fallback to website_gallery table
      const { data, error } = await supabase
        .from('website_gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(d => normalizeItem({
          id: d.id,
          title: d.title,
          caption: d.caption,
          image_url: d.image_url,
          cloudinary_public_id: d.cloudinary_public_id,
          category: d.category || 'Campus Life',
          is_featured: Boolean(d.is_featured),
          sort_order: d.sort_order || 0,
          created_at: d.created_at
        }));

        const local = getGalleryItems();
        const remoteIds = new Set(mapped.map(m => m.cloudinary_public_id || m.id));
        const merged = [...mapped, ...local.filter(l => !remoteIds.has(l.cloudinary_public_id || l.id))];

        saveLocalGalleryItems(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Supabase gallery fetch error, using local storage:', err);
  }

  return getGalleryItems();
}

export async function saveGalleryItem(itemData) {
  let current = getGalleryItems();
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_gallery')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const remoteIds = new Set(parsed.map(i => i.id));
          current = [...parsed, ...current.filter(c => !remoteIds.has(c.id))];
        }
      }
    } catch (e) {}
  }

  const id = itemData.id || `gal-${Date.now()}`;
  const now = new Date().toISOString();

  const normalized = normalizeItem({
    ...itemData,
    id,
    created_at: itemData.created_at || now,
    updated_at: now
  });

  const existingIdx = current.findIndex(i => i.id === id || (normalized.cloudinary_public_id && i.cloudinary_public_id === normalized.cloudinary_public_id));
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...normalized };
  } else {
    updated = [normalized, ...current];
  }

  saveLocalGalleryItems(updated);

  // 1. Authoritative fast live sync to Supabase website_gallery table
  if (supabase) {
    try {
      const payload = {
        image_url: normalized.image_url,
        title: normalized.title,
        caption: normalized.caption,
        category: normalized.category || 'campus-life',
        featured: Boolean(normalized.is_featured),
        updated_at: now
      };
      if (normalized.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized.id)) {
        payload.id = normalized.id;
      }
      await supabase.from('website_gallery').upsert(payload);
    } catch (err) {
      console.warn('website_gallery direct save warning:', err);
    }
  }

  // 2. Fallback key-value sync for multi-device compatibility
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_gallery',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  return normalized;
}

/**
 * Delete a gallery item from local storage, Supabase, and Cloudinary
 */
export async function deleteGalleryItem(item) {
  let current = getGalleryItems();
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_gallery')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          current = parsed;
        }
      }
    } catch (e) {}
  }

  const targetId = typeof item === 'string' ? item : item?.id;
  const targetPublicId = typeof item === 'object' ? item?.cloudinary_public_id : null;

  const updated = current.filter(i => {
    if (targetId && i.id === targetId) return false;
    if (targetPublicId && i.cloudinary_public_id === targetPublicId) return false;
    return true;
  });

  saveLocalGalleryItems(updated);

  // Authoritative live sync to Supabase store_gallery
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_gallery',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });

      if (targetPublicId) {
        await supabase.from('media_assets').delete().eq('cloudinary_public_id', targetPublicId);
        await supabase.from('website_gallery').delete().eq('cloudinary_public_id', targetPublicId);
      }
    }
  } catch (err) {
    console.warn('Supabase store_gallery delete error:', err);
  }

  // Remote delete
  const pubId = targetPublicId || (current.find(i => i.id === targetId)?.cloudinary_public_id);
  try {
    if (supabase) {
      if (pubId) await supabase.from('media_assets').delete().eq('cloudinary_public_id', pubId);
      if (targetId) await supabase.from('media_assets').delete().eq('entity_id', targetId);
    }
  } catch (e) {
    console.warn('Universal media delete error:', e);
  }

  if (pubId) {
    try {
      await deleteMediaAsset(pubId);
    } catch (e) {
      console.warn('Cloudinary delete notice:', e);
    }
  }

  try {
    if (supabase) {
      if (pubId) {
        await supabase.from('website_gallery').delete().eq('cloudinary_public_id', pubId);
      }
      if (targetId && !targetId.startsWith('gal-')) {
        await supabase.from('website_gallery').delete().eq('id', targetId);
      }
    }
  } catch (err) {
    console.warn('Supabase delete notice:', err);
  }

  return updated;
}

/**
 * Toggle featured state
 */
export async function toggleGalleryFeatured(id) {
  const current = getGalleryItems();
  let nextFeatured = false;
  let targetPublicId = null;

  const updated = current.map(item => {
    if (item.id === id) {
      nextFeatured = !item.is_featured;
      targetPublicId = item.cloudinary_public_id;
      return { ...item, is_featured: nextFeatured };
    }
    return item;
  });

  saveLocalGalleryItems(updated);

  // Authoritative live sync to Supabase store_gallery
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_gallery',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_gallery toggle featured error:', err);
  }

  if (targetPublicId) {
    try {
      recordAdminAction('gallery_feature_toggle', 'gallery', targetPublicId, { is_featured: nextFeatured });
      if (supabase) {
        await supabase.from('website_gallery').update({ is_featured: nextFeatured }).eq('cloudinary_public_id', targetPublicId);
      }
    } catch (err) {
      console.warn('Supabase feature toggle notice:', err);
    }
  }

  return updated;
}
