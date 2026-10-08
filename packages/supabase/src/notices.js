/**
 * @file notices.js
 * Official Notices & Academic Bulletin Service for NACOS FUTO Student Portal.
 * Handles institution-wide notices, targeted level bulletins, and urgent login pop-ups.
 * Strictly synchronized with Supabase live database tables ('announcements' & 'id_card_settings').
 */

import { supabase } from './client.js';

const STORAGE_KEY_NOTICES = 'nacos_notices_db';
const STORAGE_KEY_DISMISSED = 'nacos_dismissed_popups';

/**
 * Generate RFC-4122 compliant UUID v4 string
 */
export function generateNoticeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Slugify a string for database indexing
 */
function slugifyTitle(title) {
  const base = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'notice'}-${Date.now().toString(36)}`;
}

/**
 * Format date for display: e.g. "Sat, 12th Sep 2026"
 */
function formatNoticeDate(isoOrDate) {
  try {
    const d = isoOrDate ? new Date(isoOrDate) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB');
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (_) {
    return new Date().toLocaleDateString('en-GB');
  }
}

/**
 * Normalize a raw announcement record from Supabase into standard notice object
 */
function normalizeNoticeRecord(item) {
  if (!item) return null;
  const isPop = Boolean(item.is_popup);
  const isUrg = Boolean(item.is_urgent || item.priority === 'high' || isPop);

  return {
    id: item.id,
    title: item.title || 'Official Notice',
    slug: item.slug || slugifyTitle(item.title),
    target_audience: item.target_audience || 'ALL STUDENTS',
    category: item.category || 'Academic',
    author_unit: item.author_unit || item.author || 'Admissions Unit',
    published_date: item.published_date || formatNoticeDate(item.published_at || item.created_at),
    created_at: item.created_at || new Date().toISOString(),
    published_at: item.published_at || item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || item.created_at || new Date().toISOString(),
    content: item.content || item.excerpt || '',
    excerpt: item.excerpt || (item.content ? item.content.slice(0, 160) : ''),
    is_popup: isPop,
    is_urgent: isUrg,
    is_published: item.is_published !== false,
    priority: isUrg ? 'high' : (item.priority || 'normal')
  };
}

/**
 * Helper to get cached notices from local store (clean fallback, zero mock seeds)
 */
function getCachedNotices() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTICES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/**
 * Helper to save notices to local cache and notify listeners
 */
function setCachedNotices(notices) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(notices));
    window.dispatchEvent(new Event('nacos_notices_updated'));
  } catch (e) {
    console.warn('Could not save notices locally:', e);
  }
}

/**
 * Fetch all notices with optional filtering by level, search, and published status
 */
export async function fetchNotices(options = {}) {
  const { level = null, activeOnly = true, search = '' } = options;

  // 1. Authoritative Supabase query from announcements table
  try {
    if (supabase) {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        let normalized = data.map(normalizeNoticeRecord).filter(Boolean);

        // Also check if any backup records exist in id_card_settings store_notices
        try {
          const { data: backupRow } = await supabase
            .from('id_card_settings')
            .select('academic_session')
            .eq('id', 'store_notices')
            .maybeSingle();

          if (backupRow?.academic_session) {
            const parsedBackup = JSON.parse(backupRow.academic_session);
            if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
              const existingIds = new Set(normalized.map(n => n.id));
              parsedBackup.forEach(b => {
                if (b?.id && !existingIds.has(b.id)) {
                  const normB = normalizeNoticeRecord(b);
                  if (normB && (!activeOnly || normB.is_published !== false)) {
                    normalized.push(normB);
                  }
                }
              });
            }
          }
        } catch (_) {}

        // Sort newest first
        normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Filter by target level if requested
        if (level) {
          const cleanLvl = String(level).toUpperCase();
          normalized = normalized.filter(n => {
            const aud = (n.target_audience || '').toUpperCase();
            return aud === 'ALL STUDENTS' || aud === 'ALL' || aud.includes(cleanLvl);
          });
        }

        // Filter by search query
        if (search && search.trim()) {
          const q = search.toLowerCase();
          normalized = normalized.filter(n =>
            (n.title || '').toLowerCase().includes(q) ||
            (n.content || '').toLowerCase().includes(q) ||
            (n.author_unit || '').toLowerCase().includes(q) ||
            (n.category || '').toLowerCase().includes(q)
          );
        }

        setCachedNotices(normalized);
        return { data: normalized, error: null };
      }
    }
  } catch (err) {
    console.warn('[Notices Fetch Notice]:', err);
  }

  // 2. Fallback to cached store without mock seeds
  let list = getCachedNotices();
  if (activeOnly) {
    list = list.filter(n => n.is_published !== false);
  }
  if (level) {
    const cleanLvl = String(level).toUpperCase();
    list = list.filter(n => {
      const aud = (n.target_audience || '').toUpperCase();
      return aud === 'ALL STUDENTS' || aud === 'ALL' || aud.includes(cleanLvl);
    });
  }
  if (search && search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.author_unit || '').toLowerCase().includes(q)
    );
  }
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return { data: list, error: null };
}

/**
 * Retrieve the active urgent pop-up notice targeted at a specific student/level
 * Returns null if no active popup or if already dismissed in this browser session.
 */
export async function fetchActivePopupNotice(options = {}) {
  const { level = null, force = false } = options;

  const { data: notices } = await fetchNotices({ level, activeOnly: true });
  if (!notices || notices.length === 0) return null;

  // Find the active popup notice (published and is_popup === true)
  const popupNotice = notices.find(n => n.is_popup === true && n.is_published !== false);
  if (!popupNotice) return null;

  if (!force && typeof window !== 'undefined') {
    try {
      const dismissedRaw = sessionStorage.getItem(STORAGE_KEY_DISMISSED);
      if (dismissedRaw) {
        const dismissedIds = JSON.parse(dismissedRaw);
        if (Array.isArray(dismissedIds) && dismissedIds.includes(popupNotice.id)) {
          return null; // Already dismissed this session
        }
      }
    } catch (_) {}
  }

  return popupNotice;
}

/**
 * Retrieve all urgent notices for student dashboard display
 */
export async function fetchUrgentNotices(options = {}) {
  const { level = null } = options;
  const { data: notices } = await fetchNotices({ level, activeOnly: true });
  if (!notices || notices.length === 0) return [];

  // Filter urgent or high priority notices
  return notices.filter(n => Boolean(n.is_urgent || n.is_popup || n.priority === 'high'));
}

/**
 * Mark an urgent notice as dismissed for the current session
 */
export function markNoticeDismissed(noticeId) {
  if (typeof window === 'undefined' || !noticeId) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_DISMISSED);
    const set = raw ? JSON.parse(raw) : [];
    if (!set.includes(noticeId)) {
      set.push(noticeId);
    }
    sessionStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(set));
  } catch (e) {
    console.warn('Could not record notice dismissal:', e);
  }
}

/**
 * Admin: Create a new notice and persist live to Supabase
 */
export async function adminCreateNotice(noticeData) {
  const id = generateNoticeUuid();
  const title = String(noticeData.title || '').trim().toUpperCase();
  const slug = slugifyTitle(title);
  const nowIso = new Date().toISOString();
  const formattedDate = formatNoticeDate(nowIso);

  const isPopup = Boolean(noticeData.is_popup);
  const isUrgent = Boolean(noticeData.is_urgent || isPopup);

  const newNotice = {
    id,
    title,
    slug,
    target_audience: noticeData.target_audience || 'ALL STUDENTS',
    category: noticeData.category || 'Academic',
    author_unit: noticeData.author_unit || 'Admissions Unit',
    published_date: formattedDate,
    created_at: nowIso,
    published_at: nowIso,
    updated_at: nowIso,
    content: String(noticeData.content || '').trim(),
    excerpt: String(noticeData.content || '').slice(0, 160).trim(),
    is_popup: isPopup,
    is_urgent: isUrgent,
    is_published: noticeData.is_published !== false,
    priority: isUrgent ? 'high' : (noticeData.priority || 'normal')
  };

  // 1. Live Sync to Supabase announcements table
  try {
    if (supabase) {
      // If this notice is a pop-up, deactivate any existing pop-up in announcements table
      if (isPopup) {
        await supabase
          .from('announcements')
          .update({ is_popup: false })
          .neq('id', id);
      }

      const { data: inserted, error: insErr } = await supabase
        .from('announcements')
        .insert([{
          id: newNotice.id,
          title: newNotice.title,
          slug: newNotice.slug,
          excerpt: newNotice.excerpt,
          content: newNotice.content,
          category: newNotice.category,
          priority: newNotice.priority,
          is_published: newNotice.is_published,
          target_audience: newNotice.target_audience,
          author_unit: newNotice.author_unit,
          is_popup: newNotice.is_popup,
          is_urgent: newNotice.is_urgent,
          published_at: newNotice.published_at,
          created_at: newNotice.created_at,
          updated_at: newNotice.updated_at
        }])
        .select()
        .single();

      if (insErr) {
        console.error('Supabase announcements insert error:', insErr);
      }
    }
  } catch (err) {
    console.error('Error during Supabase announcement insert:', err);
  }

  // 2. Synchronize cache and id_card_settings store_notices backup
  const current = getCachedNotices();
  if (isPopup) {
    current.forEach(n => { n.is_popup = false; });
  }
  current.unshift(newNotice);
  setCachedNotices(current);

  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_notices',
        academic_session: JSON.stringify(current),
        updated_at: nowIso
      });
    }
  } catch (_) {}

  return { success: true, data: newNotice };
}

/**
 * Admin: Update an existing notice live in Supabase
 */
export async function adminUpdateNotice(id, updates = {}) {
  const nowIso = new Date().toISOString();
  const isPopup = updates.is_popup !== undefined ? Boolean(updates.is_popup) : undefined;
  const isUrgent = updates.is_urgent !== undefined ? Boolean(updates.is_urgent) : (isPopup ? true : undefined);

  // 1. Sync directly to Supabase announcements table
  try {
    if (supabase) {
      if (isPopup) {
        await supabase
          .from('announcements')
          .update({ is_popup: false })
          .neq('id', id);
      }

      const payload = { ...updates, updated_at: nowIso };
      if (updates.title) {
        payload.title = updates.title.toUpperCase();
      }
      if (isPopup !== undefined) {
        payload.is_popup = isPopup;
      }
      if (isUrgent !== undefined) {
        payload.is_urgent = isUrgent;
        payload.priority = isUrgent ? 'high' : 'normal';
      }

      await supabase
        .from('announcements')
        .update(payload)
        .eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase update notice error:', err);
  }

  // 2. Update local cache & id_card_settings
  const current = getCachedNotices();
  const index = current.findIndex(n => n.id === id);
  if (index !== -1) {
    if (isPopup) {
      current.forEach((n, idx) => {
        if (idx !== index) n.is_popup = false;
      });
    }
    current[index] = {
      ...current[index],
      ...updates,
      ...(isPopup !== undefined ? { is_popup: isPopup } : {}),
      ...(isUrgent !== undefined ? { is_urgent: isUrgent, priority: isUrgent ? 'high' : 'normal' } : {}),
      updated_at: nowIso
    };
    setCachedNotices(current);

    try {
      if (supabase) {
        await supabase.from('id_card_settings').upsert({
          id: 'store_notices',
          academic_session: JSON.stringify(current),
          updated_at: nowIso
        });
      }
    } catch (_) {}

    return { success: true, data: current[index] };
  }

  return { success: true };
}

/**
 * Admin: Delete a notice live from Supabase
 */
export async function adminDeleteNotice(id) {
  // 1. Delete from Supabase announcements table
  try {
    if (supabase) {
      await supabase.from('announcements').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase delete notice error:', err);
  }

  // 2. Update local cache and backup store
  const current = getCachedNotices();
  const filtered = current.filter(n => n.id !== id);
  setCachedNotices(filtered);

  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_notices',
        academic_session: JSON.stringify(filtered),
        updated_at: new Date().toISOString()
      });
    }
  } catch (_) {}

  return { success: true };
}

/**
 * Admin: Toggle urgent popup status
 */
export async function adminTogglePopup(id, isPopup) {
  return adminUpdateNotice(id, {
    is_popup: Boolean(isPopup),
    is_urgent: Boolean(isPopup),
    priority: isPopup ? 'high' : 'normal'
  });
}
