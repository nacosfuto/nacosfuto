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

export const PERMISSION_ALIASES = {
  // News
  'main_website.news': ['main_website.news', 'feature:news', 'news', 'feature:news_events'],
  'feature:news': ['main_website.news', 'feature:news', 'news'],
  'news': ['main_website.news', 'feature:news', 'news'],

  // Events
  'main_website.events': ['main_website.events', 'feature:events', 'events', 'feature:news_events'],
  'feature:events': ['main_website.events', 'feature:events', 'events'],
  'events': ['main_website.events', 'feature:events', 'events'],

  // Combined legacy news_events
  'feature:news_events': ['main_website.news', 'main_website.events', 'feature:news_events', 'feature:news', 'feature:events', 'news', 'events'],

  // Media Library
  'main_website.media': ['main_website.media', 'feature:media', 'feature:media_library', 'media'],
  'feature:media': ['main_website.media', 'feature:media', 'feature:media_library', 'media'],
  'feature:media_library': ['main_website.media', 'feature:media', 'feature:media_library', 'media'],
  'media': ['main_website.media', 'feature:media', 'feature:media_library', 'media'],

  // Campus Gallery
  'main_website.gallery': ['main_website.gallery', 'feature:gallery', 'gallery'],
  'feature:gallery': ['main_website.gallery', 'feature:gallery', 'gallery'],
  'gallery': ['main_website.gallery', 'feature:gallery', 'gallery'],

  // Yellow Pages
  'main_website.yellow_pages': ['main_website.yellow_pages', 'feature:yellow_pages', 'yellow_pages'],
  'feature:yellow_pages': ['main_website.yellow_pages', 'feature:yellow_pages', 'yellow_pages'],
  'yellow_pages': ['main_website.yellow_pages', 'feature:yellow_pages', 'yellow_pages'],

  // Campus Clubs
  'main_website.clubs': ['main_website.clubs', 'feature:campus_clubs', 'feature:clubs', 'clubs'],
  'feature:campus_clubs': ['main_website.clubs', 'feature:campus_clubs', 'feature:clubs', 'clubs'],
  'feature:clubs': ['main_website.clubs', 'feature:campus_clubs', 'feature:clubs', 'clubs'],
  'clubs': ['main_website.clubs', 'feature:campus_clubs', 'feature:clubs', 'clubs'],

  // Spiritual Life
  'main_website.spiritual': ['main_website.spiritual', 'main_website.spiritual_life', 'feature:spiritual_life', 'main_website.clubs', 'feature:campus_clubs', 'spiritual_life'],
  'main_website.spiritual_life': ['main_website.spiritual', 'main_website.spiritual_life', 'feature:spiritual_life', 'main_website.clubs', 'feature:campus_clubs', 'spiritual_life'],
  'feature:spiritual_life': ['main_website.spiritual', 'main_website.spiritual_life', 'feature:spiritual_life', 'main_website.clubs', 'feature:campus_clubs', 'spiritual_life'],
  'spiritual_life': ['main_website.spiritual', 'main_website.spiritual_life', 'feature:spiritual_life', 'main_website.clubs', 'feature:campus_clubs', 'spiritual_life'],

  // Alumni Network
  'main_website.alumni': ['main_website.alumni', 'feature:alumni', 'feature:alumni_management', 'alumni'],
  'feature:alumni': ['main_website.alumni', 'feature:alumni', 'feature:alumni_management', 'alumni'],
  'feature:alumni_management': ['main_website.alumni', 'feature:alumni', 'feature:alumni_management', 'alumni'],
  'alumni': ['main_website.alumni', 'feature:alumni', 'feature:alumni_management', 'alumni'],

  // Executives
  'main_website.executives': ['main_website.executives', 'feature:executives', 'main_website.homepage', 'executives'],
  'feature:executives': ['main_website.executives', 'feature:executives', 'main_website.homepage', 'executives'],
  'executives': ['main_website.executives', 'feature:executives', 'main_website.homepage', 'executives'],

  // Administration
  'main_website.administration': ['main_website.administration', 'feature:administration', 'main_website.homepage', 'administration'],
  'feature:administration': ['main_website.administration', 'feature:administration', 'main_website.homepage', 'administration'],
  'administration': ['main_website.administration', 'feature:administration', 'main_website.homepage', 'administration'],

  // Homepage Content & Hero Carousel
  'main_website.homepage': ['main_website.homepage', 'feature:homepage', 'homepage'],
  'feature:homepage': ['main_website.homepage', 'feature:homepage', 'homepage'],
  'homepage': ['main_website.homepage', 'feature:homepage', 'homepage'],

  // Website Settings
  'main_website.settings': ['main_website.settings', 'feature:website_settings', 'feature:settings', 'settings'],
  'feature:website_settings': ['main_website.settings', 'feature:website_settings', 'feature:settings', 'settings'],
  'settings': ['main_website.settings', 'feature:website_settings', 'feature:settings', 'settings'],

  // View / Audit Trail
  'main_website.view': ['main_website.view', 'view', 'feature:audit_logs', 'audit_logs'],
  'feature:audit_logs': ['main_website.view', 'feature:audit_logs', 'audit_logs'],

  // Portal Features
  'student_portal.students': ['student_portal.students', 'feature:student_registry', 'students'],
  'feature:student_registry': ['student_portal.students', 'feature:student_registry', 'students'],
  'student_portal.results': ['student_portal.results', 'feature:results_management', 'results'],
  'feature:results_management': ['student_portal.results', 'feature:results_management', 'results'],
  'student_portal.id_cards': ['student_portal.id_cards', 'feature:id_management', 'id_cards'],
  'feature:id_management': ['student_portal.id_cards', 'feature:id_management', 'id_cards'],
  'student_portal.courses': ['student_portal.courses', 'feature:course_management', 'courses'],
  'feature:course_management': ['student_portal.courses', 'feature:course_management', 'courses'],
  'student_portal.resources': ['student_portal.resources', 'feature:resource_management', 'resources'],
  'feature:resource_management': ['student_portal.resources', 'feature:resource_management', 'resources'],

  // Electoral
  'feature:election_management': ['feature:election_management', 'elections']
};

export function hasPermission(adminSession, requiredPermission) {
  if (!adminSession) return false;
  const role = String(adminSession.role || '').toLowerCase().trim();
  const scope = String(adminSession.scope || '').toLowerCase().trim();
  const perms = Array.isArray(adminSession.permissions) ? adminSession.permissions : [];

  if (
    adminSession.is_super_admin === true ||
    scope === 'super_admin' ||
    scope === 'superadmin' ||
    scope === 'all' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'super admin' ||
    perms.includes('*') ||
    perms.includes('all')
  ) {
    return true;
  }

  if (!requiredPermission || requiredPermission === 'main_website.view' || requiredPermission === 'dashboard') {
    return true;
  }

  // Exact match
  if (perms.includes(requiredPermission)) return true;

  // Direct check: Does user have requiredPermission or any equivalent alias of requiredPermission?
  const targetEquivalents = PERMISSION_ALIASES[requiredPermission] || [requiredPermission];
  if (targetEquivalents.some(eq => perms.includes(eq))) return true;

  // Reverse check: For each granted permission, does it expand to requiredPermission?
  for (const granted of perms) {
    const grantedEquivalents = PERMISSION_ALIASES[granted];
    if (grantedEquivalents && grantedEquivalents.includes(requiredPermission)) {
      return true;
    }
  }

  return false;
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
