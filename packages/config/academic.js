/**
 * NACOS FUTO Academic Year Configuration & Scalable Progression Engine
 * 
 * Provides centralized, scalable academic session management and dynamic
 * cohort progression calculation without hard-coded student levels or restrictive regexes.
 */

// Authoritative Baseline Academic Session Start Year (e.g. 2026 for the 2026/2027 Session)
export const DEFAULT_ACADEMIC_YEAR_START = 2026;
export const CURRENT_ACADEMIC_YEAR_START = DEFAULT_ACADEMIC_YEAR_START;
export const DEFAULT_PROGRAMME_DURATION = 5;

export const SUPPORTED_ACADEMIC_SESSIONS = [
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029',
  '2029/2030',
  '2030/2031'
];

const SESSION_STORAGE_KEY = 'nacos_active_academic_session';
const SESSION_EVENT_NAME = 'nacos_academic_session_changed';

// In-memory active session state (initialized from localStorage in browser environments if available)
let _activeAcademicYearStart = DEFAULT_ACADEMIC_YEAR_START;

if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
        _activeAcademicYearStart = parsed;
      }
    }
  } catch (_) {}
}

/**
 * Format academic session string from start year
 * e.g. 2026 -> '2026/2027'
 */
export function getAcademicSession(yearStart = getActiveAcademicYearStart()) {
  const start = parseInt(yearStart, 10) || DEFAULT_ACADEMIC_YEAR_START;
  return `${start}/${start + 1}`;
}

/**
 * Parses an academic session string (e.g., '2026/2027' or '2026-2027') into start and end years
 */
export function parseSessionYears(sessionStr) {
  if (!sessionStr) {
    return {
      startYear: DEFAULT_ACADEMIC_YEAR_START,
      endYear: DEFAULT_ACADEMIC_YEAR_START + 1,
      sessionName: getAcademicSession(DEFAULT_ACADEMIC_YEAR_START)
    };
  }

  const cleaned = String(sessionStr).trim();
  const match = cleaned.match(/^(\d{4})[\/\-](\d{4})$/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    return {
      startYear,
      endYear,
      sessionName: `${startYear}/${endYear}`
    };
  }

  const singleYearMatch = cleaned.match(/^(\d{4})/);
  if (singleYearMatch) {
    const startYear = parseInt(singleYearMatch[1], 10);
    return {
      startYear,
      endYear: startYear + 1,
      sessionName: `${startYear}/${startYear + 1}`
    };
  }

  return {
    startYear: DEFAULT_ACADEMIC_YEAR_START,
    endYear: DEFAULT_ACADEMIC_YEAR_START + 1,
    sessionName: getAcademicSession(DEFAULT_ACADEMIC_YEAR_START)
  };
}

/**
 * Get currently active academic year start (e.g., 2026)
 */
export function getActiveAcademicYearStart() {
  return _activeAcademicYearStart;
}

/**
 * Get currently active academic session string (e.g., '2026/2027')
 */
export function getActiveAcademicSession() {
  return getAcademicSession(_activeAcademicYearStart);
}

/**
 * Set the active academic session system-wide
 * Accepts a year number (e.g. 2027) or a session string (e.g. '2027/2028')
 * Broadcasts change event so all open views immediately recompute student levels.
 */
export function setActiveAcademicSession(sessionOrYear) {
  let startYear = DEFAULT_ACADEMIC_YEAR_START;

  if (typeof sessionOrYear === 'number') {
    startYear = sessionOrYear;
  } else if (typeof sessionOrYear === 'string') {
    const parsed = parseSessionYears(sessionOrYear);
    startYear = parsed.startYear;
  }

  _activeAcademicYearStart = startYear;

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, String(startYear));
    } catch (_) {}
  }

  if (typeof window !== 'undefined') {
    try {
      const sessionName = getAcademicSession(startYear);
      window.dispatchEvent(new CustomEvent(SESSION_EVENT_NAME, {
        detail: {
          startYear,
          sessionName
        }
      }));
    } catch (_) {}
  }

  return getAcademicSession(startYear);
}

/**
 * Subscribe to active academic session changes across the app
 */
export function onAcademicSessionChange(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }
  const handler = (e) => callback(e.detail);
  window.addEventListener(SESSION_EVENT_NAME, handler);
  return () => window.removeEventListener(SESSION_EVENT_NAME, handler);
}

/**
 * Legacy FUTO Registration Number Year-Code Mapping (Retained only for legacy reference)
 */
export const FUTO_YEAR_CODES = {
  2020: '10',
  2021: '12',
  2022: '12',
  2023: '13',
  2024: '14',
  2025: '15',
  2026: '16',
};

/**
 * Validate registration number presence.
 * Format-based validation has been completely removed in favor of authoritative
 * database record lookup. Registration numbers are treated as database identifiers.
 */
export function validateRegistrationNumberFormat(regNumber) {
  if (!regNumber || typeof regNumber !== 'string') {
    return { valid: false, error: 'Registration number is required.' };
  }

  const cleaned = regNumber.trim();
  if (!cleaned) {
    return { valid: false, error: 'Registration number is required.' };
  }

  return { valid: true, regNumber: cleaned };
}

/**
 * Safely extracts 4-digit admission year from a registration number or record.
 * Only uses the first 4 characters IF they are digits representing a valid admission year (1980 to current + 10).
 * Does NOT re-introduce restrictive patterns, length requirements, or suffix rules.
 */
export function parseAdmissionYear(identifier, currentYearStart = getActiveAcademicYearStart()) {
  if (identifier === null || identifier === undefined) {
    return { valid: false, error: 'Registration number or identifier cannot be empty.' };
  }

  // If already a numeric year
  if (typeof identifier === 'number' && identifier >= 1980 && identifier <= currentYearStart + 10) {
    return { valid: true, admissionYear: identifier };
  }

  const cleaned = String(identifier).trim();
  if (!cleaned) {
    return { valid: false, error: 'Registration number or identifier cannot be empty.' };
  }

  // Soft extraction: does the identifier begin with a 4-digit year?
  const match = cleaned.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1], 10);
    if (year >= 1980 && year <= currentYearStart + 10) {
      return { valid: true, admissionYear: year };
    }
  }

  return { 
    valid: false, 
    error: 'Admission year could not be inferred from registration number. Please use the database student record.' 
  };
}

/**
 * Convenient extraction of 4-digit admission year or null
 */
export function extractEntryYearFromRegNumber(regNumber) {
  const res = parseAdmissionYear(regNumber);
  return res.valid ? res.admissionYear : null;
}

/**
 * Calculate expected graduation year
 * Formula: expected_graduation_year = admission_year + programme_duration
 */
export function calculateExpectedGraduation(admissionYear, programmeDuration = DEFAULT_PROGRAMME_DURATION) {
  const duration = parseInt(programmeDuration, 10) || DEFAULT_PROGRAMME_DURATION;
  const year = parseInt(admissionYear, 10);
  if (isNaN(year)) return null;
  return year + duration;
}

/**
 * Authoritative Central Academic Progression Engine
 * 
 * Scalably computes dynamic academic level, graduation status, expected graduation year,
 * and Class of from a student's entry year and the active academic session.
 * 
 * Core Formula:
 *   currentLevel = currentAcademicYearStart - entryYear + 1
 * 
 * Levels:
 *   1 -> 100 Level
 *   2 -> 200 Level
 *   3 -> 300 Level
 *   4 -> 400 Level
 *   5 -> 500 Level
 *   > programmeDuration -> Graduated
 * 
 * Accepts either:
 *   - A numeric admission year or registration string
 *   - An object representing a student profile or registry row:
 *     { regNumber, registration_number, admission_year, admissionYear, programme_duration, programmeDuration, is_graduated, ... }
 * 
 * @param {string|number|object} input - Student record or identifier
 * @param {object} [options] - Optional overrides: { currentYearStart, programmeDuration, isGraduatedOverride }
 * @returns {object} Comprehensive progression details
 */
export function calculateAcademicProgression(input, options = {}) {
  const currentYearStart = parseInt(
    options.currentYearStart ?? options.academicYearStart ?? getActiveAcademicYearStart(),
    10
  ) || DEFAULT_ACADEMIC_YEAR_START;

  const sessionName = getAcademicSession(currentYearStart);

  let rawAdmissionYear = null;
  let regNo = '';
  let duration = DEFAULT_PROGRAMME_DURATION;
  let isGraduatedOverride = false;

  if (typeof input === 'number') {
    rawAdmissionYear = input;
  } else if (typeof input === 'string') {
    regNo = input.trim();
    const parsed = parseAdmissionYear(regNo, currentYearStart);
    if (parsed.valid) {
      rawAdmissionYear = parsed.admissionYear;
    }
  } else if (input && typeof input === 'object') {
    regNo = String(
      input.registration_number || 
      input.registrationNumber || 
      input.matric_number || 
      input.matricNumber || 
      input.matric || 
      input.regNo || 
      input.reg_no || 
      input.studentId || 
      input.student_id || 
      ''
    ).trim();

    duration = parseInt(
      input.programme_duration || 
      input.programmeDuration || 
      input.duration || 
      options.programmeDuration || 
      DEFAULT_PROGRAMME_DURATION,
      10
    );

    if (isNaN(duration) || duration <= 0) {
      duration = DEFAULT_PROGRAMME_DURATION;
    }

    if (input.admission_year !== undefined && input.admission_year !== null && input.admission_year !== '') {
      rawAdmissionYear = parseInt(input.admission_year, 10);
    } else if (input.admissionYear !== undefined && input.admissionYear !== null && input.admissionYear !== '') {
      rawAdmissionYear = parseInt(input.admissionYear, 10);
    } else if (regNo) {
      const parsed = parseAdmissionYear(regNo, currentYearStart);
      if (parsed.valid) {
        rawAdmissionYear = parsed.admissionYear;
      }
    }

    if (
      input.is_graduated === true || 
      input.isGraduated === true || 
      input.status === 'graduated' || 
      input.level === 'Graduated' ||
      input.current_level === 'Graduated'
    ) {
      isGraduatedOverride = true;
    }
  }

  if (options.isGraduatedOverride !== undefined) {
    isGraduatedOverride = Boolean(options.isGraduatedOverride);
  }

  if (options.programmeDuration) {
    const optDuration = parseInt(options.programmeDuration, 10);
    if (!isNaN(optDuration) && optDuration > 0) duration = optDuration;
  }

  // Handle Edge Case: Missing or Unparseable Admission Year
  if (!rawAdmissionYear || isNaN(rawAdmissionYear) || rawAdmissionYear < 1980) {
    return {
      valid: false,
      admissionYear: null,
      currentYearStart,
      academicSession: sessionName,
      numericLevel: null,
      levelString: 'Level unavailable',
      isGraduated: false,
      status: 'Level unavailable',
      expectedGraduationYear: null,
      classOf: null,
      classOfDisplay: 'Class of N/A',
      programmeDuration: duration,
      reason: 'Valid admission year could not be derived from registration number or student record.'
    };
  }

  const admissionYear = rawAdmissionYear;
  const expectedGraduationYear = admissionYear + duration;
  const classOf = expectedGraduationYear;
  const classOfDisplay = `Class of ${classOf}`;

  // Edge Case: Admission year is in the future relative to current session start
  if (admissionYear > currentYearStart) {
    return {
      valid: true,
      admissionYear,
      currentYearStart,
      academicSession: sessionName,
      numericLevel: 1,
      levelString: '100 Level (Upcoming Cohort)',
      isGraduated: false,
      status: 'Admitted',
      expectedGraduationYear,
      classOf,
      classOfDisplay,
      programmeDuration: duration,
      reason: 'Admitted for future academic session.'
    };
  }

  // Standard progressive formula
  const numericLevel = currentYearStart - admissionYear + 1;

  // Has reached or passed graduation point
  if (isGraduatedOverride || numericLevel > duration) {
    return {
      valid: true,
      admissionYear,
      currentYearStart,
      academicSession: sessionName,
      numericLevel,
      levelString: 'Graduated',
      isGraduated: true,
      status: 'Graduated',
      expectedGraduationYear,
      classOf,
      classOfDisplay,
      programmeDuration: duration
    };
  }

  // Active student in study
  const levelString = `${numericLevel * 100} Level`;
  return {
    valid: true,
    admissionYear,
    currentYearStart,
    academicSession: sessionName,
    numericLevel,
    levelString,
    isGraduated: false,
    status: 'Active',
    expectedGraduationYear,
    classOf,
    classOfDisplay,
    programmeDuration: duration
  };
}

/**
 * Backwards compatible helper for calculateCurrentLevel
 * Returns standard { numericLevel, levelString, isGraduated, status, classOf, classOfDisplay, expectedGraduationYear }
 */
export function calculateCurrentLevel(
  admissionYear, 
  currentYearStart = getActiveAcademicYearStart(), 
  programmeDuration = DEFAULT_PROGRAMME_DURATION
) {
  return calculateAcademicProgression(admissionYear, { currentYearStart, programmeDuration });
}

/**
 * Generates an institutional progression matrix preview for any given target academic session.
 * Used by administrators in the portal dashboard to review cohort impacts before switching the active session.
 * 
 * @param {number} targetSessionStartYear - e.g. 2027
 * @param {number[]} [cohorts] - Array of admission years to inspect (defaults to 2020 through targetSessionStartYear)
 * @param {number} [programmeDuration=5]
 * @returns {Array<{ cohort: number, levelString: string, numericLevel: number, isGraduated: boolean, classOf: number, status: string }>}
 */
export function previewProgression(
  targetSessionStartYear, 
  cohorts = null, 
  programmeDuration = DEFAULT_PROGRAMME_DURATION
) {
  const targetYear = parseInt(targetSessionStartYear, 10) || DEFAULT_ACADEMIC_YEAR_START;
  const cohortsToInspect = Array.isArray(cohorts) && cohorts.length > 0
    ? cohorts
    : [
        targetYear - 6,
        targetYear - 5,
        targetYear - 4,
        targetYear - 3,
        targetYear - 2,
        targetYear - 1,
        targetYear
      ];

  return cohortsToInspect.map(cohort => {
    const res = calculateAcademicProgression(cohort, {
      currentYearStart: targetYear,
      programmeDuration
    });
    return {
      cohort,
      session: getAcademicSession(targetYear),
      levelString: res.levelString,
      numericLevel: res.numericLevel,
      isGraduated: res.isGraduated,
      classOf: res.classOf,
      classOfDisplay: res.classOfDisplay,
      status: res.status
    };
  });
}
