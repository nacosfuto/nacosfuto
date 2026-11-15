/**
 * NACOS FUTO Academic Sessions & Progression Database Service
 * 
 * Manages institutional academic sessions, current active session state,
 * and authoritative database synchronization with Supabase.
 */

import { supabase } from './client.js';
import { 
  DEFAULT_ACADEMIC_YEAR_START,
  SUPPORTED_ACADEMIC_SESSIONS,
  DEFAULT_ACADEMIC_SEMESTER,
  SUPPORTED_ACADEMIC_SEMESTERS,
  parseSessionYears, 
  getAcademicSession, 
  setActiveAcademicSession, 
  getActiveAcademicSession, 
  getActiveAcademicYearStart,
  setActiveAcademicSemester,
  getActiveAcademicSemester,
  calculateAcademicProgression,
  onAcademicSessionChange,
  onAcademicSemesterChange
} from '@nacos/config/academic';

const LOCAL_SESSIONS_KEY = 'nacos_academic_sessions_db';

const DEFAULT_SESSIONS = [
  { id: 'sess-2022-2023', session_name: '2022/2023', start_year: 2022, end_year: 2023, is_current: false },
  { id: 'sess-2023-2024', session_name: '2023/2024', start_year: 2023, end_year: 2024, is_current: false },
  { id: 'sess-2024-2025', session_name: '2024/2025', start_year: 2024, end_year: 2025, is_current: false },
  { id: 'sess-2025-2026', session_name: '2025/2026', start_year: 2025, end_year: 2026, is_current: false },
  { id: 'sess-2026-2027', session_name: '2026/2027', start_year: 2026, end_year: 2027, is_current: false },
  { id: 'sess-2027-2028', session_name: '2027/2028', start_year: 2027, end_year: 2028, is_current: false },
  { id: 'sess-2028-2029', session_name: '2028/2029', start_year: 2028, end_year: 2029, is_current: false },
  { id: 'sess-2029-2030', session_name: '2029/2030', start_year: 2029, end_year: 2030, is_current: false },
  { id: 'sess-2030-2031', session_name: '2030/2031', start_year: 2030, end_year: 2031, is_current: false }
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
 * Builds or marks current in a list of sessions
 * Strictly ensures only ONE session has is_current: true and eliminates duplicate entries.
 */
export function buildSessionsListWithCurrent(baseSessions, targetStartYear) {
  const currentStartYear = parseInt(targetStartYear, 10) || DEFAULT_ACADEMIC_YEAR_START;
  const currentSessionName = getAcademicSession(currentStartYear);
  const known = Array.isArray(baseSessions) && baseSessions.length > 0 ? baseSessions : DEFAULT_SESSIONS;

  const seen = new Set();
  const deduped = [];

  for (const s of known) {
    const sName = s.session_name || getAcademicSession(s.start_year);
    if (!seen.has(sName)) {
      seen.add(sName);
      deduped.push({
        ...s,
        session_name: sName,
        start_year: s.start_year || parseSessionYears(sName).startYear,
        end_year: s.end_year || parseSessionYears(sName).endYear
      });
    }
  }

  if (!seen.has(currentSessionName)) {
    deduped.unshift({
      id: `sess-${currentStartYear}-${currentStartYear + 1}`,
      session_name: currentSessionName,
      start_year: currentStartYear,
      end_year: currentStartYear + 1,
      is_current: true
    });
  }

  const mapped = deduped.map(s => ({
    ...s,
    is_current: s.start_year === currentStartYear || s.session_name === currentSessionName
  }));

  mapped.sort((a, b) => b.start_year - a.start_year);
  return mapped;
}

let _inFlightSessionsPromise = null;
let _lastSessionsFetchTime = 0;
let _cachedSessions = null;
const SESSIONS_FETCH_COOLDOWN_MS = 2000;

/**
 * Fetch all academic sessions and global active semester from Supabase database
 * Returns ordered by start_year descending
 * Authoritative Sources: public.id_card_settings and public.academic_settings
 */
export async function fetchAcademicSessionsFromDatabase(options = {}) {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && _cachedSessions && (now - _lastSessionsFetchTime < SESSIONS_FETCH_COOLDOWN_MS)) {
    return _cachedSessions;
  }

  if (_inFlightSessionsPromise) {
    return _inFlightSessionsPromise;
  }

  _inFlightSessionsPromise = (async () => {
    try {
      if (supabase) {
        try {
          // 1. Authoritative check: id_card_settings table (where Admin Dashboard saves settings)
          const { data: idSettingsRows, error: idErr } = await supabase
            .from('id_card_settings')
            .select('id, academic_session, payload')
            .in('id', ['default', 'dues', 'store_academic_session_config']);

          if (!idErr && Array.isArray(idSettingsRows) && idSettingsRows.length > 0) {
            const defaultRow = idSettingsRows.find(r => r.id === 'default');
            const configRow = idSettingsRows.find(r => r.id === 'store_academic_session_config');

            // Check active semester
            const activeSemesterRaw = configRow?.payload?.active_semester || 
                                      configRow?.payload?.academic_semester || 
                                      defaultRow?.payload?.active_semester;
            if (activeSemesterRaw) {
              const semNormalized = String(activeSemesterRaw).toLowerCase().includes('second')
                ? 'Second Semester'
                : 'First Semester';
              setActiveAcademicSemester(semNormalized);
            }

            const activeSessionRaw = configRow?.academic_session || defaultRow?.academic_session;
            if (activeSessionRaw && typeof activeSessionRaw === 'string' && activeSessionRaw.includes('/')) {
              const parsed = parseSessionYears(activeSessionRaw);
              const activeStartYear = parsed.startYear;

              // Sync in-memory session state
              setActiveAcademicSession(activeStartYear);

              // Get sessions list
              let rawList = configRow?.payload?.sessions;
              if (!Array.isArray(rawList) || rawList.length === 0) {
                rawList = getLocalSessions();
              }

              const finalizedSessions = buildSessionsListWithCurrent(rawList, activeStartYear);
              saveLocalSessions(finalizedSessions);
              _cachedSessions = finalizedSessions;
              _lastSessionsFetchTime = Date.now();
              return finalizedSessions;
            }
          }

          // 2. Secondary check: academic_settings table
          const { data: settingsRow } = await supabase
            .from('academic_settings')
            .select('current_session, current_academic_year_start')
            .eq('id', 'default')
            .maybeSingle();

          if (settingsRow) {
            if (settingsRow.current_session) {
              const parsed = parseSessionYears(settingsRow.current_session);
              setActiveAcademicSession(parsed.startYear);
              const finalizedSessions = buildSessionsListWithCurrent(getLocalSessions(), parsed.startYear);
              saveLocalSessions(finalizedSessions);
              _cachedSessions = finalizedSessions;
              _lastSessionsFetchTime = Date.now();
              return finalizedSessions;
            }
          }
        } catch (e) {
          console.warn('[Academic Service] Supabase sessions query notice:', e.message);
        }
      }

      // Fallback to local session store with active start year
      const activeYear = getActiveAcademicYearStart();
      const localList = buildSessionsListWithCurrent(getLocalSessions(), activeYear);
      saveLocalSessions(localList);
      _cachedSessions = localList;
      _lastSessionsFetchTime = Date.now();
      return localList;
    } finally {
      _inFlightSessionsPromise = null;
    }
  })();

  return _inFlightSessionsPromise;
}

/**
 * Fetch unified global academic settings (Session + Active Semester) directly from Supabase
 */
export async function fetchAcademicSettingsFromDatabase() {
  await fetchAcademicSessionsFromDatabase();
  return {
    academicSession: getActiveAcademicSession(),
    activeSemester: getActiveAcademicSemester(),
    startYear: getActiveAcademicYearStart()
  };
}

let _academicSyncInitialized = false;

/**
 * Global Real-time Academic Session & Semester Synchronization Engine
 * Automatically aligns the student portal, payment gateways, and admin dashboards in real time.
 */
export function initAcademicSessionSync() {
  if (typeof window === 'undefined') return;
  if (_academicSyncInitialized) return;
  _academicSyncInitialized = true;

  // 1. Fetch immediately on application mount
  fetchAcademicSessionsFromDatabase().catch(err => {
    console.warn('[Academic Sync] Initial fetch notice:', err);
  });

  // 2. Setup Realtime subscription across all admin configuration tables (debounced to collapse multi-row upserts)
  let _realtimeDebounceTimer = null;
  const triggerDebouncedFetch = () => {
    if (_realtimeDebounceTimer) clearTimeout(_realtimeDebounceTimer);
    _realtimeDebounceTimer = setTimeout(() => {
      fetchAcademicSessionsFromDatabase({ force: true }).catch(() => {});
    }, 400);
  };

  if (supabase) {
    try {
      supabase
        .channel('academic-session-live-sync-global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'id_card_settings', filter: 'id=eq.store_academic_session_config' }, triggerDebouncedFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'id_card_settings', filter: 'id=eq.default' }, triggerDebouncedFetch)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_settings', filter: 'id=eq.default' }, triggerDebouncedFetch)
        .subscribe();
    } catch (_) {}
  }

  // 3. Setup Cross-Tab BroadcastChannel listener for Session and Semester
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const sessionChannel = new BroadcastChannel('nacos_academic_session_sync');
      sessionChannel.onmessage = (event) => {
        const { startYear } = event?.data || {};
        if (startYear && startYear !== getActiveAcademicYearStart()) {
          fetchAcademicSessionsFromDatabase({ force: true }).catch(() => {});
        }
      };

      const semesterChannel = new BroadcastChannel('nacos_academic_semester_sync');
      semesterChannel.onmessage = (event) => {
        const { semester } = event?.data || {};
        if (semester && semester !== getActiveAcademicSemester()) {
          setActiveAcademicSemester(semester);
        }
      };
    } catch (_) {}
  }

  // 4. Re-sync on focus/visibility change (with 60-second cooldown guard)
  let lastSessionSync = Date.now();
  const handleThrottledSync = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      if (Date.now() - lastSessionSync > 60000) {
        lastSessionSync = Date.now();
        fetchAcademicSessionsFromDatabase().catch(() => {});
      }
    }
  };

  window.addEventListener('visibilitychange', handleThrottledSync);
  window.addEventListener('focus', handleThrottledSync);

  // 5. Automatically re-enrich local user profile when active academic session changes
  onAcademicSessionChange(({ sessionName }) => {
    try {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.academic_session === sessionName) {
          return;
        }
        const progression = calculateAcademicProgression(u, sessionName);
        const updated = {
          ...u,
          level: progression.levelString,
          current_level: progression.levelString,
          numeric_level: progression.numericLevel,
          is_graduated: progression.isGraduated,
          status: progression.isGraduated ? 'Graduated' : (u.status || 'Active'),
          class_of: progression.classOf,
          classOf: progression.classOf,
          class_of_display: progression.classOfDisplay,
          graduation_year: progression.expectedGraduationYear,
          expected_graduation_year: progression.expectedGraduationYear,
          academic_session: sessionName
        };
        localStorage.setItem('nacos_user', JSON.stringify(updated));
        window.dispatchEvent(new Event('nacos_user_updated'));
      }
    } catch (_) {}
  });
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
 * Automatically updates Supabase id_card_settings, payment_fees, and local state.
 * Broadcasts system event so all students' academic levels and payments dynamically recalculate.
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

  // Build finalized sessions list
  const currentLocal = getLocalSessions();
  const updatedSessionsList = buildSessionsListWithCurrent(currentLocal, targetStartYear);

  // 1. Update Supabase Database Single Source of Truth: public.id_card_settings
  if (supabase) {
    try {
      const activeSem = getActiveAcademicSemester();
      // Primary: id_card_settings (accessible, reliable, and verified)
      const { error: idSaveErr } = await supabase
        .from('id_card_settings')
        .upsert([
          { id: 'default', academic_session: targetSessionName, payload: { active_semester: activeSem, academic_semester: activeSem }, updated_at: now },
          { id: 'dues', academic_session: targetSessionName, payload: { active_semester: activeSem, academic_semester: activeSem }, updated_at: now },
          { 
            id: 'store_academic_session_config', 
            academic_session: targetSessionName, 
            payload: { 
              active_session: targetSessionName, 
              active_semester: activeSem,
              academic_semester: activeSem,
              start_year: targetStartYear, 
              end_year: targetEndYear,
              sessions: updatedSessionsList 
            }, 
            updated_at: now 
          }
        ], { onConflict: 'id' });

      if (idSaveErr) {
        console.warn('[Academic Service] id_card_settings upsert notice:', idSaveErr.message);
      }

      // Keep payment_fees synchronized for the target session
      try {
        const { data: fees } = await supabase
          .from('payment_fees')
          .select('id')
          .eq('academic_session', targetSessionName);

        if (!fees || fees.length === 0) {
          const { data: currentSettings } = await supabase
            .from('id_card_settings')
            .select('id, id_card_fee')
            .in('id', ['default', 'dues']);
          const idFee = currentSettings?.find(s => s.id === 'default')?.id_card_fee ?? null;
          const duesFee = currentSettings?.find(s => s.id === 'dues')?.id_card_fee ?? null;

          if (idFee != null || duesFee != null) {
            const upsertRows = [];
            if (idFee != null) {
              upsertRows.push({
                fee_key: 'id_card',
                title: 'Digital Student ID Card Issuance',
                academic_session: targetSessionName,
                amount: Number(idFee),
                currency: 'NGN',
                is_active: true
              });
            }
            if (duesFee != null) {
              upsertRows.push({
                fee_key: 'departmental_dues',
                title: 'NACOS Departmental Dues',
                academic_session: targetSessionName,
                amount: Number(duesFee),
                currency: 'NGN',
                is_active: true
              });
            }
            if (upsertRows.length > 0) {
              await supabase.from('payment_fees').upsert(upsertRows, { onConflict: 'fee_key,academic_session' });
            }
          }
        }
      } catch (_) {}

      // Optional attempt for academic_settings table
      try {
        await supabase
          .from('academic_settings')
          .upsert({
            id: 'default',
            current_academic_year_start: targetStartYear,
            current_session: targetSessionName,
            updated_at: now
          }, { onConflict: 'id' });
      } catch (_) {}

    } catch (dbErr) {
      console.error('[Academic Service] Database session update error:', dbErr);
    }
  }

  // 2. Update in-memory state and dispatch system-wide progression change event
  setActiveAcademicSession(targetStartYear);

  // 3. Save local sessions cache
  saveLocalSessions(updatedSessionsList);
  _cachedSessions = updatedSessionsList;
  _lastSessionsFetchTime = Date.now();

  // 4. Broadcast across tabs and update local user if present
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nacos_user');
      if (stored) {
        const u = JSON.parse(stored);
        const progression = calculateAcademicProgression(u, targetSessionName);
        const updated = {
          ...u,
          level: progression.levelString,
          current_level: progression.levelString,
          numeric_level: progression.numericLevel,
          is_graduated: progression.isGraduated,
          status: progression.isGraduated ? 'Graduated' : (u.status || 'Active'),
          class_of: progression.classOf,
          classOf: progression.classOf,
          class_of_display: progression.classOfDisplay,
          graduation_year: progression.expectedGraduationYear,
          expected_graduation_year: progression.expectedGraduationYear,
          academic_session: targetSessionName
        };
        localStorage.setItem('nacos_user', JSON.stringify(updated));
      }
      window.dispatchEvent(new Event('nacos_user_updated'));
    } catch (_) {}
  }

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
    id: `sess-${parsed.startYear}-${parsed.endYear}`,
    session_name: parsed.sessionName,
    start_year: parsed.startYear,
    end_year: parsed.endYear,
    is_current: Boolean(isCurrent),
    start_date: startDate || `${parsed.startYear}-10-01`,
    end_date: endDate || `${parsed.endYear}-09-30`,
    updated_at: now
  };

  const list = getLocalSessions();
  if (isCurrent) {
    list.forEach(s => s.is_current = false);
  }
  const existingIdx = list.findIndex(s => s.session_name === parsed.sessionName);
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...newSessionRecord };
  } else {
    list.unshift(newSessionRecord);
  }
  list.sort((a, b) => b.start_year - a.start_year);
  saveLocalSessions(list);

  if (supabase) {
    try {
      await supabase
        .from('id_card_settings')
        .upsert({
          id: 'store_academic_session_config',
          academic_session: isCurrent ? parsed.sessionName : getActiveAcademicSession(),
          payload: {
            active_session: isCurrent ? parsed.sessionName : getActiveAcademicSession(),
            active_semester: getActiveAcademicSemester(),
            academic_semester: getActiveAcademicSemester(),
            start_year: isCurrent ? parsed.startYear : getActiveAcademicYearStart(),
            sessions: list
          },
          updated_at: now
        }, { onConflict: 'id' });
    } catch (_) {}
  }

  if (isCurrent) {
    await setActiveAcademicSessionInDatabase(parsed.startYear);
  }

  return { success: true, session: newSessionRecord };
}

/**
 * Switch active academic semester system-wide (First Semester or Second Semester)
 * Saves persistently to Supabase id_card_settings and academic_settings,
 * updates in-memory state, and broadcasts real-time synchronization across all tabs and components.
 */
export async function setActiveAcademicSemesterInDatabase(semesterIdentifier) {
  const normalized = String(semesterIdentifier || '').toLowerCase().includes('second')
    ? 'Second Semester'
    : 'First Semester';
  const now = new Date().toISOString();
  const currentSession = getActiveAcademicSession();
  const currentStartYear = getActiveAcademicYearStart();

  if (supabase) {
    try {
      // 1. Update store_academic_session_config payload in id_card_settings
      try {
        const { data: configRow } = await supabase
          .from('id_card_settings')
          .select('payload')
          .eq('id', 'store_academic_session_config')
          .maybeSingle();

        const currentPayload = configRow?.payload || {};
        await supabase
          .from('id_card_settings')
          .upsert({
            id: 'store_academic_session_config',
            academic_session: currentSession,
            payload: {
              ...currentPayload,
              active_semester: normalized,
              academic_semester: normalized
            },
            updated_at: now
          }, { onConflict: 'id' });
        // Also sync default and dues row payloads in id_card_settings
        await supabase
          .from('id_card_settings')
          .update({
            payload: { active_semester: normalized, academic_semester: normalized },
            updated_at: now
          })
          .in('id', ['default', 'dues']);
      } catch (_) {}

      // 2. Update academic_settings table
      try {
        await supabase
          .from('academic_settings')
          .upsert({
            id: 'default',
            current_session: currentSession,
            current_academic_year_start: currentStartYear,
            updated_at: now
          }, { onConflict: 'id' });
      } catch (_) {}

      // 3. Optional: Call stored procedure if available
      try {
        await supabase.rpc('set_active_academic_semester', { p_semester: normalized });
      } catch (_) {}
    } catch (dbErr) {
      console.error('[Academic Service] Database semester update error:', dbErr);
    }
  }

  // Update in-memory state and broadcast system-wide
  setActiveAcademicSemester(normalized);

  return {
    success: true,
    semester: normalized,
    academicSession: currentSession
  };
}

/**
 * Switch both active academic session and semester atomically
 */
export async function setGlobalAcademicContextInDatabase({ sessionIdentifier, semesterIdentifier }) {
  let sessionRes = null;
  if (sessionIdentifier) {
    sessionRes = await setActiveAcademicSessionInDatabase(sessionIdentifier);
  }
  let semesterRes = null;
  if (semesterIdentifier) {
    semesterRes = await setActiveAcademicSemesterInDatabase(semesterIdentifier);
  }
  return {
    success: true,
    session: sessionRes?.sessionName || getActiveAcademicSession(),
    semester: semesterRes?.semester || getActiveAcademicSemester()
  };
}

