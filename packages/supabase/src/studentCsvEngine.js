/**
 * @file packages/supabase/src/studentCsvEngine.js
 * Comprehensive, production-grade CSV parser, column detection, level normalization,
 * and row validation engine for NACOS FUTO student data.
 * 
 * CORE PRINCIPLES:
 * 1. EMAIL IS OPTIONAL: A student record is 100% valid with or without an email.
 * 2. Deterministic column alias detection with manual override fallback.
 * 3. Smart level normalization (100, 200, 300, 400, 500, 600, 100L, 200 Level, Year 1).
 * 4. Two-step import experience: Parse -> Preview & Mapping -> Commit.
 * 5. Row-level error reporting (row number, regNo, field, human-readable reason).
 * 6. Dual duplicate detection (batch duplicate vs database duplicate).
 * 7. Support for both Add New and Update Existing import modes.
 */

import {
  CURRENT_ACADEMIC_YEAR_START,
  getAcademicSession,
  calculateCurrentLevel,
  calculateAcademicProgression,
  parseAdmissionYear,
  getActiveAcademicSession,
  getActiveAcademicYearStart
} from '@nacos/config/academic';

/**
 * Valid academic levels supported in NACOS FUTO
 */
export const VALID_ACADEMIC_LEVELS = [100, 200, 300, 400, 500, 600];

/**
 * Standard email format checker
 */
export function isValidEmailAddress(email) {
  if (!email || typeof email !== 'string') return false;
  const cleaned = email.trim();
  if (cleaned.length === 0) return true; // Optional empty email is valid
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}

/**
 * Normalizes a header string for deterministic alias comparison:
 * - strips UTF-8 BOM
 * - lowercases
 * - removes punctuation (.,-_/\\#)
 * - collapses extra whitespace
 */
export function normalizeHeaderName(header) {
  if (!header || typeof header !== 'string') return '';
  return header
    .replace(/^[\ufeff\u200b]+/g, '')
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Known column alias mappings
 */
export const HEADER_ALIASES = {
  registration_number: [
    'registration number',
    'registration no',
    'registration no.',
    'registration num',
    'reg number',
    'reg no',
    'reg no.',
    'reg. number',
    'reg. no',
    'reg num',
    'reg',
    'regno',
    'matric number',
    'matric no',
    'matric no.',
    'matric num',
    'matric',
    'matricno',
    'matriculation number',
    'matriculation no',
    'matriculation no.',
    'mat no',
    'mat no.',
    'mat number',
    'student id',
    'student reg no',
    'student registration number',
    'student matric number',
    'student number',
    'registration',
    'matric number reg number',
    'reg number matric number'
  ],
  first_name: [
    'first name',
    'firstname',
    'first',
    'given name',
    'givenname',
    'fname',
    'f name',
    'first_name'
  ],
  middle_name: [
    'middle name',
    'middlename',
    'middle',
    'mname',
    'm name',
    'other name',
    'other names',
    'othername',
    'othernames',
    'middle_name'
  ],
  last_name: [
    'last name',
    'lastname',
    'surname',
    'family name',
    'familyname',
    'lname',
    'l name',
    'last_name'
  ],
  full_name: [
    'full name',
    'fullname',
    'name',
    'student name',
    'student fullname',
    'student names',
    'names',
    'full_name'
  ],
  level: [
    'level',
    'current level',
    'class level',
    'academic level',
    'student level',
    'year',
    'study level',
    'class',
    'curr level',
    'current academic level'
  ],
  email: [
    'email',
    'email address',
    'student email',
    'official email',
    'e mail',
    'mail',
    'student email address',
    'official student email'
  ],
  phone: [
    'phone',
    'phone number',
    'mobile',
    'mobile number',
    'gsm',
    'contact',
    'telephone',
    'tel',
    'contact number'
  ],
  department: [
    'department',
    'dept',
    'academic department'
  ],
  faculty: [
    'faculty',
    'school'
  ],
  programme: [
    'programme',
    'program',
    'course',
    'discipline',
    'study programme'
  ],
  academic_session: [
    'academic session',
    'session',
    'school session',
    'academic year'
  ],
  admission_year: [
    'admission year',
    'admission_year',
    'entry year',
    'year of entry',
    'adm year',
    'admitted year'
  ]
};

/**
 * Robust CSV tokenizer that parses RFC 4180-compliant CSV text
 * Handles:
 * - UTF-8 BOM
 * - Quoted fields with escaped quotes ("")
 * - Commas inside quotes
 * - Multi-line and Windows (\r\n) or Unix (\n) line endings
 */
export function parseCsvText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      success: false,
      error: 'No student records were found in this CSV.',
      headers: [],
      rows: []
    };
  }

  // Strip BOM
  const text = rawText.replace(/^\uFEFF/, '').trim();
  if (text.length === 0) {
    return {
      success: false,
      error: 'No student records were found in this CSV.',
      headers: [],
      rows: []
    };
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
        continue;
      } else {
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
      
      // Skip \r\n pair
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      
      // Push non-empty rows
      if (currentRow.some(val => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      i++;
      continue;
    }

    currentField += char;
    i++;
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(val => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: 'No student records were found in this CSV.',
      headers: [],
      rows: []
    };
  }

  const rawHeaders = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    return {
      success: false,
      error: 'The CSV contains headers but no student records.',
      headers: rawHeaders,
      rows: []
    };
  }

  // Build row objects mapped by raw headers
  const rowObjects = dataRows.map((vals, rowIdx) => {
    const obj = { __rowIndex: rowIdx + 2 };
    rawHeaders.forEach((header, colIdx) => {
      obj[header] = vals[colIdx] !== undefined ? vals[colIdx] : '';
    });
    return obj;
  });

  return {
    success: true,
    headers: rawHeaders,
    rows: rowObjects,
    totalRows: rowObjects.length
  };
}

/**
 * Intelligently detect column mappings from CSV headers
 */
export function detectColumnMappings(headers) {
  const mappings = {
    registration_number: null,
    first_name: null,
    middle_name: null,
    last_name: null,
    full_name: null,
    level: null,
    email: null,
    phone: null,
    department: null,
    faculty: null,
    programme: null,
    academic_session: null
  };

  const confidence = {};
  const unmappedHeaders = [];

  headers.forEach(header => {
    const normalized = normalizeHeaderName(header);
    let matchedField = null;

    for (const [fieldKey, aliasList] of Object.entries(HEADER_ALIASES)) {
      if (aliasList.includes(normalized)) {
        matchedField = fieldKey;
        break;
      }
    }

    // Secondary partial matching if not exact alias match
    if (!matchedField) {
      if (normalized.includes('matric') || normalized.includes('reg no') || normalized.includes('registration no')) {
        matchedField = 'registration_number';
      } else if (normalized.includes('first name') || normalized.includes('given name')) {
        matchedField = 'first_name';
      } else if (normalized.includes('surname') || normalized.includes('last name') || normalized.includes('family name')) {
        matchedField = 'last_name';
      } else if (normalized.includes('middle name') || normalized.includes('other name')) {
        matchedField = 'middle_name';
      } else if (normalized.includes('full name') || normalized === 'name' || normalized.includes('student name')) {
        matchedField = 'full_name';
      } else if (normalized.includes('level') || normalized.includes('class level')) {
        matchedField = 'level';
      } else if (normalized.includes('email') || normalized.includes('mail')) {
        matchedField = 'email';
      } else if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('gsm')) {
        matchedField = 'phone';
      }
    }

    if (matchedField) {
      if (!mappings[matchedField]) {
        mappings[matchedField] = header;
        confidence[matchedField] = 'auto';
      }
    } else {
      unmappedHeaders.push(header);
    }
  });

  // Check required fields
  const missingRequired = [];
  if (!mappings.registration_number) {
    missingRequired.push('Registration Number');
  }

  const hasSeparateNames = Boolean(mappings.first_name && mappings.last_name);
  const hasFullName = Boolean(mappings.full_name);

  if (!hasSeparateNames && !hasFullName) {
    if (!mappings.first_name && !mappings.last_name) {
      missingRequired.push('Student Name (First & Last Name or Full Name)');
    } else if (!mappings.first_name) {
      missingRequired.push('First Name');
    } else if (!mappings.last_name) {
      missingRequired.push('Last Name (Surname)');
    }
  }

  if (!mappings.level) {
    missingRequired.push('Level');
  }

  return {
    mappings,
    confidence,
    unmappedHeaders,
    missingRequired,
    isValid: missingRequired.length === 0,
    hasSeparateNames,
    hasFullName
  };
}

/**
 * Normalizes academic level to canonical format (e.g., '200 Level' and 200).
 * Handles:
 * 100, 200, 300, 400, 500, 600
 * 100L, 200L, 300L...
 * 100 Level, 200 Level...
 * Year 1, Year 2...
 * 
 * If invalid level is given (e.g., 700L or abc), returns valid: false with clear reason.
 */
export function normalizeLevel(rawLevel, regNo = null) {
  if (rawLevel === undefined || rawLevel === null || String(rawLevel).trim() === '') {
    // If no level given, attempt dynamic progression calculation from regNo
    if (regNo) {
      const progression = calculateAcademicProgression({
        regNumber: String(regNo),
        currentYearStart: getActiveAcademicYearStart()
      });
      if (progression.valid) {
        return {
          valid: true,
          numericLevel: progression.numericLevel * 100,
          levelString: progression.levelString,
          inferred: true
        };
      }
    }
    return {
      valid: false,
      error: 'Academic Level is required and could not be detected.'
    };
  }

  const str = String(rawLevel).trim().toUpperCase();

  // Pattern 1: e.g. "100", "200L", "300 LEVEL", "400-LEVEL", "500 L"
  const hundredMatch = str.match(/^([1-6]00)\s*(L|LEVEL)?$/);
  if (hundredMatch) {
    const num = parseInt(hundredMatch[1], 10);
    return {
      valid: true,
      numericLevel: num,
      levelString: `${num} Level`,
      inferred: false
    };
  }

  // Pattern 2: e.g. "YEAR 1", "YR 2", "CLASS 3", "LEVEL 4", or single digit "1" - "6"
  const singleDigitMatch = str.match(/^(?:YEAR|YR|CLASS|LEVEL)?\s*([1-6])$/);
  if (singleDigitMatch) {
    const num = parseInt(singleDigitMatch[1], 10) * 100;
    return {
      valid: true,
      numericLevel: num,
      levelString: `${num} Level`,
      inferred: false
    };
  }

  // Not recognized -> Flag invalid level explicitly
  return {
    valid: false,
    error: `Invalid level "${rawLevel}". Supported academic levels are 100, 200, 300, 400, 500, or 600.`
  };
}

/**
 * Normalizes single name part (First, Middle, Last / Surname)
 * Removes accidental double spaces and normalizes casing
 */
export function normalizeNamePart(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  // Title case each word while preserving hyphens and apostrophes
  return trimmed
    .split(' ')
    .map(word => {
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      if (word.includes("'")) {
        return word
          .split("'")
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Intelligently parse a single full name string into Surname, First Name, and Middle Name
 */
export function parseFullNameParts(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', middleName: '', lastName: '', surname: '', fullName: '' };
  }

  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', middleName: '', lastName: '', surname: '', fullName: '' };
  }

  if (parts.length === 1) {
    const name = normalizeNamePart(parts[0]);
    return { firstName: name, middleName: '', lastName: name, surname: name, fullName: name };
  }

  // In Nigeria and FUTO records, the first token is typically the Surname
  const surname = normalizeNamePart(parts[0]);
  const firstName = normalizeNamePart(parts[1]);
  const middleName = parts.length > 2 ? normalizeNamePart(parts.slice(2).join(' ')) : '';
  const combined = [surname, firstName, middleName].filter(Boolean).join(' ');

  return {
    surname,
    lastName: surname,
    firstName,
    middleName,
    fullName: combined
  };
}

/**
 * Validate and normalize a single student row from parsed CSV data
 */
export function validateAndNormalizeStudentRow(
  rawRow,
  mappings,
  rowIndex,
  existingRosterMap,
  seenInBatch,
  options = { mode: 'add_only' }
) {
  const isUpdateMode = options.mode === 'update';

  // 1. Registration Number (Strictly Required)
  const regCol = mappings.registration_number;
  const rawReg = (regCol && rawRow[regCol] !== undefined ? rawRow[regCol] : '').toString().trim();

  if (!rawReg) {
    return {
      isValid: false,
      error: {
        row: rowIndex,
        regNo: null,
        field: 'registration_number',
        message: 'Registration number could not be detected'
      }
    };
  }

  const cleanReg = rawReg.trim().toUpperCase();

  // 2. Names (First Name & Last Name Required; Middle Name Optional)
  let firstName = '';
  let middleName = '';
  let lastName = '';
  let fullName = '';

  if (mappings.first_name && rawRow[mappings.first_name]) {
    firstName = normalizeNamePart(String(rawRow[mappings.first_name]));
  }
  if (mappings.last_name && rawRow[mappings.last_name]) {
    lastName = normalizeNamePart(String(rawRow[mappings.last_name]));
  }
  if (mappings.middle_name && rawRow[mappings.middle_name]) {
    middleName = normalizeNamePart(String(rawRow[mappings.middle_name]));
  }

  // If first or last name is missing, fall back to parsing full_name column
  if ((!firstName || !lastName) && mappings.full_name && rawRow[mappings.full_name]) {
    const parsed = parseFullNameParts(String(rawRow[mappings.full_name]));
    if (!firstName && parsed.firstName) firstName = parsed.firstName;
    if (!lastName && parsed.lastName) lastName = parsed.lastName;
    if (!middleName && parsed.middleName) middleName = parsed.middleName;
  }

  if (!lastName) {
    return {
      isValid: false,
      error: {
        row: rowIndex,
        regNo: cleanReg,
        field: 'last_name',
        message: 'Last name is missing'
      }
    };
  }

  if (!firstName) {
    return {
      isValid: false,
      error: {
        row: rowIndex,
        regNo: cleanReg,
        field: 'first_name',
        message: 'First name is missing'
      }
    };
  }

  fullName = [lastName, firstName, middleName].filter(Boolean).join(' ');

  // 3. Level (Strictly Required & Normalized)
  const levelCol = mappings.level;
  const rawLevelVal = levelCol ? rawRow[levelCol] : null;
  const levelNorm = normalizeLevel(rawLevelVal, cleanReg);

  if (!levelNorm.valid) {
    return {
      isValid: false,
      error: {
        row: rowIndex,
        regNo: cleanReg,
        field: 'level',
        message: levelNorm.error
      }
    };
  }

  // 4. Email (CRITICAL BUSINESS RULE: EMAIL IS OPTIONAL)
  const emailCol = mappings.email;
  const rawEmail = (emailCol && rawRow[emailCol] !== undefined ? rawRow[emailCol] : '').toString().trim();
  let email = null;

  if (rawEmail) {
    const lowerEmail = rawEmail.toLowerCase();
    if (!isValidEmailAddress(lowerEmail)) {
      return {
        isValid: false,
        error: {
          row: rowIndex,
          regNo: cleanReg,
          field: 'email',
          message: `Invalid email address format "${rawEmail}"`
        }
      };
    }
    email = lowerEmail;
  }

  // 5. Phone (Optional)
  const phoneCol = mappings.phone;
  const rawPhone = (phoneCol && rawRow[phoneCol] !== undefined ? rawRow[phoneCol] : '').toString().trim();
  const phone = rawPhone || '';

  // 6. Other Institutional Metadata (Department, Faculty, Session, Programme)
  const deptCol = mappings.department;
  const department = (deptCol && rawRow[deptCol] ? rawRow[deptCol] : 'Computer Science').toString().trim();

  const facCol = mappings.faculty;
  const faculty = (facCol && rawRow[facCol] ? rawRow[facCol] : 'School of Information & Communication Tech (SICT)').toString().trim();

  const progCol = mappings.programme;
  const programme = (progCol && rawRow[progCol] ? rawRow[progCol] : 'B.Tech Computer Science').toString().trim();

  const sessCol = mappings.academic_session;
  const academicSession = (sessCol && rawRow[sessCol] ? rawRow[sessCol] : getActiveAcademicSession()).toString().trim();

  // Admission Year derivation (source from explicit row field, or derive from academic level)
  const rawAdmissionYear = mappings.admission_year && rawRow[mappings.admission_year] ? parseInt(rawRow[mappings.admission_year], 10) : null;
  const admissionYear = rawAdmissionYear && !isNaN(rawAdmissionYear)
    ? rawAdmissionYear
    : (getActiveAcademicYearStart() - (levelNorm.numericLevel / 100) + 1);

  // 7. Duplicate Checks
  // A. Check duplicate inside uploaded CSV
  if (seenInBatch.regNos.has(cleanReg)) {
    const prevRow = seenInBatch.regNos.get(cleanReg);
    return {
      isDuplicate: true,
      duplicate: {
        row: rowIndex,
        type: 'batch',
        regNo: cleanReg,
        registration_number: cleanReg,
        field: 'registration_number',
        reason: `Duplicate registration number inside uploaded CSV (same as Row ${prevRow})`
      }
    };
  }
  seenInBatch.regNos.set(cleanReg, rowIndex);

  // If email is present, check email duplicate inside batch
  if (email) {
    if (seenInBatch.emails.has(email)) {
      const prevRow = seenInBatch.emails.get(email);
      return {
        isDuplicate: true,
        duplicate: {
          row: rowIndex,
          type: 'batch',
          regNo: cleanReg,
          registration_number: cleanReg,
          email,
          field: 'email',
          reason: `Duplicate email inside uploaded CSV (same as Row ${prevRow})`
        }
      };
    }
    seenInBatch.emails.set(email, rowIndex);
  }

  // B. Check duplicate against existing database roster
  const existingRecord = existingRosterMap.regNos.get(cleanReg);
  let isExisting = false;

  if (existingRecord) {
    if (!isUpdateMode) {
      return {
        isDuplicate: true,
        duplicate: {
          row: rowIndex,
          type: 'database',
          regNo: cleanReg,
          registration_number: cleanReg,
          fullName: existingRecord.full_name || fullName,
          field: 'registration_number',
          reason: 'Student already exists in database'
        }
      };
    } else {
      isExisting = true;
    }
  }

  // If email is provided and assigned to a DIFFERENT student in database
  if (email && existingRosterMap.emails.has(email)) {
    const ownerReg = existingRosterMap.emails.get(email);
    if (ownerReg !== cleanReg) {
      return {
        isDuplicate: true,
        duplicate: {
          row: rowIndex,
          type: 'database',
          regNo: cleanReg,
          registration_number: cleanReg,
          email,
          field: 'email',
          reason: `Email already assigned to student ${ownerReg} in database`
        }
      };
    }
  }

  // In update mode, preserve existing non-empty values if CSV value is empty
  let finalEmail = email;
  let finalPhone = phone;
  if (isExisting && existingRecord) {
    if (!finalEmail && existingRecord.email) {
      finalEmail = existingRecord.email; // Do not overwrite existing email with null
    }
    if (!finalPhone && existingRecord.phone_number) {
      finalPhone = existingRecord.phone_number;
    }
  }

  const normalizedRecord = {
    id: existingRecord?.id || `vs-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    registration_number: cleanReg,
    matric_number: cleanReg,
    surname: lastName,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    full_name: fullName,
    level: levelNorm.levelString,
    numeric_level: levelNorm.numericLevel,
    email: finalEmail || null,
    phone_number: finalPhone || '',
    admission_year: admissionYear,
    department,
    faculty,
    programme,
    programme_duration: 5,
    academic_session: academicSession,
    status: 'active',
    has_registered: existingRecord?.has_registered || false,
    is_existing: isExisting,
    csv_row_number: rowIndex
  };

  return {
    isValid: true,
    record: normalizedRecord
  };
}

/**
 * High-level pipeline to process and validate a full CSV text against existing roster
 */
export function processStudentCsv(
  csvText,
  existingRosterArg = [],
  optionsArg = { mode: 'add_only', customMappings: null }
) {
  let existingRoster = Array.isArray(existingRosterArg) ? existingRosterArg : [];
  let options = typeof optionsArg === 'object' && optionsArg !== null ? { ...optionsArg } : { mode: 'add_only' };

  if (!Array.isArray(existingRosterArg) && typeof existingRosterArg === 'object' && existingRosterArg !== null) {
    if (Array.isArray(existingRosterArg.existingStudents)) {
      existingRoster = existingRosterArg.existingStudents;
    } else if (Array.isArray(existingRosterArg.existingRoster)) {
      existingRoster = existingRosterArg.existingRoster;
    }
    options = { ...options, ...existingRosterArg };
  }
  const parseRes = parseCsvText(csvText);
  if (!parseRes.success) {
    return {
      success: false,
      error: parseRes.error,
      headers: parseRes.headers,
      totalRows: 0,
      validRecords: [],
      duplicates: [],
      errors: [],
      summary: {
        total: 0,
        totalRows: 0,
        validCount: 0,
        duplicateCount: 0,
        errorCount: 0
      }
    };
  }

  const { headers, rows } = parseRes;

  // Detect column mappings or use custom user overrides
  let mappings = options.customMappings;
  let detection = null;

  if (!mappings) {
    detection = detectColumnMappings(headers);
    mappings = detection.mappings;
  } else {
    detection = {
      mappings,
      isValid: Boolean(mappings.registration_number && (mappings.first_name || mappings.full_name) && mappings.level),
      missingRequired: []
    };
  }

  // If required headers cannot be found
  if (!detection.isValid) {
    return {
      success: false,
      needsManualMapping: true,
      error: `Could not automatically map all required columns. Missing: ${detection.missingRequired.join(', ')}`,
      headers,
      mappings,
      missingRequired: detection.missingRequired,
      unmappedHeaders: detection.unmappedHeaders || [],
      totalRows: rows.length,
      validRecords: [],
      duplicates: [],
      errors: []
    };
  }

  // Build index of existing roster for O(1) duplicate checks
  const existingRosterMap = {
    regNos: new Map(),
    emails: new Map()
  };

  existingRoster.forEach(s => {
    if (s.registration_number) {
      const regKey = s.registration_number.toString().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      existingRosterMap.regNos.set(regKey, s);
    }
    if (s.email && typeof s.email === 'string' && s.email.trim().length > 0) {
      existingRosterMap.emails.set(s.email.trim().toLowerCase(), s.registration_number);
    }
  });

  const seenInBatch = {
    regNos: new Map(),
    emails: new Map()
  };

  const validRecords = [];
  const duplicates = [];
  const errors = [];

  rows.forEach(rawRow => {
    const res = validateAndNormalizeStudentRow(
      rawRow,
      mappings,
      rawRow.__rowIndex,
      existingRosterMap,
      seenInBatch,
      options
    );

    if (res.isValid) {
      validRecords.push(res.record);
    } else if (res.isDuplicate) {
      duplicates.push(res.duplicate);
    } else if (res.error) {
      errors.push(res.error);
    }
  });

  return {
    success: true,
    headers,
    mappings,
    totalRows: rows.length,
    validRecords,
    duplicates,
    errors,
    summary: {
      total: rows.length,
      totalRows: rows.length,
      validCount: validRecords.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length
    }
  };
}

/**
 * Generates downloadable standardized CSV template demonstrating optional email
 */
export function generateSampleCsvTemplate() {
  const header = 'Registration Number,First Name,Middle Name,Last Name,Level,Email\n';
  const rows = [
    '202412345,John,Chukwu,Okoro,200,\n',
    '202412346,Mary,Grace,Okafor,200,mary.okafor@futo.edu.ng\n',
    '20241429481,Nestor,Emeka,Anyanwu,100,nestor.anyanwu@futo.edu.ng\n',
    '20231429102,David,,Chukwuma,300,\n'
  ].join('');
  return header + rows;
}

/**
 * Generates error and duplicate report as CSV text for download
 */
export function exportErrorReportCsv(errors = [], duplicates = []) {
  const header = 'Type,Row Number,Registration Number,Field,Explanation\n';
  const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

  const errorLines = errors.map(e => 
    `"Error",${e.row || ''},${escapeCsv(e.regNo || '')},${escapeCsv(e.field || '')},${escapeCsv(e.message || '')}`
  );

  const duplicateLines = duplicates.map(d => 
    `"Duplicate",${d.row || ''},${escapeCsv(d.regNo || '')},${escapeCsv(d.field || 'registration_number')},${escapeCsv(d.reason || '')}`
  );

  return header + [...errorLines, ...duplicateLines].join('\n');
}
