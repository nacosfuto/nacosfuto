/**
 * NACOS FUTO Academic Sessions & Progression Database Service
 * 
 * Manages institutional academic sessions, current active session state,
 * and database synchronization with Supabase.
 */

import { supabase } from './client.js';
import { 
  DEFAULT_ACADEMIC_YEAR_START,
  parseSessionYears, 
  getAcademicSession, 
  setActiveAcademicSession, 
  getActiveAcademicSession,
  getActiveAcademicYearStart,
  calculateAcademicProgression
} from '@nacos/config/academic';

const LOCAL_SESSIONS_KEY = 'nacos_academic_sessions_db';

const DEFAULT_SESSIONS = [
  { id: 'sess-2024-2025', session_name: '2024/2025', start_year: 2024, end_year: 2025, is_current: false },
  { id: 'sess-2025-2026', session_name: '2025/2026', start_year: 2025, end_year: 2026, is_current: false },
  { id: 'sess-2026-2027', session_name: '2026/2027', start_year: 2026, end_year: 2027, is_current: true },
  { id: 'sess-2027-2028', session_name: '2027/2028', start_year: 2027, end_year: 2028, is_current: false },
  { id: 'sess-2028-2029', session_name: '2028/2029', start_year: 2028, end_year: 2029, is_current: false },
  { id: 'sess-2029-2030', session_name: '2029/2030', start_year: 2029, end_year: 2030, is_current: false },
];

function getLocalSessions() {
  if (typeof localStorage === 'undefined') return DEFAULT_SESSIONS;
  try {
    const stored = localStorage.getItem(LOCAL_SESSIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_SESSIONS;
}

function saveLocalSessions(sessions) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (_) {}
  }
}

/**
 * Fetch all academic sessions from Supabase database
 * Returns ordered by start_year descending
 */
export async function fetchAcademicSessionsFromDatabase() {
  if (supabase) {
    try {
      // 1. Query academic_sessions table
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .order('start_year', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        saveLocalSessions(data);

        // Find current session and sync in-memory state
        const current = data.find(s => s.is_current === true);
        if (current) {
          setActiveAcademicSession(current.start_year);
        }
        return data;
      }

      // If table is empty or doesn't exist yet, check academic_settings
      const { data: settingsRow } = await supabase
        .from('academic_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (settingsRow?.current_session) {
        const parsed = parseSessionYears(settingsRow.current_session);
        setActiveAcademicSession(parsed.startYear);
      }
    } catch (e) {
      console.warn('[Academic Service] Supabase sessions query notice:', e.message);
    }
  }

  // Fallback to local session store
  const local = getLocalSessions();
  const currentLocal = local.find(s => s.is_current === true);
  if (currentLocal) {
    setActiveAcademicSession(currentLocal.start_year);
  }
  return local;
}

/**
 * Get current active academic session record
 */
export async function getCurrentAcademicSessionRecord() {
  const sessions = await fetchAcademicSessionsFromDatabase();
  const active = sessions.find(s => s.is_current === true);
  if (active) return active;

  return {
    id: 'default',
    session_name: getActiveAcademicSession(),
    start_year: getActiveAcademicYearStart(),
    end_year: getActiveAcademicYearStart() + 1,
    is_current: true
  };
}

/**
 * Switch active academic session system-wide
 * Automatically updates Supabase academic_sessions, academic_settings, and id_card_settings.
 * Broadcasts system event so all students' academic levels are dynamically recalculated.
 */
export async function setActiveAcademicSessionInDatabase(sessionIdentifier) {
  let targetSessionName = '';
  let targetStartYear = DEFAULT_ACADEMIC_YEAR_START;

  if (typeof sessionIdentifier === 'string') {
    if (sessionIdentifier.includes('/')) {
      targetSessionName = sessionIdentifier.trim();
      const p = parseSessionYears(targetSessionName);
      targetStartYear = p.startYear;
    } else {
      // Could be UUID
      const currentList = getLocalSessions();
      const match = currentList.find(s => s.id === sessionIdentifier);
      if (match) {
        targetSessionName = match.session_name;
        targetStartYear = match.start_year;
      } else {
        const p = parseSessionYears(sessionIdentifier);
        targetSessionName = p.sessionName;
        targetStartYear = p.startYear;
      }
    }
  } else if (typeof sessionIdentifier === 'number') {
    targetStartYear = sessionIdentifier;
    targetSessionName = getAcademicSession(sessionIdentifier);
  }

  const targetEndYear = targetStartYear + 1;
  const now = new Date().toISOString();

  // 1. Update Supabase Database
  if (supabase) {
    try {
      // A. Update academic_sessions table
      // Mark all sessions as non-current
      await supabase
        .from('academic_sessions')
        .update({ is_current: false, updated_at: now })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Set target session as current, or upsert it
      const { error: upsertErr } = await supabase
        .from('academic_sessions')
        .upsert({
          session_name: targetSessionName,
          start_year: targetStartYear,
          end_year: targetEndYear,
          is_current: true,
          updated_at: now
        }, { onConflict: 'session_name' });

      if (upsertErr) {
        console.warn('[Academic Service] Session upsert notice:', upsertErr.message);
      }

      // B. Update academic_settings table
      await supabase
        .from('academic_settings')
        .upsert({
          id: 'default',
          current_academic_year_start: targetStartYear,
          current_session: targetSessionName,
          updated_at: now
        }, { onConflict: 'id' });

      // C. Synchronize id_card_settings for unified dues, payment, and ID verification
      await supabase
        .from('id_card_settings')
        .upsert([
          { id: 'default', academic_session: targetSessionName, updated_at: now },
          { id: 'dues', academic_session: targetSessionName, updated_at: now }
        ], { onConflict: 'id' });

    } catch (dbErr) {
      console.error('[Academic Service] Database session update error:', dbErr);
    }
  }

  // 2. Update local state and dispatch system-wide progression change event
  setActiveAcademicSession(targetStartYear);

  // Update local sessions cache
  const localList = getLocalSessions();
  const updatedLocal = localList.map(s => ({
    ...s,
    is_current: s.session_name === targetSessionName || s.start_year === targetStartYear
  }));
  if (!updatedLocal.some(s => s.is_current)) {
    updatedLocal.unshift({
      id: `sess-${targetStartYear}-${targetEndYear}`,
      session_name: targetSessionName,
      start_year: targetStartYear,
      end_year: targetEndYear,
      is_current: true
    });
  }
  saveLocalSessions(updatedLocal);

  return {
    success: true,
    sessionName: targetSessionName,
    startYear: targetStartYear,
    endYear: targetEndYear
  };
}

/**
 * Create a new academic session in the database
 */
export async function createAcademicSessionInDatabase({ sessionName, startDate = null, endDate = null, isCurrent = false }) {
  const parsed = parseSessionYears(sessionName);
  const now = new Date().toISOString();

  const newSessionRecord = {
    session_name: parsed.sessionName,
    start_year: parsed.startYear,
    end_year: parsed.endYear,
    is_current: Boolean(isCurrent),
    start_date: startDate || `${parsed.startYear}-10-01`,
    end_date: endDate || `${parsed.endYear}-09-30`,
    updated_at: now
  };

  if (supabase) {
    try {
      if (isCurrent) {
        await supabase
          .from('academic_sessions')
          .update({ is_current: false })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await supabase
        .from('academic_sessions')
        .upsert(newSessionRecord, { onConflict: 'session_name' })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (isCurrent) {
        await setActiveAcademicSessionInDatabase(parsed.startYear);
      }

      return { success: true, session: data || newSessionRecord };
    } catch (e) {
      console.error('[Academic Service] Failed to create session:', e);
      throw e;
    }
  }

  // Local fallback
  const list = getLocalSessions();
  if (isCurrent) {
    list.forEach(s => s.is_current = false);
  }
  const existingIdx = list.findIndex(s => s.session_name === parsed.sessionName);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...newSessionRecord };
  } else {
    list.unshift({ id: `sess-${parsed.startYear}-${parsed.endYear}`, ...newSessionRecord });
  }
  saveLocalSessions(list);

  if (isCurrent) {
    setActiveAcademicSession(parsed.startYear);
  }

  return { success: true, session: newSessionRecord };
}
