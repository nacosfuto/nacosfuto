/**
 * spiritualLifeService.js
 * Centralized service for NACOS FUTO Spiritual Life & Campus Fellowships.
 * Synchronizes fellowship directories between local storage, Supabase, and real-time UI events.
 */

import { supabase, isSupabaseConfigured } from './client.js';
import { addAdminNotification } from './notificationService.js';

export const SPIRITUAL_LIFE_STORAGE_KEY = 'nacos_spiritual_life_store';

export const INITIAL_FELLOWSHIPS = [];

export async function fetchSpiritualFellowshipsFromSupabase(statusFilter = 'all') {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_spiritual_life')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveLocalSpiritualFellowships(parsed);
            if (statusFilter === 'all') return parsed;
            return parsed.filter(f => f.status === statusFilter);
          }
        } catch (e) {}
      }

      // Check media_assets fallback
      const { data: mediaFel, error: mediaErr } = await supabase
        .from('media_assets')
        .select('*')
        .eq('category', 'spiritual_life')
        .order('created_at', { ascending: false });

      if (!mediaErr && mediaFel && mediaFel.length > 0) {
        const parsedFel = [];
        for (const m of mediaFel) {
          try {
            if (m.image_alt && m.image_alt.startsWith('{')) {
              const obj = JSON.parse(m.image_alt);
              parsedFel.push({
                ...obj,
                id: obj.id || m.entity_id || m.id,
                image: m.image_url || obj.image
              });
            }
          } catch (_) {}
        }
        if (parsedFel.length > 0) {
          const remoteIds = new Set(parsedFel.map(f => f.id));
          const localInitials = INITIAL_FELLOWSHIPS.filter(f => !remoteIds.has(f.id));
          const merged = [...parsedFel, ...localInitials];
          saveLocalSpiritualFellowships(merged);
          if (statusFilter === 'all') return merged;
          return merged.filter(f => f.status === statusFilter);
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetchSpiritualFellowships error:', err);
  }
  return getSpiritualFellowships(statusFilter);
}

export function getSpiritualFellowships(statusFilter = 'all') {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(SPIRITUAL_LIFE_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : [];

    if (!list || !Array.isArray(list)) {
      list = [];
    }

    if (statusFilter === 'all') return list;
    return list.filter(f => f.status === statusFilter);
  } catch (err) {
    console.warn('Error reading spiritual fellowships storage:', err);
    return [];
  }
}

export function saveLocalSpiritualFellowships(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPIRITUAL_LIFE_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('nacos_spiritual_life_updated'));
}

async function getRemoteStoreFellowships() {
  const fallback = getSpiritualFellowships('all');
  try {
    if (supabase) {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_spiritual_life')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map();
          parsed.forEach(item => { if (item?.id) map.set(item.id, item); });
          fallback.forEach(item => { if (item?.id && !map.has(item.id)) map.set(item.id, item); });
          return Array.from(map.values());
        }
      }
    }
  } catch (_) {}
  return fallback;
}

export async function submitSpiritualFellowship(fellowshipData) {
  const currentList = await getRemoteStoreFellowships();
  const now = new Date().toISOString();
  const id = fellowshipData.id || `fel-${Date.now()}`;
  const newFellowship = {
    id,
    ...fellowshipData,
    status: fellowshipData.status || 'pending',
    createdAt: now
  };

  const updated = [newFellowship, ...currentList.filter(f => f.id !== id)];
  saveLocalSpiritualFellowships(updated);

  // Authoritative live sync to Supabase store_spiritual_life
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_spiritual_life',
        academic_session: JSON.stringify(updated),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_spiritual_life sync error:', err);
  }

  addAdminNotification({
    type: 'spiritual_life',
    title: 'New Campus Fellowship Registration Submitted',
    message: `"${newFellowship.name}" submitted a new spiritual fellowship profile awaiting approval.`,
    entityId: newFellowship.id,
    link: '/admin/spiritual-life'
  });

  return newFellowship;
}

export async function updateSpiritualFellowship(id, updates) {
  const currentList = await getRemoteStoreFellowships();
  const now = new Date().toISOString();
  let updatedItem = null;

  const updatedList = currentList.map(f => {
    if (f.id === id) {
      updatedItem = {
        ...f,
        ...updates,
        updatedAt: now
      };
      return updatedItem;
    }
    return f;
  });

  if (!updatedItem) return null;

  saveLocalSpiritualFellowships(updatedList);

  // Authoritative live sync to Supabase store_spiritual_life
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_spiritual_life',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase store_spiritual_life update error:', err);
  }

  return updatedItem;
}

export async function approveSpiritualFellowship(id) {
  return updateSpiritualFellowship(id, { status: 'approved' });
}

export async function denySpiritualFellowship(id) {
  return updateSpiritualFellowship(id, { status: 'denied' });
}

export async function deleteSpiritualFellowship(id) {
  const currentList = await getRemoteStoreFellowships();
  const updated = currentList.filter(f => f.id !== id);
  saveLocalSpiritualFellowships(updated);

  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_spiritual_life',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase store_spiritual_life delete error:', err);
  }

  return updated;
}
