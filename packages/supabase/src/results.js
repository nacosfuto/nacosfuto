/**
 * @file results.js
 * Official Results and Academic Grading Engine for NACOS FUTO Portal.
 * Handles student semester grades, batch CSV score uploads, and CGPA computations.
 */

import { supabase } from './client.js';

const STORAGE_KEY_RESULTS = 'nacos_results_db';

/**
 * FUTO Standard Grading Scale:
 * 70 - 100: A (5.0 GP)
 * 60 - 69:  B (4.0 GP)
 * 50 - 59:  C (3.0 GP)
 * 45 - 49:  D (2.0 GP)
 * 0  - 44:  F (0.0 GP - Fail / Carry Over)
 */
export function calculateFutoGrade(testScore = 0, examScore = 0, units = 3) {
  const test = Math.min(40, Math.max(0, Number(testScore) || 0));
  const exam = Math.min(60, Math.max(0, Number(examScore) || 0));
  const score = Math.round(test + exam);

  let grade = 'F';
  let point = 0.0;
  let status = 'Carry Over';

  if (score >= 70) {
    grade = 'A';
    point = 5.0;
    status = 'Passed';
  } else if (score >= 60) {
    grade = 'B';
    point = 4.0;
    status = 'Passed';
  } else if (score >= 50) {
    grade = 'C';
    point = 3.0;
    status = 'Passed';
  } else if (score >= 45) {
    grade = 'D';
    point = 2.0;
    status = 'Passed';
  } else {
    grade = 'F';
    point = 0.0;
    status = 'Carry Over';
  }

  const gp = Number((point * units).toFixed(2));

  return {
    test,
    exam,
    score,
    grade,
    gp,
    point,
    status
  };
}

/**
 * Benchmark Seeded Student Results
 */
export const SEED_RESULTS = [
  // 100 Level - 1st Semester
  {
    id: 'res-1',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'CSC 101',
    course_title: 'Introduction to Computing Systems',
    units: 3,
    level: 100,
    semester: '1st Semester',
    session: '2022/2023',
    test: 27,
    exam: 58,
    score: 85,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-2',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'MTH 101',
    course_title: 'Elementary Mathematics I (Algebra & Trig)',
    units: 3,
    level: 100,
    semester: '1st Semester',
    session: '2022/2023',
    test: 25,
    exam: 53,
    score: 78,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-3',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'PHY 101',
    course_title: 'General Physics I (Mechanics)',
    units: 3,
    level: 100,
    semester: '1st Semester',
    session: '2022/2023',
    test: 23,
    exam: 51,
    score: 74,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-4',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'CHM 101',
    course_title: 'General Chemistry I',
    units: 3,
    level: 100,
    semester: '1st Semester',
    session: '2022/2023',
    test: 22,
    exam: 48,
    score: 70,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-5',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'GST 101',
    course_title: 'Use of English I',
    units: 2,
    level: 100,
    semester: '1st Semester',
    session: '2022/2023',
    test: 26,
    exam: 55,
    score: 81,
    grade: 'A',
    gp: 10,
    status: 'Passed'
  },

  // 100 Level - 2nd Semester
  {
    id: 'res-6',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'CSC 102',
    course_title: 'Introduction to Problem Solving & Programming',
    units: 3,
    level: 100,
    semester: '2nd Semester',
    session: '2022/2023',
    test: 28,
    exam: 60,
    score: 88,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-7',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'MTH 102',
    course_title: 'Elementary Mathematics II (Calculus)',
    units: 3,
    level: 100,
    semester: '2nd Semester',
    session: '2022/2023',
    test: 24,
    exam: 54,
    score: 78,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-8',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'CHM 102',
    course_title: 'General Chemistry II',
    units: 3,
    level: 100,
    semester: '2nd Semester',
    session: '2022/2023',
    test: 21,
    exam: 47,
    score: 68,
    grade: 'B',
    gp: 12,
    status: 'Passed'
  },

  // 200 Level - 1st Semester
  {
    id: 'res-9',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'CSC 201',
    course_title: 'Computer Programming I (C++)',
    units: 3,
    level: 200,
    semester: '1st Semester',
    session: '2023/2024',
    test: 26,
    exam: 58,
    score: 84,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-10',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'CSC 203',
    course_title: 'Discrete Structures',
    units: 3,
    level: 200,
    semester: '1st Semester',
    session: '2023/2024',
    test: 25,
    exam: 52,
    score: 77,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  },
  {
    id: 'res-11',
    matric_number: '20221234567',
    student_name: 'Daniel Chukwuka',
    course_code: 'MTH 201',
    course_title: 'Mathematical Methods I',
    units: 3,
    level: 200,
    semester: '1st Semester',
    session: '2023/2024',
    test: 23,
    exam: 50,
    score: 73,
    grade: 'A',
    gp: 15,
    status: 'Passed'
  }
];

export function getLocalResults() {
  if (typeof window === 'undefined') return [...SEED_RESULTS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESULTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(SEED_RESULTS));
      return [...SEED_RESULTS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...SEED_RESULTS];
  } catch (e) {
    return [...SEED_RESULTS];
  }
}

export function saveLocalResults(results) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(results));
    window.dispatchEvent(new Event('nacos_results_updated'));
  } catch (e) {
    console.warn('Failed to save results locally:', e);
  }
}

/**
 * Fetch all results for a student grouped by semester & level
 */
export async function fetchResultsForStudent(matricOrRegNo) {
  if (!matricOrRegNo) return { data: [], error: null };
  const cleanId = String(matricOrRegNo).trim().toLowerCase();

  // Try Supabase first
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('student_results')
        .select('*')
        .ilike('matric_number', cleanId);
      if (!error && Array.isArray(data) && data.length > 0) {
        return { data, error: null };
      }
    }
  } catch (e) {}

  // Local fallback
  const all = getLocalResults();
  const matched = all.filter(r => 
    (r.matric_number && r.matric_number.toLowerCase() === cleanId) ||
    (r.registration_number && r.registration_number.toLowerCase() === cleanId)
  );

  // Return only matched records for this specific student; if none exist, return []
  return { 
    data: matched, 
    error: null 
  };
}

/**
 * Admin: Query results catalog with filters
 */
export async function adminFetchResultsCatalog(options = {}) {
  const { level = null, semester = null, courseCode = null, session = null, search = '' } = options;

  let list = [];

  // 1. Authoritative query from Supabase
  try {
    if (supabase) {
      let query = supabase.from('student_results').select('*').order('created_at', { ascending: false });

      if (level) {
        const cleanLevel = parseInt(String(level).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(cleanLevel)) {
          query = query.eq('level', cleanLevel);
        }
      }

      if (semester && semester !== 'All') {
        query = query.ilike('semester', `%${semester}%`);
      }

      if (courseCode && courseCode !== 'All') {
        query = query.eq('course_code', courseCode.toUpperCase().trim());
      }

      if (session && session !== 'All') {
        query = query.eq('session', session);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
        saveLocalResults(list);
      }
    }
  } catch (err) {
    console.warn('Supabase student_results query warning:', err);
  }

  // 2. Fallback to local storage if database returned empty
  if (list.length === 0) {
    list = getLocalResults();

    if (level) {
      const cleanLevel = parseInt(String(level).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(cleanLevel)) {
        list = list.filter(r => Number(r.level) === cleanLevel);
      }
    }

    if (semester && semester !== 'All') {
      const cleanSem = semester.toLowerCase();
      list = list.filter(r => (r.semester || '').toLowerCase().includes(cleanSem));
    }

    if (courseCode && courseCode !== 'All') {
      const cleanCode = courseCode.toUpperCase().trim();
      list = list.filter(r => (r.course_code || '').toUpperCase() === cleanCode);
    }

    if (session && session !== 'All') {
      list = list.filter(r => (r.session || '').toLowerCase() === session.toLowerCase());
    }
  }

  if (search && search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(r => 
      (r.matric_number || '').toLowerCase().includes(q) ||
      (r.student_name || '').toLowerCase().includes(q) ||
      (r.course_code || '').toLowerCase().includes(q) ||
      (r.course_title || '').toLowerCase().includes(q)
    );
  }

  return { data: list, error: null };
}

/**
 * Admin: Save or update a single student's course grade
 */
export async function adminSaveSingleResult(resultData) {
  const units = parseInt(resultData.units, 10) || 3;
  const gradeCalc = calculateFutoGrade(resultData.test, resultData.exam, units);

  const id = resultData.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const cleanLevel = parseInt(String(resultData.level || 100).replace(/[^0-9]/g, ''), 10) || 100;

  const record = {
    id,
    matric_number: String(resultData.matric_number || '').trim().toUpperCase(),
    student_name: String(resultData.student_name || 'Department Student').trim(),
    course_code: String(resultData.course_code || '').trim().toUpperCase(),
    course_title: String(resultData.course_title || '').trim(),
    units,
    level: cleanLevel,
    semester: resultData.semester || '1st Semester',
    session: resultData.session || '2026/2027',
    test: gradeCalc.test,
    exam: gradeCalc.exam,
    score: gradeCalc.score,
    grade: gradeCalc.grade,
    gp: gradeCalc.gp,
    status: gradeCalc.status,
    updated_at: new Date().toISOString()
  };

  const current = getLocalResults();
  const existingIdx = current.findIndex(r => 
    (r.id === id) || 
    (r.matric_number === record.matric_number && r.course_code === record.course_code && r.session === record.session)
  );

  if (existingIdx !== -1) {
    current[existingIdx] = { ...current[existingIdx], ...record };
  } else {
    current.unshift(record);
  }

  saveLocalResults(current);

  try {
    if (supabase) {
      await supabase.from('student_results').upsert([record]);
    }
  } catch (e) {}

  return { success: true, data: record };
}

/**
 * Admin: Batch Upload Grades (from CSV parsing)
 * Expects array of { matric_number, student_name, course_code, course_title, units, level, semester, session, test, exam }
 */
export async function adminUploadResultsBatch(records = []) {
  if (!Array.isArray(records) || records.length === 0) {
    return { success: false, error: 'No records provided for upload' };
  }

  const current = getLocalResults();
  const processed = [];

  for (const item of records) {
    if (!item.matric_number || !item.course_code) continue;
    const units = parseInt(item.units, 10) || 3;
    const gradeCalc = calculateFutoGrade(item.test, item.exam, units);
    const cleanLevel = parseInt(String(item.level || 100).replace(/[^0-9]/g, ''), 10) || 100;

    const record = {
      id: item.id || `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      matric_number: String(item.matric_number).trim().toUpperCase(),
      student_name: String(item.student_name || 'Department Student').trim(),
      course_code: String(item.course_code).trim().toUpperCase(),
      course_title: String(item.course_title || item.course_code).trim(),
      units,
      level: cleanLevel,
      semester: item.semester || '1st Semester',
      session: item.session || '2026/2027',
      test: gradeCalc.test,
      exam: gradeCalc.exam,
      score: gradeCalc.score,
      grade: gradeCalc.grade,
      gp: gradeCalc.gp,
      status: gradeCalc.status,
      updated_at: new Date().toISOString()
    };

    const existingIdx = current.findIndex(r => 
      r.matric_number === record.matric_number && 
      r.course_code === record.course_code && 
      r.session === record.session
    );

    if (existingIdx !== -1) {
      current[existingIdx] = { ...current[existingIdx], ...record };
    } else {
      current.unshift(record);
    }

    processed.push(record);
  }

  saveLocalResults(current);

  try {
    if (supabase && processed.length > 0) {
      await supabase.from('student_results').upsert(processed);
    }
  } catch (e) {}

  return { success: true, count: processed.length, data: processed };
}

/**
 * Admin: Delete a student result record
 */
export async function adminDeleteResult(id) {
  const current = getLocalResults();
  const filtered = current.filter(r => r.id !== id);
  saveLocalResults(filtered);

  try {
    if (supabase) {
      await supabase.from('student_results').delete().eq('id', id);
    }
  } catch (e) {}

  return { success: true };
}
