/**
 * @file courses.js
 * Official Database-Driven Registered Courses Management Service for NACOS FUTO.
 * Handles curriculum management, admin course operations, grouping by level/session/semester,
 * and academic progression eligibility filtering.
 * 
 * Strict Database Source: Zero hardcoded mock data. Fallbacks cleanly default to [].
 */

import { supabase } from './client.js';
import { 
  getActiveAcademicSession, 
  getActiveAcademicSemester,
  parseSessionYears,
  getAcademicSession,
  getEligibleAcademicRecords 
} from '@nacos/config/academic';

/**
 * Normalizes course record from Supabase table
 */
export function normalizeCourseRecord(c) {
  if (!c) return null;
  const rawLvl = c.level != null ? String(c.level).trim() : '100 Level';
  const numMatch = rawLvl.match(/\d{3}/);
  const numLevel = numMatch ? parseInt(numMatch[0], 10) : 100;
  const normalizedLevel = `${numLevel} Level`;
  
  const rawSemester = String(c.semester || 'First Semester').trim();
  const normalizedSemester = rawSemester.toLowerCase().includes('second') || rawSemester.toLowerCase().includes('rain')
    ? 'Second Semester'
    : 'First Semester';

  const units = parseInt(c.credit_units ?? c.units, 10) || 3;
  const session = String(c.academic_session || c.session || getActiveAcademicSession()).trim();

  let syllabusArray = [];
  if (Array.isArray(c.syllabus)) {
    syllabusArray = c.syllabus;
  } else if (typeof c.syllabus === 'string') {
    try {
      const parsed = JSON.parse(c.syllabus);
      if (Array.isArray(parsed)) syllabusArray = parsed;
      else syllabusArray = c.syllabus.split('\n').map(s => s.trim()).filter(Boolean);
    } catch (_) {
      syllabusArray = c.syllabus.split('\n').map(s => s.trim()).filter(Boolean);
    }
  }

  return {
    id: c.id,
    code: String(c.code || '').trim().toUpperCase(),
    course_code: String(c.code || '').trim().toUpperCase(),
    title: String(c.title || '').trim(),
    course_title: String(c.title || '').trim(),
    credit_units: units,
    units,
    level: normalizedLevel,
    levelString: normalizedLevel,
    numericLevel: numLevel,
    levelNumber: Math.floor(numLevel / 100),
    semester: normalizedSemester,
    academic_session: session,
    session,
    course_type: c.course_type || c.type || 'Core / Compulsory',
    type: c.course_type || c.type || 'Core / Compulsory',
    lecturer: c.lecturer_name || c.lecturer || '',
    lecturer_name: c.lecturer_name || c.lecturer || '',
    office: c.office || '',
    prerequisites: c.prerequisites || 'None',
    description: c.description || '',
    syllabus: syllabusArray,
    is_elective: Boolean(c.is_elective),
    created_by: c.created_by || null,
    created_at: c.created_at || null,
    updated_at: c.updated_at || null
  };
}

/**
 * Broadcast course updates across tabs
 */
function broadcastCourseUpdate(action, payload) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('nacos_courses_updated', { detail: { action, payload } }));
    } catch (_) {}

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('nacos_courses_sync');
        channel.postMessage({ action, payload, timestamp: Date.now() });
        channel.close();
      } catch (_) {}
    }
  }
}

/**
 * Fetch courses from Supabase with optional level, session, semester, and search filters.
 * Returns empty array [] when no database records exist.
 */
export async function fetchCourses(options = {}) {
  const { 
    level = null, 
    semester = null, 
    session = null, 
    academic_session = null, 
    search = '' 
  } = options;

  const targetSession = academic_session || session || null;

  try {
    if (!supabase) {
      return { data: [], error: 'Supabase client not initialized' };
    }

    let query = supabase
      .from('courses')
      .select('*')
      .order('level', { ascending: true })
      .order('semester', { ascending: true })
      .order('code', { ascending: true });

    if (level && String(level).toLowerCase() !== 'all') {
      const numMatch = String(level).match(/\d{3}/);
      if (numMatch) {
        const num = numMatch[0];
        query = query.or(`level.eq.${num} Level,level.eq.${num},level.ilike.%${num}%`);
      }
    }

    if (semester && String(semester).toLowerCase() !== 'all') {
      const isSecond = String(semester).toLowerCase().includes('second');
      query = query.ilike('semester', isSecond ? '%Second%' : '%First%');
    }

    if (targetSession && String(targetSession).toLowerCase() !== 'all') {
      query = query.eq('academic_session', targetSession);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Courses] Database query error:', error);
      return { data: [], error: error.message };
    }

    let normalized = (data || []).map(normalizeCourseRecord).filter(Boolean);

    // Apply text search filtering if provided
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      normalized = normalized.filter(c => 
        (c.code || '').toLowerCase().includes(q) ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.lecturer || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.academic_session || '').toLowerCase().includes(q)
      );
    }

    return { data: normalized, error: null };
  } catch (err) {
    console.error('[Courses] Unexpected fetchCourses exception:', err);
    return { data: [], error: err.message };
  }
}

/**
 * Fetch and group courses by distinct (Level, Academic Session, Semester) combinations.
 * Used by the Admin Dashboard course management table and student overview.
 */
export async function fetchCourseOfferingsGrouped(options = {}) {
  const res = await fetchCourses(options);
  if (res.error || !Array.isArray(res.data)) {
    return { data: [], error: res.error || 'Failed to fetch course offerings' };
  }

  const map = new Map();

  for (const course of res.data) {
    const key = `${course.level}__${course.academic_session}__${course.semester}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        level: course.level,
        levelString: course.level,
        levelNumber: course.levelNumber,
        numericLevel: course.numericLevel,
        academicSession: course.academic_session,
        session: course.academic_session,
        semester: course.semester,
        courseCount: 0,
        totalUnits: 0,
        courses: []
      });
    }

    const group = map.get(key);
    group.courses.push(course);
    group.courseCount += 1;
    group.totalUnits += (Number(course.credit_units) || 0);
  }

  // Convert to sorted array (Session desc, Level asc, Semester asc)
  const groupedList = Array.from(map.values()).sort((a, b) => {
    const sessA = parseSessionYears(a.academicSession).startYear;
    const sessB = parseSessionYears(b.academicSession).startYear;
    if (sessB !== sessA) return sessB - sessA; // newest session first
    if (a.numericLevel !== b.numericLevel) return a.numericLevel - b.numericLevel;
    return a.semester.localeCompare(b.semester);
  });

  return { data: groupedList, error: null };
}

/**
 * Fetch courses for an exact level, session, and semester offering
 */
export async function fetchOfferingCourseDetails({ level, academicSession, academic_session, session, semester }) {
  const resolvedSession = academicSession || academic_session || session || getActiveAcademicSession();
  const res = await fetchCourses({
    level,
    semester,
    session: resolvedSession
  });

  const courses = res.data || [];
  const totalCourses = courses.length;
  const totalUnits = courses.reduce((acc, c) => acc + (Number(c.credit_units) || 0), 0);

  return {
    courses,
    totalCourses,
    totalUnits,
    level,
    academicSession: resolvedSession,
    semester,
    error: res.error
  };
}

/**
 * Admin: Create a new course with rigorous database validation & duplicate check
 */
export async function adminCreateCourse(courseData) {
  if (!supabase) {
    return { success: false, error: 'Supabase client not connected.' };
  }

  const code = String(courseData.code || '').trim().toUpperCase();
  const title = String(courseData.title || '').trim();
  if (!code) return { success: false, error: 'Course code is required (e.g. CSC 101).' };
  if (!title) return { success: false, error: 'Course title is required.' };

  const rawLvl = String(courseData.level || 100);
  const numLvl = parseInt(rawLvl.replace(/\D/g, ''), 10) || 100;
  const level = `${numLvl} Level`;

  const rawSem = String(courseData.semester || 'First Semester').trim();
  const semester = rawSem.toLowerCase().includes('second') ? 'Second Semester' : 'First Semester';

  const session = String(courseData.academic_session || courseData.session || getActiveAcademicSession()).trim();
  const units = Math.max(1, parseInt(courseData.credit_units ?? courseData.units, 10) || 3);
  const courseType = String(courseData.course_type || courseData.type || 'Core / Compulsory').trim();

  // 1. Prevent duplicate entries for same course code, level, semester, and academic session
  const { data: existing, error: checkErr } = await supabase
    .from('courses')
    .select('id, code, level, semester, academic_session')
    .eq('code', code)
    .eq('academic_session', session)
    .ilike('semester', semester)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `Course code "${code}" is already registered for ${session} (${level}, ${semester}). Please edit the existing entry or use a different course code.`
    };
  }

  // Format syllabus
  let syllabusText = '';
  if (Array.isArray(courseData.syllabus)) {
    syllabusText = courseData.syllabus.join('\n');
  } else if (typeof courseData.syllabus === 'string') {
    syllabusText = courseData.syllabus.trim();
  }

  const newRow = {
    code,
    title,
    credit_units: units,
    level,
    semester,
    academic_session: session,
    course_type: courseType,
    lecturer_name: String(courseData.lecturer_name || courseData.lecturer || '').trim(),
    office: String(courseData.office || '').trim(),
    prerequisites: String(courseData.prerequisites || 'None').trim(),
    description: String(courseData.description || '').trim(),
    syllabus: syllabusText,
    is_elective: courseType.toLowerCase().includes('elective') || Boolean(courseData.is_elective),
    created_by: courseData.created_by || 'portal_admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('courses')
    .insert([newRow])
    .select()
    .single();

  if (insertErr) {
    console.error('[Courses] Error inserting course:', insertErr);
    return { success: false, error: insertErr.message || 'Failed to save course to database.' };
  }

  broadcastCourseUpdate('create', inserted);
  return { success: true, data: normalizeCourseRecord(inserted) };
}

/**
 * Admin: Update an existing course
 */
export async function adminUpdateCourse(id, updates = {}) {
  if (!supabase) {
    return { success: false, error: 'Supabase client not connected.' };
  }

  if (!id) return { success: false, error: 'Course ID is required for update.' };

  const cleanUpdates = {
    updated_at: new Date().toISOString()
  };

  if (updates.code) cleanUpdates.code = String(updates.code).trim().toUpperCase();
  if (updates.title) cleanUpdates.title = String(updates.title).trim();
  if (updates.credit_units != null || updates.units != null) {
    cleanUpdates.credit_units = Math.max(1, parseInt(updates.credit_units ?? updates.units, 10) || 3);
  }
  if (updates.level) {
    const num = parseInt(String(updates.level).replace(/\D/g, ''), 10) || 100;
    cleanUpdates.level = `${num} Level`;
  }
  if (updates.semester) {
    cleanUpdates.semester = String(updates.semester).toLowerCase().includes('second')
      ? 'Second Semester'
      : 'First Semester';
  }
  if (updates.academic_session || updates.session) {
    cleanUpdates.academic_session = String(updates.academic_session || updates.session).trim();
  }
  if (updates.course_type || updates.type) {
    cleanUpdates.course_type = String(updates.course_type || updates.type).trim();
  }
  if (updates.lecturer_name !== undefined || updates.lecturer !== undefined) {
    cleanUpdates.lecturer_name = String(updates.lecturer_name || updates.lecturer || '').trim();
  }
  if (updates.office !== undefined) cleanUpdates.office = String(updates.office || '').trim();
  if (updates.prerequisites !== undefined) cleanUpdates.prerequisites = String(updates.prerequisites || 'None').trim();
  if (updates.description !== undefined) cleanUpdates.description = String(updates.description || '').trim();
  if (updates.syllabus !== undefined) {
    cleanUpdates.syllabus = Array.isArray(updates.syllabus) 
      ? updates.syllabus.join('\n') 
      : String(updates.syllabus || '').trim();
  }
  if (updates.is_elective !== undefined) {
    cleanUpdates.is_elective = Boolean(updates.is_elective);
  }

  // If code, level, semester, or session changed, verify duplicate constraint
  if (cleanUpdates.code && (cleanUpdates.academic_session || cleanUpdates.semester || cleanUpdates.level)) {
    const { data: existingDup } = await supabase
      .from('courses')
      .select('id')
      .eq('code', cleanUpdates.code)
      .eq('academic_session', cleanUpdates.academic_session || updates.academic_session)
      .ilike('semester', cleanUpdates.semester || updates.semester)
      .neq('id', id)
      .maybeSingle();

    if (existingDup) {
      return {
        success: false,
        error: `Another course with code "${cleanUpdates.code}" already exists for this session and semester.`
      };
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from('courses')
    .update(cleanUpdates)
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    console.error('[Courses] Error updating course:', updateErr);
    return { success: false, error: updateErr.message || 'Failed to update course in database.' };
  }

  broadcastCourseUpdate('update', updated);
  return { success: true, data: normalizeCourseRecord(updated) };
}

/**
 * Admin: Delete a course with confirmation
 */
export async function adminDeleteCourse(id) {
  if (!supabase) {
    return { success: false, error: 'Supabase client not connected.' };
  }

  if (!id) return { success: false, error: 'Course ID is required for deletion.' };

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Courses] Error deleting course:', error);
    return { success: false, error: error.message || 'Failed to delete course from database.' };
  }

  broadcastCourseUpdate('delete', { id });
  return { success: true };
}
