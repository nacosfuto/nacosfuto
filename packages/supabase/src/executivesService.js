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
  '2020/2021',
  '2019/2020'
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
    // 1. Authoritative check on live Supabase store_executives row
    const { data: storeRow } = await supabase
      .from('id_card_settings')
      .select('academic_session')
      .eq('id', 'store_executives')
      .maybeSingle();

    if (storeRow?.academic_session) {
      try {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(parsed));
            window.dispatchEvent(new Event('nacos_executives_updated'));
          }

          // Check settings store
          const { data: setRow } = await supabase
            .from('id_card_settings')
            .select('academic_session')
            .eq('id', 'store_executives_settings')
            .maybeSingle();
          if (setRow?.academic_session) {
            try {
              const parsedSet = JSON.parse(setRow.academic_session);
              if (typeof window !== 'undefined') {
                localStorage.setItem(EXECUTIVES_SETTINGS_STORAGE_KEY, JSON.stringify(parsedSet));
                window.dispatchEvent(new Event('nacos_executives_settings_updated'));
              }
            } catch (_) {}
          }

          return parsed;
        }
      } catch (e) {}
    }

    // 2. Fallback check on media_assets
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('category', 'executives')
      .order('created_at', { ascending: false });

    if (!error && data && Array.isArray(data)) {
      const execAssets = data.filter(d => d.entity_type === 'executives' || d.entity_type === 'executive');
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
          const missingDefaults = getAllInitialExecutives().filter(e => !remoteIds.has(e.id));
          const merged = [...parsedExecs, ...missingDefaults].filter(e => e.id !== 'test-123');
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
    console.warn('Supabase fetch executives notice:', err);
  }

  return getExecutives('all');
}

export const DEFAULT_EXECUTIVES_PAGE_SETTINGS = {
  heroImage: '',
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
    image: '',
    cloudinary_public_id: 'nacos/executives/president_irechukwu',
    category: 'current',
    session: '2025/2026',
    order_index: 0
  },
  {
    id: 'exec-2',
    name: 'Comrade Okolie Chinaemereme E.',
    role: 'Vice President',
    image: '',
    cloudinary_public_id: 'nacos/executives/vp_chinaemerem',
    category: 'current',
    session: '2025/2026',
    order_index: 1
  },
  {
    id: 'exec-3',
    name: 'High Comrade Egwuonwu Makuochukwu V.',
    role: 'Secretary General',
    image: '',
    cloudinary_public_id: 'nacos/executives/sec_gen_makuochukwu',
    category: 'current',
    session: '2025/2026',
    order_index: 2
  },
  {
    id: 'exec-4',
    name: 'Comrade Jibulu Chinecherem Favour',
    role: 'Ass. Secretary General',
    image: '',
    cloudinary_public_id: 'nacos/executives/asg_chinecherem',
    category: 'current',
    session: '2025/2026',
    order_index: 3
  },
  {
    id: 'exec-5',
    name: 'Comrade Nzeh Daniel Chukwuka',
    role: 'Financial Secretary',
    image: '',
    cloudinary_public_id: 'nacos/executives/daniel_chukwuka',
    category: 'current',
    session: '2025/2026',
    order_index: 4
  },
  {
    id: 'exec-6',
    name: 'Comrade Pedro Dennis Chikamso',
    role: 'Treasurer',
    image: '',
    cloudinary_public_id: 'nacos/executives/treasurer_chikamso',
    category: 'current',
    session: '2025/2026',
    order_index: 5
  },
  {
    id: 'exec-7',
    name: 'Journalist Comrade Balogun John M.',
    role: 'P.R.O',
    image: '',
    cloudinary_public_id: 'nacos/executives/pro_john',
    category: 'current',
    session: '2025/2026',
    order_index: 6
  },
  {
    id: 'exec-8',
    name: 'Comrade Jonathan Faith Onyoiza',
    role: 'Director of Welfare',
    image: '',
    cloudinary_public_id: 'nacos/executives/welfare_onyoiza',
    category: 'current',
    session: '2025/2026',
    order_index: 7
  },
  {
    id: 'exec-9',
    name: 'Comrade Anyanwu Nestor Ifeanyi',
    role: 'Director of ICT',
    image: '',
    cloudinary_public_id: 'nacos/executives/ict_dir_ifeanyi',
    category: 'current',
    session: '2025/2026',
    order_index: 8
  },
  {
    id: 'exec-10',
    name: 'Comrade Okere Kelechukwu Victory',
    role: 'Asst. Director of ICT',
    image: '',
    cloudinary_public_id: 'nacos/executives/ict_asst_victory',
    category: 'current',
    session: '2025/2026',
    order_index: 9
  },
  {
    id: 'exec-11',
    name: 'Comrade Ikenna Elvis Munachimso',
    role: 'Director of Socials',
    image: '',
    cloudinary_public_id: 'nacos/executives/socials_dir_munachimso',
    category: 'current',
    session: '2025/2026',
    order_index: 10
  },
  {
    id: 'exec-12',
    name: 'Comrade Azubuike Ebenezer Ifeanyi',
    role: 'Director of Sports',
    image: '',
    cloudinary_public_id: 'nacos/executives/sports_dir_ifeanyi',
    category: 'current',
    session: '2025/2026',
    order_index: 11
  },
  {
    id: 'exec-13',
    name: 'Comrade Emeka Mmesoma Rosemary',
    role: 'Provost 1',
    image: '',
    cloudinary_public_id: 'nacos/executives/provost1_rosemary',
    category: 'current',
    session: '2025/2026',
    order_index: 12
  },
  {
    id: 'exec-14',
    name: 'Comrade Nduka Anselem Chidera',
    role: 'Provost 2',
    image: '',
    cloudinary_public_id: 'nacos/executives/provost2_chidera',
    category: 'current',
    session: '2025/2026',
    order_index: 13
  },
  {
    id: 'exec-15',
    name: 'HON. Ogbu Promise Ruby Ucha',
    role: 'MSRC',
    image: '',
    cloudinary_public_id: 'nacos/executives/msrc_ruby',
    category: 'current',
    session: '2025/2026',
    order_index: 14
  }
];

// Initial Seeded Past Executives (2019/2020 Sleek-Tech Executive)
export const INITIAL_PAST_EXECUTIVES = [
  {
    id: 'exec-2019-1',
    name: 'Rtr. Comr. Igwe Kingsley',
    role: 'President',
    category: 'past',
    session: '2019/2020',
    order_index: 0,
    image: ''
  },
  {
    id: 'exec-2019-2',
    name: 'Comr. Iwuono Obiamaka',
    role: 'Vice President',
    category: 'past',
    session: '2019/2020',
    order_index: 1,
    image: ''
  },
  {
    id: 'exec-2019-3',
    name: 'Rtr. Comr. Nwido Paul',
    role: 'Secretary General',
    category: 'past',
    session: '2019/2020',
    order_index: 2,
    image: ''
  },
  {
    id: 'exec-2019-4',
    name: 'Comr. Amaechi Prisca',
    role: 'Asst. Secretary General',
    category: 'past',
    session: '2019/2020',
    order_index: 3,
    image: ''
  },
  {
    id: 'exec-2019-5',
    name: 'Comr. Emezie Victor',
    role: 'Financial Secretary',
    category: 'past',
    session: '2019/2020',
    order_index: 4,
    image: ''
  },
  {
    id: 'exec-2019-6',
    name: 'Comr. Sunday Beauty',
    role: 'Treasurer',
    category: 'past',
    session: '2019/2020',
    order_index: 5,
    image: ''
  },
  {
    id: 'exec-2019-7',
    name: 'Comr. Onyekachi Franklin',
    role: 'P.R.O',
    category: 'past',
    session: '2019/2020',
    order_index: 6,
    image: ''
  },
  {
    id: 'exec-2019-8',
    name: 'Comr. Ibe Victor',
    role: 'Director of Welfare',
    category: 'past',
    session: '2019/2020',
    order_index: 7,
    image: ''
  },
  {
    id: 'exec-2019-9',
    name: 'Comr. Ohaja Wisdom',
    role: 'Director of ICT',
    category: 'past',
    session: '2019/2020',
    order_index: 8,
    image: ''
  },
  {
    id: 'exec-2019-10',
    name: 'Comr. Mozie Promise',
    role: 'Director of Socials',
    category: 'past',
    session: '2019/2020',
    order_index: 9,
    image: ''
  },
  {
    id: 'exec-2019-11',
    name: 'Comr. Eze Stanley',
    role: 'Director of Sports',
    category: 'past',
    session: '2019/2020',
    order_index: 10,
    image: ''
  },
  {
    id: 'exec-2019-12',
    name: 'Comr. Nwaonumara Elochukwu',
    role: 'Provost 1',
    category: 'past',
    session: '2019/2020',
    order_index: 11,
    image: ''
  },
  {
    id: 'exec-2019-13',
    name: 'Comr. Ofordieze Anthony',
    role: 'Provost 2',
    category: 'past',
    session: '2019/2020',
    order_index: 12,
    image: ''
  },
  {
    id: 'exec-2019-14',
    name: 'Hon. Izeuma Thankgod',
    role: 'MSRC CSC',
    category: 'past',
    session: '2019/2020',
    order_index: 13,
    image: ''
  },
  {
    id: 'exec-2019-15',
    name: 'Comr. Okoye Goodness',
    role: 'Female Coordinator (Southeast)',
    category: 'past',
    session: '2019/2020',
    order_index: 14,
    image: ''
  },
  {
    id: 'exec-2019-16',
    name: 'Rtr. Comr. Ekejuba Chinonso',
    role: 'ICT Director (Imo State)',
    category: 'past',
    session: '2019/2020',
    order_index: 15,
    image: ''
  },
  {
    id: 'exec-2019-17',
    name: 'Dr. (Mrs) E.C. Nwokorie',
    role: 'Head of Department',
    category: 'past',
    session: '2019/2020',
    order_index: 16,
    image: ''
  },
  {
    id: 'exec-2019-18',
    name: 'Mr. Njoku Obilor',
    role: 'Staff Adviser',
    category: 'past',
    session: '2019/2020',
    order_index: 17,
    image: ''
  }
];

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

  // Authoritative live store sync to Supabase
  try {
    if (supabase) {
      supabase.from('id_card_settings').upsert({
        id: 'store_executives_settings',
        academic_session: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      }).then(() => {}).catch(() => {});
    }
  } catch (e) {}

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

    list = list.filter(e => e.id !== 'test-123');
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
  let list = getExecutives('all');
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_executives')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const remoteIds = new Set(parsed.map(e => e.id));
          list = [...parsed, ...list.filter(l => !remoteIds.has(l.id))];
        }
      }
    } catch (e) {}
  }

  const now = new Date().toISOString();
  let updatedList;
  let savedItem;

  if (execData.id && list.some(item => item.id === execData.id)) {
    // Update existing
    savedItem = {
      ...execData,
      updated_at: now
    };
    updatedList = list.map(item => item.id === execData.id ? savedItem : item);
  } else if (execData.id) {
    savedItem = {
      ...execData,
      updated_at: now
    };
    updatedList = [savedItem, ...list];
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

  // 1. Direct fast write to Supabase nacos_executives table
  if (supabase) {
    try {
      await supabase.from('nacos_executives').upsert({
        id: savedItem.id,
        name: savedItem.name,
        role: savedItem.role,
        image: savedItem.image || null,
        cloudinary_public_id: savedItem.cloudinary_public_id || null,
        category: savedItem.category || 'current',
        session: savedItem.session || '2025/2026',
        order_index: savedItem.order_index ?? 0,
        updated_at: now
      });
    } catch (err) {
      console.warn('Supabase nacos_executives save error:', err);
    }
  }

  // 2. Authoritative persistent save to Supabase store_executives
  if (supabase) {
    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_executives',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
    } catch (_) {}
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
  let list = getExecutives('all');
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_executives')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {}
  }

  const target = list.find(e => e.id === id);
  const updatedList = list.filter(e => e.id !== id);

  if (typeof window !== 'undefined') {
    localStorage.setItem(EXECUTIVES_STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('nacos_executives_updated'));
  }

  // Direct fast delete from Supabase nacos_executives table
  if (supabase) {
    try {
      await supabase.from('nacos_executives').delete().eq('id', id);
    } catch (e) {}

    try {
      await supabase.from('id_card_settings').upsert({
        id: 'store_executives',
        academic_session: JSON.stringify(updatedList),
        updated_at: new Date().toISOString()
      });
    } catch (_) {}
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
  let list = getExecutives('all');
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_executives')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {}
  }

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
      await supabase.from('id_card_settings').upsert({
        id: 'store_executives',
        academic_session: JSON.stringify(updatedList),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {}

  return updatedList;
}

/**
 * Move a single executive from Past to Current
 */
export async function moveExecutiveToCurrent(id, currentSessionLabel = '2025/2026') {
  let list = getExecutives('all');
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_executives')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {}
  }

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
      await supabase.from('id_card_settings').upsert({
        id: 'store_executives',
        academic_session: JSON.stringify(updatedList),
        updated_at: new Date().toISOString()
      });
    }
  } catch (err) {}

  return updatedList;
}

/**
 * Archive entire Current Tenure to Past (Preserves exact order)
 */
export async function archiveCurrentTenure(archiveSession = '2024/2025', newTenureSession = '2025/2026') {
  let list = getExecutives('all');
  if (supabase) {
    try {
      const { data: storeRow } = await supabase
        .from('id_card_settings')
        .select('academic_session')
        .eq('id', 'store_executives')
        .maybeSingle();
      if (storeRow?.academic_session) {
        const parsed = JSON.parse(storeRow.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (e) {}
  }

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

  // Persistent save to Supabase store_executives
  try {
    if (supabase) {
      await supabase.from('id_card_settings').upsert({
        id: 'store_executives',
        academic_session: JSON.stringify(updatedList),
        updated_at: now
      });
    }
  } catch (err) {}

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

  try {
    if (supabase) {
      supabase.from('id_card_settings').upsert({
        id: 'store_executives',
        academic_session: JSON.stringify(updatedList),
        updated_at: new Date().toISOString()
      }).then(() => {}).catch(() => {});
    }
  } catch (err) {}

  return updatedList;
}
