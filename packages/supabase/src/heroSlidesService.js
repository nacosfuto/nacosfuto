/**
 * heroSlidesService.js
 * Centralized service for NACOS FUTO Website Homepage Hero Carousel.
 * Sourced directly from Supabase (`website_hero_slides` table and `id_card_settings`),
 * Cloudinary CDN media delivery, and real-time state synchronization.
 * Zero hardcoded mock data.
 */

import { supabase, isSupabaseConfigured } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { recordAdminAction } from './adminAuth.js';
import { CLOUDINARY_FOLDERS, getOptimizedImageUrl } from '@nacos/media';

export const HERO_SLIDES_STORAGE_KEY = 'nacos_website_hero_slides_store';
export const HERO_SLIDES_EVENT = 'nacos_website_hero_slides_updated';

/**
 * Normalizes slide record to ensure complete, consistent schema
 */
export function normalizeSlide(item = {}) {
  const imageUrl = item.image_url || item.url || item.src || '';
  const publicId = item.cloudinary_public_id || item.publicId || item.public_id || '';
  
  return {
    id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `slide_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    image_url: imageUrl,
    cloudinary_public_id: publicId,
    title: item.title || item.internal_title || '',
    heading: item.heading || '',
    subtext: item.subtext || item.description || '',
    cta_text: item.cta_text || item.button_text || '',
    cta_link: item.cta_link || item.cta_url || item.button_link || '',
    display_order: typeof item.display_order === 'number' ? item.display_order : 0,
    is_published: item.is_published !== undefined ? Boolean(item.is_published) : true,
    image_position: item.image_position || 'center 35%',
    created_by: item.created_by || null,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  };
}

/**
 * Get current slides from local cache
 */
export function getLocalHeroSlides() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HERO_SLIDES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSlide) : [];
  } catch (err) {
    console.warn('Error reading hero slides from local cache:', err);
    return [];
  }
}

/**
 * Save slides to local cache and notify listeners
 */
export function saveLocalHeroSlides(slides) {
  if (typeof window === 'undefined') return;
  try {
    const normalized = (slides || []).map(normalizeSlide);
    localStorage.setItem(HERO_SLIDES_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(HERO_SLIDES_EVENT, { detail: normalized }));
  } catch (err) {
    console.warn('Error saving hero slides to local cache:', err);
  }
}

/**
 * Fetch all hero slides from Supabase (with multi-tier fallback & local cache synchronization)
 * @param {Object} [options]
 * @param {boolean} [options.publishedOnly=false]
 */
export async function fetchHeroSlides(options = {}) {
  const { publishedOnly = false } = options;

  let remoteSlides = null;

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Direct query on public.website_hero_slides table
      let query = supabase
        .from('website_hero_slides')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (publishedOnly) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        remoteSlides = data.map(normalizeSlide);
      }
    } catch (tblErr) {
      // Table might not exist yet; proceed to synchronized store
    }

    // 2. Synchronized store in id_card_settings ('store_hero_slides')
    if (!remoteSlides) {
      try {
        const { data: storeRow, error: storeErr } = await supabase
          .from('id_card_settings')
          .select('academic_session, payload')
          .eq('id', 'store_hero_slides')
          .maybeSingle();

        if (!storeErr && storeRow) {
          const rawContent = storeRow.academic_session || (storeRow.payload ? JSON.stringify(storeRow.payload) : null);
          if (rawContent) {
            const parsed = JSON.parse(rawContent);
            if (Array.isArray(parsed)) {
              let list = parsed.map(normalizeSlide);
              if (publishedOnly) {
                list = list.filter(s => s.is_published);
              }
              list.sort((a, b) => (a.display_order - b.display_order) || new Date(a.created_at) - new Date(b.created_at));
              remoteSlides = list;
            }
          }
        }
      } catch (storeErr) {
        console.warn('Supabase store_hero_slides fetch error:', storeErr);
      }
    }
  }

  // If remote records found, update local cache and return
  if (remoteSlides !== null) {
    if (!publishedOnly) {
      saveLocalHeroSlides(remoteSlides);
    }
    return remoteSlides;
  }

  // Fallback to local cache
  const local = getLocalHeroSlides();
  const filtered = publishedOnly ? local.filter(s => s.is_published) : local;
  filtered.sort((a, b) => (a.display_order - b.display_order) || new Date(a.created_at) - new Date(b.created_at));
  return filtered;
}

/**
 * Fetch only published hero slides for the public website
 */
export async function fetchPublishedHeroSlides() {
  return await fetchHeroSlides({ publishedOnly: true });
}

/**
 * Save (create or update) a hero slide across Supabase and local cache
 */
export async function saveHeroSlide(slideData) {
  const current = getLocalHeroSlides();
  const isNew = !slideData.id || !current.some(s => s.id === slideData.id);

  // If new slide and display_order not specified, place at end
  let displayOrder = slideData.display_order;
  if (displayOrder === undefined || displayOrder === null) {
    const maxOrder = current.reduce((max, s) => Math.max(max, s.display_order || 0), -1);
    displayOrder = maxOrder + 1;
  }

  const normalized = normalizeSlide({
    ...slideData,
    display_order: displayOrder,
    updated_at: new Date().toISOString()
  });

  // Update in local array
  let updated;
  if (isNew) {
    updated = [...current, normalized];
  } else {
    updated = current.map(s => (s.id === normalized.id ? { ...s, ...normalized } : s));
  }

  // Sort and re-index orders cleanly
  updated.sort((a, b) => (a.display_order - b.display_order) || new Date(a.created_at) - new Date(b.created_at));
  saveLocalHeroSlides(updated);

  // 1. Authoritative write to Supabase `website_hero_slides`
  if (isSupabaseConfigured && supabase) {
    try {
      const payload = {
        id: normalized.id,
        image_url: normalized.image_url,
        cloudinary_public_id: normalized.cloudinary_public_id || null,
        title: normalized.title || null,
        heading: normalized.heading || null,
        subtext: normalized.subtext || null,
        cta_text: normalized.cta_text || null,
        cta_link: normalized.cta_link || null,
        display_order: normalized.display_order,
        is_published: normalized.is_published,
        image_position: normalized.image_position,
        created_by: normalized.created_by || null,
        updated_at: normalized.updated_at
      };

      await supabase.from('website_hero_slides').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase website_hero_slides upsert warning:', e);
    }

    // 2. Dual sync to id_card_settings ('store_hero_slides')
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_hero_slides',
        academic_session: JSON.stringify(updated),
        updated_at: normalized.updated_at
      });
    } catch (e) {
      console.warn('Supabase store_hero_slides sync warning:', e);
    }

    // 3. Sync image to shared media registry
    if (normalized.cloudinary_public_id && normalized.image_url) {
      try {
        await syncMediaAsset({
          publicId: normalized.cloudinary_public_id,
          url: normalized.image_url,
          folder: CLOUDINARY_FOLDERS.HOMEPAGE,
          category: 'homepage',
          entity_type: 'hero_slide',
          entity_id: normalized.id,
          image_alt: normalized.title || normalized.heading || 'Homepage Hero Slide'
        });
      } catch (e) {
        console.warn('Shared media asset sync warning:', e);
      }
    }
  }

  // 4. Audit logging
  try {
    await recordAdminAction(
      isNew ? 'hero_slide_created' : 'hero_slide_updated',
      'hero_carousel',
      normalized.id,
      {
        title: normalized.title,
        heading: normalized.heading,
        is_published: normalized.is_published,
        display_order: normalized.display_order
      }
    );
  } catch (e) {}

  return normalized;
}

/**
 * Delete a hero slide
 */
export async function deleteHeroSlide(idOrItem, options = {}) {
  const current = getLocalHeroSlides();
  const targetId = typeof idOrItem === 'string' ? idOrItem : idOrItem?.id;
  const targetSlide = current.find(s => s.id === targetId);

  const updated = current.filter(s => s.id !== targetId);
  // Re-index remaining slides
  const reindexed = updated.map((s, idx) => ({ ...s, display_order: idx }));
  saveLocalHeroSlides(reindexed);

  if (isSupabaseConfigured && supabase) {
    // 1. Delete from website_hero_slides
    try {
      await supabase.from('website_hero_slides').delete().eq('id', targetId);
    } catch (e) {
      console.warn('Supabase website_hero_slides delete warning:', e);
    }

    // 2. Dual sync to id_card_settings
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_hero_slides',
        academic_session: JSON.stringify(reindexed),
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase store_hero_slides sync warning:', e);
    }

    // 3. If explicit delete of media is requested and public ID exists
    if (options.deleteMediaAsset && targetSlide?.cloudinary_public_id) {
      try {
        await deleteMediaAsset(targetSlide.cloudinary_public_id);
      } catch (e) {
        console.warn('Media asset delete warning:', e);
      }
    }
  }

  // 4. Audit logging
  try {
    await recordAdminAction('hero_slide_deleted', 'hero_carousel', targetId, {
      title: targetSlide?.title
    });
  } catch (e) {}

  return reindexed;
}

/**
 * Reorder slides by array of IDs in new order
 */
export async function reorderHeroSlides(orderedIds) {
  if (!Array.isArray(orderedIds)) return getLocalHeroSlides();

  const current = getLocalHeroSlides();
  const slideMap = new Map(current.map(s => [s.id, s]));

  const reordered = [];
  orderedIds.forEach((id, index) => {
    const item = slideMap.get(id);
    if (item) {
      reordered.push({
        ...item,
        display_order: index,
        updated_at: new Date().toISOString()
      });
      slideMap.delete(id);
    }
  });

  // Append any remaining slides that weren't in orderedIds
  slideMap.forEach(item => {
    reordered.push({
      ...item,
      display_order: reordered.length,
      updated_at: new Date().toISOString()
    });
  });

  saveLocalHeroSlides(reordered);

  if (isSupabaseConfigured && supabase) {
    // 1. Update website_hero_slides in batch
    try {
      const updates = reordered.map(s => ({
        id: s.id,
        image_url: s.image_url,
        cloudinary_public_id: s.cloudinary_public_id || null,
        title: s.title || null,
        heading: s.heading || null,
        subtext: s.subtext || null,
        cta_text: s.cta_text || null,
        cta_link: s.cta_link || null,
        display_order: s.display_order,
        is_published: s.is_published,
        image_position: s.image_position,
        updated_at: s.updated_at
      }));

      await supabase.from('website_hero_slides').upsert(updates, { onConflict: 'id' });
    } catch (e) {
      console.warn('Supabase batch reorder warning:', e);
    }

    // 2. Dual sync to id_card_settings
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_hero_slides',
        academic_session: JSON.stringify(reordered),
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase store_hero_slides sync warning:', e);
    }
  }

  // 3. Audit logging
  try {
    await recordAdminAction('hero_slides_reordered', 'hero_carousel', 'order', {
      total: reordered.length,
      order: reordered.map(s => ({ id: s.id, title: s.title, order: s.display_order }))
    });
  } catch (e) {}

  return reordered;
}

/**
 * Toggle slide published status
 */
export async function toggleHeroSlidePublish(id, isPublished) {
  const current = getLocalHeroSlides();
  const target = current.find(s => s.id === id);
  if (!target) return current;

  const newStatus = isPublished !== undefined ? Boolean(isPublished) : !target.is_published;
  return await saveHeroSlide({
    ...target,
    is_published: newStatus
  });
}
