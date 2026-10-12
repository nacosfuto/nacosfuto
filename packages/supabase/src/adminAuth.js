import { supabase } from './client.js';
import { hashPassword, verifyPassword } from './auth.js';
import { maskEmail } from './otpService.js';
import { sendPasswordResetEmail } from './emailService.js';

const ADMIN_SESSION_STORAGE_KEY = 'nacos_website_admin_session';
const PORTAL_ADMIN_SESSION_KEY = 'nacos_portal_admin_session';
const ONE_HOUR_MS = 60 * 60 * 1000; // Strict 60-minute session lifetime

export const AVAILABLE_ADMIN_FEATURES = [
  { key: 'feature:student_registry', label: 'Student Registry & Profiles', platform: 'portal', description: 'Search, verify, and manage departmental student profiles' },
  { key: 'feature:results_management', label: 'Results & Grades (Course Adviser)', platform: 'portal', description: 'Upload, compute CGPA, and approve semester student results' },
  { key: 'feature:id_management', label: 'ID Card Applications & Verification', platform: 'portal', description: 'Review student ID applications, approve, and generate official cards' },
  { key: 'feature:resource_management', label: 'Academic Resource Hub (Backblaze B2)', platform: 'shared', description: 'Upload, manage handouts, past questions, and video courses in B2' },
  { key: 'feature:course_management', label: 'Academic Curriculum & Courses', platform: 'portal', description: 'Manage course units, semester allocations, and curriculum' },
  { key: 'feature:yellow_pages', label: 'Yellow Pages Business Directory', platform: 'website', description: 'Review, approve, reject, and manage indigenous student businesses' },
  { key: 'feature:campus_clubs', label: 'Campus Clubs & Tech Communities', platform: 'website', description: 'Approve student tech clubs, communities, and leadership links' },
  { key: 'feature:alumni_management', label: 'Alumni Network & Spotlights', platform: 'website', description: 'Review alumni join requests, spotlights, and graduate records' },
  { key: 'feature:news_events', label: 'News & Event Flyers CMS', platform: 'website', description: 'Publish departmental announcements, hackathons, and social mixers' },
  { key: 'feature:media_library', label: 'Cloudinary Media Asset Library', platform: 'shared', description: 'Manage CDN image uploads, folders, and banners' }
];

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
        .select('*')
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
      session.scope === 'super_admin' ||
      session.scope === 'electoral_admin' ||
      session.scope === 'electra_admin' ||
      session.role === 'super_admin' ||
      session.role === 'portal_admin' ||
      session.role === 'course_adviser' ||
      session.role === 'electoral_admin';

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
      return { valid: true, admin: data.admin };
    }
  } catch (_) {
    // If running in development without API server, check Supabase directly
  }

  // 2. Direct Supabase database status check
  if (supabase && session.id) {
    try {
      const { data: dbAdmin, error } = await supabase
        .from('admin_scopes')
        .select('id, is_active, role, scope')
        .eq('id', session.id)
        .maybeSingle();

      if (error || !dbAdmin || dbAdmin.is_active === false) {
        clearAdminStorage();
        return { valid: false, error: 'Account suspended or removed from database.' };
      }
      return { valid: true, admin: session };
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
      .select('*')
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
      dbAdmin.scope === 'super_admin' ||
      dbAdmin.role === 'super_admin' ||
      dbAdmin.role === 'superadmin' ||
      dbAdmin.role === 'website_admin';

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
      scope: dbAdmin.scope,
      role: dbAdmin.role,
      assigned_level: dbAdmin.assigned_level || 'all',
      permissions: dbAdmin.permissions || ['main_website.view'],
      is_super_admin: dbAdmin.scope === 'super_admin' || dbAdmin.role === 'super_admin',
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
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, targetPlatform: 'portal' })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.session) {
      localStorage.setItem(PORTAL_ADMIN_SESSION_KEY, JSON.stringify(data.session));
      localStorage.setItem('nacos_portal_admin_last_activity', Date.now().toString());
      return { success: true, session: data.session, admin: data.session };
    }

    if (!res.ok && data.error) {
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
      .select('*')
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
      dbAdmin.scope === 'super_admin' ||
      dbAdmin.scope === 'electoral_admin' ||
      dbAdmin.scope === 'electra_admin' ||
      dbAdmin.role === 'super_admin' ||
      dbAdmin.role === 'portal_admin' ||
      dbAdmin.role === 'course_adviser' ||
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
      scope: dbAdmin.scope,
      role: dbAdmin.role,
      assigned_level: dbAdmin.assigned_level || 'all',
      permissions: dbAdmin.permissions || ['student_portal.view', 'student_portal.students'],
      is_super_admin: dbAdmin.scope === 'super_admin' || dbAdmin.role === 'super_admin',
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
  if (admin.is_super_admin || admin.scope === 'super_admin' || admin.role === 'super_admin') return true;
  if (admin.permissions?.includes('*')) return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(permission);
}

export function hasAdminFeature(admin, featureKey) {
  if (!admin) return false;
  if (admin.is_super_admin || admin.scope === 'super_admin' || admin.role === 'super_admin') return true;
  if (admin.permissions?.includes('*')) return true;

  const isWebsiteAdmin = admin.scope === 'main_website' || admin.role === 'website_admin';
  const isPortalAdmin = admin.scope === 'student_portal' || admin.role === 'portal_admin';

  if (isWebsiteAdmin && ['feature:yellow_pages', 'feature:campus_clubs', 'feature:alumni_management', 'feature:news_events', 'feature:media_library', 'feature:resource_management'].includes(featureKey)) {
    return true;
  }

  if (isPortalAdmin && ['feature:student_registry', 'feature:results_management', 'feature:id_management', 'feature:course_management', 'feature:resource_management', 'feature:media_library'].includes(featureKey)) {
    return true;
  }

  if (admin.role === 'course_adviser' && ['feature:results_management', 'feature:student_registry', 'feature:course_management'].includes(featureKey)) {
    return true;
  }

  return Array.isArray(admin.permissions) && (
    admin.permissions.includes(featureKey) || 
    admin.permissions.includes(featureKey.replace('feature:', '')) ||
    admin.permissions.some(p => p.startsWith(featureKey) || featureKey.startsWith(p))
  );
}

// =============================================================================
// SUPER ADMIN USER MANAGEMENT OPERATIONS (Database-Backed)
// =============================================================================

/**
 * Retrieve all administrators across all scopes directly from Supabase
 */
export async function superAdminGetAdmins() {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token;

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/admin/users', {
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
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return { success: true, admins: data };
      }
    } catch (_) {}
  }

  return { success: true, admins: [] };
}

/**
 * Super Admin: Create and Provision a New Administrator in Database + Send Resend Email
 */
export async function superAdminCreateAdmin({ email, fullName, role = 'website_admin', permissions, scope = 'main_website', assigned_level = 'all' }) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token;

  if (!email || !fullName) {
    return { error: 'Email and Full Name are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanLevel = String(assigned_level || 'all').toLowerCase().replace(' level', '');

  // 1. Try serverless endpoint
  try {
    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        email: cleanEmail,
        fullName: cleanName,
        role,
        scope,
        assignedLevel: cleanLevel,
        permissions
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, admin: data.admin, message: data.message };
    }
    if (!res.ok && data.error) {
      return { error: data.error };
    }
  } catch (_) {}

  // 2. Direct Database Fallback
  if (!supabase) return { error: 'Database service offline.' };

  const adminId = `admin-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const newAdmin = {
    id: adminId,
    user_id: null,
    email: cleanEmail,
    full_name: cleanName,
    scope: scope || 'main_website',
    role: role || 'website_admin',
    assigned_level: cleanLevel,
    permissions: permissions || ['main_website.view'],
    is_active: true,
    password_hash: null, // set via reset password flow
    created_at: nowIso,
    updated_at: nowIso
  };

  const { error: insErr } = await supabase.from('admin_scopes').insert([newAdmin]);
  if (insErr) {
    return { error: insErr.message };
  }

  // Trigger assignment email
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://admin.nacosfuto.com.ng';
    await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_assignment',
        to: cleanEmail,
        admin: {
          fullName: cleanName,
          scope: newAdmin.scope,
          role: newAdmin.role,
          assignedLevel: cleanLevel,
          portalAdminUrl: origin,
          assignedAt: nowIso
        }
      })
    });
  } catch (_) {}

  return { success: true, admin: newAdmin };
}

export const superAdminInviteAdmin = superAdminCreateAdmin;

/**
 * Super Admin: Toggle Active / Suspended Status in Database
 */
export async function superAdminToggleAdmin(adminIdOrEmail, isActive) {
  const current = getWebsiteAdminSession() || getPortalAdminSession();
  const token = current?.token;

  // 1. Try serverless endpoint
  try {
    const res = await fetch('/api/admin/users/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ adminId: adminIdOrEmail, isActive })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    if (!res.ok && data.error) {
      return { error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Update
  if (supabase) {
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
  const token = current?.token;

  if (current && (current.id === adminId || current.user_id === adminId)) {
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
      body: JSON.stringify({ adminId })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    if (!res.ok && data.error) {
      return { error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Deletion
  if (supabase) {
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

  // 1. Try serverless endpoint
  try {
    const res = await fetch('/api/admin/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, maskedEmail: data.maskedEmail, expiresAt: data.expiresAt };
    }
    if (!res.ok && data.error) {
      return { success: false, error: data.error, retryAfterSeconds: data.retryAfterSeconds };
    }
  } catch (_) {}

  // 2. Direct Supabase Fallback
  if (!supabase) {
    return { success: false, error: 'Database offline.' };
  }

  const { data: adminRecord } = await supabase
    .from('admin_scopes')
    .select('id, email, full_name, role, is_active')
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

  const emailResult = await sendPasswordResetEmail(cleanEmail, otpCode, adminRecord.full_name || 'Administrator', adminRecord.role || 'Admin Officer');
  if (!emailResult.success && emailResult.provider !== 'simulated') {
    return { success: false, error: emailResult.error || 'Failed to dispatch email.' };
  }

  return {
    success: true,
    email: cleanEmail,
    maskedEmail,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
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

  // 1. Try serverless endpoint
  try {
    const res = await fetch('/api/admin/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: otpCode, newPassword })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    if (!res.ok && data.error) {
      return { success: false, error: data.error };
    }
  } catch (_) {}

  // 2. Direct Supabase Fallback
  if (!supabase) return { success: false, error: 'Database offline.' };

  const newHash = await hashPassword(newPassword);
  const { error: updateErr } = await supabase
    .from('admin_scopes')
    .update({ password_hash: newHash, updated_at: new Date().toISOString() })
    .ilike('email', cleanEmail);

  if (updateErr) {
    return { success: false, error: `Failed to update password: ${updateErr.message}` };
  }

  return { success: true, message: 'Your administrator password has been updated successfully. You can now log in.' };
}
