/**
 * NACOS Scope and Authorization Rules
 * 
 * Strict boundary:
 * - 'main_website': Content Management (News, Events, Media, Gallery, Homepage, Website Settings)
 * - 'student_portal': Student Management (Student Registry Whitelist, ID Cards, Verifications, Level/Progression)
 * - 'super_admin': Universal administrative oversight
 */

export const ADMIN_SCOPES = {
  MAIN_WEBSITE: 'main_website',
  STUDENT_PORTAL: 'student_portal',
  ELECTORAL_ADMIN: 'electoral_admin',
  SUPER_ADMIN: 'super_admin'
};

export const PERMISSIONS = {
  // Website permissions
  WEBSITE_VIEW: 'main_website.view',
  WEBSITE_MEDIA: 'main_website.media',
  WEBSITE_GALLERY: 'main_website.gallery',
  WEBSITE_NEWS: 'main_website.news',
  WEBSITE_EVENTS: 'main_website.events',
  WEBSITE_HOMEPAGE: 'main_website.homepage',
  WEBSITE_SETTINGS: 'main_website.settings',

  // Portal permissions
  PORTAL_VIEW: 'student_portal.view',
  PORTAL_STUDENTS: 'student_portal.students',
  PORTAL_ID_CARDS: 'student_portal.id_cards',
  PORTAL_VERIFICATION: 'student_portal.verification',
  PORTAL_RESULTS: 'student_portal.results',
  PORTAL_COURSES: 'student_portal.courses',
  PORTAL_DUES: 'student_portal.dues',
  PORTAL_SETTINGS: 'student_portal.settings',

  // Universal
  ALL: '*'
};

export function hasPermission(adminSession, requiredPermission) {
  if (!adminSession) return false;
  if (adminSession.scope === ADMIN_SCOPES.SUPER_ADMIN || adminSession.role === 'super_admin') {
    return true;
  }
  if (adminSession.permissions?.includes('*')) {
    return true;
  }
  if (!requiredPermission) return true;
  return Array.isArray(adminSession.permissions) && adminSession.permissions.includes(requiredPermission);
}

export function validateScope(adminSession, expectedScope) {
  if (!adminSession) return false;
  if (adminSession.scope === ADMIN_SCOPES.SUPER_ADMIN) return true;
  return adminSession.scope === expectedScope;
}

/**
 * Check whether an admin has rights to view or manage a specific academic level.
 * Returns true if admin has full level access ('all' / super_admin) or if target level matches assigned_level.
 */
export function canAccessLevel(adminSession, targetLevel) {
  if (!adminSession) return true;
  if (adminSession.scope === ADMIN_SCOPES.SUPER_ADMIN || adminSession.role === 'super_admin') {
    return true;
  }
  const assigned = String(adminSession.assigned_level || 'all').toLowerCase().trim();
  if (assigned === 'all' || assigned === '*' || assigned === 'full') {
    return true;
  }
  if (!targetLevel) return true;
  const cleanTarget = String(targetLevel).replace(/[^0-9]/g, '');
  const cleanAssigned = assigned.replace(/[^0-9]/g, '');
  return !cleanAssigned || cleanTarget === cleanAssigned;
}

/**
 * Returns the list of academic levels this admin is authorized to manage.
 */
export function getAccessibleLevels(adminSession) {
  const allLevels = ['100', '200', '300', '400', '500'];
  if (!adminSession) return allLevels;
  if (adminSession.scope === ADMIN_SCOPES.SUPER_ADMIN || adminSession.role === 'super_admin') {
    return allLevels;
  }
  const assigned = String(adminSession.assigned_level || 'all').toLowerCase().trim();
  if (assigned === 'all' || assigned === '*' || assigned === 'full') {
    return allLevels;
  }
  const clean = assigned.replace(/[^0-9]/g, '');
  return allLevels.includes(clean) ? [clean] : allLevels;
}
