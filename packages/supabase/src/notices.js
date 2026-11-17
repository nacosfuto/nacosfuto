/**
 * @file notices.js
 * Official Notices & Academic Bulletin Service for NACOS FUTO Student Portal.
 * Handles institution-wide notices, targeted level bulletins, and urgent login pop-ups.
 * Strictly synchronized with Supabase live database tables ('announcements' & 'id_card_settings').
 */

import { supabase } from './client.js';

const STORAGE_KEY_NOTICES = 'nacos_notices_db';
const STORAGE_KEY_DISMISSED = 'nacos_dismissed_popups';
const ZOMBIE_NOTICE_ID = '3d6429a8-6687-4a0e-83cb-5a5fc0f1d1ec';
const ZOMBIE_TITLE_KEYWORD = 'HARMATTAN SEMESTER 2026/2027 REGISTRATION';

// Explicit column selection strictly adhering to AGENTS.md (No wildcard select('*'))
const ANNOUNCEMENT_COLUMNS = 'id, title, slug, excerpt, content, category, priority, is_published, target_audience, author_unit, is_popup, is_urgent, published_at, created_at, updated_at';

// Immediately cleanse any legacy zombie notice from localStorage on load
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTICES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(n => 
          n?.id !== ZOMBIE_NOTICE_ID &&
          !String(n?.title || '').toUpperCase().includes(ZOMBIE_TITLE_KEYWORD)
        );
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(cleaned));
        }
      }
    }
  } catch (_) {}
}

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
  const isUrg = Boolean(item.is_urgent || item.is_popup || item.priority === 'high');

  return {
    id: item.id,
    title: item.title || 'Official Notice',
    slug: item.slug || slugifyTitle(item.title),
    target_audience: item.target_audience || 'ALL STUDENTS',
    category: item.category || 'Academic',
    author_unit: item.author_unit || item.author || 'NACOS Directorate',
    published_date: item.published_date || formatNoticeDate(item.published_at || item.created_at),
    created_at: item.created_at || new Date().toISOString(),
    published_at: item.published_at || item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || item.created_at || new Date().toISOString(),
    content: item.content || item.excerpt || '',
    excerpt: item.excerpt || (item.content ? item.content.slice(0, 160) : ''),
    is_popup: isUrg,
    is_urgent: isUrg,
    is_published: item.is_published !== false,
    priority: isUrg ? 'high' : (item.priority || 'normal')
  };
}

/**
 * Robust target audience level matcher supporting:
 * - 'ALL STUDENTS', 'ALL'
 * - '100 LEVEL', '100 Level', '100L', '100'
 */
function audienceMatches(targetAudience, studentLevel) {
  if (!studentLevel) return true;
  const aud = String(targetAudience || 'ALL STUDENTS').trim().toUpperCase();
  if (aud === 'ALL' || aud === 'ALL STUDENTS' || aud.includes('ALL')) return true;

  const reqClean = String(studentLevel).trim().toUpperCase();
  if (aud.includes(reqClean) || reqClean.includes(aud)) return true;

  // Compare 3-digit numeric level (e.g. 100, 200, 300, 400, 500)
  const reqNum = reqClean.match(/\b\d{3}\b|\d{3}/)?.[0];
  const audNum = aud.match(/\b\d{3}\b|\d{3}/)?.[0];
  if (reqNum && audNum && reqNum === audNum) return true;

  return false;
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
    if (!Array.isArray(parsed)) return [];
    // Ensure deleted zombie notice is never returned from cache
    const cleaned = parsed.filter(n => 
      n?.id !== ZOMBIE_NOTICE_ID && 
      !String(n?.title || '').toUpperCase().includes(ZOMBIE_TITLE_KEYWORD)
    );
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (_) {
    return [];
  }
}

/**
 * Helper to save notices to local cache and optionally notify listeners (only on mutations)
 */
function setCachedNotices(notices, notify = false) {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = (Array.isArray(notices) ? notices : []).filter(n => 
      n?.id !== ZOMBIE_NOTICE_ID &&
      !String(n?.title || '').toUpperCase().includes(ZOMBIE_TITLE_KEYWORD)
    );
    localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(cleaned));
    if (notify) {
      window.dispatchEvent(new Event('nacos_notices_updated'));
    }
  } catch (e) {
    console.warn('Could not save notices locally:', e);
  }
}

/**
 * Fetch fresh authoritative list from Supabase and synchronize local cache & backup rows
 */
async function syncAuthoritativeStore() {
  if (!supabase) return null;
  try {
    const { data: fresh, error } = await supabase
      .from('announcements')
      .select(ANNOUNCEMENT_COLUMNS)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(fresh)) {
      const normalized = fresh
        .map(normalizeNoticeRecord)
        .filter(n => n && n.id !== ZOMBIE_NOTICE_ID && !String(n.title || '').toUpperCase().includes(ZOMBIE_TITLE_KEYWORD));

      setCachedNotices(normalized, true);

      const jsonStr = JSON.stringify(normalized);
      const nowIso = new Date().toISOString();

      await supabase.from('id_card_settings').upsert([
        { id: 'store_notices', academic_session: jsonStr, updated_at: nowIso },
        { id: 'store_portal_notices', academic_session: jsonStr, updated_at: nowIso }
      ]);

      return normalized;
    }
  } catch (err) {
    console.warn('Sync authoritative store error:', err);
  }
  return null;
}

/**
 * Fetch all notices with optional filtering by level, search, and published status.
 * Strictly queries the authoritative Supabase 'announcements' table.
 * Never resurrects deleted notices from backup rows.
 */
export async function fetchNotices(options = {}) {
  const { level = null, activeOnly = true, search = '' } = options;

  // 1. Authoritative Supabase query from announcements table
  try {
    if (supabase) {
      let query = supabase
        .from('announcements')
        .select(ANNOUNCEMENT_COLUMNS)
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        let normalized = data
          .map(normalizeNoticeRecord)
          .filter(n => n && n.id !== ZOMBIE_NOTICE_ID && !String(n.title || '').toUpperCase().includes(ZOMBIE_TITLE_KEYWORD));

        // Sort newest first
        normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Filter by target level if requested
        if (level) {
          normalized = normalized.filter(n => audienceMatches(n.target_audience, level));
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

        // Authoritatively update local cache to match database exactly
        setCachedNotices(normalized);
        return { data: normalized, error: null };
      }
    }
  } catch (err) {
    console.warn('[Notices Fetch Notice]:', err);
  }

  // 2. Fallback to cached store ONLY if database network error occurred
  let list = getCachedNotices();
  if (activeOnly) {
    list = list.filter(n => n.is_published !== false);
  }
  if (level) {
    list = list.filter(n => audienceMatches(n.target_audience, level));
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
 * Whatever notification that is set to urgent is the one that pops up when user opens the portal.
 * Returns null if no active urgent notice or if already dismissed in this browser session.
 */
export async function fetchActivePopupNotice(options = {}) {
  const { level = null, force = false } = options;

  const { data: notices } = await fetchNotices({ level, activeOnly: true });
  if (!notices || notices.length === 0) return null;

  // Filter all candidates with urgent/popup flags
  const urgentCandidates = notices.filter(n => Boolean(n.is_urgent || n.is_popup) && n.is_published !== false);
  if (urgentCandidates.length === 0) return null;

  // Pick the most recently updated/created urgent notice
  urgentCandidates.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.published_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.published_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  const urgentNotice = urgentCandidates[0];
  if (!urgentNotice) return null;

  if (!force && typeof window !== 'undefined') {
    try {
      const dismissedRaw = sessionStorage.getItem(STORAGE_KEY_DISMISSED);
      if (dismissedRaw) {
        const dismissedIds = JSON.parse(dismissedRaw);
        if (Array.isArray(dismissedIds) && dismissedIds.includes(urgentNotice.id)) {
          return null; // Already dismissed this session
        }
      }
    } catch (_) {}
  }

  return urgentNotice;
}

/**
 * Retrieve all urgent notices for student dashboard display
 */
export async function fetchUrgentNotices(options = {}) {
  const { level = null } = options;
  const { data: notices } = await fetchNotices({ level, activeOnly: true });
  if (!notices || notices.length === 0) return [];

  // Filter urgent notices
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
 * Admin: Create a new notice and persist live to Supabase.
 * If set to urgent, all other notices have their urgent status deactivated,
 * ensuring only ONE notice is urgent and pops up for students.
 */
export async function adminCreateNotice(noticeData) {
  const id = generateNoticeUuid();
  const title = String(noticeData.title || '').trim().toUpperCase();
  const slug = slugifyTitle(title);
  const nowIso = new Date().toISOString();
  const formattedDate = formatNoticeDate(nowIso);

  const isUrgent = Boolean(noticeData.is_urgent || noticeData.is_popup);

  const newNotice = {
    id,
    title,
    slug,
    target_audience: noticeData.target_audience || 'ALL STUDENTS',
    category: noticeData.category || 'Academic',
    author_unit: noticeData.author_unit || 'NACOS Directorate',
    published_date: formattedDate,
    created_at: nowIso,
    published_at: nowIso,
    updated_at: nowIso,
    content: String(noticeData.content || '').trim(),
    excerpt: String(noticeData.content || '').slice(0, 160).trim(),
    is_popup: isUrgent,
    is_urgent: isUrgent,
    is_published: noticeData.is_published !== false,
    priority: isUrgent ? 'high' : (noticeData.priority || 'normal')
  };

  // 1. Live Sync to Supabase announcements table
  try {
    if (supabase) {
      // If this notice is set to urgent, ensure strictly ONE urgent notice exists:
      // Deactivate urgent status on all other announcements in Supabase
      if (isUrgent) {
        await supabase
          .from('announcements')
          .update({ is_popup: false, is_urgent: false, priority: 'normal' })
          .neq('id', id);
      }

      const { error: insErr } = await supabase
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
        .select(ANNOUNCEMENT_COLUMNS)
        .single();

      if (insErr) {
        console.error('Supabase announcements insert error:', insErr);
      }
    }
  } catch (err) {
    console.error('Error during Supabase announcement insert:', err);
  }

  // 2. Authoritatively synchronize stores from live database
  const synchronized = await syncAuthoritativeStore();
  if (!synchronized) {
    const current = getCachedNotices();
    if (isUrgent) {
      current.forEach(n => {
        n.is_popup = false;
        n.is_urgent = false;
        n.priority = 'normal';
      });
    }
    current.unshift(newNotice);
    setCachedNotices(current, true);
  }

  return { success: true, data: newNotice };
}

/**
 * Admin: Update an existing notice live in Supabase.
 * If setting to urgent, all other notices have urgent removed, maintaining single-urgent rule.
 */
export async function adminUpdateNotice(id, updates = {}) {
  const nowIso = new Date().toISOString();
  const isUrgent = updates.is_urgent !== undefined
    ? Boolean(updates.is_urgent)
    : (updates.is_popup !== undefined ? Boolean(updates.is_popup) : undefined);

  // 1. Sync directly to Supabase announcements table
  try {
    if (supabase) {
      // If setting this notice to urgent, clear urgent on ALL other announcements
      if (isUrgent === true) {
        await supabase
          .from('announcements')
          .update({ is_popup: false, is_urgent: false, priority: 'normal' })
          .neq('id', id);
      }

      const payload = { ...updates, updated_at: nowIso };
      if (updates.title) {
        payload.title = updates.title.toUpperCase();
      }
      if (isUrgent !== undefined) {
        payload.is_popup = isUrgent;
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

  // 2. Authoritatively synchronize stores from live database
  const synchronized = await syncAuthoritativeStore();
  if (!synchronized) {
    const current = getCachedNotices();
    const index = current.findIndex(n => n.id === id);
    if (index !== -1) {
      if (isUrgent === true) {
        current.forEach((n, idx) => {
          if (idx !== index) {
            n.is_popup = false;
            n.is_urgent = false;
            n.priority = 'normal';
          }
        });
      }
      current[index] = {
        ...current[index],
        ...updates,
        ...(isUrgent !== undefined ? { is_popup: isUrgent, is_urgent: isUrgent, priority: isUrgent ? 'high' : 'normal' } : {}),
        updated_at: nowIso
      };
      setCachedNotices(current, true);
      return { success: true, data: current[index] };
    }
  }

  return { success: true, data: updates };
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

  // 2. Authoritatively synchronize stores from live database
  const synchronized = await syncAuthoritativeStore();
  if (!synchronized) {
    const current = getCachedNotices();
    const filtered = current.filter(n => n.id !== id);
    setCachedNotices(filtered, true);
  }

  return { success: true };
}

/**
 * Admin: Toggle urgent status (sets single active popup on student portal)
 */
export async function adminToggleUrgent(id, isUrgent) {
  return adminUpdateNotice(id, {
    is_popup: Boolean(isUrgent),
    is_urgent: Boolean(isUrgent),
    priority: isUrgent ? 'high' : 'normal'
  });
}

export const adminTogglePopup = adminToggleUrgent;
