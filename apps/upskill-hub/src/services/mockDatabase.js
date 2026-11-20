/**
 * mockDatabase.js
 * Production database service adapter for BuildHub / Upskill Hub.
 * Connects directly to Supabase via @nacos/supabase/upskillService with full live synchronization,
 * Cloudinary asset compatibility, and persistent database storage.
 */

import * as upskillService from '@nacos/supabase/upskillService';

export const checkCreatorVerifiedSync = upskillService.checkCreatorVerifiedSync;

export const db = {
  // ─── Courses & Workshops ───
  getCourses: upskillService.getCourses,
  getCourse: upskillService.getCourse,
  getLiveWorkshops: upskillService.getLiveWorkshops,
  createCourse: upskillService.createCourse,
  updateCourse: upskillService.updateCourse,
  deleteCourse: upskillService.deleteCourse,

  // ─── Curriculum Topics / Lessons ───
  getTopicsByCourse: upskillService.getTopicsByCourse,
  createTopic: upskillService.createTopic,
  createBatchTopics: upskillService.createBatchTopics,
  updateTopic: upskillService.updateTopic,
  deleteTopic: upskillService.deleteTopic,

  // ─── Enrollments & Progress Tracking ───
  getEnrollmentsByUser: upskillService.getEnrollmentsByUser,
  getEnrollment: upskillService.getEnrollment,
  createEnrollment: upskillService.createEnrollment,
  markTopicComplete: upskillService.markTopicComplete,

  // ─── Live Workshop Registrations & Rosters ───
  getWorkshopRegistrationsByUser: upskillService.getWorkshopRegistrationsByUser,
  registerForWorkshop: upskillService.registerForWorkshop,
  getWorkshopRegistration: upskillService.getWorkshopRegistration,
  getWorkshopRoster: upskillService.getWorkshopRoster,
  updateStudentNote: upskillService.updateStudentNote,

  // ─── Instructor Roster & Real Learner Progress ───
  getAllLearnersForCreator: upskillService.getAllLearnersForCreator,

  // ─── Creator Applications & Admin Approvals ───
  getCreatorApplications: upskillService.getCreatorApplications,
  submitCreatorApplication: upskillService.submitCreatorApplication,
  updateCreatorApplicationStatus: upskillService.updateCreatorApplicationStatus,
  getApprovedCreators: upskillService.getApprovedCreators,
  assignCreatorDirectly: upskillService.assignCreatorDirectly,
  isUserApprovedCreator: upskillService.isUserApprovedCreator,

  // ─── Creator Verification Badges ───
  getVerifiedCreators: upskillService.getVerifiedCreators,
  isCreatorVerified: upskillService.isCreatorVerified,
  setCreatorVerification: upskillService.setCreatorVerification,
  checkCreatorVerifiedSync: upskillService.checkCreatorVerifiedSync,
};

export default db;
