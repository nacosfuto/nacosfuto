/**
 * @file packages/supabase/src/courseFoldersService.js
 * Authoritative Service for Course Google Drive Cloud Folders (100L - 500L)
 * 
 * Provides:
 * 1. Default schema for 100L, 200L, 300L, 400L, and 500L Google Drive folders.
 * 2. Real-time synchronization with Supabase (id_card_settings: 'store_course_folders').
 * 3. Client caching for zero-layout-shift instant page loads.
 * 4. Admin update persistence for Portal Admin / Website Admin.
 */

import { supabase, isSupabaseConfigured } from './client.js';

export const DEFAULT_COURSE_FOLDERS = [
  {
    level: '100 Level',
    shortLevel: '100L',
    title: '100 Level',
    description: 'First year foundational courses, lecture notes & past questions',
    drive_url: ''
  },
  {
    level: '200 Level',
    shortLevel: '200L',
    title: '200 Level',
    description: 'Second year departmental courses & past questions',
    drive_url: ''
  },
  {
    level: '300 Level',
    shortLevel: '300L',
    title: '300 Level',
    description: 'Third year core computing & practical courses',
    drive_url: ''
  },
  {
    level: '400 Level',
    shortLevel: '400L',
    title: '400 Level',
    description: 'Fourth year advanced modules, SIWES & past questions',
    drive_url: ''
  },
  {
    level: '500 Level',
    shortLevel: '500L',
    title: '500 Level',
    description: 'Final year research, projects & specialized electives',
    drive_url: ''
  }
];

const CACHE_KEY = 'nacos_course_folders_cache';

/**
 * Returns locally cached course folders or default structure.
 */
export function getLocalCourseFolders() {
  if (typeof window === 'undefined') return DEFAULT_COURSE_FOLDERS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeWithDefaults(parsed);
      }
    }
  } catch (_) {}
  return DEFAULT_COURSE_FOLDERS;
}

/**
 * Merges loaded folders with standard 100L-500L structure to guarantee completeness.
 */
function mergeWithDefaults(loadedFolders) {
  const map = new Map();
  if (Array.isArray(loadedFolders)) {
    loadedFolders.forEach(item => {
      if (item && item.level) {
        map.set(item.level.trim().toLowerCase(), item);
      }
    });
  }

  return DEFAULT_COURSE_FOLDERS.map(def => {
    const key = def.level.trim().toLowerCase();
    const existing = map.get(key);
    return {
      ...def,
      ...(existing || {}),
      level: def.level,
      shortLevel: def.shortLevel,
      title: def.title
    };
  });
}

/**
 * Authoritatively fetches course folders from Supabase id_card_settings.
 */
export async function fetchCourseFolders() {
  const cached = getLocalCourseFolders();
  if (!isSupabaseConfigured || !supabase) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('id_card_settings')
      .select('id, academic_session, updated_at')
      .eq('id', 'store_course_folders')
      .maybeSingle();

    if (error) {
      console.warn('[CourseFoldersService] Fetch error:', error.message);
      return cached;
    }

    if (data?.academic_session) {
      try {
        const parsed = JSON.parse(data.academic_session);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeWithDefaults(parsed);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
            } catch (_) {}
          }
          return merged;
        }
      } catch (parseErr) {
        console.warn('[CourseFoldersService] Parse error:', parseErr);
      }
    }

    return cached;
  } catch (err) {
    console.warn('[CourseFoldersService] Query failure:', err);
    return cached;
  }
}

/**
 * Persists course folders to Supabase id_card_settings.
 */
export async function updateCourseFolders(folders) {
  if (!Array.isArray(folders)) {
    return { success: false, error: 'Course folders must be an array.' };
  }

  const merged = mergeWithDefaults(folders);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('nacos_course_folders_updated', { detail: merged }));
    } catch (_) {}
  }

  if (!isSupabaseConfigured || !supabase) {
    return { success: true, data: merged };
  }

  try {
    const { error } = await supabase
      .from('id_card_settings')
      .upsert({
        id: 'store_course_folders',
        academic_session: JSON.stringify(merged),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[CourseFoldersService] Update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: merged };
  } catch (err) {
    console.error('[CourseFoldersService] Exception:', err);
    return { success: false, error: err.message };
  }
}
