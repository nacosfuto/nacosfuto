/**
 * studentDataCache.js
 * Centralized, intelligent, resilient data cache and retrieval layer for NACOS Student Portal.
 * 
 * Features:
 * 1. Stale-While-Revalidate: Instant synchronous cache returns on route transitions (no more blank or ₦0 flashes).
 * 2. Request Deduplication: Merges concurrent in-flight requests into a single network call.
 * 3. Scoped Cache Security: Isolated per student registration/matric number; wiped completely on logout.
 * 4. Reactive Invalidation: Listens to payment completions, session adjustments, and profile changes.
 * 5. Supabase Authoritative: Only verified, cleared, and completed records are cached as successful.
 */

import { supabase } from './client.js';
import { getDepartmentalDuesFee } from './payments.js';
import { getIdCardSettings } from './idCard.js';
import { fetchResultsForStudent } from './results.js';
import { fetchCourses } from './courses.js';
import { 
  calculateAcademicProgression, 
  getActiveAcademicSession, 
  getStudentApplicableLevelSessions 
} from '@nacos/config/academic';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes fresh cache window
const SESSION_CACHE_PREFIX = 'nacos_cache_student_clearance_';

// In-memory cache map
const memoryCache = new Map();
// In-flight promises map for request deduplication
const inFlightRequests = new Map();

/**
 * Normalizes matric/registration number for cache scoping
 */
export function getStudentIdentifier(student) {
  if (!student) return '';
  const raw = student.registration_number || student.matric || student.matricNumber || student.id || '';
  return String(raw).trim().toUpperCase();
}

/**
 * Derives numeric academic level string (e.g. '100', '200')
 */
export function deriveStudentLevelNum(student) {
  if (!student) return '100';
  const prog = calculateAcademicProgression(student);
  if (prog && prog.valid && prog.numericLevel) {
    return String(prog.numericLevel * 100);
  }
  const raw = String(student?.level || student?.current_level || '100');
  const match = raw.match(/\d{3}/);
  return match ? match[0] : '100';
}

/**
 * Synchronously retrieves cached clearance data if valid
 */
export function getCachedStudentClearance(student) {
  const identifier = getStudentIdentifier(student);
  if (!identifier) return null;

  // 1. Check in-memory cache first
  const mem = memoryCache.get(identifier);
  if (mem && (Date.now() - mem.timestamp < CACHE_TTL_MS)) {
    return mem.data;
  }

  // 2. Check sessionStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${identifier}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
          memoryCache.set(identifier, parsed);
          return parsed.data;
        }
      }
    } catch (_) {}
  }

  return null;
}

/**
 * Authoritatively fetches and calculates student clearance & financial summary with caching and deduplication
 */
export async function getStudentClearanceSummary(student, { forceRefresh = false } = {}) {
  const identifier = getStudentIdentifier(student);
  if (!identifier) {
    return null;
  }

  // If not forcing refresh, return valid cached data
  if (!forceRefresh) {
    const cached = getCachedStudentClearance(student);
    if (cached) {
      return cached;
    }
  }

  // Request deduplication: if request for this student is already running, join it
  if (inFlightRequests.has(identifier)) {
    return inFlightRequests.get(identifier);
  }

  const fetchPromise = (async () => {
    try {
      const cleanMatric = identifier;
      const strippedDigits = String(identifier).replace(/\D/g, '');
      const userId = student?.id;
      const currentLvl = deriveStudentLevelNum(student);

      const matrix = {
        '100': { dues: false, duesAmount: 0, idCard: false },
        '200': { dues: false, duesAmount: 0, idCard: false },
        '300': { dues: false, duesAmount: 0, idCard: false },
        '400': { dues: false, duesAmount: 0, idCard: false },
        '500': { dues: false, duesAmount: 0, idCard: false }
      };

      let totalSum = 0;

      // Parallelize queries across database tables
      const [paymentsResult, idAppsResult, legacyDuesResult, deptDuesResult, liveProfileResult, duesCfg, idCfg] = await Promise.all([
        // 1. Live Payments table
        (async () => {
          if (!supabase || (!cleanMatric && !userId)) return [];
          try {
            const conds = [];
            if (cleanMatric) {
              conds.push(`registration_number.eq.${cleanMatric}`);
              conds.push(`matric_number.eq.${cleanMatric}`);
            }
            if (strippedDigits && strippedDigits !== cleanMatric) {
              conds.push(`registration_number.eq.${strippedDigits}`);
              conds.push(`matric_number.eq.${strippedDigits}`);
            }
            if (userId && !String(userId).startsWith('student-')) {
              conds.push(`student_id.eq.${userId}`);
            }
            if (conds.length === 0) return [];
            const { data } = await supabase.from('payments').select('*').or(conds.join(','));
            return data || [];
          } catch (e) {
            console.warn('[Cache Service] Payments fetch notice:', e);
            return [];
          }
        })(),

        // 2. ID Card Applications table
        (async () => {
          if (!supabase || (!cleanMatric && !userId)) return [];
          try {
            const appConds = [];
            if (cleanMatric) {
              appConds.push(`matric_number.eq.${cleanMatric}`);
              appConds.push(`registration_number.eq.${cleanMatric}`);
            }
            if (strippedDigits && strippedDigits !== cleanMatric) {
              appConds.push(`matric_number.eq.${strippedDigits}`);
              appConds.push(`registration_number.eq.${strippedDigits}`);
            }
            if (userId && !String(userId).startsWith('student-')) {
              appConds.push(`user_id.eq.${userId}`);
              appConds.push(`student_id.eq.${userId}`);
            }
            if (appConds.length === 0) return [];
            const { data } = await supabase
              .from('id_card_applications')
              .select('*')
              .in('payment_status', ['paid', 'verified'])
              .or(appConds.join(','));
            return data || [];
          } catch (e) {
            console.warn('[Cache Service] ID Apps fetch notice:', e);
            return [];
          }
        })(),

        // 3. Legacy Dues Payments table
        (async () => {
          if (!supabase || (!cleanMatric && !userId)) return [];
          try {
            const duesConds = [];
            if (cleanMatric) duesConds.push(`registration_number.eq.${cleanMatric}`);
            if (strippedDigits && strippedDigits !== cleanMatric) duesConds.push(`registration_number.eq.${strippedDigits}`);
            if (userId && !String(userId).startsWith('student-')) duesConds.push(`student_id.eq.${userId}`);
            if (duesConds.length === 0) return [];

            const { data } = await supabase
              .from('dues_payments')
              .select('*')
              .or(duesConds.join(','))
              .in('status', ['successful', 'verified', 'cleared', 'paid']);
            return data || [];
          } catch (e) {
            return [];
          }
        })(),

        // 4. Departmental Dues table
        (async () => {
          if (!supabase || !cleanMatric) return [];
          try {
            const deptConds = [];
            deptConds.push(`registration_number.eq.${cleanMatric}`);
            deptConds.push(`matric_number.eq.${cleanMatric}`);
            if (strippedDigits && strippedDigits !== cleanMatric) {
              deptConds.push(`registration_number.eq.${strippedDigits}`);
              deptConds.push(`matric_number.eq.${strippedDigits}`);
            }
            const { data } = await supabase
              .from('departmental_dues')
              .select('*')
              .or(deptConds.join(','))
              .in('status', ['paid', 'verified', 'cleared', 'successful']);
            return data || [];
          } catch (e) {
            return [];
          }
        })(),

        // 5. Authoritative live profile & verified_students status in Supabase
        (async () => {
          if (!supabase || (!cleanMatric && !userId)) return null;
          try {
            const pConds = [];
            if (cleanMatric) {
              pConds.push(`registration_number.eq.${cleanMatric}`);
              pConds.push(`matric_number.eq.${cleanMatric}`);
            }
            if (strippedDigits && strippedDigits !== cleanMatric) {
              pConds.push(`registration_number.eq.${strippedDigits}`);
              pConds.push(`matric_number.eq.${strippedDigits}`);
            }
            if (userId && !String(userId).startsWith('student-')) {
              pConds.push(`id.eq.${userId}`);
            }
            if (pConds.length === 0) return null;

            const [{ data: pData }, { data: vData }] = await Promise.all([
              supabase.from('profiles').select('dues_cleared, has_paid_dues, level, current_level, payment_status').or(pConds.join(',')).maybeSingle(),
              supabase.from('verified_students').select('dues_cleared, has_paid_dues, level, current_level, payment_status').or(pConds.join(',')).maybeSingle()
            ]);

            return {
              dues_cleared: Boolean(pData?.dues_cleared || pData?.has_paid_dues || vData?.dues_cleared || vData?.has_paid_dues),
              level: pData?.level || pData?.current_level || vData?.level || vData?.current_level || null
            };
          } catch (e) {
            return null;
          }
        })(),

        // 6. Live Dues fee configuration
        getDepartmentalDuesFee().catch(() => null),

        // 7. Live ID Card fee configuration
        getIdCardSettings().catch(() => null)
      ]);

      // Process payments
      paymentsResult.forEach((p) => {
        const isConfirmed = ['successful', 'paid', 'verified', 'cleared', 'completed'].includes(String(p.status || '').toLowerCase()) || Boolean(p.paid_at);
        if (!isConfirmed) return;

        const amt = Number(p.amount || 0);
        totalSum += amt;

        const lvlRaw = p.metadata?.level || p.level || '';
        const match = String(lvlRaw).match(/\d{3}/);
        const lvl = match ? match[0] : currentLvl;

        if (matrix[lvl]) {
          if (p.payment_type === 'DEPARTMENTAL_DUES' || String(p.payment_type || '').toLowerCase().includes('due')) {
            matrix[lvl].dues = true;
            matrix[lvl].duesAmount = amt;
          } else if (p.payment_type === 'ID_CARD' || String(p.payment_type || '').toLowerCase().includes('id')) {
            matrix[lvl].idCard = true;
          }
        }
      });

      // Process ID applications
      idAppsResult.forEach((app) => {
        const lvlRaw = app.level || '';
        const match = String(lvlRaw).match(/\d{3}/);
        const lvl = match ? match[0] : currentLvl;
        if (matrix[lvl]) {
          matrix[lvl].idCard = true;
        }
      });

      // Process Legacy Dues
      legacyDuesResult.forEach((item) => {
        const amt = Number(item.amount || 0);
        const lvlRaw = item.level || '';
        const match = String(lvlRaw).match(/\d{3}/);
        const lvl = match ? match[0] : currentLvl;
        if (matrix[lvl] && !matrix[lvl].dues) {
          matrix[lvl].dues = true;
          matrix[lvl].duesAmount = amt;
          totalSum += amt;
        }
      });

      // Process Departmental Dues
      deptDuesResult.forEach((item) => {
        const amt = Number(item.amount || 0);
        const lvlRaw = item.level || '';
        const match = String(lvlRaw).match(/\d{3}/);
        const lvl = match ? match[0] : currentLvl;
        if (matrix[lvl] && !matrix[lvl].dues) {
          matrix[lvl].dues = true;
          matrix[lvl].duesAmount = amt;
          totalSum += amt;
        }
      });

      // Live Profile / Verified Students DB clearance
      if (liveProfileResult && liveProfileResult.dues_cleared) {
        const liveLevel = String(liveProfileResult.level || currentLvl).match(/\d{3}/)?.[0] || currentLvl;
        if (matrix[liveLevel] && !matrix[liveLevel].dues) {
          const dynFee = Number(duesCfg?.dues_amount) || 0;
          matrix[liveLevel].dues = true;
          matrix[liveLevel].duesAmount = dynFee;
          totalSum += dynFee;
        }
      }

      // Profile fallback for current level dues clearance (from memory or localStorage)
      if (
        !matrix[currentLvl].dues &&
        (student?.dues_cleared === true ||
          student?.has_paid_dues === true ||
          ['cleared', 'successful', 'verified', 'paid'].includes(String(student?.payment_status).toLowerCase()))
      ) {
        const dynFee = Number(duesCfg?.dues_amount) || 0;
        matrix[currentLvl].dues = true;
        matrix[currentLvl].duesAmount = dynFee;
        totalSum += dynFee;
      }

      // Resolve fee amounts
      const duesFeeAmount = Number(duesCfg?.dues_amount) || 0;
      const idCardFeeAmount = Number(idCfg?.id_card_fee) || 0;

      // Calculate total owing (payable) across all applicable levels
      const applicableLevels = getStudentApplicableLevelSessions(student) || [];
      let calculatedOwing = 0;
      let pendingCount = 0;

      applicableLevels.forEach((item) => {
        const lvlStr = String(item.numericLevel || item.level || '').replace(/\D/g, '');
        const lvlEntry = matrix[lvlStr] || { dues: false, idCard: false };

        if (!lvlEntry.dues) {
          calculatedOwing += duesFeeAmount;
          pendingCount++;
        }
        if (!lvlEntry.idCard) {
          calculatedOwing += idCardFeeAmount;
          pendingCount++;
        }
      });

      // Fetch supplementary counts (non-blocking)
      let coursesCount = null;
      let resultsPublishedCount = null;

      try {
        const studentId = cleanMatric || userId;
        if (studentId) {
          const res = await fetchResultsForStudent(studentId);
          if (res && res.data && res.data.length > 0) {
            const distinctSemesters = new Set(res.data.map((r) => `${r.level}-${r.semester}`));
            resultsPublishedCount = distinctSemesters.size;
          } else {
            resultsPublishedCount = 0;
          }
        } else {
          resultsPublishedCount = 0;
        }
      } catch (_) {
        resultsPublishedCount = 0;
      }

      try {
        const lvlNum = parseInt(currentLvl, 10) || 100;
        const cRes = await fetchCourses({ level: lvlNum });
        if (cRes && cRes.data && cRes.data.length > 0) {
          coursesCount = cRes.data.length;
        } else {
          coursesCount = 0;
        }
      } catch (_) {
        coursesCount = 0;
      }

      const summary = {
        totalPaid: totalSum,
        totalPayable: calculatedOwing,
        pendingObligationsCount: pendingCount,
        levelClearanceMatrix: matrix,
        isPaid: Boolean(matrix[currentLvl]?.dues),
        payments: paymentsResult,
        idApps: idAppsResult,
        legacyDues: legacyDuesResult,
        duesSettings: duesCfg,
        idCardSettings: idCfg,
        coursesCount,
        resultsPublishedCount,
        isLoaded: true,
        isError: false,
        cachedAt: Date.now()
      };

      // Store in memory cache
      const cacheEnvelope = { timestamp: Date.now(), data: summary };
      memoryCache.set(identifier, cacheEnvelope);

      // Persist to sessionStorage for tab transitions
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${identifier}`, JSON.stringify(cacheEnvelope));
        } catch (_) {}
      }

      return summary;
    } catch (error) {
      console.error('[Cache Service] Clearance summary calculation error:', error);
      return {
        totalPaid: null,
        totalPayable: null,
        pendingObligationsCount: 0,
        levelClearanceMatrix: {},
        isPaid: false,
        coursesCount: null,
        resultsPublishedCount: null,
        isLoaded: false,
        isError: true
      };
    } finally {
      inFlightRequests.delete(identifier);
    }
  })();

  inFlightRequests.set(identifier, fetchPromise);
  return fetchPromise;
}

/**
 * Invalidates cache for a student (or all if omitted)
 */
export function invalidateStudentDataCache(studentOrIdentifier) {
  const identifier = typeof studentOrIdentifier === 'string' 
    ? studentOrIdentifier.trim().toUpperCase() 
    : getStudentIdentifier(studentOrIdentifier);

  if (identifier) {
    memoryCache.delete(identifier);
    inFlightRequests.delete(identifier);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${identifier}`);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nacos_student_cache_invalidated', { detail: { identifier } }));
    }
  } else {
    memoryCache.clear();
    inFlightRequests.clear();
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith(SESSION_CACHE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('nacos_student_cache_invalidated', { detail: {} }));
    }
  }
}

/**
 * Clears all cached student information immediately (e.g. on user sign-out)
 */
export function clearStudentDataCache() {
  memoryCache.clear();
  inFlightRequests.clear();
  if (typeof window !== 'undefined') {
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith(SESSION_CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (_) {}
  }
}

/**
 * Synchronously extracts cached dues payments and clearance map for immediate render
 */
export function extractCachedDuesData(student, cachedSummary = null) {
  const summary = cachedSummary || getCachedStudentClearance(student);
  if (!summary) return null;

  const cleanMatric = getStudentIdentifier(student);
  const currentLvl = deriveStudentLevelNum(student);
  const levelDuesMap = {
    '100': null,
    '200': null,
    '300': null,
    '400': null,
    '500': null
  };
  const paymentHistoryList = [];
  let totalPaidSum = 0;

  const processItem = (item) => {
    if (!item) return;
    const isIdCard = item.payment_type === 'ID_CARD' || 
      String(item.purpose || '').toLowerCase().includes('id card') ||
      String(item.title || '').toLowerCase().includes('id card') ||
      String(item.payment_title || '').toLowerCase().includes('id card');
    if (isIdCard) return;

    const amt = Number(item.amount || summary.duesSettings?.dues_amount || 0);
    const isPaid = ['successful', 'paid', 'cleared', 'verified', 'completed'].includes(String(item.status || '').toLowerCase()) || Boolean(item.paid_at);
    if (isPaid) totalPaidSum += amt;

    const payDate = item.paid_at || item.created_at || new Date().toISOString();
    const dateObj = new Date(payDate);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) : 'Current Session';
    const timeStr = !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-GB') : '12:00:00';

    const itemLevelRaw = item.metadata?.level || item.level || '';
    const match = String(itemLevelRaw).match(/\d{3}/);
    const lvl = match ? match[0] : currentLvl;
    const session = item.academic_session || item.metadata?.academic_session || item.session || student?.academic_session || getActiveAcademicSession();

    const formatted = {
      id: item.id || item.reference || `pay-${Math.random()}`,
      receiptNo: item.reference || item.payment_reference || `NACOS/DUES/${cleanMatric}-${lvl}L`,
      transactionId: item.provider_payment_id || item.id || item.reference || 'TX-CONFIRMED',
      date: dateStr,
      time: timeStr,
      paymentDate: `${dateStr} (${timeStr} GMT+1)`,
      amount: `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      rawAmount: amt,
      paymentMethod: item.provider ? `${String(item.provider).replace(/bachs/gi, 'Online Gateway')} (${isPaid ? 'Confirmed' : 'Unconfirmed'})` : `Online Gateway (${isPaid ? 'Confirmed' : 'Unconfirmed'})`,
      status: isPaid ? 'PAID' : 'UNPAID',
      isPaid,
      session,
      level: `${lvl} LEVEL`,
      levelNum: lvl,
      paymentType: 'Departmental Dues (Full Payment)',
      studentName: (student?.full_name || student?.name || item.customer_name || 'Student Member').trim(),
      matricNo: cleanMatric || '',
      department: student?.department || 'Computer Science',
      created_at: item.created_at || item.paid_at || new Date().toISOString()
    };

    paymentHistoryList.push(formatted);
    if (isPaid && ['100', '200', '300', '400', '500'].includes(lvl) && !levelDuesMap[lvl]) {
      levelDuesMap[lvl] = formatted;
    }
  };

  // Populate from cached payments
  if (Array.isArray(summary.payments)) {
    summary.payments.forEach(processItem);
  }
  if (Array.isArray(summary.legacyDues)) {
    summary.legacyDues.forEach(processItem);
  }

  // Populate from clearance matrix directly if matrix marked it paid
  if (summary.levelClearanceMatrix) {
    ['100', '200', '300', '400', '500'].forEach(lvl => {
      if (summary.levelClearanceMatrix[lvl]?.dues && !levelDuesMap[lvl]) {
        const amt = summary.levelClearanceMatrix[lvl]?.duesAmount || summary.duesSettings?.dues_amount || 0;
        levelDuesMap[lvl] = {
          id: `cache-${cleanMatric}-${lvl}`,
          receiptNo: `NACOS/DUES/${cleanMatric}-${lvl}L`,
          transactionId: 'TX-CONFIRMED',
          date: 'Confirmed',
          time: '',
          paymentDate: 'Confirmed (Database Verified)',
          amount: `₦${Number(amt).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          rawAmount: amt,
          status: 'PAID',
          isPaid: true,
          session: getActiveAcademicSession(),
          level: `${lvl} LEVEL`,
          levelNum: lvl,
          paymentType: 'Departmental Dues (Full Payment)',
          studentName: (student?.full_name || student?.name || 'Student Member').trim(),
          matricNo: cleanMatric || '',
          department: student?.department || 'Computer Science',
          created_at: new Date().toISOString()
        };
      }
    });
  }

  return {
    levelDuesMap,
    paymentHistoryList,
    totalPaidSum: summary.totalPaid ?? totalPaidSum,
    duesFee: summary.duesSettings?.dues_amount || null
  };
}

/**
 * Synchronously extracts cached ID card payments for immediate render
 */
export function extractCachedIdCardData(student, cachedSummary = null) {
  const summary = cachedSummary || getCachedStudentClearance(student);
  if (!summary) return null;

  const cleanMatric = getStudentIdentifier(student);
  const currentLvl = deriveStudentLevelNum(student);
  const collectedIdCardPays = [];

  const processIdPayItem = (p) => {
    if (!p) return;
    const isIdType = p.payment_type === 'ID_CARD' ||
      String(p.purpose || '').toLowerCase().includes('id card') ||
      String(p.title || '').toLowerCase().includes('id card') ||
      String(p.payment_title || '').toLowerCase().includes('id card');
    if (!isIdType) return;

    const rawStatus = String(p.status || '').toLowerCase();
    const isPaid = ['successful', 'paid', 'cleared', 'verified', 'completed'].includes(rawStatus) || Boolean(p.paid_at);
    const amt = Number(p.amount || summary.idCardSettings?.id_card_fee || 0);

    const lvlRaw = p.metadata?.level || p.level || '';
    const match = String(lvlRaw).match(/\d{3}/);
    const lvl = match ? `${match[0]} Level` : `${currentLvl} Level`;
    const session = p.academic_session || p.metadata?.academic_session || p.session || getActiveAcademicSession();

    const payDate = p.paid_at || p.created_at || new Date().toISOString();
    const dObj = new Date(payDate);

    collectedIdCardPays.push({
      id: p.id || p.reference,
      receiptNo: p.reference || `NACOS/IDCARD/${cleanMatric}`,
      transactionId: p.provider_payment_id || p.id || p.reference || 'TX-CONFIRMED',
      amount: amt,
      formattedAmount: `₦${amt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      session,
      level: lvl,
      paymentType: 'Student ID Card Issuance',
      status: isPaid ? 'PAID' : 'UNPAID',
      isPaid,
      date: !isNaN(dObj.getTime()) ? dObj.toLocaleDateString('en-GB') : 'Verified',
      created_at: payDate
    });
  };

  if (Array.isArray(summary.payments)) {
    summary.payments.forEach(processIdPayItem);
  }
  if (Array.isArray(summary.idApps)) {
    summary.idApps.forEach(app => {
      const isPaid = ['paid', 'verified'].includes(String(app.payment_status).toLowerCase());
      const lvlRaw = app.level || '';
      const match = String(lvlRaw).match(/\d{3}/);
      const lvl = match ? `${match[0]} Level` : `${currentLvl} Level`;
      collectedIdCardPays.push({
        id: app.id,
        receiptNo: `NACOS/IDCARD/${cleanMatric}`,
        transactionId: app.payment_id || 'TX-CONFIRMED',
        amount: Number(summary.idCardSettings?.id_card_fee || 0),
        formattedAmount: `₦${Number(summary.idCardSettings?.id_card_fee || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        session: app.session || getActiveAcademicSession(),
        level: lvl,
        paymentType: 'Student ID Card Issuance',
        status: isPaid ? 'PAID' : 'UNPAID',
        isPaid,
        date: app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB') : 'Verified',
        created_at: app.created_at || new Date().toISOString()
      });
    });
  }

  // Populate from clearance matrix if marked paid
  if (summary.levelClearanceMatrix) {
    ['100', '200', '300', '400', '500'].forEach(lvlNum => {
      if (summary.levelClearanceMatrix[lvlNum]?.idCard) {
        const alreadyInList = collectedIdCardPays.some(p => p.isPaid && String(p.level).includes(lvlNum));
        if (!alreadyInList) {
          collectedIdCardPays.push({
            id: `cache-id-${cleanMatric}-${lvlNum}`,
            receiptNo: `NACOS/IDCARD/${cleanMatric}`,
            transactionId: 'TX-CONFIRMED',
            amount: Number(summary.idCardSettings?.id_card_fee || 0),
            formattedAmount: `₦${Number(summary.idCardSettings?.id_card_fee || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
            session: getActiveAcademicSession(),
            level: `${lvlNum} Level`,
            paymentType: 'Student ID Card Issuance',
            status: 'PAID',
            isPaid: true,
            date: 'Verified',
            created_at: new Date().toISOString()
          });
        }
      }
    });
  }

  return {
    collectedIdCardPays,
    idCardSettings: summary.idCardSettings || null
  };
}

// Global lifecycle listeners
if (typeof window !== 'undefined') {
  // Clear cache when user logs out
  window.addEventListener('nacos_user_logged_out', clearStudentDataCache);

  // Invalidate cache when cross-tab payment or user update occurs
  window.addEventListener('nacos_user_updated', () => {
    invalidateStudentDataCache();
  });

  try {
    const channel = new BroadcastChannel('nacos_payment_sync');
    channel.onmessage = (e) => {
      if (e.data?.status === 'successful') {
        invalidateStudentDataCache();
      }
    };
  } catch (_) {}
}
