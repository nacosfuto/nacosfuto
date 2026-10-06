/**
 * galleryService.js
 * Centralized service for NACOS FUTO Website Gallery.
 * Synchronizes between Supabase `website_gallery` table, local storage, and Cloudinary media assets.
 */

import { supabase } from './client.js';
import { syncMediaAsset, deleteMediaAsset } from './media.js';
import { recordAdminAction } from './adminAuth.js';
import { CLOUDINARY_FOLDERS } from '@nacos/media';

export const GALLERY_STORAGE_KEY = 'nacos_website_gallery_store';

export const INITIAL_GALLERY = [
  {
    id: 'gal-1',
    title: 'Department Front Entrance',
    caption: 'NACOS Student Leaders at the Department of Computer Science (TETFUND Complex)',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569317/nacos/gallery/gallery_dept_front.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_dept_front',
    category: 'Academics',
    is_featured: true,
    created_at: '2026-08-10T12:00:00Z'
  },
  {
    id: 'gal-2',
    title: 'Student Group Mixer',
    caption: 'FUTO Computing Students Outdoor Hangout & Mixer',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569318/nacos/gallery/gallery_student_group.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_student_group',
    category: 'Socials',
    is_featured: true,
    created_at: '2026-08-12T14:30:00Z'
  },
  {
    id: 'gal-3',
    title: 'Cultural Day Celebrations',
    caption: 'Traditional Attire Cultural Day Celebrations',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569319/nacos/gallery/gallery_traditional_day.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_traditional_day',
    category: 'Culture',
    is_featured: true,
    created_at: '2026-08-15T16:00:00Z'
  },
  {
    id: 'gal-4',
    title: 'Community Nature Outing',
    caption: 'Student Community Outing & Nature Meetup',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569318/nacos/gallery/gallery_nature_hangout.jpg',
    cloudinary_public_id: 'nacos/gallery/gallery_nature_hangout',
    category: 'Socials',
    is_featured: false,
    created_at: '2026-08-18T10:00:00Z'
  },
  {
    id: 'gal-5',
    title: 'Tech Symposium Panel',
    caption: 'Tech Symposium Panel Discussion with Industry Guest Speakers',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569327/nacos/gallery/nacos1.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos1',
    category: 'Tech',
    is_featured: false,
    created_at: '2026-08-20T11:00:00Z'
  },
  {
    id: 'gal-6',
    title: 'Hackathon Sprint',
    caption: 'Hackathon Sprint & Collaborative Coding Arena',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569330/nacos/gallery/nacos2.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos2',
    category: 'Tech',
    is_featured: false,
    created_at: '2026-08-22T09:00:00Z'
  },
  {
    id: 'gal-7',
    title: 'Software Project Demo Day',
    caption: 'Departmental Software Project Demonstration Day',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569331/nacos/gallery/nacos3.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos3',
    category: 'Academics',
    is_featured: false,
    created_at: '2026-08-25T13:00:00Z'
  },
  {
    id: 'gal-8',
    title: 'Freshmen Induction Ceremony',
    caption: 'Freshmen Orientation & Computing Induction Ceremony',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569332/nacos/gallery/nacos4.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos4',
    category: 'Campus Life',
    is_featured: false,
    created_at: '2026-08-28T10:00:00Z'
  },
  {
    id: 'gal-9',
    title: 'Annual NACOS Dinner & Awards',
    caption: 'Annual NACOS Dinner & Outstanding Scholar Awards Gala',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569333/nacos/gallery/nacos5.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos5',
    category: 'Culture',
    is_featured: false,
    created_at: '2026-09-01T19:00:00Z'
  },
  {
    id: 'gal-10',
    title: 'Cybersecurity Workshop',
    caption: 'Hands-on Cloud & Cyber Security Workshop Session',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569333/nacos/gallery/nacos6.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos6',
    category: 'Tech',
    is_featured: false,
    created_at: '2026-09-03T11:00:00Z'
  },
  {
    id: 'gal-11',
    title: 'Departmental Sports Championship',
    caption: 'Departmental Sports Championship & Track Relay',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569334/nacos/gallery/nacos7.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos7',
    category: 'Sports',
    is_featured: false,
    created_at: '2026-09-05T15:00:00Z'
  },
  {
    id: 'gal-12',
    title: 'Alumni Career Talk',
    caption: 'Alumni Tech Talk & Career Advisory Fireside Chat',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569335/nacos/gallery/nacos8.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos8',
    category: 'Academics',
    is_featured: false,
    created_at: '2026-09-08T12:00:00Z'
  },
  {
    id: 'gal-13',
    title: 'Women in Computing Roundtable',
    caption: 'Women in Computing Roundtable & Mentorship Circle',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569336/nacos/gallery/nacos9.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos9',
    category: 'Socials',
    is_featured: false,
    created_at: '2026-09-10T14:00:00Z'
  },
  {
    id: 'gal-14',
    title: 'Open Source Code Sprint',
    caption: 'Open Source Community Code Contribution Sprint',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569337/nacos/gallery/nacos10.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos10',
    category: 'Tech',
    is_featured: false,
    created_at: '2026-09-12T10:00:00Z'
  },
  {
    id: 'gal-15',
    title: 'Systems Programming Lab',
    caption: 'TETFUND Laboratory Hardware & Systems Programming Class',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569338/nacos/gallery/nacos11.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos11',
    category: 'Academics',
    is_featured: false,
    created_at: '2026-09-15T13:00:00Z'
  },
  {
    id: 'gal-16',
    title: 'Final Year Project Showcase',
    caption: 'Final Year Project Exhibition & Valedictory Showcase',
    image_url: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569339/nacos/gallery/nacos12.jpg',
    cloudinary_public_id: 'nacos/gallery/nacos12',
    category: 'Campus Life',
    is_featured: false,
    created_at: '2026-09-18T11:00:00Z'
  }
];

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
    return INITIAL_GALLERY.map(normalizeItem);
  }

  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : null;

    if (!list || !Array.isArray(list) || list.length === 0) {
      list = INITIAL_GALLERY;
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(list));
    }

    return list.map(normalizeItem);
  } catch (err) {
    console.warn('Error reading gallery storage:', err);
    return INITIAL_GALLERY.map(normalizeItem);
  }
}

/**
 * Save gallery items array locally and dispatch update event for real-time reactivity
 */
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
  try {
    if (supabase) {
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

        // Merge with existing local or initial items
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

/**
 * Save / Create / Update a gallery item
 */
export async function saveGalleryItem(itemData) {
  const current = getGalleryItems();
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

  // Sync to Supabase `website_gallery` & `media_assets`
  try {
    if (normalized.cloudinary_public_id && normalized.image_url) {
      await syncMediaAsset({
        publicId: normalized.cloudinary_public_id,
        url: normalized.image_url,
        folder: CLOUDINARY_FOLDERS.GALLERY,
        category: 'gallery',
        image_alt: normalized.caption || normalized.title,
        entity_type: 'gallery',
        entity_id: normalized.cloudinary_public_id.split('/').pop()
      });
    }

    if (supabase) {
      await supabase
        .from('website_gallery')
        .upsert({
          id: normalized.id.startsWith('gal-') ? undefined : normalized.id,
          title: normalized.title,
          caption: normalized.caption,
          image_url: normalized.image_url,
          cloudinary_public_id: normalized.cloudinary_public_id,
          category: normalized.category || 'Campus Life',
          is_featured: Boolean(normalized.is_featured),
          created_at: normalized.created_at
        }, { onConflict: 'cloudinary_public_id' });
    }
  } catch (err) {
    console.warn('Remote sync notice for gallery item:', err);
  }

  return normalized;
}

/**
 * Delete a gallery item from local storage, Supabase, and Cloudinary
 */
export async function deleteGalleryItem(item) {
  const current = getGalleryItems();
  const targetId = typeof item === 'string' ? item : item?.id;
  const targetPublicId = typeof item === 'object' ? item?.cloudinary_public_id : null;

  const updated = current.filter(i => {
    if (targetId && i.id === targetId) return false;
    if (targetPublicId && i.cloudinary_public_id === targetPublicId) return false;
    return true;
  });

  saveLocalGalleryItems(updated);

  // Remote delete
  const pubId = targetPublicId || (current.find(i => i.id === targetId)?.cloudinary_public_id);
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
