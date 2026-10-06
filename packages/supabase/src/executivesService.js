/**
 * executivesService.js
 * Centralized data and management service for NACOS Executives & Page Header Settings.
 * Supports:
 * - Real-time Supabase sync with automatic localStorage fallback
 * - Cloudinary image URLs and public IDs
 * - Current vs Past executives segregation & ordering
 * - Migration / moving executives from Current to Past
 * - Full tenure archiving (e.g., 2025/2026 -> 2024/2025)
 * - Customization of page hero header, title, subtitle, and session titles
 */

import { supabase } from './client.js';
import { addAdminNotification } from './notificationService.js';

export const EXECUTIVES_STORAGE_KEY = 'nacos_executives_db';
export const EXECUTIVES_SETTINGS_STORAGE_KEY = 'nacos_executives_settings_db';
export const TENURES_STORAGE_KEY = 'nacos_tenures_db';

export const DEFAULT_TENURES = [
  '2026/2027',
  '2025/2026',
  '2024/2025',
  '2023/2024',
  '2022/2023',
  '2021/2022',
  '2020/2021'
];

export function getTenures() {
  let stored = [];
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TENURES_STORAGE_KEY);
      if (raw) stored = JSON.parse(raw);
    } catch (e) {}
  }
  
  // Extract all sessions from existing executives
  const execs = getExecutives('all');
  const execSessions = execs.map(e => e.session).filter(Boolean);
  
  // Combine defaults, stored, and execSessions, deduplicated
  const combined = Array.from(new Set([...DEFAULT_TENURES, ...stored, ...execSessions]));
  
  // Sort descending by starting year
  combined.sort((a, b) => {
    const yearA = parseInt(a.split('/')[0] || a, 10) || 0;
    const yearB = parseInt(b.split('/')[0] || b, 10) || 0;
    return yearB - yearA;
  });

  return combined;
}

export function addTenure(tenureSession) {
  if (!tenureSession || typeof tenureSession !== 'string') return getTenures();
  const cleaned = tenureSession.trim();
  if (!cleaned) return getTenures();

  const current = getTenures();
  if (!current.includes(cleaned)) {
    const updated = [cleaned, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem(TENURES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('nacos_tenures_updated'));
      window.dispatchEvent(new Event('nacos_executives_updated'));
    }
    return updated;
  }
  return current;
}

export async function fetchExecutivesFromSupabase() {
  if (!supabase) return getExecutives('all');

  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('category', 'executives')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const execAssets = data.filter(d => d.entity_type === 'executive');
      const settingsAsset = data.find(d => d.entity_type === 'executives_settings');

      if (settingsAsset && settingsAsset.image_alt) {
        try {
          const parsedSettings = JSON.parse(settingsAsset.image_alt);
          if (typeof window !== 'undefined') {
            localStorage.setItem(EXECUTIVES_SETTINGS_STORAGE_KEY, JSON.stringify(parsedSettings));
            window.dispatchEvent(new Event('nacos_executives_settings_updated'));
          }
        } catch (e) {}
      }

      if (execAssets.length > 0) {
        const parsedExecs = [];
        for (const item of execAssets) {
          try {
            if (item.image_alt && item.image_alt.startsWith('{')) {
              const obj = JSON.parse(item.image_alt);
              parsedExecs.push({
                ...obj,
                id: obj.id || item.entity_id || item.id,
                image: item.image_url || obj.image,
                cloudinary_public_id: item.cloudinary_public_id || obj.cloudinary_public_id
              });
            }
          } catch (e) {}
        }

        if (parsedExecs.length > 0) {
          const remoteIds = new Set(parsedExecs.map(e => e.id));
          const currentDefaults = INITIAL_CURRENT_EXECUTIVES.filter(e => !remoteIds.has(e.id));
          const merged = [...parsedExecs, ...currentDefaults].filter(e => !e.id?.startsWith('past-2'));
          merged.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));
          
          if (typeof window !== 'undefined') {
            localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new Event('nacos_executives_updated'));
          }
          return merged;
        }
      }
    }
  } catch (err) {
    console.warn('Supabase fetch executives from media_assets notice:', err);
  }

  return getExecutives('all');
}

export const DEFAULT_EXECUTIVES_PAGE_SETTINGS = {
  heroImage: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569305/nacos/executives/nacos_exec_group.jpg',
  heroTitle: 'NACOS EXECUTIVES',
  heroYear: '2026',
  heroSubtitle: 'Meet the team elected to serve and represent the students of the Department of Computer Science.',
  currentSessionTitle: 'Current Executives (2025/2026)',
  pastSessionTitle: 'Past Executives (2024/2025)'
};

// Initial Seeded Current Executives
export const INITIAL_CURRENT_EXECUTIVES = [
  {
    id: 'exec-1',
    name: 'High Comrade Irechukwu Emmanuel S.',
    role: 'President',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569275/nacos/executives/president_irechukwu.jpg',
    cloudinary_public_id: 'nacos/executives/president_irechukwu',
    category: 'current',
    session: '2025/2026',
    order_index: 0
  },
  {
    id: 'exec-2',
    name: 'Comrade Okolie Chinaemereme E.',
    role: 'Vice President',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569279/nacos/executives/vp_chinaemerem.jpg',
    cloudinary_public_id: 'nacos/executives/vp_chinaemerem',
    category: 'current',
    session: '2025/2026',
    order_index: 1
  },
  {
    id: 'exec-3',
    name: 'High Comrade Egwuonwu Makuochukwu V.',
    role: 'Secretary General',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569277/nacos/executives/sec_gen_makuochukwu.jpg',
    cloudinary_public_id: 'nacos/executives/sec_gen_makuochukwu',
    category: 'current',
    session: '2025/2026',
    order_index: 2
  },
  {
    id: 'exec-4',
    name: 'Comrade Jibulu Chinecherem Favour',
    role: 'Ass. Secretary General',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569268/nacos/executives/asg_chinecherem.jpg',
    cloudinary_public_id: 'nacos/executives/asg_chinecherem',
    category: 'current',
    session: '2025/2026',
    order_index: 3
  },
  {
    id: 'exec-5',
    name: 'Comrade Nzeh Daniel Chukwuka',
    role: 'Financial Secretary',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569269/nacos/executives/daniel_chukwuka.jpg',
    cloudinary_public_id: 'nacos/executives/daniel_chukwuka',
    category: 'current',
    session: '2025/2026',
    order_index: 4
  },
  {
    id: 'exec-6',
    name: 'Comrade Pedro Dennis Chikamso',
    role: 'Treasurer',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569278/nacos/executives/treasurer_chikamso.jpg',
    cloudinary_public_id: 'nacos/executives/treasurer_chikamso',
    category: 'current',
    session: '2025/2026',
    order_index: 5
  },
  {
    id: 'exec-7',
    name: 'Journalist Comrade Balogun John M.',
    role: 'P.R.O',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569276/nacos/executives/pro_john.jpg',
    cloudinary_public_id: 'nacos/executives/pro_john',
    category: 'current',
    session: '2025/2026',
    order_index: 6
  },
  {
    id: 'exec-8',
    name: 'Comrade Jonathan Faith Onyoiza',
    role: 'Director of Welfare',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569280/nacos/executives/welfare_onyoiza.jpg',
    cloudinary_public_id: 'nacos/executives/welfare_onyoiza',
    category: 'current',
    session: '2025/2026',
    order_index: 7
  },
  {
    id: 'exec-9',
    name: 'Comrade Anyanwu Nestor Ifeanyi',
    role: 'Director of ICT',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569272/nacos/executives/ict_dir_ifeanyi.jpg',
    cloudinary_public_id: 'nacos/executives/ict_dir_ifeanyi',
    category: 'current',
    session: '2025/2026',
    order_index: 8
  },
  {
    id: 'exec-10',
    name: 'Comrade Okere Kelechukwu Victory',
    role: 'Asst. Director of ICT',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569271/nacos/executives/ict_asst_victory.jpg',
    cloudinary_public_id: 'nacos/executives/ict_asst_victory',
    category: 'current',
    session: '2025/2026',
    order_index: 9
  },
  {
    id: 'exec-11',
    name: 'Comrade Ikenna Elvis Munachimso',
    role: 'Director of Socials',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569273/nacos/executives/socials_dir_munachimso.jpg',
    cloudinary_public_id: 'nacos/executives/socials_dir_munachimso',
    category: 'current',
    session: '2025/2026',
    order_index: 10
  },
  {
    id: 'exec-12',
    name: 'Comrade Azubuike Ebenezer Ifeanyi',
    role: 'Director of Sports',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569274/nacos/executives/sports_dir_ifeanyi.jpg',
    cloudinary_public_id: 'nacos/executives/sports_dir_ifeanyi',
    category: 'current',
    session: '2025/2026',
    order_index: 11
  },
  {
    id: 'exec-13',
    name: 'Comrade Emeka Mmesoma Rosemary',
    role: 'Provost 1',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569275/nacos/executives/provost1_rosemary.jpg',
    cloudinary_public_id: 'nacos/executives/provost1_rosemary',
    category: 'current',
    session: '2025/2026',
    order_index: 12
  },
  {
    id: 'exec-14',
    name: 'Comrade Nduka Anselem Chidera',
    role: 'Provost 2',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569276/nacos/executives/provost2_chidera.jpg',
    cloudinary_public_id: 'nacos/executives/provost2_chidera',
    category: 'current',
    session: '2025/2026',
    order_index: 13
  },
  {
    id: 'exec-15',
    name: 'HON. Ogbu Promise Ruby Ucha',
    role: 'MSRC',
    image: 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569274/nacos/executives/msrc_ruby.jpg',
    cloudinary_public_id: 'nacos/executives/msrc_ruby',
    category: 'current',
    session: '2025/2026',
    order_index: 14
  }
];

// Initial Seeded Past Executives (Dynamic - only populated from Admin Dashboard)
export const INITIAL_PAST_EXECUTIVES = [];

// Helper to get all seeded items initially
function getAllInitialExecutives() {
  return [...INITIAL_CURRENT_EXECUTIVES, ...INITIAL_PAST_EXECUTIVES];
}

// ─────────────────────────────────────────────────────────────
// 1. PAGE HEADER SETTINGS METHODS
// ─────────────────────────────────────────────────────────────

export function getExecutivesSettings() {
  if (typeof window === 'undefined') return DEFAULT_EXECUTIVES_PAGE_SETTINGS;

  try {
    const raw = localStorage.getItem(EXECUTIVES_SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_EXECUTIVES_PAGE_SETTINGS, ...JSON.parse(raw) };
    }
    // Seed initial settings into localStorage
    localStorage.setItem(EXECUTIVES_SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_EXECUTIVES_PAGE_SETTINGS));
    return DEFAULT_EXECUTIVES_PAGE_SETTINGS;
  } catch (err) {
    console.warn('Error reading executives settings:', err);
    return DEFAULT_EXECUTIVES_PAGE_SETTINGS;
  }
}

export async function updateExecutivesSettings(newSettings) {
  const current = getExecutivesSettings();
  const updated = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('nacos_executives_settings_updated'));
  }

  // Attempt Supabase synchronization
  try {
    if (supabase) {
      await supabase.from('nacos_executives_settings').upsert({
        id: 'default',
        hero_image: updated.heroImage,
        hero_title: updated.heroTitle,
        hero_year: updated.heroYear,
        hero_subtitle: updated.heroSubtitle,
        current_session_title: updated.currentSessionTitle,
        past_session_title: updated.pastSessionTitle,
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Supabase sync warning for executives settings:', err);
  }

  try {
    if (supabase) {
      await supabase.from('media_assets').upsert({
        cloudinary_public_id: 'nacos/executives/page_settings',
        image_url: updated.heroImage || DEFAULT_EXECUTIVES_PAGE_SETTINGS.heroImage,
        image_alt: JSON.stringify(updated),
        media_type: 'image',
        folder: 'nacos/executives',
        category: 'executives',
        entity_type: 'executives_settings',
        entity_id: 'settings_default',
        updated_at: new Date().toISOString()
      }, { onConflict: 'cloudinary_public_id' });
    }
  } catch (e) {
    console.warn('Universal settings live sync notice:', e);
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────
// 2. EXECUTIVES DIRECTORY CRUD METHODS
// ─────────────────────────────────────────────────────────────

export function getExecutives(category = 'all') {
  if (typeof window === 'undefined') {
    const all = getAllInitialExecutives();
    if (category === 'all') return all;
    return all.filter(e => e.category === category);
  }

  try {
    const raw = localStorage.getItem(EXECUTIVES_STORAGE_KEY);
    let list = raw ? JSON.parse(raw) : null;

    if (!list || !Array.isArray(list) || list.length === 0) {
      list = getAllInitialExecutives();
      localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(list));
    } else {
      // Merge any newly introduced initial executives (e.g., archived historical sessions)
      const existingIds = new Set(list.map(e => e.id));
      const missingInitial = getAllInitialExecutives().filter(e => !existingIds.has(e.id));
      if (missingInitial.length > 0) {
        list = [...list, ...missingInitial];
        localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(list));
      }
    }

    list = list.filter(e => !e.id?.startsWith('past-2'));
    // Sort by order_index ascending
    list.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

    if (category === 'all') return list;
    return list.filter(e => e.category === category);
  } catch (err) {
    console.warn('Error reading executives list:', err);
    return getAllInitialExecutives().filter(e => category === 'all' || e.category === category);
  }
}

export async function saveExecutive(execData) {
  const list = getExecutives('all');
  const now = new Date().toISOString();

  let updatedList;
  let savedItem;

  if (execData.id) {
    // Update existing
    savedItem = {
      ...execData,
      updated_at: now
    };
    updatedList = list.map(item => item.id === execData.id ? savedItem : item);
  } else {
    // Create new
    const categoryList = list.filter(e => e.category === (execData.category || 'current'));
    const maxOrder = categoryList.reduce((max, e) => Math.max(max, e.order_index ?? 0), -1);

    savedItem = {
      ...execData,
      id: `exec-${Date.now()}`,
      category: execData.category || 'current',
      order_index: execData.order_index ?? (maxOrder + 1),
      created_at: now,
      updated_at: now
    };
    updatedList = [savedItem, ...list];
  }

  if (savedItem.session) {
    addTenure(savedItem.session);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  // Attempt Supabase synchronization
  try {
    if (supabase) {
      await supabase.from('nacos_executives').upsert({
        id: savedItem.id,
        name: savedItem.name,
        role: savedItem.role,
        image: savedItem.image,
        cloudinary_public_id: savedItem.cloudinary_public_id,
        category: savedItem.category,
        session: savedItem.session,
        order_index: savedItem.order_index,
        updated_at: now
      });
    }
  } catch (err) {
    console.warn('Supabase sync warning for saveExecutive:', err);
  }

  try {
    if (supabase) {
      await supabase.from('media_assets').upsert({
        cloudinary_public_id: savedItem.cloudinary_public_id || ('nacos/executives/' + savedItem.id),
        image_url: savedItem.image || 'https://res.cloudinary.com/z3wgqisj/image/upload/v1788569275/nacos/executives/president_irechukwu.jpg',
        image_alt: JSON.stringify(savedItem),
        media_type: 'image',
        folder: 'nacos/executives',
        category: 'executives',
        entity_type: 'executive',
        entity_id: savedItem.id,
        updated_at: now
      }, { onConflict: 'cloudinary_public_id' });
    }
  } catch (e) {
    console.warn('Universal executive live sync notice:', e);
  }

  // Admin Notification
  addAdminNotification({
    type: 'executives',
    title: execData.id ? 'Executive Profile Updated' : 'New Executive Added',
    message: `${savedItem.name} (${savedItem.role}) was ${execData.id ? 'updated' : 'added'} to ${savedItem.category} executives.`,
    entityId: savedItem.id,
    link: '/admin/executives'
  });

  return savedItem;
}

export async function deleteExecutive(id) {
  const list = getExecutives('all');
  const target = list.find(e => e.id === id);
  const updatedList = list.filter(e => e.id !== id);

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('nacos_executives').delete().eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase sync warning for deleteExecutive:', err);
  }

  try {
    if (supabase) {
      await supabase.from('media_assets').delete().eq('entity_id', id);
    }
  } catch (e) {
    console.warn('Universal executive live delete notice:', e);
  }

  if (target) {
    addAdminNotification({
      type: 'executives',
      title: 'Executive Removed',
      message: `${target.name} (${target.role}) was removed from the directory.`,
      entityId: id,
      link: '/admin/executives'
    });
  }

  return updatedList;
}

/**
 * Move a single executive from Current to Past
 */
export async function moveExecutiveToPast(id, pastSessionLabel = '2024/2025') {
  const list = getExecutives('all');
  const pastList = list.filter(e => e.category === 'past');
  const nextOrder = pastList.length;

  const updatedList = list.map(e => {
    if (e.id === id) {
      return {
        ...e,
        category: 'past',
        session: pastSessionLabel || e.session || '2024/2025',
        order_index: nextOrder,
        updated_at: new Date().toISOString()
      };
    }
    return e;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('nacos_executives').update({
        category: 'past',
        session: pastSessionLabel,
        order_index: nextOrder,
        updated_at: new Date().toISOString()
      }).eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase sync error on moveExecutiveToPast:', err);
  }

  const movedItem = updatedList.find(e => e.id === id);
  if (movedItem) {
    saveExecutive(movedItem).catch(() => {});
  }

  return updatedList;
}

/**
 * Move a single executive from Past to Current
 */
export async function moveExecutiveToCurrent(id, currentSessionLabel = '2025/2026') {
  const list = getExecutives('all');
  const currentList = list.filter(e => e.category === 'current');
  const nextOrder = currentList.length;

  const updatedList = list.map(e => {
    if (e.id === id) {
      return {
        ...e,
        category: 'current',
        session: currentSessionLabel || '2025/2026',
        order_index: nextOrder,
        updated_at: new Date().toISOString()
      };
    }
    return e;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  try {
    if (supabase) {
      await supabase.from('nacos_executives').update({
        category: 'current',
        session: currentSessionLabel,
        order_index: nextOrder,
        updated_at: new Date().toISOString()
      }).eq('id', id);
    }
  } catch (err) {
    console.warn('Supabase sync error on moveExecutiveToCurrent:', err);
  }

  const movedItem = updatedList.find(e => e.id === id);
  if (movedItem) {
    saveExecutive(movedItem).catch(() => {});
  }

  return updatedList;
}

/**
 * Archive entire Current Tenure to Past (Preserves exact order)
 */
export async function archiveCurrentTenure(archiveSession = '2024/2025', newTenureSession = '2025/2026') {
  const list = getExecutives('all');
  const now = new Date().toISOString();

  // Find existing past max order
  const existingPast = list.filter(e => e.category === 'past');
  let basePastOrder = existingPast.length;

  const updatedList = list.map(e => {
    if (e.category === 'current') {
      const movedOrder = basePastOrder++;
      return {
        ...e,
        category: 'past',
        session: archiveSession,
        order_index: movedOrder,
        updated_at: now
      };
    }
    return e;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  // Update Page Settings titles to reflect the new tenure
  await updateExecutivesSettings({
    currentSessionTitle: `Current Executives (${newTenureSession})`,
    pastSessionTitle: `Past Executives (${archiveSession})`,
    heroYear: newTenureSession.split('/')[1] || newTenureSession
  });

  // Attempt Supabase batch update
  try {
    if (supabase) {
      const currentIds = list.filter(e => e.category === 'current').map(e => e.id);
      if (currentIds.length > 0) {
        await supabase.from('nacos_executives')
          .update({
            category: 'past',
            session: archiveSession,
            updated_at: now
          })
          .in('id', currentIds);
      }
    }
  } catch (err) {
    console.warn('Supabase sync error on archiveCurrentTenure:', err);
  }

  // Sync all archived records to media_assets for universal multi-device live sync
  try {
    for (const item of updatedList) {
      saveExecutive(item).catch(() => {});
    }
  } catch (e) {}

  addAdminNotification({
    type: 'executives',
    title: 'Executive Tenure Archived',
    message: `All current executives have been transitioned to past executives under session ${archiveSession}. Ready for new ${newTenureSession} council.`,
    entityId: 'archive',
    link: '/admin/executives'
  });

  return updatedList;
}

/**
 * Reorder executives within a category
 */
export async function reorderExecutives(category, orderedIds) {
  const list = getExecutives('all');
  const updatedList = list.map(item => {
    if (item.category === category) {
      const newIndex = orderedIds.indexOf(item.id);
      if (newIndex !== -1) {
        return { ...item, order_index: newIndex };
      }
    }
    return item;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  return updatedList;
}
