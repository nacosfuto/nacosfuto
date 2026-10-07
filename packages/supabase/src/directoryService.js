/**
 * directoryService.js
 * Centralized directory management for:
 * 1. Yellow Pages Indigenous Student Businesses
 * 2. Campus Clubs & Student Tech Communities
 * 3. Alumni Network & Hall of Fame Spotlights
 * 
 * Supports submission, Cloudinary image flyers/photos, approval workflow,
 * deletion, and automated admin notification dispatch.
 */

import { addAdminNotification } from './notificationService.js';
import { supabase } from './client.js';

const YELLOW_PAGES_STORAGE_KEY = 'nacos_yellow_pages_db';
const CAMPUS_CLUBS_STORAGE_KEY = 'nacos_campus_clubs_db';
const ALUMNI_STORAGE_KEY = 'nacos_alumni_directory_db';

// ─── INITIAL DIRECTORY ARRAYS (DEFAULT TO EMPTY) ───
const INITIAL_YELLOW_PAGES = [];
const INITIAL_CAMPUS_CLUBS = [];
const INITIAL_ALUMNI = [];

// ═══════════════════════════════════════════════════════════════
// 1. YELLOW PAGES DIRECTORY METHODS
// ═══════════════════════════════════════════════════════════════

export function getYellowPages(statusFilter = 'all') {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(YELLOW_PAGES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    if (statusFilter === 'all') return list;
    return list.filter(b => b.status === statusFilter);
  } catch (err) {
    console.warn('Error reading yellow pages:', err);
    return [];
  }
}

export const getYellowPagesBusinesses = getYellowPages;

export async function fetchYellowPagesFromSupabase(statusFilter = 'all') {
  try {
    if (supabase) {
      // 1. Authoritative check on live Supabase store_yellow_pages row
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_yellow_pages')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(parsed));
              window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
            }
            if (statusFilter === 'all') return parsed;
            return parsed.filter(b => b.status === statusFilter);
          }
        } catch (e) {}
      }

      // 2. Live query from media_assets for universal multi-device sync
      const { data: mediaYP, error: mediaErr } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'yellow_pages')
        .order('created_at', { ascending: false });

      if (!mediaErr && mediaYP && mediaYP.length > 0) {
        const parsedYP = [];
        for (const m of mediaYP) {
          try {
            if (m.image_alt && m.image_alt.startsWith('{')) {
              const obj = JSON.parse(m.image_alt);
              parsedYP.push({
                ...obj,
                id: obj.id || m.entity_id || m.id,
                image: m.image_url || obj.image,
                cloudinary_public_id: m.cloudinary_public_id || obj.cloudinary_public_id
              });
            }
          } catch (e) {}
        }

        if (parsedYP.length > 0) {
          const remoteIds = new Set(parsedYP.map(b => b.id));
          const localInitials = INITIAL_YELLOW_PAGES.filter(b => !remoteIds.has(b.id));
          const merged = [...parsedYP, ...localInitials];

          if (typeof window !== 'undefined') {
            localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
          }

          if (statusFilter === 'all') return merged;
          return merged.filter(b => b.status === statusFilter);
        }
      }

      // 3. Fallback to yellow_pages table
      let query = supabase.from('yellow_pages').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped = data.map(b => ({
          id: b.id,
          name: b.name,
          category: b.category,
          secondaryCategories: Array.isArray(b.secondary_categories) ? b.secondary_categories : [],
          ownerName: b.owner_name,
          ownerLevel: b.owner_level,
          description: b.description,
          location: b.location,
          phone: b.phone,
          whatsapp: b.whatsapp,
          email: b.email,
          rating: Number(b.rating || 5.0),
          reviewsCount: Number(b.reviews_count || 0),
          image: b.image,
          cloudinary_public_id: b.cloudinary_public_id,
          imagePosition: b.image_position || 'top center',
          status: b.status,
          createdAt: b.created_at
        }));
        if (typeof window !== 'undefined') {
          localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(mapped));
          window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
        }
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchYellowPagesFromSupabase error, using local:', err);
  }
  return getYellowPages(statusFilter);
}

async function getRemoteStoreList(storeId, fallbackList) {
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', storeId)
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          parsed.forEach(item => { if (item?.id) map.set(item.id, item); });
          fallbackList.forEach(item => { if (item?.id && !map.has(item.id)) map.set(item.id, item); });
          return Array.from(map.values());
        }
      }
    }
  } catch (_) {}
  return [...fallbackList];
}

export async function submitYellowPageBusiness(businessData) {
  const currentList = await getRemoteStoreList('store_yellow_pages', getYellowPages('all'));
  const id = businessData.id || `yp-${Date.now()}`;
  const now = new Date().toISOString();
  const newBusiness = {
    id,
    ...businessData,
    imagePosition: businessData.imagePosition || 'top center',
    status: businessData.status || 'pending',
    createdAt: now
  };

  const updated = [newBusiness, ...currentList.filter(b => b.id !== id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }

  // 1. Direct fast write to Supabase yellow_pages table
  if (supabase) {
    try {
      await supabase.from('yellow_pages').upsert({
        id: newBusiness.id,
        name: newBusiness.name,
        category: newBusiness.category,
        secondary_categories: newBusiness.secondaryCategories || [],
        owner_name: newBusiness.ownerName,
        owner_level: newBusiness.ownerLevel,
        description: newBusiness.description,
        location: newBusiness.location,
        phone: newBusiness.phone,
        whatsapp: newBusiness.whatsapp,
        email: newBusiness.email,
        rating: newBusiness.rating || 5.0,
        reviews_count: newBusiness.reviewsCount || 0,
        image: newBusiness.image,
        cloudinary_public_id: newBusiness.cloudinary_public_id,
        image_position: newBusiness.imagePosition || 'top center',
        status: newBusiness.status || 'pending',
        updated_at: now
      });
    } catch (err) {
      console.warn('yellow_pages direct save error:', err);
    }
  }

  // 2. Authoritative sync to Supabase store_yellow_pages
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_yellow_pages',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    } catch (_) {}
  }

  // Trigger real-time Admin notification
  addAdminNotification({
    type: 'yellow_pages',
    title: 'New Business Pending Approval',
    message: `"${newBusiness.name}" submitted a student business listing waiting for review.`,
    entityId: newBusiness.id,
    link: '/admin/yellow-pages'
  });

  return newBusiness;
}

export async function updateYellowPageBusiness(id, updates) {
  const currentList = await getRemoteStoreList('store_yellow_pages', getYellowPages('all'));
  const now = new Date().toISOString();
  let updatedItem = null;

  const updatedList = currentList.map(b => {
    if (b.id === id) {
      updatedItem = {
        ...b,
        ...updates,
        imagePosition: updates.imagePosition || b.imagePosition || 'top center',
        updatedAt: now
      };
      return updatedItem;
    }
    return b;
  });

  if (!updatedItem) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }

  // 1. Direct fast write to Supabase yellow_pages table
  if (supabase) {
    try {
      await supabase.from('yellow_pages').upsert({
        id: updatedItem.id,
        name: updatedItem.name,
        category: updatedItem.category,
        secondary_categories: updatedItem.secondaryCategories || [],
        owner_name: updatedItem.ownerName,
        owner_level: updatedItem.ownerLevel,
        description: updatedItem.description,
        location: updatedItem.location,
        phone: updatedItem.phone,
        whatsapp: updatedItem.whatsapp,
        email: updatedItem.email,
        rating: updatedItem.rating || 5.0,
        reviews_count: updatedItem.reviewsCount || 0,
        image: updatedItem.image,
        cloudinary_public_id: updatedItem.cloudinary_public_id,
        image_position: updatedItem.imagePosition || 'top center',
        status: updatedItem.status || 'approved',
        updated_at: now
      });
    } catch (err) {
      console.warn('yellow_pages direct update error:', err);
    }
  }

  // 2. Authoritative sync to Supabase store_yellow_pages
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_yellow_pages',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
    } catch (_) {}
  }

  return updatedItem;
}

export async function approveYellowPageBusiness(id) {
  return updateYellowPageBusiness(id, { status: 'approved' });
}

export async function denyYellowPageBusiness(id) {
  return updateYellowPageBusiness(id, { status: 'denied' });
}

export async function deleteYellowPageBusiness(id) {
  const currentList = await getRemoteStoreList('store_yellow_pages', getYellowPages('all'));
  const updated = currentList.filter(b => b.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(YELLOW_PAGES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_yellow_pages_updated'));
  }

  // Direct fast delete from Supabase yellow_pages table
  if (supabase) {
    try {
      await supabase.from('yellow_pages').delete().eq('id', id);
    } catch (e) {}

    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_yellow_pages',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
  }
  return updated;
}

// ═══════════════════════════════════════════════════════════════
// 2. CAMPUS CLUBS DIRECTORY METHODS
// ═══════════════════════════════════════════════════════════════

export async function fetchCampusClubsFromSupabase(statusFilter = 'all') {
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_campus_clubs')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(parsed));
              window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
            }
            if (statusFilter === 'all') return parsed;
            return parsed.filter(c => c.status === statusFilter);
          }
        } catch (e) {}
      }

      // Check media_assets fallback
      const { data: mediaClubs, error: mediaErr } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'campus_clubs')
        .order('created_at', { ascending: false });

      if (!mediaErr && mediaClubs && mediaClubs.length > 0) {
        const parsedClubs = [];
        for (const m of mediaClubs) {
          try {
            if (m.image_alt && m.image_alt.startsWith('{')) {
              const obj = JSON.parse(m.image_alt);
              parsedClubs.push({
                ...obj,
                id: obj.id || m.entity_id || m.id,
                image: m.image_url || obj.image
              });
            }
          } catch (_) {}
        }
        if (parsedClubs.length > 0) {
          const remoteIds = new Set(parsedClubs.map(c => c.id));
          const localInitials = INITIAL_CAMPUS_CLUBS.filter(c => !remoteIds.has(c.id));
          const merged = [...parsedClubs, ...localInitials];
          if (typeof window !== 'undefined') {
            localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
          }
          if (statusFilter === 'all') return merged;
          return merged.filter(c => c.status === statusFilter);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetchCampusClubs error:', err);
  }
  return getCampusClubs(statusFilter);
}

export function getCampusClubs(statusFilter = 'all') {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CAMPUS_CLUBS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    if (statusFilter === 'all') return list;
    return list.filter(c => c.status === statusFilter);
  } catch (err) {
    console.warn('Error reading campus clubs:', err);
    return [];
  }
}

export async function submitCampusClub(clubData) {
  const currentList = await getRemoteStoreList('store_campus_clubs', getCampusClubs('all'));
  const now = new Date().toISOString();
  const id = clubData.id || `club-${Date.now()}`;
  const newClub = {
    id,
    ...clubData,
    status: clubData.status || 'pending',
    createdAt: now
  };

  const updated = [newClub, ...currentList.filter(c => c.id !== id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }

  // Authoritative live sync to Supabase store_campus_clubs
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_campus_clubs',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_campus_clubs sync error:', err);
  }

  // Trigger Admin notification
  addAdminNotification({
    type: 'campus_club',
    title: 'New Campus Club Waiting for Approval',
    message: `"${newClub.name}" submitted a new student community listing.`,
    entityId: newClub.id,
    link: '/admin/clubs'
  });

  return newClub;
}

export async function updateCampusClub(id, updates) {
  const currentList = await getRemoteStoreList('store_campus_clubs', getCampusClubs('all'));
  const now = new Date().toISOString();
  let updatedClub = null;

  const updatedList = currentList.map(c => {
    if (c.id === id) {
      updatedClub = {
        ...c,
        ...updates,
        updatedAt: now
      };
      return updatedClub;
    }
    return c;
  });

  if (!updatedClub) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }

  // Authoritative live sync to Supabase store_campus_clubs
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_campus_clubs',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_campus_clubs update error:', err);
  }

  return updatedClub;
}

export async function approveCampusClub(id) {
  return updateCampusClub(id, { status: 'approved' });
}

export async function denyCampusClub(id) {
  return updateCampusClub(id, { status: 'denied' });
}

export async function deleteCampusClub(id) {
  const currentList = await getRemoteStoreList('store_campus_clubs', getCampusClubs('all'));
  const updated = currentList.filter(c => c.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CAMPUS_CLUBS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_campus_clubs_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_campus_clubs',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
      await supabase.from('media_assets').delete().eq('entity_id', id);
    }
  } catch (err) {}

  return updated;
}

// ═══════════════════════════════════════════════════════════════
// 3. ALUMNI DIRECTORY METHODS
// ═══════════════════════════════════════════════════════════════

export async function fetchAlumniFromSupabase(statusFilter = 'all') {
  try {
    if (supabase) {
      // 1. Authoritative check on store_alumni in id_card_settings
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_alumni')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(parsed));
              window.dispatchEvent(new Event('nacos_alumni_updated'));
              window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
            }
            if (statusFilter === 'all') return parsed;
            return parsed.filter(a => a.status === statusFilter);
          }
        } catch (e) {}
      }

      // 2. Real-time media_assets fallback
      const { data: mediaAlumni, error: mediaErr } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'alumni')
        .order('created_at', { ascending: false });

      if (!mediaErr && mediaAlumni && mediaAlumni.length > 0) {
        const parsedAlumni = [];
        for (const m of mediaAlumni) {
          try {
            if (m.image_alt && m.image_alt.startsWith('{')) {
              const obj = JSON.parse(m.image_alt);
              parsedAlumni.push({
                ...obj,
                id: obj.id || m.entity_id || m.id,
                image: m.image_url || obj.image,
                cloudinary_public_id: m.cloudinary_public_id || obj.cloudinary_public_id
              });
            }
          } catch (_) {}
        }

        if (parsedAlumni.length > 0) {
          const remoteIds = new Set(parsedAlumni.map(a => a.id));
          const localInitials = INITIAL_ALUMNI.filter(a => !remoteIds.has(a.id));
          const merged = [...parsedAlumni, ...localInitials];

          if (typeof window !== 'undefined') {
            localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new Event('nacos_alumni_updated'));
            window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
          }

          if (statusFilter === 'all') return merged;
          return merged.filter(a => a.status === statusFilter);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetchAlumni error:', err);
  }
  return getAlumni(statusFilter);
}

export function getAlumni(statusFilter = 'all') {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ALUMNI_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    if (statusFilter === 'all') return list;
    return list.filter(a => a.status === statusFilter);
  } catch (err) {
    console.warn('Error reading alumni directory:', err);
    return [];
  }
}

export async function submitAlumnus(alumnusData) {
  const currentList = await getRemoteStoreList('store_alumni', getAlumni('all'));
  const id = alumnusData.id || `alm-${Date.now()}`;
  const now = new Date().toISOString();
  const newAlumnus = {
    id,
    ...alumnusData,
    status: alumnusData.status || 'pending',
    createdAt: now
  };

  const updated = [newAlumnus, ...currentList.filter(a => a.id !== id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
    window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
  }

  // Authoritative live sync to Supabase store_alumni
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_alumni',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_alumni sync error:', err);
  }

  // Trigger Admin notification
  addAdminNotification({
    type: 'alumni',
    title: 'New Alumni Spotlight Request',
    message: `${newAlumnus.name} (${newAlumnus.position || 'Graduate'}) submitted an alumni profile.`,
    entityId: newAlumnus.id,
    link: '/admin/alumni'
  });

  return newAlumnus;
}

export const getAlumniDirectory = getAlumni;
export const submitAlumniRequest = submitAlumnus;
export const submitAlumni = submitAlumnus;

export async function updateAlumnus(id, updates) {
  const currentList = await getRemoteStoreList('store_alumni', getAlumni('all'));
  const now = new Date().toISOString();
  let updatedAlm = null;

  const updatedList = currentList.map(a => {
    if (a.id === id) {
      updatedAlm = {
        ...a,
        ...updates,
        updatedAt: now
      };
      return updatedAlm;
    }
    return a;
  });

  if (!updatedAlm) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
    window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
  }

  // Authoritative live sync to Supabase store_alumni
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_alumni',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_alumni update error:', err);
  }

  return updatedAlm;
}

export async function approveAlumnus(id) {
  return updateAlumnus(id, { status: 'approved' });
}

export async function denyAlumnus(id) {
  return updateAlumnus(id, { status: 'denied' });
}

export async function deleteAlumnus(id) {
  const currentList = await getRemoteStoreList('store_alumni', getAlumni('all'));
  const updated = currentList.filter(a => a.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ALUMNI_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_alumni_updated'));
    window.dispatchEvent(new Event('nacos_alumni_directory_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_alumni',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
      await supabase.from('media_assets').delete().eq('entity_id', id);
    }
  } catch (err) {}

  return updated;
}
