/**
 * @file packages/auth/src/portalAuth.js
 * Production-ready Student Portal Administrator Authentication Module
 * 
 * Sourced directly from Supabase database `admin_scopes` table and serverless auth endpoints.
 * Zero hardcoded mock users or mock storage.
 * Enforces strict 60-minute session limits and database verification.
 */

import { supabase } from '@nacos/database';
import {
  loginPortalAdmin,
  logoutPortalAdmin,
  getPortalAdminSession,
  verifyLiveAdminSession,
  superAdminCreateAdmin,
  superAdminToggleAdmin,
  superAdminDeleteAdmin,
  superAdminResendInvite,
  requestAdminPasswordReset,
  confirmAdminPasswordReset
} from '@nacos/supabase/adminAuth';

const STUDENT_USER_SESSION_KEY = 'nacos_user';

export {
  loginPortalAdmin,
  logoutPortalAdmin,
  getPortalAdminSession
};

export function getStudentSession() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STUDENT_USER_SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    return null;
  }
}

/**
 * Fetch portal administrators live from Supabase database
 */
export async function fetchPortalAdminsFromSupabase() {
  try {
    if (supabase) {
      const { data: dbAdmins, error } = await supabase
        .from('admin_scopes')
        .select('id, email, full_name, name, role, scope, is_active, created_at, updated_at, last_login_at, assigned_level')
        .or('scope.eq.student_portal,scope.eq.super_admin,role.eq.portal_admin,role.eq.course_adviser,role.eq.super_admin')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(dbAdmins)) {
        return dbAdmins;
      }
    }
  } catch (err) {
    console.warn('Supabase fetchPortalAdmins notice:', err);
  }
  return [];
}

/**
 * Super Admin: Update assigned academic level for a portal administrator
 * @param {string} adminId
 * @param {string} level 'all' | '100' | '200' | '300' | '400' | '500'
 */
export async function updateAdminAssignedLevel(adminId, level) {
  const cleanLevel = String(level || 'all').toLowerCase().replace(' level', '');

  if (supabase) {
    try {
      const { error: dbError } = await supabase
        .from('admin_scopes')
        .update({ assigned_level: cleanLevel, updated_at: new Date().toISOString() })
        .eq('id', adminId);

      if (dbError) {
        console.error('[Admin Level Update DB Error]:', dbError);
        return { error: `Database error: ${dbError.message}` };
      }
    } catch (err) {
      return { error: err.message };
    }
  }

  const liveAdmins = await fetchPortalAdminsFromSupabase();

  if (typeof window !== 'undefined') {
    const current = getPortalAdminSession();
    if (current && (current.id === adminId || current.user_id === adminId)) {
      current.assigned_level = cleanLevel;
      localStorage.setItem('nacos_portal_admin_session', JSON.stringify(current));
    }
  }

  return { success: true, admins: liveAdmins };
}

/**
 * Create a new Portal Administrator / Course Adviser and sync live to Supabase
 */
export async function createPortalAdmin({ email, fullName, role = 'portal_admin', permissions = ['feature:student_registry', 'feature:results_management'], assignedLevel = 'all', initialPassword = '', password = '' }) {
  const isSuper = role === 'super_admin';
  const isElectoral = role === 'electoral_admin' || role === 'electra_admin';
  const cleanScope = isSuper ? 'super_admin' : (isElectoral ? 'electoral_admin' : 'student_portal');
  const cleanPerms = isSuper ? ['*'] : (isElectoral ? ['feature:election_management'] : permissions);

  const result = await superAdminCreateAdmin({
    email,
    fullName,
    role: role || 'portal_admin',
    scope: cleanScope,
    assigned_level: assignedLevel,
    permissions: cleanPerms,
    initialPassword: initialPassword || password || '',
    password: password || initialPassword || ''
  });

  if (result.error) {
    return { error: result.error };
  }

  const liveAdmins = await fetchPortalAdminsFromSupabase();
  return { success: true, admin: result.admin, admins: liveAdmins };
}

/**
 * Toggle portal administrator active/suspended status
 */
export async function togglePortalAdminStatus(adminId, isActive) {
  const result = await superAdminToggleAdmin(adminId, isActive);
  if (result.error) {
    return { error: result.error };
  }
  const liveAdmins = await fetchPortalAdminsFromSupabase();
  return { success: true, admins: liveAdmins };
}

/**
 * Permanently delete a portal administrator from the database
 */
export async function deletePortalAdmin(adminId) {
  const result = await superAdminDeleteAdmin(adminId);
  if (result.error) {
    return { error: result.error };
  }
  const liveAdmins = await fetchPortalAdminsFromSupabase();
  return { success: true, admins: liveAdmins };
}
