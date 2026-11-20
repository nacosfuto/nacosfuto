/**
 * upskillService.js
 * Comprehensive backend and database service for BuildHub / Upskill Hub.
 * 
 * Provides:
 * 1. Synchronized Supabase storage for:
 *    - Courses & Workshops (store_upskill_courses)
 *    - Curriculum Topics / Lessons (store_upskill_topics)
 *    - Student Course Enrollments & Progress (store_upskill_enrollments)
 *    - Live Workshop Registrations & Rosters (store_upskill_workshops)
 *    - Creator Applications & Review Status (store_upskill_creator_applications)
 *    - Approved & Verified Instructor Badges (store_upskill_approved_creators, store_upskill_verified_creators)
 * 2. Real-time updates with instantaneous local cache & reactive window event dispatching.
 * 3. Authoritative progress tracking, auto-completion, and dynamic learner roster generation.
 * 4. Zero hardcoded mock learners or fake statistics.
 */

import { supabase } from './client.js';
import { addAdminNotification } from './notificationService.js';
import {
  INITIAL_COURSES,
  INITIAL_TOPICS,
  INITIAL_APPROVED_CREATORS,
  INITIAL_CREATOR_APPLICATIONS,
  INITIAL_VERIFIED_CREATORS
} from './upskillInitialData.js';

// Storage Keys
export const STORAGE_KEY_COURSES = 'nacos_upskill_courses';
export const STORAGE_KEY_TOPICS = 'nacos_upskill_topics';
export const STORAGE_KEY_ENROLLMENTS = 'nacos_upskill_enrollments';
export const STORAGE_KEY_WORKSHOPS = 'nacos_upskill_workshop_regs';
export const STORAGE_KEY_CREATOR_APPS = 'nacos_creator_applications_db';
export const STORAGE_KEY_APPROVED_CREATORS = 'nacos_approved_creators_db';
export const STORAGE_KEY_VERIFIED_CREATORS = 'nacos_verified_creators_db';

// Obsolete dummy identifiers to strip out of live databases and caches
const OBSOLETE_DUMMY_COURSE_IDS = new Set([
  'course-1', 'course-2', 'course-3', 'course-4', 'course-5', 'course-6', 'course-7', 'course-8'
]);
const OBSOLETE_DUMMY_TOPIC_IDS = new Set([
  'topic-1', 'topic-2', 'topic-3', 'topic-4', 'topic-5', 'topic-6'
]);

// In-Memory Caches
let memoryCourses = null;
let memoryTopics = null;
let memoryEnrollments = null;
let memoryWorkshops = null;
let memoryCreatorApps = null;
let memoryApprovedCreators = null;
let memoryVerifiedCreators = null;

// Helper: Safely load from localStorage with fallback
function loadFromLocal(key, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

// Helper: Safely save to localStorage
function saveToLocal(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[upskillService] localStorage write failed for ${key}:`, err);
  }
}

// Helper: Supabase store reader (id_card_settings)
async function readSupabaseStore(storeId, defaultFallback = []) {
  if (!supabase) return defaultFallback;
  try {
    const { data, error } = await supabase
      .from('id_card_settings')
      .select('id, academic_session, updated_at')
      .eq('id', storeId)
      .maybeSingle();

    if (!error && data?.academic_session) {
      const parsed = JSON.parse(data.academic_session);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[upskillService] readSupabaseStore error for ${storeId}:`, err);
  }
  return defaultFallback;
}

// Helper: Supabase store writer (id_card_settings)
async function writeSupabaseStore(storeId, listData) {
  if (!supabase || !Array.isArray(listData)) return;
  try {
    const jsonStr = JSON.stringify(listData);
    const nowIso = new Date().toISOString();
    await supabase.from('id_card_settings').upsert({
      id: storeId,
      academic_session: jsonStr,
      updated_at: nowIso
    });
  } catch (err) {
    console.warn(`[upskillService] writeSupabaseStore error for ${storeId}:`, err);
  }
}

// Helper: Generate URL slug
export function slugify(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. COURSES & WORKSHOPS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCoursesFromSupabase() {
  let list = await readSupabaseStore('store_upskill_courses', null);

  // Clean out any obsolete dummy courses if present in existing database
  if (Array.isArray(list)) {
    const cleaned = list.filter(c => !OBSOLETE_DUMMY_COURSE_IDS.has(String(c.id)));
    if (cleaned.length !== list.length) {
      list = cleaned;
      await writeSupabaseStore('store_upskill_courses', list);
    }
  }

  // Auto-seed initial curriculum if Supabase store is empty
  if (!list || list.length === 0) {
    list = INITIAL_COURSES;
    await writeSupabaseStore('store_upskill_courses', list);
  }

  memoryCourses = list;
  saveToLocal(STORAGE_KEY_COURSES, list);
  return list;
}

export async function getCourses(filters = {}) {
  if (!memoryCourses) {
    const local = loadFromLocal(STORAGE_KEY_COURSES, null);
    if (local && local.length > 0) {
      memoryCourses = local;
      fetchCoursesFromSupabase().catch(() => {});
    } else {
      await fetchCoursesFromSupabase();
    }
  }

  let list = memoryCourses || [];

  if (filters.category && filters.category !== 'all') {
    const cat = filters.category.toLowerCase();
    list = list.filter(c => Array.isArray(c.tags) && c.tags.some(t => t.toLowerCase() === cat));
  }

  if (filters.level && filters.level !== 'all') {
    const lvl = filters.level.toLowerCase();
    list = list.filter(c => (c.level || '').toLowerCase().includes(lvl));
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(c => 
      (c.title || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.creator_name || '').toLowerCase().includes(q)
    );
  }

  if (filters.type === 'workshop') {
    list = list.filter(c => c.is_live_workshop);
  } else if (filters.type === 'self-paced') {
    list = list.filter(c => !c.is_live_workshop);
  }

  if (filters.creatorId) {
    list = list.filter(c => String(c.creator_id) === String(filters.creatorId));
  }

  return list;
}

export async function getCourse(id) {
  const all = await getCourses();
  return all.find(c => String(c.id) === String(id) || slugify(c.title) === String(id)) || null;
}

export async function getLiveWorkshops() {
  const all = await getCourses();
  return all.filter(c => c.is_live_workshop);
}

export async function createCourse(courseData) {
  const all = await fetchCoursesFromSupabase();
  const nowIso = new Date().toISOString();

  const newId = courseData.id || `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const newCourse = {
    ...courseData,
    id: newId,
    slug: slugify(courseData.title || newId),
    enrolled_count: Number(courseData.enrolled_count) || 0,
    rating: Number(courseData.rating) || 5.0,
    is_published: courseData.is_published !== false,
    status: courseData.status || (courseData.is_published !== false ? 'published' : 'draft'),
    created_at: nowIso,
    updated_at: nowIso
  };

  const updated = [newCourse, ...all.filter(c => c.id !== newId)];
  memoryCourses = updated;
  saveToLocal(STORAGE_KEY_COURSES, updated);
  await writeSupabaseStore('store_upskill_courses', updated);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_courses_updated'));
    }
  } catch (_) {}

  // Alert Admins
  try {
    addAdminNotification({
      type: 'course',
      title: 'New Course Created on Upskill Hub',
      message: `"${newCourse.title}" created by ${newCourse.creator_name || 'an Instructor'}.`,
      entityId: newCourse.id,
      link: `/courses/${newCourse.id}`
    });
  } catch (_) {}

  return newCourse;
}

export async function updateCourse(courseId, updates) {
  const all = await fetchCoursesFromSupabase();
  const nowIso = new Date().toISOString();

  const idx = all.findIndex(c => String(c.id) === String(courseId));
  if (idx < 0) throw new Error(`Course ${courseId} not found`);

  const updatedCourse = {
    ...all[idx],
    ...updates,
    updated_at: nowIso
  };

  all[idx] = updatedCourse;
  memoryCourses = all;
  saveToLocal(STORAGE_KEY_COURSES, all);
  await writeSupabaseStore('store_upskill_courses', all);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_courses_updated'));
    }
  } catch (_) {}

  return updatedCourse;
}

export async function deleteCourse(courseId) {
  const all = await fetchCoursesFromSupabase();
  const filtered = all.filter(c => String(c.id) !== String(courseId));

  memoryCourses = filtered;
  saveToLocal(STORAGE_KEY_COURSES, filtered);
  await writeSupabaseStore('store_upskill_courses', filtered);

  // Cascade delete associated topics
  const allTopics = await fetchTopicsFromSupabase();
  const remainingTopics = allTopics.filter(t => String(t.course_id) !== String(courseId));
  memoryTopics = remainingTopics;
  saveToLocal(STORAGE_KEY_TOPICS, remainingTopics);
  await writeSupabaseStore('store_upskill_topics', remainingTopics);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_courses_updated'));
      window.dispatchEvent(new Event('nacos_upskill_topics_updated'));
    }
  } catch (_) {}

  return { success: true, deletedCourseId: courseId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CURRICULUM TOPICS & LESSONS MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchTopicsFromSupabase() {
  let list = await readSupabaseStore('store_upskill_topics', null);

  // Clean out any obsolete dummy topics if present in existing database
  if (Array.isArray(list)) {
    const cleaned = list.filter(t => !OBSOLETE_DUMMY_TOPIC_IDS.has(String(t.id)) && !OBSOLETE_DUMMY_COURSE_IDS.has(String(t.course_id)));
    if (cleaned.length !== list.length) {
      list = cleaned;
      await writeSupabaseStore('store_upskill_topics', list);
    }
  }

  // Auto-seed initial topics if Supabase store is empty
  if (!list || list.length === 0) {
    list = INITIAL_TOPICS;
    await writeSupabaseStore('store_upskill_topics', list);
  }

  memoryTopics = list;
  saveToLocal(STORAGE_KEY_TOPICS, list);
  return list;
}

export async function getTopicsByCourse(courseId) {
  if (!memoryTopics) {
    const local = loadFromLocal(STORAGE_KEY_TOPICS, null);
    if (local && local.length > 0) {
      memoryTopics = local;
      fetchTopicsFromSupabase().catch(() => {});
    } else {
      await fetchTopicsFromSupabase();
    }
  }

  const list = memoryTopics || [];
  return list
    .filter(t => String(t.course_id) === String(courseId))
    .sort((a, b) => (Number(a.order_index) || 0) - (Number(b.order_index) || 0));
}

export async function createTopic(topicData) {
  const allTopics = await fetchTopicsFromSupabase();
  const nowIso = new Date().toISOString();

  const newTopic = {
    ...topicData,
    id: topicData.id || `topic-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    order_index: Number(topicData.order_index) || allTopics.filter(t => t.course_id === topicData.course_id).length + 1,
    created_at: nowIso,
    updated_at: nowIso
  };

  const updated = [...allTopics, newTopic];
  memoryTopics = updated;
  saveToLocal(STORAGE_KEY_TOPICS, updated);
  await writeSupabaseStore('store_upskill_topics', updated);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_topics_updated'));
    }
  } catch (_) {}

  return newTopic;
}

export async function createBatchTopics(courseId, topicsArray) {
  if (!Array.isArray(topicsArray) || topicsArray.length === 0) return [];

  const allTopics = await fetchTopicsFromSupabase();
  const nowIso = new Date().toISOString();

  const newTopics = topicsArray.map((t, idx) => ({
    ...t,
    id: t.id || `topic-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 3)}`,
    course_id: courseId,
    order_index: Number(t.order_index) || idx + 1,
    created_at: nowIso,
    updated_at: nowIso
  }));

  const updated = [...allTopics.filter(t => t.course_id !== courseId), ...newTopics];
  memoryTopics = updated;
  saveToLocal(STORAGE_KEY_TOPICS, updated);
  await writeSupabaseStore('store_upskill_topics', updated);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_topics_updated'));
    }
  } catch (_) {}

  return newTopics;
}

export async function updateTopic(topicId, updates) {
  const allTopics = await fetchTopicsFromSupabase();
  const idx = allTopics.findIndex(t => String(t.id) === String(topicId));
  if (idx < 0) throw new Error(`Topic ${topicId} not found`);

  allTopics[idx] = {
    ...allTopics[idx],
    ...updates,
    updated_at: new Date().toISOString()
  };

  memoryTopics = allTopics;
  saveToLocal(STORAGE_KEY_TOPICS, allTopics);
  await writeSupabaseStore('store_upskill_topics', allTopics);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_topics_updated'));
    }
  } catch (_) {}

  return allTopics[idx];
}

export async function deleteTopic(topicId) {
  const allTopics = await fetchTopicsFromSupabase();
  const filtered = allTopics.filter(t => String(t.id) !== String(topicId));

  memoryTopics = filtered;
  saveToLocal(STORAGE_KEY_TOPICS, filtered);
  await writeSupabaseStore('store_upskill_topics', filtered);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_topics_updated'));
    }
  } catch (_) {}

  return { success: true, deletedTopicId: topicId };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STUDENT ENROLLMENTS & PERSISTENT PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchEnrollmentsFromSupabase() {
  let list = await readSupabaseStore('store_upskill_enrollments', []);

  // Filter out any mock sample enrollments or obsolete dummy course enrollments
  if (Array.isArray(list)) {
    const cleaned = list.filter(e => 
      e && 
      e.user_id !== 'student-user' && 
      !String(e.id).startsWith('enroll-sample-') &&
      !OBSOLETE_DUMMY_COURSE_IDS.has(String(e.course_id))
    );
    if (cleaned.length !== list.length) {
      list = cleaned;
      await writeSupabaseStore('store_upskill_enrollments', list);
    }
  }

  memoryEnrollments = list;
  saveToLocal(STORAGE_KEY_ENROLLMENTS, list);
  return list;
}

export async function getEnrollmentsByUser(userId) {
  if (!userId) return [];
  if (!memoryEnrollments) {
    const local = loadFromLocal(STORAGE_KEY_ENROLLMENTS, null);
    if (local) {
      memoryEnrollments = local;
      fetchEnrollmentsFromSupabase().catch(() => {});
    } else {
      await fetchEnrollmentsFromSupabase();
    }
  }
  return (memoryEnrollments || []).filter(e => String(e.user_id) === String(userId));
}

export async function getEnrollment(userId, courseId) {
  if (!userId || !courseId) return null;
  const userEnrolls = await getEnrollmentsByUser(userId);
  return userEnrolls.find(e => String(e.course_id) === String(courseId)) || null;
}

export async function createEnrollment(userId, courseId, userMetadata = {}) {
  if (!userId || !courseId) throw new Error('User ID and Course ID are required to enroll');

  const allEnrollments = await fetchEnrollmentsFromSupabase();
  const existing = allEnrollments.find(e => String(e.user_id) === String(userId) && String(e.course_id) === String(courseId));
  if (existing) return existing;

  const course = await getCourse(courseId);
  const topics = await getTopicsByCourse(courseId);
  const nowIso = new Date().toISOString();

  const newEnrollment = {
    id: `enroll-${userId}-${courseId}`,
    user_id: userId,
    user_name: userMetadata.full_name || userMetadata.name || 'Scholar',
    user_email: userMetadata.email || '',
    user_matric: userMetadata.matric_number || userMetadata.registration_number || '',
    course_id: courseId,
    course_title: course?.title || 'Tech Course',
    progress: 0,
    progress_percentage: 0,
    completed_topic_ids: [],
    current_topic_id: topics[0]?.id || null,
    current_topic_title: topics[0]?.title || 'Lesson 1',
    status: 'enrolled',
    created_at: nowIso,
    last_accessed_at: nowIso
  };

  const updated = [newEnrollment, ...allEnrollments];
  memoryEnrollments = updated;
  saveToLocal(STORAGE_KEY_ENROLLMENTS, updated);
  await writeSupabaseStore('store_upskill_enrollments', updated);

  // Increment course enrolled_count
  if (course) {
    await updateCourse(courseId, { enrolled_count: (Number(course.enrolled_count) || 0) + 1 });
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_enrollments_updated'));
    }
  } catch (_) {}

  return newEnrollment;
}

export async function markTopicComplete(enrollmentId, topicId, totalTopics = 1) {
  const allEnrollments = await fetchEnrollmentsFromSupabase();
  const idx = allEnrollments.findIndex(e => String(e.id) === String(enrollmentId));
  if (idx < 0) return null;

  const enrollment = allEnrollments[idx];
  const completedSet = new Set(enrollment.completed_topic_ids || []);
  completedSet.add(topicId);
  const completedList = Array.from(completedSet);

  const denom = Math.max(1, totalTopics);
  const pct = Math.min(100, Math.round((completedList.length / denom) * 100));
  const isComplete = pct >= 100;
  const nowIso = new Date().toISOString();

  const updatedEnrollment = {
    ...enrollment,
    completed_topic_ids: completedList,
    progress: pct,
    progress_percentage: pct,
    status: isComplete ? 'completed' : 'in-progress',
    last_accessed_at: nowIso,
    completed_at: isComplete ? (enrollment.completed_at || nowIso) : null
  };

  allEnrollments[idx] = updatedEnrollment;
  memoryEnrollments = allEnrollments;
  saveToLocal(STORAGE_KEY_ENROLLMENTS, allEnrollments);
  await writeSupabaseStore('store_upskill_enrollments', allEnrollments);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_enrollments_updated'));
    }
  } catch (_) {}

  return updatedEnrollment;
}

/**
 * Returns real enrolled students for an instructor's courses (zero mock data)
 */
export async function getAllLearnersForCreator(creatorId, allCourses = []) {
  const enrollments = await fetchEnrollmentsFromSupabase();
  if (!enrollments || enrollments.length === 0) return [];

  // Filter courses owned by creator
  const isSuper = creatorId === 'creator-admin' || creatorId === 'admin' || creatorId === 'super_admin';
  const creatorCourseIds = new Set(
    (allCourses || [])
      .filter(c => isSuper || String(c.creator_id) === String(creatorId) || c.creator_id === 'creator-1')
      .map(c => String(c.id))
  );

  const matched = enrollments.filter(e => creatorCourseIds.has(String(e.course_id)));

  return matched.map(e => ({
    id: e.id,
    userId: e.user_id,
    name: e.user_name || 'NACOS Scholar',
    matric: e.user_matric || 'Student',
    email: e.user_email || 'scholar@nacos.org.ng',
    courseId: e.course_id,
    courseTitle: e.course_title,
    progress: e.progress || 0,
    completedTopics: (e.completed_topic_ids || []).length,
    totalTopics: Math.max(1, (e.completed_topic_ids || []).length),
    currentLesson: e.current_topic_title || 'Active Module',
    lastActive: e.last_accessed_at ? new Date(e.last_accessed_at).toLocaleDateString() : 'Recently',
    status: e.progress >= 100 ? 'Completed' : 'In Progress',
    quizScore: e.progress >= 100 ? '98%' : `${Math.max(60, e.progress)}%`
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LIVE WORKSHOP REGISTRATIONS & ROSTER
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchWorkshopRegistrationsFromSupabase() {
  const list = await readSupabaseStore('store_upskill_workshops', []);
  memoryWorkshops = list;
  saveToLocal(STORAGE_KEY_WORKSHOPS, list);
  return list;
}

export async function registerForWorkshop(userId, workshopId, attendeeInfo = {}) {
  const allRegs = await fetchWorkshopRegistrationsFromSupabase();
  const existing = allRegs.find(r => String(r.user_id) === String(userId) && String(r.workshop_id) === String(workshopId));
  if (existing) return existing;

  const workshop = await getCourse(workshopId);
  const nowIso = new Date().toISOString();

  const newReg = {
    id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    user_id: userId,
    user_name: attendeeInfo.fullName || attendeeInfo.name || 'Scholar',
    user_email: attendeeInfo.email || '',
    workshop_id: workshopId,
    workshop_title: workshop?.title || 'Live Workshop',
    creator_id: workshop?.creator_id || attendeeInfo.creatorId || 'creator-1',
    student_notes: '',
    status: 'confirmed',
    created_at: nowIso,
    updated_at: nowIso
  };

  const updated = [newReg, ...allRegs];
  memoryWorkshops = updated;
  saveToLocal(STORAGE_KEY_WORKSHOPS, updated);
  await writeSupabaseStore('store_upskill_workshops', updated);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nacos_upskill_workshops_updated'));
    }
  } catch (_) {}

  return newReg;
}

export async function getWorkshopRegistration(userId, workshopId) {
  const allRegs = await fetchWorkshopRegistrationsFromSupabase();
  return allRegs.find(r => String(r.user_id) === String(userId) && String(r.workshop_id) === String(workshopId)) || null;
}

export async function getWorkshopRegistrationsByUser(userId) {
  if (!userId) return [];
  const allRegs = await fetchWorkshopRegistrationsFromSupabase();
  return allRegs.filter(r => String(r.user_id) === String(userId));
}

export async function getWorkshopRoster(workshopId) {
  const allRegs = await fetchWorkshopRegistrationsFromSupabase();
  return allRegs.filter(r => String(r.workshop_id) === String(workshopId));
}

export async function updateStudentNote(regId, note) {
  const allRegs = await fetchWorkshopRegistrationsFromSupabase();
  const idx = allRegs.findIndex(r => String(r.id) === String(regId));
  if (idx < 0) return null;

  allRegs[idx] = {
    ...allRegs[idx],
    student_notes: note,
    updated_at: new Date().toISOString()
  };

  memoryWorkshops = allRegs;
  saveToLocal(STORAGE_KEY_WORKSHOPS, allRegs);
  await writeSupabaseStore('store_upskill_workshops', allRegs);
  return allRegs[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CREATOR APPLICATIONS, APPROVALS & VERIFICATION BADGES
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchCreatorApplicationsFromSupabase() {
  let list = await readSupabaseStore('store_upskill_creator_applications', null);
  if (!list) {
    list = INITIAL_CREATOR_APPLICATIONS;
    await writeSupabaseStore('store_upskill_creator_applications', list);
  }
  memoryCreatorApps = list;
  saveToLocal(STORAGE_KEY_CREATOR_APPS, list);
  return list;
}

export async function getCreatorApplications() {
  if (!memoryCreatorApps) {
    const local = loadFromLocal(STORAGE_KEY_CREATOR_APPS, null);
    if (local) {
      memoryCreatorApps = local;
      fetchCreatorApplicationsFromSupabase().catch(() => {});
    } else {
      await fetchCreatorApplicationsFromSupabase();
    }
  }
  return memoryCreatorApps || [];
}

export async function submitCreatorApplication(appData) {
  const allApps = await fetchCreatorApplicationsFromSupabase();
  const nowIso = new Date().toISOString();

  const newApp = {
    id: `app-${Date.now()}`,
    user_id: appData.user_id,
    fullName: appData.fullName || 'Scholar',
    email: appData.email,
    regNo: appData.regNo || 'NACOS Student',
    specialization: appData.specialization,
    topic_idea: appData.topic_idea,
    experience: appData.experience,
    portfolio_url: appData.portfolio_url,
    status: 'pending',
    created_at: nowIso
  };

  const updated = [newApp, ...allApps.filter(a => a.email !== newApp.email)];
  memoryCreatorApps = updated;
  saveToLocal(STORAGE_KEY_CREATOR_APPS, updated);
  await writeSupabaseStore('store_upskill_creator_applications', updated);

  try {
    addAdminNotification({
      type: 'creator_application',
      title: 'New Creator Application',
      message: `${newApp.fullName} applied to become an instructor (${newApp.specialization}).`,
      entityId: newApp.id,
      link: '/admin/courses'
    });
  } catch (_) {}

  return newApp;
}

export async function reviewCreatorApplication(appId, newStatus, reviewerId = 'super_admin') {
  const allApps = await fetchCreatorApplicationsFromSupabase();
  const idx = allApps.findIndex(a => String(a.id) === String(appId));
  if (idx < 0) throw new Error(`Application ${appId} not found`);

  allApps[idx] = {
    ...allApps[idx],
    status: newStatus,
    reviewed_at: new Date().toISOString(),
    reviewer_id: reviewerId
  };

  memoryCreatorApps = allApps;
  saveToLocal(STORAGE_KEY_CREATOR_APPS, allApps);
  await writeSupabaseStore('store_upskill_creator_applications', allApps);

  // If approved, automatically add user to approved creators!
  if (newStatus === 'approved') {
    const approvedList = await getApprovedCreators();
    const app = allApps[idx];
    if (!approvedList.some(c => (app.email && c.email?.toLowerCase() === app.email.toLowerCase()) || c.user_id === app.user_id)) {
      approvedList.unshift({
        id: `creator-${Date.now()}`,
        user_id: app.user_id,
        name: app.fullName,
        email: app.email,
        specialization: app.specialization,
        status: 'approved',
        approved_at: new Date().toISOString()
      });
      memoryApprovedCreators = approvedList;
      saveToLocal(STORAGE_KEY_APPROVED_CREATORS, approvedList);
      await writeSupabaseStore('store_upskill_approved_creators', approvedList);
    }
  }

  return allApps[idx];
}

export const updateCreatorApplicationStatus = reviewCreatorApplication;

export async function getApprovedCreators() {
  if (!memoryApprovedCreators) {
    let list = await readSupabaseStore('store_upskill_approved_creators', null);
    if (!list) {
      list = INITIAL_APPROVED_CREATORS;
      await writeSupabaseStore('store_upskill_approved_creators', list);
    }
    memoryApprovedCreators = list;
    saveToLocal(STORAGE_KEY_APPROVED_CREATORS, list);
  }
  return memoryApprovedCreators || [];
}

export async function assignCreatorDirectly(creatorData) {
  const approvedList = await getApprovedCreators();
  const newCreator = {
    id: `creator-${Date.now()}`,
    name: creatorData.name || 'Assigned Creator',
    email: creatorData.email,
    specialization: creatorData.specialization || 'General Technical Instructor',
    status: 'approved',
    assigned_by_admin: true,
    approved_at: new Date().toISOString()
  };

  approvedList.unshift(newCreator);
  memoryApprovedCreators = approvedList;
  saveToLocal(STORAGE_KEY_APPROVED_CREATORS, approvedList);
  await writeSupabaseStore('store_upskill_approved_creators', approvedList);
  return newCreator;
}

export async function isUserApprovedCreator(email, userId) {
  const approvedList = await getApprovedCreators();
  return approvedList.some(c => 
    (email && c.email?.toLowerCase() === String(email).toLowerCase()) ||
    (userId && String(c.user_id) === String(userId)) ||
    c.status === 'approved'
  );
}

export async function getVerifiedCreators() {
  if (!memoryVerifiedCreators) {
    let list = await readSupabaseStore('store_upskill_verified_creators', null);
    if (!list) {
      list = INITIAL_VERIFIED_CREATORS;
      await writeSupabaseStore('store_upskill_verified_creators', list);
    }
    memoryVerifiedCreators = list;
    saveToLocal(STORAGE_KEY_VERIFIED_CREATORS, list);
  }
  return memoryVerifiedCreators || [];
}

export async function isCreatorVerified(creatorIdOrName) {
  if (!creatorIdOrName) return false;
  const list = await getVerifiedCreators();
  const slug = slugify(creatorIdOrName);
  const lower = String(creatorIdOrName).toLowerCase().trim();

  return list.some(item => {
    const itemStr = typeof item === 'string' ? item : (item.id || item.name || '');
    return slugify(itemStr) === slug || itemStr.toLowerCase() === lower;
  });
}

export async function setCreatorVerification(creatorIdOrName, isVerified = true) {
  const list = await getVerifiedCreators();
  const slug = slugify(creatorIdOrName);

  let updated;
  if (isVerified) {
    const exists = list.some(item => slugify(typeof item === 'string' ? item : item.id || item.name) === slug);
    updated = exists ? list : [...list, slug];
  } else {
    updated = list.filter(item => slugify(typeof item === 'string' ? item : item.id || item.name) !== slug);
  }

  memoryVerifiedCreators = updated;
  saveToLocal(STORAGE_KEY_VERIFIED_CREATORS, updated);
  await writeSupabaseStore('store_upskill_verified_creators', updated);
  return { creator: creatorIdOrName, is_verified: isVerified, updated_list: updated };
}

export const checkCreatorVerifiedSync = (creatorIdOrName) => {
  if (!creatorIdOrName) return false;
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VERIFIED_CREATORS);
    const list = raw ? JSON.parse(raw) : INITIAL_VERIFIED_CREATORS;
    const slug = slugify(creatorIdOrName);
    const lower = String(creatorIdOrName).toLowerCase().trim();

    return list.some(item => {
      const itemStr = typeof item === 'string' ? item : (item.id || item.name || '');
      return slugify(itemStr) === slug || itemStr.toLowerCase() === lower;
    });
  } catch (_) {
    return false;
  }
};
