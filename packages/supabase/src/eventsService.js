/**
 * eventsService.js
 * Centralized service for NACOS FUTO Events & Flyers.
 * Synchronizes authentic events between Supabase `website_events`, local storage, and Cloudinary media CDN.
 */

import { supabase } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { recordAdminAction } from './adminAuth.js';
import { generateUniqueSlug } from './newsService.js';
import { CLOUDINARY_FOLDERS, getCloudinaryAssetUrl } from '@nacos/media';

export const EVENTS_STORAGE_KEY = 'nacos_website_events_store';

export const INITIAL_EVENTS = [];

function normalizeEvent(e) {
  return {
    ...e,
    image: e.image_url || e.image,
    image_url: e.image_url || e.image,
    date: e.date || e.event_date,
    event_date: e.date || e.event_date,
    time: e.time || e.event_time,
    event_time: e.time || e.event_time,
    category: e.category || 'upcoming',
    is_published: e.is_published !== false,
    is_featured: Boolean(e.is_featured)
  };
}

let memoryEvents = null;

/**
 * Get events from local storage with fallback to INITIAL_EVENTS
 */
export function getEvents({ category = 'all', publishedOnly = false } = {}) {
  let list = [];
  if (memoryEvents && Array.isArray(memoryEvents) && memoryEvents.length > 0) {
    list = memoryEvents;
  } else if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
      list = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('Error reading events storage:', err);
      list = [];
    }
  }

  if (!list || !Array.isArray(list)) {
    list = [];
  }
  let normalized = list.map(normalizeEvent);
  if (publishedOnly) normalized = normalized.filter(e => e.is_published);
  if (category !== 'all') normalized = normalized.filter(e => e.category === category);
  return normalized;
}

/**
 * Save updated events array locally and dispatch event
 */
export function saveLocalEvents(events, { notify = true } = {}) {
  if (!events || !Array.isArray(events)) return;
  const normalized = events.map(normalizeEvent);
  memoryEvents = normalized;
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.warn('[eventsService] localStorage quota exceeded on saveLocalEvents:', err);
    try {
      if (window.sessionStorage) {
        sessionStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(normalized.slice(0, 30)));
      }
    } catch (_) {}
  }

  if (notify) {
    try {
      window.dispatchEvent(new Event('nacos_website_events_updated'));
    } catch (_) {}
  }
}

/**
 * Fetch events from Supabase `website_events` table with local storage fallback
 */
export async function fetchEventsFromSupabase() {
  try {
    if (supabase) {
      // 1. Authoritative check on live Supabase store_events row
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_events')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveLocalEvents(parsed, { notify: false });
            return parsed;
          }
        } catch (e) {}
      }

      // 2. Fetch live events from media_assets where category = 'events'
      const { data: mediaEvents, error: mediaError } = await supabase
        .from('media_assets')
        .select('id, entity_id, category, image_url, image_alt, cloudinary_public_id, created_at')
        .eq('category', 'events')
        .not('image_url', 'like', 'data:%')
        .order('created_at', { ascending: false });

      if (!mediaError && mediaEvents && mediaEvents.length > 0) {
        const parsedEvents = [];
        for (const item of mediaEvents) {
          try {
            if (item.image_alt && item.image_alt.startsWith('{')) {
              const obj = JSON.parse(item.image_alt);
              parsedEvents.push(normalizeEvent({
                ...obj,
                id: obj.id || item.entity_id || item.id,
                image_url: item.image_url || obj.image_url,
                cloudinary_public_id: item.cloudinary_public_id || obj.cloudinary_public_id
              }));
            }
          } catch (e) {}
        }

        if (parsedEvents.length > 0) {
          const remoteSlugs = new Set(parsedEvents.map(e => e.slug || e.id));
          const localInitials = INITIAL_EVENTS.map(normalizeEvent).filter(e => !remoteSlugs.has(e.slug || e.id));
          const merged = [...parsedEvents, ...localInitials];

          saveLocalEvents(merged, { notify: false });
          return merged;
        }
      }

      // 3. Fallback to website_events table
      const { data, error } = await supabase
        .from('website_events')
        .select('id, title, slug, event_date, event_time, location, description, image_url, cloudinary_public_id, category, registration_link, is_published, is_featured, created_at')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map(d => normalizeEvent({
          id: d.id,
          title: d.title,
          slug: d.slug,
          date: d.event_date,
          time: d.event_time,
          location: d.location,
          description: d.description,
          image_url: d.image_url,
          cloudinary_public_id: d.cloudinary_public_id,
          category: d.category || 'upcoming',
          registration_link: d.registration_link || d.link || null,
          is_published: d.is_published !== false,
          is_featured: Boolean(d.is_featured),
          created_at: d.created_at
        }));

        const local = getEvents({ category: 'all' });
        const remoteSlugs = new Set(mapped.map(m => m.slug || m.id));
        const merged = [...mapped, ...local.filter(l => !remoteSlugs.has(l.slug || l.id))];

        saveLocalEvents(merged, { notify: false });
        return merged;
      }
    }
  } catch (err) {
    console.warn('Supabase events fetch error, falling back to local storage:', err);
  }

  return getEvents({ category: 'all' });
}

async function getRemoteStoreEvents() {
  const fallback = getEvents({ category: 'all' });
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_events')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          parsed.forEach(item => { if (item?.id || item?.slug) map.set(item.id || item.slug, item); });
          fallback.forEach(item => { if ((item?.id || item?.slug) && !map.has(item.id || item.slug)) map.set(item.id || item.slug, item); });
          return Array.from(map.values()).map(normalizeEvent);
        }
      }
    }
  } catch (_) {}
  return fallback;
}

export async function saveEvent(eventData) {
  const current = await getRemoteStoreEvents();
  const id = eventData.id || `evt-${Date.now()}`;
  const now = new Date().toISOString();
  
  // Ensure slug is collision-free and never replaces an existing event
  const rawSlug = eventData.slug || eventData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const finalSlug = generateUniqueSlug(rawSlug, current, id);

  const cleanImg = String(eventData.image_url || eventData.image || '').startsWith('data:') ? '' : (eventData.image_url || eventData.image || '');
  const normalized = normalizeEvent({
    ...eventData,
    id,
    image: cleanImg,
    image_url: cleanImg,
    slug: finalSlug,
    created_at: eventData.created_at || now,
    updated_at: now
  });

  // Target exclusively by unique ID so duplicate titles never replace previous events
  const existingIdx = current.findIndex(e => e.id === id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...updated[existingIdx], ...normalized };
  } else {
    updated = [normalized, ...current];
  }

  // 1. Authoritative live sync to Supabase store_events FIRST
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_events save error:', err);
  }

  // 2. Safe local cache update
  saveLocalEvents(updated);


  // 2. Authoritative live write directly to public.website_events table
  try {
    if (supabase) {
      const dbPayload = {
        title: normalized.title,
        slug: normalized.slug,
        event_date: normalized.date,
        event_time: normalized.time,
        location: normalized.location,
        description: normalized.description,
        image_url: normalized.image_url,
        cloudinary_public_id: normalized.cloudinary_public_id,
        category: normalized.category,
        registration_link: normalized.registration_link,
        is_published: normalized.is_published,
        is_featured: normalized.is_featured,
        updated_at: now
      };

      const isRealUuid = normalized.id && !normalized.id.startsWith('evt-');
      const { data: existing } = await supabase
        .from('website_events')
        .select('id')
        .or(`slug.eq.${normalized.slug}${isRealUuid ? `,id.eq.${normalized.id}` : ''}`)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from('website_events').update(dbPayload).eq('id', existing.id);
        normalized.id = existing.id;
      } else {
        const { data: inserted } = await supabase.from('website_events').insert([dbPayload]).select();
        if (inserted?.[0]?.id) {
          normalized.id = inserted[0].id;
        }
      }
    }
  } catch (err) {
    console.warn('Remote sync notice for event table:', err);
  }

  return normalized;
}

export async function deleteEvent(eventItem) {
  const current = await getRemoteStoreEvents();
  const targetId = typeof eventItem === 'string' ? eventItem : eventItem?.id;
  const targetSlug = typeof eventItem === 'object' ? eventItem?.slug : null;
  const pubId = typeof eventItem === 'object' ? eventItem?.cloudinary_public_id : null;

  const updated = current.filter(e => {
    if (targetId && e.id === targetId) return false;
    if (targetSlug && e.slug === targetSlug) return false;
    return true;
  });

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events & website_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });

      if (targetSlug) {
        await supabase.from('website_events').delete().eq('slug', targetSlug);
      }
      if (targetId && !targetId.startsWith('evt-')) {
        await supabase.from('website_events').delete().eq('id', targetId);
      }
    }
  } catch (err) {
    console.warn('Supabase store_events delete sync error:', err);
  }

  // Delete from media_assets
  try {
    if (supabase) {
      if (targetSlug) {
        await supabase.from('media_assets').delete().eq('entity_id', targetSlug);
      }
      if (targetId) {
        await supabase.from('media_assets').delete().eq('entity_id', targetId);
      }
      if (pubId) {
        await supabase.from('media_assets').delete().eq('cloudinary_public_id', pubId);
      }
    }
  } catch (e) {
    console.warn('Universal media_assets delete notice for event:', e);
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
      if (targetSlug) {
        await supabase.from('website_events').delete().eq('slug', targetSlug);
      } else if (targetId && !targetId.startsWith('evt-')) {
        await supabase.from('website_events').delete().eq('id', targetId);
      }
    }
  } catch (err) {
    console.warn('Supabase delete event notice:', err);
  }

  return updated;
}

export async function toggleEventPublish(id) {
  const current = getEvents({ category: 'all' });
  let nextPublished = false;
  let targetSlug = null;

  const updated = current.map(e => {
    if (e.id === id) {
      nextPublished = !e.is_published;
      targetSlug = e.slug;
      return { ...e, is_published: nextPublished };
    }
    return e;
  });

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_events toggle sync error:', err);
  }

  if (targetSlug && supabase) {
    try {
      await supabase.from('website_events').update({ is_published: nextPublished }).eq('slug', targetSlug);
    } catch (err) {
      console.warn('Supabase toggle event publish notice:', err);
    }
  }

  return updated;
}

/**
 * Toggle featured status of an event
 */
export async function toggleEventFeatured(id) {
  const current = getEvents({ category: 'all' });
  let nextFeatured = false;
  let targetSlug = null;

  const updated = current.map(e => {
    if (e.id === id) {
      nextFeatured = !e.is_featured;
      targetSlug = e.slug;
      return { ...e, is_featured: nextFeatured };
    }
    return e;
  });

  saveLocalEvents(updated);

  // Authoritative live sync to Supabase store_events
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_events',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_events toggle featured error:', err);
  }

  if (targetSlug && supabase) {
    try {
      await supabase.from('website_events').update({ is_featured: nextFeatured }).eq('slug', targetSlug);
    } catch (err) {
      console.warn('Supabase toggle event featured notice:', err);
    }
  }

  return updated;
}
