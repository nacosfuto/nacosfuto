/**
 * @file packages/auth/src/websiteAuth.js
 * Production-ready Website Administrator Authentication Module
 * 
 * Sourced directly from Supabase database `admin_scopes` table and serverless auth endpoints.
 * Zero hardcoded mock users or mock storage.
 * Enforces strict 60-minute session limits and database verification.
 */

export {
  loginWebsiteAdmin,
  logoutWebsiteAdmin,
  getWebsiteAdminSession,
  verifyLiveAdminSession,
  superAdminGetAdmins,
  superAdminCreateAdmin,
  superAdminInviteAdmin,
  superAdminToggleAdmin,
  superAdminDeleteAdmin,
  superAdminResendInvite,
  requestAdminPasswordReset,
  confirmAdminPasswordReset,
  recordAdminAction,
  getAdminAuditLogs,
  AVAILABLE_ADMIN_FEATURES,
  hasAdminFeature
} from '@nacos/supabase/adminAuth';
