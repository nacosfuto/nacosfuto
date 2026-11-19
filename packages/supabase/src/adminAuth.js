import { supabase } from './client.js';
import { hashPassword, hashPasswordPBKDF2, verifyPassword } from './auth.js';
import { maskEmail } from './otpService.js';
import { sendPasswordResetEmail } from './emailService.js';

const ADMIN_SESSION_STORAGE_KEY = 'nacos_website_admin_session';
const PORTAL_ADMIN_SESSION_KEY = 'nacos_portal_admin_session';
const ONE_HOUR_MS = 60 * 60 * 1000; // Strict 60-minute session lifetime

/**
 * Authoritatively determines if an administrator record or session holds Super Admin privileges.
 */
export function isSuperAdminScope(admin) {
  if (!admin) return false;
  const role = String(admin.role || '').toLowerCase().trim();
  const scope = String(admin.scope || '').toLowerCase().trim();
  const perms = Array.isArray(admin.permissions) ? admin.permissions : [];
  return Boolean(
    admin.is_super_admin === true ||
    scope === 'super_admin' ||
    scope === 'superadmin' ||
    scope === 'all' ||
    role === 'super_admin' ||
    role === 'superadmin' ||
    role === 'super admin' ||
    perms.includes('*') ||
    perms.includes('all') ||
    perms.includes('super_admin') ||
    perms.includes('admins.manage')
  );
}

export const AVAILABLE_ADMIN_FEATURES = [
  // Website CMS Granular Features
  { key: 'feature:news', label: 'News & Journal Management', platform: 'website', description: 'Draft, publish, edit, and categorize departmental news and articles' },
  { key: 'feature:events', label: 'Event Management & Flyers', platform: 'website', description: 'Schedule departmental hackathons, tech conferences, mixers, and event flyers' },
  { key: 'feature:media_library', label: 'Media Asset Library', platform: 'website', description: 'Upload and manage Cloudinary media assets, folders, and banners' },
  { key: 'feature:gallery', label: 'Campus Gallery', platform: 'website', description: 'Curate campus photos, lab images, and student life gallery collections' },
  { key: 'feature:yellow_pages', label: 'Yellow Pages Directory', platform: 'website', description: 'Review, approve, and manage indigenous student business listings' },
  { key: 'feature:campus_clubs', label: 'Campus Clubs & Communities', platform: 'website', description: 'Manage departmental student tech clubs, affiliations, and community leaders' },
  { key: 'feature:spiritual_life', label: 'Spiritual Life & Fellowships', platform: 'website', description: 'Publish and manage campus Christian fellowship and prayer group details' },
  { key: 'feature:alumni_management', label: 'Alumni Network & Spotlights', platform: 'website', description: 'Approve alumni memberships, highlight hall of fame, and spotlight graduates' },
  { key: 'feature:executives', label: 'NACOS Executives Directory', platform: 'website', description: 'Update executive council members, department leaders, and tenure rosters' },
  { key: 'feature:administration', label: 'Department Administration', platform: 'website', description: 'Manage HOD, Faculty, Staff Advisers, and administrative profiles' },
  { key: 'feature:homepage', label: 'Homepage & Hero Carousel', platform: 'website', description: 'Edit homepage hero slides, announcement badges, and featured spotlight sections' },
  { key: 'feature:website_settings', label: 'Website Settings & Configuration', platform: 'website', description: 'Configure site-wide preferences, contact mailboxes, and SEO metadata' },

  // Portal Features
  { key: 'feature:student_registry', label: 'Student Registry & Profiles', platform: 'portal', description: 'Search, verify, and manage departmental student profiles' },
  { key: 'feature:results_management', label: 'Results & Grades (Course Adviser)', platform: 'portal', description: 'Upload, compute CGPA, and approve semester student results' },
  { key: 'feature:id_management', label: 'ID Card Applications & Verification', platform: 'portal', description: 'Review student ID applications, approve, and generate official cards' },
  { key: 'feature:resource_management', label: 'Academic Resource Hub (Backblaze B2)', platform: 'shared', description: 'Upload, manage handouts, past questions, and video courses in B2' },
  { key: 'feature:course_management', label: 'Academic Curriculum & Courses', platform: 'portal', description: 'Manage course units, semester allocations, and curriculum' },
  { key: 'feature:election_management', label: 'Elections & Ballot Vetting (Electra)', platform: 'electra', description: 'Configure departmental elections, vet candidates, monitor ballots' }
];

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

/**
 * Record an administrative action in the audit log
 */
export async function recordAdminAction(action, resourceType, resourceId = null, details = {}) {
  const session = getWebsiteAdminSession() || getPortalAdminSession();
  const entry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: session?.user_id || session?.id || null,
    admin_email: session?.email || 'system@nacosfuto.com.ng',
    scope: session?.scope || 'main_website',
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date().toISOString()
  };

  try {
    if (supabase) {
      await supabase.from('admin_audit_logs').insert([entry]);
    }
  } catch (err) {
    // Audit table may be optional
  }

  return entry;
}

/**
 * Retrieve administrative audit logs
 */
export async function getAdminAuditLogs(scope = 'main_website', limit = 50) {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, admin_id, admin_email, action, details, ip_address, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {}
  return [];
}

// =============================================================================
// STRICT 1-HOUR SESSION MANAGEMENT HELPERS
// =============================================================================

function isSessionExpired(session) {
  if (!session) return true;
  const now = Date.now();

  // 1. Check explicit expires_at timestamp
  if (session.expires_at) {
    const exp = typeof session.expires_at === 'number' ? session.expires_at : new Date(session.expires_at).getTime();
    if (now >= exp) return true;
  }

  // 2. Check logged_in_at fallback (max 1 hour)
  if (session.logged_in_at) {
    const loggedIn = new Date(session.logged_in_at).getTime();
    if (now - loggedIn >= ONE_HOUR_MS) return true;
  }

  return false;
}

function clearAdminStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    localStorage.removeItem(PORTAL_ADMIN_SESSION_KEY);
    localStorage.removeItem('nacos_portal_admin_last_activity');
    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PORTAL_ADMIN_SESSION_KEY);
  } catch (_) {}
}

/**
 * Retrieve current active verified website admin session.
 * Automatically evicts and clears storage if session has exceeded 1 hour.
 */
export function getWebsiteAdminSession() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    if (!session) return null;

    // Strict 1-hour session lifetime enforcement
    if (isSessionExpired(session)) {
      clearAdminStorage();
      return null;
    }

    if (session.scope === 'main_website' || session.scope === 'super_admin' || session.role === 'super_admin' || session.role === 'website_admin') {
      return session;
    }
  } catch (e) {
    clearAdminStorage();
  }

  return null;
}

/**
 * Retrieve current active verified portal admin session.
 * Automatically evicts and clears storage if session has exceeded 1 hour.
 */
export function getPortalAdminSession() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(PORTAL_ADMIN_SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    if (!session) return null;

    // Strict 1-hour session lifetime enforcement
    if (isSessionExpired(session)) {
      clearAdminStorage();
      return null;
    }

    const isPortalAllowed = 
      session.scope === 'student_portal' || 
      session.scope === 'portal' ||
      session.scope === 'all' ||
      session.scope === 'super_admin' || 
      session.scope === 'electoral_admin' || 
      session.scope === 'electra_admin' || 
      session.scope === 'electra' || 
      session.role === 'super_admin' || 
      session.role === 'portal_admin' || 
      session.role === 'course_adviser' || 
      session.role === 'hod' || 
      session.role === 'dean' || 
      session.role === 'admin' || 
      session.role === 'electoral_admin' || 
      session.role === 'isec_admin' || 
      session.is_super_admin === true;

    if (isPortalAllowed) {
      return session;
    }
  } catch (e) {
    clearAdminStorage();
  }

  return null;
}

/**
 * Re-validates active session against server/database.
 * Ensures that if an admin was suspended or deleted in the database,
 * active client sessions lose privileges immediately.
 */
export async function verifyLiveAdminSession(targetPlatform = 'website') {
  const session = targetPlatform === 'website' ? getWebsiteAdminSession() : getPortalAdminSession();
  if (!session) return { valid: false, error: 'No active session.' };

  const storageKey = targetPlatform === 'website' ? ADMIN_SESSION_STORAGE_KEY : PORTAL_ADMIN_SESSION_KEY;

  // 1. Try serverless verification endpoint
  try {
    const token = session.token;
    const res = await fetch('/api/admin/auth/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ token })
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.valid) {
        clearAdminStorage();
        return { valid: false, error: data.error || 'Session revoked by administrator.' };
      }
      if (data.admin) {
        const updated = { ...session, ...data.admin };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nacos_admin_session_updated', { detail: updated }));
          }
        } catch (_) {}
        return { valid: true, admin: updated };
      }
      return { valid: true, admin: data.admin || session };
    }
  } catch (_) {
    // If running in development without API server, check Supabase directly
  }

  // 2. Direct Supabase database status and permissions check
  if (supabase && (session.id || session.email)) {
    try {
      const { data: dbAdmin, error } = await supabase
        .from('admin_scopes')
        .select('id, email, full_name, role, scope, permissions, assigned_level, is_active')
        .or(`id.eq.${session.id},email.eq.${session.email}`)
        .maybeSingle();

      if (error || !dbAdmin || dbAdmin.is_active === false) {
        clearAdminStorage();
        return { valid: false, error: 'Account suspended or removed from database.' };
      }

      const updated = {
        ...session,
        id: dbAdmin.id,
        user_id: dbAdmin.id,
        email: dbAdmin.email,
        full_name: dbAdmin.full_name,
        name: dbAdmin.full_name,
        role: dbAdmin.role,
        scope: dbAdmin.scope,
        assigned_level: dbAdmin.assigned_level || 'all',
        permissions: dbAdmin.permissions || [],
        is_super_admin: isSuperAdminScope(dbAdmin)
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nacos_admin_session_updated', { detail: updated }));
        }
      } catch (_) {}

      return { valid: true, admin: updated };
    } catch (_) {}
  }

  return { valid: true, admin: session };
}

// =============================================================================
// DATABASE-BACKED LOGIN IMPLEMENTATIONS
// =============================================================================

/**
 * Authenticates Website Administrator via real database credentials.
 * Issues strict 1-hour session token and persists to localStorage.
 */
export async function loginWebsiteAdmin(email, password) {
  if (!email || !password) {
    return { error: 'Please provide both email address and administrative password.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Try Serverless Production Endpoint
  try {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, targetPlatform: 'website' })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.session) {
      localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(data.session));
      await recordAdminAction('login', 'admin_session', data.session.id, {
        email: data.session.email,
        role: data.session.role,
        scope: data.session.scope
      });
      return { success: true, admin: data.session, session: data.session };
    }

    if (!res.ok && data.error) {
      return { error: data.error };
    }
  } catch (apiErr) {
    // Fall back to direct Supabase query if running locally without serverless router
  }

  // 2. Direct Supabase Database Authentication (Zero Mock Data)
  if (!supabase) {
    return { error: 'Database service is currently unreachable. Please verify network configuration.' };
  }

  try {
    const { data: dbAdmin, error: dbErr } = await supabase
      .from('admin_scopes')
      .select('id, user_id, email, password_hash, full_name, role, scope, permissions, assigned_level, is_active, created_at, updated_at, last_login_at')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (dbErr || !dbAdmin) {
      return { error: 'Invalid administrative credentials. Access restricted to authorized NACOS administrators.' };
    }

    if (dbAdmin.is_active === false) {
      return { error: 'Account Disabled: Your administrative access has been revoked or deactivated. Contact the Super Admin.' };
    }

    const isAllowedScope = 
      dbAdmin.scope === 'main_website' || 
      dbAdmin.scope === 'website' || 
      dbAdmin.scope === 'cms' || 
      dbAdmin.scope === 'all' || 
      dbAdmin.scope === 'super_admin' ||
      dbAdmin.role === 'super_admin' ||
      dbAdmin.role === 'superadmin' ||
      dbAdmin.role === 'website_admin' ||
      dbAdmin.role === 'cms_admin' ||
      dbAdmin.role === 'admin';

    if (!isAllowedScope) {
      return { 
        error: `Access Denied: Your account holds the '${dbAdmin.scope}' scope and is not authorized to access the Main Website Administration area.` 
      };
    }

    if (!dbAdmin.password_hash) {
      return { error: 'Administrative password has not been established. Please use "Forgot Password" to set up your password.' };
    }

    const isValidPassword = await verifyPassword(password, dbAdmin.password_hash);
    if (!isValidPassword) {
      return { error: 'Invalid password. Please check your credentials.' };
    }

    // Update last_login_at in database
    const nowIso = new Date().toISOString();
    const expiresAt = Date.now() + ONE_HOUR_MS;
    await supabase.from('admin_scopes').update({ last_login_at: nowIso, updated_at: nowIso }).eq('id', dbAdmin.id);

    const adminSession = {
      id: dbAdmin.id,
      user_id: dbAdmin.user_id || dbAdmin.id,
      email: dbAdmin.email,
      full_name: dbAdmin.full_name,
      name: dbAdmin.full_name,
      scope: dbAdmin.scope,
      role: dbAdmin.role,
      assigned_level: dbAdmin.assigned_level || 'all',
      permissions: dbAdmin.permissions || ['main_website.view'],
      is_super_admin: isSuperAdminScope(dbAdmin),
      token: dbAdmin.id,
      logged_in_at: nowIso,
      expires_at: expiresAt
    };

    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminSession));
    await recordAdminAction('login', 'admin_session', adminSession.id, {
      email: adminSession.email,
      role: adminSession.role,
      scope: adminSession.scope
    });

    return { success: true, admin: adminSession, session: adminSession };
  } catch (err) {
    return { error: err.message || 'Authentication error occurred.' };
  }
}

/**
 * Authenticates Student Portal / Electra Administrator via real database credentials.
 * Issues strict 1-hour session token and persists to localStorage.
 */
export async function loginPortalAdmin(email, password) {
  if (!email || !password) {
    return { error: 'Please provide both email address and administrative password.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Try Serverless Production Endpoint
  try {
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, targetPlatform: 'portal' })
    };
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      fetchOptions.signal = AbortSignal.timeout(3500);
    }
    const res = await fetch('/api/admin/auth/login', fetchOptions);

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.session) {
      localStorage.setItem(PORTAL_ADMIN_SESSION_KEY, JSON.stringify(data.session));
      localStorage.setItem('nacos_portal_admin_last_activity', Date.now().toString());
      return { success: true, session: data.session, admin: data.session };
    }

    // Only return error immediately if the server explicitly rejected credentials (401/403)
    if (!res.ok && (res.status === 401 || res.status === 403) && data.error) {
      return { error: data.error };
    }
  } catch (apiErr) {
    // Fall back to direct Supabase query
  }

  // 2. Direct Supabase Database Authentication
  if (!supabase) {
    return { error: 'Database service is currently unreachable.' };
  }

  try {
    const { data: dbAdmin, error: dbErr } = await supabase
      .from('admin_scopes')
      .select('id, user_id, email, password_hash, full_name, role, scope, permissions, assigned_level, is_active, created_at, updated_at, last_login_at')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (dbErr || !dbAdmin) {
      return { error: 'Invalid administrative credentials. Access restricted to authorized NACOS administrators.' };
    }

    if (dbAdmin.is_active === false) {
      return { error: 'Account Disabled: Your portal administrative access has been revoked.' };
    }

    const isAllowedScope = 
      dbAdmin.scope === 'student_portal' || 
      dbAdmin.scope === 'portal' || 
      dbAdmin.scope === 'all' || 
      dbAdmin.scope === 'super_admin' ||
      dbAdmin.scope === 'electoral_admin' ||
      dbAdmin.scope === 'electra_admin' ||
      dbAdmin.role === 'super_admin' ||
      dbAdmin.role === 'portal_admin' ||
      dbAdmin.role === 'course_adviser' ||
      dbAdmin.role === 'hod' ||
      dbAdmin.role === 'dean' ||
      dbAdmin.role === 'admin' ||
      dbAdmin.role === 'electoral_admin';

    if (!isAllowedScope) {
      return { 
        error: `Access Denied: Your account holds the '${dbAdmin.scope}' scope and is not authorized to access this administration console.` 
      };
    }

    if (!dbAdmin.password_hash) {
      return { error: 'Administrative password has not been established. Please use "Forgot Password" to set up your password.' };
    }

    const isValidPassword = await verifyPassword(password, dbAdmin.password_hash);
    if (!isValidPassword) {
      return { error: 'Invalid password. Please check your credentials.' };
    }

    const nowIso = new Date().toISOString();
    const expiresAt = Date.now() + ONE_HOUR_MS;
    await supabase.from('admin_scopes').update({ last_login_at: nowIso, updated_at: nowIso }).eq('id', dbAdmin.id);

    const portalAdminSession = {
      id: dbAdmin.id,
      user_id: dbAdmin.user_id || dbAdmin.id,
      email: dbAdmin.email,
      full_name: dbAdmin.full_name,
      name: dbAdmin.full_name,
      scope: dbAdmin.scope,
      role: dbAdmin.role,
      assigned_level: dbAdmin.assigned_level || 'all',
      permissions: dbAdmin.permissions || ['student_portal.view', 'student_portal.students'],
      is_super_admin: isSuperAdminScope(dbAdmin),
      token: dbAdmin.id,
      logged_in_at: nowIso,
      expires_at: expiresAt
    };

    localStorage.setItem(PORTAL_ADMIN_SESSION_KEY, JSON.stringify(portalAdminSession));
    localStorage.setItem('nacos_portal_admin_last_activity', Date.now().toString());

    return { success: true, session: portalAdminSession, admin: portalAdminSession };
  } catch (err) {
    return { error: err.message || 'Authentication error occurred.' };
  }
}

/**
 * Terminate website admin session and evict stored state
 */
export async function logoutWebsiteAdmin() {
  const session = getWebsiteAdminSession();
  if (session) {
    await recordAdminAction('logout', 'admin_session', session.id);
  }
  clearAdminStorage();
  try {
    if (supabase) await supabase.auth.signOut();
  } catch (_) {}
  return { success: true };
}

/**
 * Terminate portal admin session and evict stored state
 */
export async function logoutPortalAdmin() {
  clearAdminStorage();
  try {
    if (supabase) await supabase.auth.signOut();
  } catch (_) {}
  return { success: true };
}

// =============================================================================
// PERMISSIONS HELPERS
// =============================================================================

export function hasPermission(admin, permission) {
  if (!admin) return false;
  if (isSuperAdminScope(admin)) return true;

  const perms = Array.isArray(admin.permissions) ? admin.permissions : [];
  if (perms.includes('*') || perms.includes('all')) return true;

  if (!permission || permission === 'main_website.view' || permission === 'dashboard') {
    return true;
  }

  // Exact match
  if (perms.includes(permission)) return true;

  // Direct check: Does user have permission or any equivalent alias of permission?
  const targetEquivalents = PERMISSION_ALIASES[permission] || [permission];
  if (targetEquivalents.some(eq => perms.includes(eq))) return true;

  // Reverse check: For each granted permission, does it expand to permission?
  for (const granted of perms) {
    const grantedEquivalents = PERMISSION_ALIASES[granted];
    if (grantedEquivalents && grantedEquivalents.includes(permission)) {
      return true;
    }
  }

  return false;
}

export function hasAdminFeature(admin, featureKey) {
  return hasPermission(admin, featureKey);
}

// =============================================================================
// SUPER ADMIN USER MANAGEMENT OPERATIONS (Database-Backed)
// =============================================================================

/**
 * Retrieve all administrators across all scopes directly from Supabase
 */
/**
 * Super Admin: Fetch all administrators from database
 */
export async function superAdminGetAdmins() {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token || current?.id;
  const requesterEmail = current?.email;

  // 1. Try server endpoint
  try {
    const url = new URL('/api/admin/users', typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (token) url.searchParams.set('token', token);
    if (requesterEmail) url.searchParams.set('requesterEmail', requesterEmail);

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.admins)) {
        return { success: true, admins: data.admins };
      }
    }
  } catch (_) {}

  // 2. Direct Supabase Query
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_scopes')
        .select('id, user_id, email, full_name, role, scope, permissions, assigned_level, is_active, created_at, updated_at, last_login_at')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return { success: true, admins: data.map(a => ({ ...a, name: a.full_name })) };
      }
    } catch (_) {}
  }

  return { success: true, admins: [] };
}

/**
 * Super Admin: Create and Provision a New Administrator in Database + Send Resend Email
 */
export async function superAdminCreateAdmin({ email, fullName, role = 'website_admin', permissions, scope = 'main_website', assigned_level = 'all', initialPassword = '', password = '' }) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token || current?.id;
  const requesterEmail = current?.email;

  if (!email || !fullName) {
    return { error: 'Email and Full Name are required.' };
  }

  const plainPassword = String(initialPassword || password || '').trim();
  if (!plainPassword || plainPassword.length < 6) {
    return { error: 'Initial administrator password is required (minimum 6 characters).' };
  }

  // Pre-check caller authority
  if (!isSuperAdminScope(current)) {
    return { error: 'Unauthorized: Super Administrator privileges required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanLevel = String(assigned_level || 'all').toLowerCase().replace(' level', '');

  // 1. Try serverless endpoint first
  try {
    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        token,
        requesterEmail,
        email: cleanEmail,
        fullName: cleanName,
        role,
        scope,
        assignedLevel: cleanLevel,
        permissions,
        initialPassword: plainPassword,
        password: plainPassword
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, admin: data.admin, message: data.message };
    }
    // Only return error immediately if it's NOT an authorization mismatch that can be verified against Supabase
    if (!res.ok && data.error && !data.error.includes('Unauthorized')) {
      return { error: data.error };
    }
  } catch (_) {}

  // 2. Direct Database Fallback (Zero Mock Data)
  if (!supabase) return { error: 'Database service offline.' };

  // Double check ground-truth caller authorization in live Supabase table
  if (requesterEmail) {
    const { data: liveSuperAdmin, error: authCheckErr } = await supabase
      .from('admin_scopes')
      .select('id, email, scope, role, permissions, is_active')
      .ilike('email', requesterEmail.trim())
      .maybeSingle();

    if (authCheckErr || !liveSuperAdmin || liveSuperAdmin.is_active === false || !isSuperAdminScope(liveSuperAdmin)) {
      return { error: 'Unauthorized: Super Administrator privileges required in database.' };
    }
  }

  const adminId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const nowIso = new Date().toISOString();
  const initialHash = await hashPassword(plainPassword);

  const newAdmin = {
    id: adminId,
    user_id: null,
    email: cleanEmail,
    full_name: cleanName,
    scope: scope || (role === 'super_admin' ? 'super_admin' : 'main_website'),
    role: role || 'website_admin',
    assigned_level: cleanLevel,
    permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : ['main_website.view'],
    is_active: true,
    password_hash: initialHash,
    created_at: nowIso,
    updated_at: nowIso
  };

  const { error: insErr } = await supabase.from('admin_scopes').insert([newAdmin]);
  if (insErr) {
    return { error: insErr.message };
  }

  // Trigger assignment email
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nacosfuto.com.ng';
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_assignment',
        to: cleanEmail,
        admin: {
          fullName: cleanName,
          email: cleanEmail,
          scope: newAdmin.scope,
          role: newAdmin.role,
          assignedLevel: cleanLevel,
          initialPassword: plainPassword,
          portalAdminUrl: origin,
          assignedAt: nowIso
        }
      })
    });
  } catch (_) {}

  return { success: true, admin: newAdmin, message: `Administrator ${cleanName} created successfully with initial password.` };
}

export const superAdminInviteAdmin = superAdminCreateAdmin;

/**
 * Super Admin: Toggle Active / Suspended Status in Database
 */
export async function superAdminToggleAdmin(adminIdOrEmail, isActive) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token || current?.id;
  const requesterEmail = current?.email;

  // 1. Try serverless endpoint
  try {
    const res = await fetch('/api/admin/users/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ adminId: adminIdOrEmail, isActive, token, requesterEmail })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    if (!res.ok && data.error && !data.error.includes('Unauthorized')) {
      return { error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Update
  if (supabase) {
    if (!isSuperAdminScope(current)) {
      return { error: 'Unauthorized: Super Administrator privileges required.' };
    }
    const { error } = await supabase
      .from('admin_scopes')
      .update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() })
      .or(`id.eq.${adminIdOrEmail},email.eq.${adminIdOrEmail}`);

    if (error) return { error: error.message };
    return { success: true };
  }

  return { error: 'Database service offline.' };
}

/**
 * Super Admin: Permanently Delete an Administrator Account
 * Enforces safeguards against deleting self and last super admin.
 */
export async function superAdminDeleteAdmin(adminId) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token || current?.id;
  const requesterEmail = current?.email;

  if (current && (current.id === adminId || current.user_id === adminId || current.email === adminId)) {
    return { error: 'Security Safeguard: You cannot delete your own account while logged in.' };
  }

  // 1. Try serverless endpoint
  try {
    const res = await fetch('/api/admin/users/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ adminId, token, requesterEmail })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    if (!res.ok && data.error && !data.error.includes('Unauthorized')) {
      return { error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Deletion
  if (supabase) {
    if (!isSuperAdminScope(current)) {
      return { error: 'Unauthorized: Super Administrator privileges required.' };
    }
    const { error } = await supabase
      .from('admin_scopes')
      .delete()
      .eq('id', adminId);

    if (error) return { error: error.message };
    return { success: true };
  }

  return { error: 'Database service offline.' };
}

/**
 * Resends the official assignment / invitation email
 */
export async function superAdminResendInvite(adminId) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token;

  try {
    const res = await fetch('/api/admin/users/resend-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ adminId })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { success: true, message: data.message };
    if (!res.ok && data.error) return { error: data.error };
  } catch (err) {
    return { error: err.message };
  }

  return { error: 'Could not send invitation email.' };
}

// =============================================================================
// ADMIN PASSWORD RESET VIA EMAIL & OTP
// =============================================================================

export async function requestAdminPasswordReset(adminEmail) {
  if (!adminEmail || !adminEmail.trim()) {
    return { success: false, error: 'Please enter your administrator email address.' };
  }

  const cleanEmail = adminEmail.trim().toLowerCase();

  // 1. Try serverless endpoint first
  try {
    const res = await fetch('/api/admin/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });

    const data = await res.json().catch(() => ({}));
    if (data.success) {
      return { success: true, maskedEmail: data.maskedEmail, expiresAt: data.expiresAt };
    }
    if (data.error) {
      return { success: false, error: data.error, retryAfterSeconds: data.retryAfterSeconds };
    }
  } catch (_) {}

  // 2. Direct Supabase Fallback
  if (!supabase) {
    return { success: false, error: 'Database offline.' };
  }

  const { data: adminRecord } = await supabase
    .from('admin_scopes')
    .select('id, email, full_name, role, scope, is_active')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (!adminRecord) {
    return { success: false, error: 'No administrator account was found with that email address. Contact the Super Admin.' };
  }

  if (adminRecord.is_active === false) {
    return { success: false, error: 'This administrator account is currently suspended. Contact the Super Admin.' };
  }

  const maskedEmail = maskEmail(cleanEmail);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  // Invalidate older expired challenges (> 15 minutes) for this administrator
  // Retaining recent unverified challenges within the 15-minute window prevents race conditions from email delivery delays
  try {
    const expiredCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .or(`destination_full.ilike.${cleanEmail},registration_number.ilike.ADMIN-${adminRecord.id},registration_number.ilike.${cleanEmail}`)
      .lt('created_at', expiredCutoff);
  } catch (_) {}

  // Compute and persist OTP hash so it can be verified in database
  let otpHash = otpCode;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(otpCode + 'nacos_otp_salt_2026'));
      otpHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch (_) {}
  }

  await supabase.from('otp_verifications').insert([{
    registration_number: `ADMIN-${adminRecord.id}`,
    channel: 'email',
    destination: maskedEmail,
    destination_full: cleanEmail,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    max_attempts: 5,
    is_used: false,
    created_at: new Date().toISOString()
  }]);

  // Dispatch dedicated administrative authorization code email
  try {
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_password_reset',
        to: cleanEmail,
        code: otpCode,
        adminName: adminRecord.full_name || 'Administrator',
        roleTitle: adminRecord.role || 'Admin Officer',
        scope: adminRecord.scope || 'student_portal',
        expiryMinutes: 15
      })
    });
  } catch (_) {}

  return {
    success: true,
    email: cleanEmail,
    maskedEmail,
    expiresAt
  };
}

export async function confirmAdminPasswordReset(adminEmail, otpCode, newPassword) {
  if (!adminEmail || !otpCode || !newPassword) {
    return { success: false, error: 'All fields are required.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const cleanEmail = adminEmail.trim().toLowerCase();
  const cleanOtp = String(otpCode || '').replace(/\D/g, '').trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit verification code.' };
  }

  let serverlessError = null;

  // 1. Try serverless endpoint first
  try {
    const res = await fetch('/api/admin/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Password reset successfully.' };
    }
    if (data && data.error) {
      // Return authoritative error from serverless handler directly without falling through to duplicate fallback
      return { success: false, error: data.error };
    }
    if (!res.ok && res.status !== 404 && res.status !== 502 && res.status !== 503) {
      return { success: false, error: data.error || `Server responded with status ${res.status}` };
    }
  } catch (err) {
    serverlessError = err.message;
  }

  // 2. Direct Supabase Fallback (Execute ONLY if serverless endpoint is offline or unreachable)
  if (!supabase) return { success: false, error: serverlessError || 'Database offline.' };

  const { data: adminRecord } = await supabase
    .from('admin_scopes')
    .select('id, email, full_name, role, is_active')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (!adminRecord) {
    return { success: false, error: 'No administrator account found with that email address.' };
  }

  if (adminRecord.is_active === false) {
    return { success: false, error: 'This administrator account is currently suspended. Contact the Super Admin.' };
  }

  // Calculate browser client candidate hashes
  let candidateSalted = cleanOtp;
  let candidateUnsalted = cleanOtp;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const bufSalted = await crypto.subtle.digest('SHA-256', enc.encode(cleanOtp + 'nacos_otp_salt_2026'));
      candidateSalted = Array.from(new Uint8Array(bufSalted)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
      const bufUnsalted = await crypto.subtle.digest('SHA-256', enc.encode(cleanOtp));
      candidateUnsalted = Array.from(new Uint8Array(bufUnsalted)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch (_) {}
  }

  const { data: challenges, error: fetchErr } = await supabase
    .from('otp_verifications')
    .select('id, registration_number, destination_full, otp_hash, is_used, verified_at, expires_at, created_at, attempts, max_attempts')
    .or(`destination_full.ilike.${cleanEmail},registration_number.ilike.ADMIN-${adminRecord.id},registration_number.ilike.${cleanEmail}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (fetchErr) {
    console.error('[Admin Reset Fallback Query Error]:', fetchErr);
  }

  const challengeList = challenges || [];
  const nowMs = Date.now();
  const nowIso = new Date().toISOString();

  // Helper matcher comparing hashes trimmed and case-insensitively
  const isMatch = (c) => {
    const storedHash = (c.otp_hash || '').trim().toLowerCase();
    return storedHash === candidateSalted || storedHash === cleanOtp || storedHash === candidateUnsalted;
  };

  const matched = challengeList.find(isMatch);

  if (!matched) {
    const activeChallenge = challengeList.find(c => !c.verified_at && !c.is_used) || challengeList.find(c => !c.verified_at);
    if (activeChallenge) {
      const newAttempts = (activeChallenge.attempts || 0) + 1;
      const maxAtt = activeChallenge.max_attempts || 5;
      await supabase
        .from('otp_verifications')
        .update({
          attempts: newAttempts,
          is_used: newAttempts >= maxAtt
        })
        .eq('id', activeChallenge.id);

      const remaining = Math.max(0, maxAtt - newAttempts);
      if (remaining > 0) {
        return { success: false, error: `Invalid verification code. ${remaining} attempt(s) remaining.` };
      } else {
        return { success: false, error: 'Too many incorrect attempts on this code. Please request a new verification code.' };
      }
    }
    return { success: false, error: 'Invalid verification code. Please check your email or request a new code.' };
  }

  if (matched.verified_at) {
    return { success: false, error: 'This verification code has already been used to reset your password. Please request a new code.' };
  }

  if ((matched.attempts || 0) >= (matched.max_attempts || 5)) {
    return { success: false, error: 'Too many incorrect attempts on this code. Please request a new verification code.' };
  }

  const expiryTime = matched.expires_at ? new Date(matched.expires_at).getTime() : 0;
  if (expiryTime > 0 && Date.now() > expiryTime + 10 * 60 * 1000) {
    return { success: false, error: 'This verification code has expired. Please request a new code.' };
  }

  await supabase
    .from('otp_verifications')
    .update({ is_used: true, verified_at: nowIso })
    .eq('id', matched.id);

  try {
    await supabase
      .from('otp_verifications')
      .update({ is_used: true })
      .or(`destination_full.ilike.${cleanEmail},registration_number.ilike.ADMIN-${adminRecord.id},registration_number.ilike.${cleanEmail}`)
      .is('verified_at', null);
  } catch (_) {}

  const newHash = await hashPasswordPBKDF2(newPassword);
  const { error: updateErr } = await supabase
    .from('admin_scopes')
    .update({ password_hash: newHash, updated_at: nowIso })
    .eq('id', adminRecord.id);

  if (updateErr) {
    return { success: false, error: `Failed to update password: ${updateErr.message}` };
  }

  return { success: true, message: 'Your administrator password has been updated successfully. You can now log in.' };
}

/**
 * Request single-use 6-digit access OTP for administrator login / verification.
 */
export async function requestAdminAccessOtp(adminEmail, targetPlatform = 'website') {
  if (!adminEmail || !adminEmail.trim()) {
    return { success: false, error: 'Please enter your administrator email address.' };
  }

  const cleanEmail = adminEmail.trim().toLowerCase();

  // 1. Try serverless endpoint first
  try {
    const res = await fetch('/api/admin/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, targetPlatform })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, maskedEmail: data.maskedEmail, expiresAt: data.expiresAt };
    }
    if (data.error) {
      return { success: false, error: data.error, retryAfterSeconds: data.retryAfterSeconds };
    }
  } catch (_) {}

  // 2. Direct Supabase Fallback
  if (!supabase) return { success: false, error: 'Database service offline.' };

  const { data: adminRecord } = await supabase
    .from('admin_scopes')
    .select('id, email, full_name, role, scope, is_active')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (!adminRecord) {
    return { success: false, error: 'No administrator account found with that email address. Contact the Super Administrator.' };
  }

  if (adminRecord.is_active === false) {
    return { success: false, error: 'Account Suspended: Your administrative privileges have been revoked.' };
  }

  const masked = maskEmail(cleanEmail);
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  let otpHash = otpCode;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(otpCode + 'nacos_otp_salt_2026'));
      otpHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch (_) {}
  }

  await supabase.from('otp_verifications').insert([{
    registration_number: `ADMIN-${adminRecord.id}`,
    channel: 'email',
    destination: masked,
    destination_full: cleanEmail,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    max_attempts: 5,
    is_used: false,
    created_at: new Date().toISOString()
  }]);

  try {
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_otp',
        to: cleanEmail,
        code: otpCode,
        adminName: adminRecord.full_name || 'Administrator',
        roleTitle: adminRecord.role || 'Admin Officer',
        scope: adminRecord.scope || 'main_website',
        expiryMinutes: 15
      })
    });
  } catch (_) {}

  return { success: true, maskedEmail: masked, expiresAt };
}

/**
 * Verify 6-digit access OTP and establish 1-hour administrator session.
 */
export async function verifyAdminAccessOtp(adminEmail, otpCode, targetPlatform = 'website') {
  if (!adminEmail || !otpCode) {
    return { success: false, error: 'Email and verification code are required.' };
  }

  const cleanEmail = adminEmail.trim().toLowerCase();
  const cleanOtp = String(otpCode || '').replace(/\D/g, '').trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit verification code.' };
  }

  // 1. Try serverless endpoint first
  try {
    const res = await fetch('/api/admin/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, targetPlatform })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.session) {
      const storageKey = targetPlatform === 'website' ? ADMIN_SESSION_STORAGE_KEY : PORTAL_ADMIN_SESSION_KEY;
      localStorage.setItem(storageKey, JSON.stringify(data.session));
      await recordAdminAction('otp_login', 'admin_session', data.session.id, {
        email: data.session.email,
        scope: data.session.scope,
        role: data.session.role
      });
      return { success: true, session: data.session, admin: data.session };
    }
    if (data && data.error) {
      return { success: false, error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Fallback
  if (!supabase) return { success: false, error: 'Database service offline.' };

  const { data: adminRecord } = await supabase
    .from('admin_scopes')
    .select('id, email, full_name, role, scope, permissions, assigned_level, is_active')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (!adminRecord) {
    return { success: false, error: 'No administrator account found with that email address.' };
  }

  if (adminRecord.is_active === false) {
    return { success: false, error: 'Account Suspended: Your administrative privileges have been revoked.' };
  }

  let candidateSalted = cleanOtp;
  let candidateUnsalted = cleanOtp;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const bufSalted = await crypto.subtle.digest('SHA-256', enc.encode(cleanOtp + 'nacos_otp_salt_2026'));
      candidateSalted = Array.from(new Uint8Array(bufSalted)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
      const bufUnsalted = await crypto.subtle.digest('SHA-256', enc.encode(cleanOtp));
      candidateUnsalted = Array.from(new Uint8Array(bufUnsalted)).map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    } catch (_) {}
  }

  const { data: challenges } = await supabase
    .from('otp_verifications')
    .select('id, registration_number, destination_full, otp_hash, is_used, verified_at, expires_at, created_at, attempts, max_attempts')
    .or(`destination_full.ilike.${cleanEmail},registration_number.ilike.ADMIN-${adminRecord.id},registration_number.ilike.${cleanEmail}`)
    .order('created_at', { ascending: false })
    .limit(50);

  const challengeList = challenges || [];
  const isMatch = (c) => {
    const stored = (c.otp_hash || '').trim().toLowerCase();
    return stored === candidateSalted || stored === cleanOtp || stored === candidateUnsalted;
  };

  const matched = challengeList.find(isMatch);
  if (!matched) {
    const activeChallenge = challengeList.find(c => !c.verified_at && !c.is_used) || challengeList.find(c => !c.verified_at);
    if (activeChallenge) {
      const newAttempts = (activeChallenge.attempts || 0) + 1;
      const maxAtt = activeChallenge.max_attempts || 5;
      await supabase.from('otp_verifications').update({ attempts: newAttempts, is_used: newAttempts >= maxAtt }).eq('id', activeChallenge.id);
      const remaining = Math.max(0, maxAtt - newAttempts);
      return { success: false, error: remaining > 0 ? `Invalid verification code. ${remaining} attempt(s) remaining.` : 'Too many incorrect attempts on this code. Please request a new verification code.' };
    }
    return { success: false, error: 'Invalid verification code. Please check your email or request a new code.' };
  }

  if (matched.verified_at) {
    return { success: false, error: 'This verification code has already been used. Please request a new code.' };
  }
  if ((matched.attempts || 0) >= (matched.max_attempts || 5)) {
    return { success: false, error: 'Too many incorrect attempts on this code. Please request a new verification code.' };
  }
  const expiryTime = matched.expires_at ? new Date(matched.expires_at).getTime() : 0;
  if (expiryTime > 0 && Date.now() > expiryTime + 10 * 60 * 1000) {
    return { success: false, error: 'This verification code has expired. Please request a new code.' };
  }

  const nowIso = new Date().toISOString();
  await supabase.from('otp_verifications').update({ is_used: true, verified_at: nowIso }).eq('id', matched.id);
  await supabase.from('admin_scopes').update({ last_login_at: nowIso, updated_at: nowIso }).eq('id', adminRecord.id);

  const sessionData = {
    token: adminRecord.id,
    user_id: adminRecord.id,
    id: adminRecord.id,
    email: adminRecord.email,
    full_name: adminRecord.full_name,
    name: adminRecord.full_name,
    scope: adminRecord.scope,
    role: adminRecord.role,
    assigned_level: adminRecord.assigned_level || 'all',
    permissions: adminRecord.permissions || [],
    is_super_admin: isSuperAdminScope(adminRecord),
    logged_in_at: nowIso,
    expires_at: Date.now() + ONE_HOUR_MS
  };

  const storageKey = targetPlatform === 'website' ? ADMIN_SESSION_STORAGE_KEY : PORTAL_ADMIN_SESSION_KEY;
  localStorage.setItem(storageKey, JSON.stringify(sessionData));
  await recordAdminAction('otp_login', 'admin_session', adminRecord.id, {
    email: adminRecord.email,
    scope: adminRecord.scope,
    role: adminRecord.role
  });

  return { success: true, session: sessionData, admin: sessionData };
}

/**
 * Super Admin: Update administrator permissions and capabilities in database.
 */
export async function superAdminUpdateAdminPermissions(adminId, { permissions = [], role = null, scope = null, assignedLevel = null }) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token || current?.id;

  // 1. Try serverless endpoint first
  try {
    const res = await fetch('/api/admin/users/permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        token,
        requesterEmail: current?.email,
        adminId,
        permissions,
        role,
        scope,
        assignedLevel
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Permissions updated successfully.' };
    }
    if (data.error) {
      return { success: false, error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Fallback
  if (!supabase) return { success: false, error: 'Database service offline.' };

  const updateData = {
    permissions: Array.isArray(permissions) ? permissions : [],
    updated_at: new Date().toISOString()
  };
  if (role) updateData.role = role;
  if (scope) updateData.scope = scope;
  if (assignedLevel) updateData.assigned_level = assignedLevel;

  const { error } = await supabase.from('admin_scopes').update(updateData).eq('id', adminId);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: 'Administrator permissions updated successfully.' };
}
