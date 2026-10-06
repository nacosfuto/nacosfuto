/**
 * @file notices.js
 * Official Notices & Academic Bulletin Service for NACOS FUTO Student Portal.
 * Handles institution-wide notices, targeted level bulletins, and urgent login pop-ups.
 */

import { supabase } from './client.js';

const STORAGE_KEY_NOTICES = 'nacos_notices_db';
const STORAGE_KEY_DISMISSED = 'nacos_dismissed_popups';

// Initial authentic departmental and institutional notices
const SEED_NOTICES = [
  {
    id: 'notice-olevel-verification-2026',
    title: 'NOTICE: O-LEVEL VERIFICATION',
    target_audience: 'ALL STUDENTS',
    category: 'Admissions',
    author_unit: 'Admissions Unit',
    published_date: 'Sat, 12th Sep 2026',
    created_at: new Date('2026-09-12T09:00:00Z').toISOString(),
    content: `Please be informed that the O-Level Verification platform is strictly for newly admitted Year One students for the 2026/2027 academic session.

No other level or category of students are required to use the O-Level Verification platform.

All concerned students are advised to strictly comply with this directive and apply for O-Level Verification accordingly.`,
    is_popup: true,
    is_urgent: true,
    is_published: true,
    priority: 'high'
  },
  {
    id: 'notice-nacos-dues-clearance-2026',
    title: 'OFFICIAL NOTICE: 2026/2027 NACOS ANNUAL DUES & CLEARANCE',
    target_audience: 'ALL STUDENTS',
    category: 'Secretariat',
    author_unit: 'NACOS Executive Secretariat',
    published_date: 'Mon, 14th Sep 2026',
    created_at: new Date('2026-09-14T10:30:00Z').toISOString(),
    content: `All undergraduate students of the Department of Computer Science (100 Level through 500 Level) are hereby notified that payment for the 2026/2027 NACOS Annual Departmental Dues is now active on the Student Portal.

Payment receipts should be retained for course registration sign-off and biometric ID Card issuance. Please ensure all transactions are completed through official portal channels.`,
    is_popup: false,
    is_urgent: false,
    is_published: true,
    priority: 'normal'
  },
  {
    id: 'notice-siwes-guidelines-400l',
    title: 'SIWES 400L ORIENTATION & LOGBOOK COLLECTION',
    target_audience: '400 LEVEL',
    category: 'Academic',
    author_unit: 'Departmental SIWES Coordinator',
    published_date: 'Thu, 17th Sep 2026',
    created_at: new Date('2026-09-17T14:00:00Z').toISOString(),
    content: `All 400 Level students preparing for the mandatory 6-month Student Industrial Work Experience Scheme (SIWES) are required to attend the mandatory departmental orientation briefing at the ICT Centre.

Collection of official ITF logbooks and placement acceptance forms will commence immediately following the session.`,
    is_popup: false,
    is_urgent: false,
    is_published: true,
    priority: 'normal'
  }
];

/**
 * Helper to get notices from local persistent store
 */
function getLocalNotices() {
  if (typeof window === 'undefined') return [...SEED_NOTICES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTICES);
    let list;
    if (!raw) {
      list = [...SEED_NOTICES];
    } else {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_NOTICES];
    }

    // Auto-sanitize: If any notice is assigned as is_popup, ensure no older notice retains is_popup or is_urgent
    const activePopup = list.find(n => n.is_popup === true);
    if (activePopup) {
      let changed = false;
      list = list.map(n => {
        if (n.id !== activePopup.id && (n.is_popup || n.is_urgent)) {
          changed = true;
          return { ...n, is_popup: false, is_urgent: false, priority: 'normal' };
        }
        return n;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(list));
      }
    }

    return list;
  } catch (_) {
    return [...SEED_NOTICES];
  }
}

/**
 * Helper to save notices to local persistent store
 */
function saveLocalNotices(notices) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_NOTICES, JSON.stringify(notices));
    window.dispatchEvent(new Event('nacos_notices_updated'));
  } catch (e) {
    console.warn('Could not save notices locally:', e);
  }
}

/**
 * Fetch all notices with optional filtering by level and published state
 */
export async function fetchNotices(options = {}) {
  const { level = null, activeOnly = true, search = '' } = options;

  // 1. Try Supabase authoritative stores
  try {
    if (supabase) {
      // Check store_notices in id_card_settings
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_notices')
        .maybeSingle();

      if (storeRow?.academic_session) {
        try {
          const parsed = JSON.parse(storeRow.academic_session);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveLocalNotices(parsed);
            let filtered = parsed;
            if (activeOnly) filtered = filtered.filter(n => n.is_published !== false);
            if (level) {
              const cleanLvl = String(level).toUpperCase();
              filtered = filtered.filter(n => {
                const aud = (n.target_audience || '').toUpperCase();
                return aud === 'ALL STUDENTS' || aud === 'ALL' || aud.includes(cleanLvl);
              });
            }
            if (search && search.trim()) {
              const q = search.toLowerCase();
              filtered = filtered.filter(n => 
                (n.title || '').toLowerCase().includes(q) ||
                (n.content || '').toLowerCase().includes(q) ||
                (n.author_unit || '').toLowerCase().includes(q)
              );
            }
            return { data: filtered, error: null };
          }
        } catch (_) {}
      }

      // Check announcements table
      let query = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        let filtered = data.map(item => ({
          id: item.id,
          title: item.title,
          target_audience: item.target_audience || 'ALL STUDENTS',
          category: item.category || 'General',
          author_unit: item.author_unit || item.author || 'Departmental Secretariat',
          published_date: item.published_date || new Date(item.created_at || Date.now()).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }),
          created_at: item.created_at,
          content: item.content || item.excerpt || '',
          is_popup: Boolean(item.is_popup),
          is_urgent: Boolean(item.is_urgent || item.priority === 'high'),
          is_published: item.is_published !== false,
          priority: item.priority || 'normal'
        }));

        if (level) {
          const cleanLvl = String(level).toUpperCase();
          filtered = filtered.filter(n => {
            const aud = (n.target_audience || '').toUpperCase();
            return aud === 'ALL STUDENTS' || aud === 'ALL' || aud.includes(cleanLvl);
          });
        }

        if (search && search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter(n => 
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.author_unit.toLowerCase().includes(q)
          );
        }

        return { data: filtered, error: null };
      }
    }
  } catch (err) {
    console.warn('Supabase notices fetch fallback:', err);
  }

  // 2. Local fallback database
  let list = getLocalNotices();

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
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.author_unit.toLowerCase().includes(q)
    );
  }

  // Sort newest first
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

  // Find the most recent active popup notice
  const popupNotice = notices.find(n => n.is_popup === true && n.is_published !== false);
  if (!popupNotice) return null;

  if (!force && typeof window !== 'undefined') {
    try {
      // Check session storage to see if student already dismissed this notice in this session
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
 * Admin: Create a new notice
 */
export async function adminCreateNotice(noticeData) {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('notice-' + Date.now());
  const createdDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const newNotice = {
    id,
    title: String(noticeData.title || '').trim().toUpperCase(),
    target_audience: noticeData.target_audience || 'ALL STUDENTS',
    category: noticeData.category || 'General',
    author_unit: noticeData.author_unit || 'Admissions Unit',
    published_date: noticeData.published_date || createdDate,
    created_at: new Date().toISOString(),
    content: String(noticeData.content || '').trim(),
    is_popup: Boolean(noticeData.is_popup),
    is_urgent: Boolean(noticeData.is_urgent || noticeData.is_popup),
    is_published: noticeData.is_published !== false,
    priority: noticeData.is_urgent ? 'high' : 'normal'
  };

  // If this notice is marked as a popup or urgent, reset other notices so only this one is urgent
  const current = getLocalNotices();
  if (newNotice.is_popup || newNotice.is_urgent) {
    current.forEach(n => {
      n.is_popup = false;
      n.is_urgent = false;
      n.priority = 'normal';
    });
  }

  current.unshift(newNotice);
  saveLocalNotices(current);

  // Sync to Supabase
  try {
    if (supabase) {
      // 1. Authoritative store_notices sync
      await supabase.from('id_card_settings').upsert({
        id: 'store_notices',
        academic_session: JSON.stringify(current),
        updated_at: new Date().toISOString()
      });

      // 2. Announcements table sync
      if (newNotice.is_popup || newNotice.is_urgent) {
        await supabase
          .from('announcements')
          .update({ is_popup: false, is_urgent: false, priority: 'normal' })
          .neq('id', newNotice.id);
      }
      await supabase.from('announcements').insert([{
        id: newNotice.id,
        title: newNotice.title,
        target_audience: newNotice.target_audience,
        category: newNotice.category,
        author_unit: newNotice.author_unit,
        content: newNotice.content,
        is_popup: newNotice.is_popup,
        is_published: newNotice.is_published,
        priority: newNotice.priority
      }]);
    }
  } catch (_) {}

  return { success: true, data: newNotice };
}

/**
 * Admin: Update an existing notice
 */
export async function adminUpdateNotice(id, updates = {}) {
  const current = getLocalNotices();
  const index = current.findIndex(n => n.id === id);
  if (index === -1) return { success: false, error: 'Notice not found' };

  if (updates.is_popup || updates.is_urgent) {
    current.forEach(n => {
      if (n.id !== id) {
        n.is_popup = false;
        n.is_urgent = false;
        n.priority = 'normal';
      }
    });
  }

  current[index] = {
    ...current[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  saveLocalNotices(current);

  // Sync to Supabase
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_notices',
        academic_session: JSON.stringify(current),
        updated_at: new Date().toISOString()
      });

      if (updates.is_popup || updates.is_urgent) {
        await supabase
          .from('announcements')
          .update({ is_popup: false, is_urgent: false, priority: 'normal' })
          .neq('id', id);
      }
      await supabase.from('announcements').update(updates).eq('id', id);
    }
  } catch (_) {}

  return { success: true, data: current[index] };
}

/**
 * Admin: Delete a notice
 */
export async function adminDeleteNotice(id) {
  const current = getLocalNotices();
  const filtered = current.filter(n => n.id !== id);
  saveLocalNotices(filtered);

  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_notices',
        academic_session: JSON.stringify(filtered),
        updated_at: new Date().toISOString()
      });
      await supabase.from('announcements').delete().eq('id', id);
    }
  } catch (_) {}

  return { success: true };
}

/**
 * Admin: Toggle urgent popup status
 */
export async function adminTogglePopup(id, isPopup) {
  return adminUpdateNotice(id, { is_popup: isPopup, is_urgent: isPopup });
}
