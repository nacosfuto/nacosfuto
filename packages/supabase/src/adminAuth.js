import { supabase } from './client.js';
import { hashPassword, isLocalEnvironment } from './auth.js';
import { createOTPVerification, verifyOTP, maskEmail } from './otpService.js';
import { sendPasswordResetEmail } from './emailService.js';

const ADMIN_SESSION_STORAGE_KEY = 'nacos_website_admin_session';
const ADMIN_SCOPES_STORAGE_KEY = 'nacos_admin_scopes_db';
const AUDIT_LOGS_STORAGE_KEY = 'nacos_admin_audit_logs_db';

/**
 * Seeded Administrative Users and Scopes for Development and Verification
 * Enforces strict isolation between Main Website and Student Portal
 */
export function getLocalAdminScopesDatabase() {
  const stored = localStorage.getItem(ADMIN_SCOPES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  const seeded = [
    {
      id: 'admin-super-ict',
      user_id: 'usr-superadmin-ict',
      email: 'ict.nacosfuto@gmail.com',
      full_name: 'NACOS FUTO ICT / Super Administrator',
      scope: 'super_admin',
      role: 'super_admin',
      permissions: ['*'],
      is_active: true,
      password_hash: null,
      created_at: '2026-10-07T12:00:00Z'
    }
  ];

  localStorage.setItem(ADMIN_SCOPES_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

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
 * Seeded Audit Logs
 */
export function getLocalAuditLogsDatabase() {
  const stored = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  const seeded = [
    {
      id: 'audit-1',
      user_id: 'usr-webadmin-1',
      admin_email: 'webadmin@nacos.org.ng',
      scope: 'main_website',
      action: 'image_upload',
      resource_type: 'media',
      resource_id: 'nacos/events/masked_affairs_banner',
      details: { folder: 'nacos/events', format: 'jpg', bytes: 482900 },
      created_at: '2026-09-03T10:14:00Z'
    },
    {
      id: 'audit-2',
      user_id: 'usr-editor-1',
      admin_email: 'editor@nacos.org.ng',
      scope: 'main_website',
      action: 'gallery_create',
      resource_type: 'gallery',
      resource_id: 'tetfund_dept_complex',
      details: { caption: 'Department of Computer Science TETFUND Complex' },
      created_at: '2026-09-03T11:20:00Z'
    }
  ];

  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

/**
 * Record an administrative action in the audit log
 */
export async function recordAdminAction(action, resourceType, resourceId = null, details = {}) {
  const session = getWebsiteAdminSession();
  const entry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: session?.user_id || session?.id || null,
    admin_email: session?.email || 'system@nacos.org.ng',
    scope: session?.scope || 'main_website',
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date().toISOString()
  };

  // 1. Try Supabase insert
  try {
    await supabase.from('admin_audit_logs').insert([entry]);
  } catch (err) {
    // Offline/bypassed
  }

  // 2. Save to local storage audit trail
  const logs = getLocalAuditLogsDatabase();
  logs.unshift(entry);
  localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 100))); // keep latest 100

  return entry;
}

/**
 * Retrieve administrative audit logs
 */
export async function getAdminAuditLogs(scope = 'main_website', limit = 50) {
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    // Offline
  }

  const logs = getLocalAuditLogsDatabase();
  return logs.filter(l => scope === 'all' || l.scope === scope || l.scope === 'super_admin').slice(0, limit);
}

/**
 * Authenticate and authorize a user specifically for the Main Website Admin area
 * 
 * Strict 2-step verification:
 * 1. Authentication: Validate credentials
 * 2. Scoped Authorization: Check that user holds an active 'main_website' or 'super_admin' scope
 * 
 * Rejects:
 * - Invalid passwords
 * - Normal student accounts (no admin scope)
 * - Portal-only admins ('student_portal' scope without 'main_website')
 * - Disabled administrator accounts
 */
export async function loginWebsiteAdmin(email, password) {
  if (!email || !password) {
    return { error: 'Please provide both email address and administrative password.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  // Attempt Supabase Auth login if online
  let authUser = null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });
    if (!error && data?.user) {
      authUser = data.user;
    }
  } catch (e) {
    // offline or mock
  }

  // Check scoped database (Supabase table or local seed)
  let adminRecord = null;

  if (authUser) {
    try {
      const { data, error } = await supabase
        .from('admin_scopes')
        .select('*')
        .or(`user_id.eq.${authUser.id},email.eq.${cleanEmail}`)
        .in('scope', ['main_website', 'super_admin'])
        .eq('is_active', true)
        .maybeSingle();

      if (!error && data) {
        adminRecord = data;
      }
    } catch (e) {
      // offline
    }
  }

  // Check Supabase admin_scopes table directly (for SQL-seeded or dashboard admins)
  if (!adminRecord && supabase) {
    try {
      const { data: dbAdmin } = await supabase
        .from('admin_scopes')
        .select('*')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (dbAdmin && dbAdmin.password_hash) {
        // Test standard SHA-256 and salted hash
        let rawSha = null;
        if (typeof crypto !== 'undefined' && crypto.subtle) {
          const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
          rawSha = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const isValidPassword = dbAdmin.password_hash === passwordHash || (rawSha && dbAdmin.password_hash === rawSha);
        const isAllowedScope = dbAdmin.scope === 'main_website' || dbAdmin.scope === 'super_admin';

        if (isValidPassword && isAllowedScope) {
          adminRecord = dbAdmin;
        } else if (!isValidPassword) {
          return { error: 'Invalid password. Please check your credentials.' };
        } else if (!isAllowedScope) {
          return { 
            error: `Access Denied: Your account holds the '${dbAdmin.scope}' scope and is not authorized to access the Main Website Administration area.` 
          };
        }
      }
    } catch (e) {
      console.warn('Supabase admin_scopes query error:', e);
    }
  }

  // Check local seeded database fallback (ONLY on localhost / dev)
  if (!adminRecord && isLocalEnvironment()) {
    const admins = getLocalAdminScopesDatabase();
    const candidate = admins.find(a => a.email.toLowerCase() === cleanEmail);

    if (!candidate) {
      return { 
        error: 'Invalid administrative credentials. Access restricted to authorized NACOS website administrators.' 
      };
    }

    // Verify password hash
    const isDefaultPass = isLocalEnvironment() && password === 'password';
    if (candidate.password_hash !== passwordHash && !isDefaultPass) {
      return { error: 'Invalid password. Please check your credentials.' };
    }

    // Step 2: Verify Scope
    if (candidate.scope !== 'main_website' && candidate.scope !== 'super_admin') {
      return { 
        error: `Access Denied: Your account holds the '${candidate.scope}' scope and is not authorized to access the Main Website Administration area.` 
      };
    }

    if (!candidate.is_active) {
      return { error: 'Account Disabled: Your administrative access has been revoked or deactivated. Contact the Super Admin.' };
    }

    adminRecord = candidate;
  }

  // Successful Scoped Login: Persist admin session
  const adminSession = {
    user_id: adminRecord.user_id || adminRecord.id,
    id: adminRecord.id,
    email: adminRecord.email,
    full_name: adminRecord.full_name,
    scope: adminRecord.scope,
    role: adminRecord.role,
    permissions: adminRecord.permissions || ['main_website.view'],
    is_super_admin: adminRecord.scope === 'super_admin' || adminRecord.role === 'super_admin',
    logged_in_at: new Date().toISOString()
  };

  localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminSession));

  // Record audit log
  await recordAdminAction('login', 'admin_session', adminSession.user_id, {
    email: adminSession.email,
    role: adminSession.role,
    scope: adminSession.scope
  });

  return { success: true, admin: adminSession };
}

/**
 * Terminate website admin session and log audit event
 */
export async function logoutWebsiteAdmin() {
  const session = getWebsiteAdminSession();
  if (session) {
    await recordAdminAction('logout', 'admin_session', session.user_id);
  }

  localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // ignore
  }
  return { success: true };
}

/**
 * Retrieve current active verified website admin session
 */
export function getWebsiteAdminSession() {
  const stored = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    // Double check that scope is authorized for website admin
    if (session && (session.scope === 'main_website' || session.scope === 'super_admin')) {
      return session;
    }
  } catch (e) {
    console.error('Failed to parse admin session', e);
  }

  return null;
}

/**
 * Check if the active admin has a specific granular permission
 */
export function hasPermission(admin, permission) {
  if (!admin) return false;
  if (admin.is_super_admin || admin.scope === 'super_admin') return true;
  if (admin.permissions?.includes('*')) return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(permission);
}

/**
 * Check if the active admin has access to a specific feature or platform
 * Supports both platform assignments and feature-based assignments (e.g. for Course Advisers)
 */
export function hasAdminFeature(admin, featureKey) {
  if (!admin) return false;
  if (admin.is_super_admin || admin.scope === 'super_admin' || admin.role === 'super_admin') return true;
  if (admin.permissions?.includes('*')) return true;

  // Platform inheritance
  const isWebsiteAdmin = admin.scope === 'main_website' || admin.role === 'website_admin';
  const isPortalAdmin = admin.scope === 'student_portal' || admin.role === 'portal_admin';

  if (isWebsiteAdmin) {
    if (['feature:yellow_pages', 'feature:campus_clubs', 'feature:alumni_management', 'feature:news_events', 'feature:media_library', 'feature:resource_management'].includes(featureKey)) {
      return true;
    }
  }

  if (isPortalAdmin) {
    if (['feature:student_registry', 'feature:results_management', 'feature:id_management', 'feature:course_management', 'feature:resource_management', 'feature:media_library'].includes(featureKey)) {
      return true;
    }
  }

  // Course Adviser check
  if (admin.role === 'course_adviser') {
    if (['feature:results_management', 'feature:student_registry', 'feature:course_management'].includes(featureKey)) {
      return true;
    }
  }

  // Explicit feature permission check
  return Array.isArray(admin.permissions) && (
    admin.permissions.includes(featureKey) || 
    admin.permissions.includes(featureKey.replace('feature:', '')) ||
    admin.permissions.some(p => p.startsWith(featureKey) || featureKey.startsWith(p))
  );
}

/**
 * Super Admin Management: Retrieve all administrators across all scopes
 */
export async function superAdminGetAdmins() {
  const current = getWebsiteAdminSession();
  if (!current?.is_super_admin) {
    return { error: 'Unauthorized. Super Admin privileges required.' };
  }

  try {
    const { data, error } = await supabase
      .from('admin_scopes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return { success: true, admins: data };
    }
  } catch (e) {
    // offline
  }

  const admins = getLocalAdminScopesDatabase();
  return { success: true, admins };
}

/**
 * Super Admin Management: Invite or create a new website administrator
 */
export async function superAdminCreateAdmin({ email, fullName, role, permissions, scope = 'main_website' }) {
  const current = getWebsiteAdminSession();
  if (!current?.is_super_admin) {
    return { error: 'Unauthorized. Super Admin privileges required.' };
  }

  if (!email || !fullName) {
    return { error: 'Email and Full Name are required.' };
  }

  const newAdmin = {
    id: `admin-${Date.now()}`,
    user_id: `usr-${Date.now()}`,
    email: email.trim().toLowerCase(),
    full_name: fullName.trim(),
    scope,
    role: role || 'website_admin',
    permissions: permissions || ['main_website.view', 'main_website.media'],
    is_active: true,
    password_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password'
    granted_by: current.user_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('admin_scopes').insert([newAdmin]);
  } catch (e) {
    // offline
  }

  const admins = getLocalAdminScopesDatabase();
  admins.push(newAdmin);
  localStorage.setItem(ADMIN_SCOPES_STORAGE_KEY, JSON.stringify(admins));

  await recordAdminAction('admin_create', 'admin_user', newAdmin.email, {
    created_admin: newAdmin.email,
    scope: newAdmin.scope,
    role: newAdmin.role
  });

  return { success: true, admin: newAdmin };
}

export const superAdminInviteAdmin = superAdminCreateAdmin;

/**
 * Super Admin Management: Toggle active status (disable/enable)
 */
export async function superAdminToggleAdmin(email, isActive) {
  const current = getWebsiteAdminSession();
  if (!current?.is_super_admin) {
    return { error: 'Unauthorized. Super Admin privileges required.' };
  }

  try {
    await supabase
      .from('admin_scopes')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('email', email);
  } catch (e) {
    // offline
  }

  const admins = getLocalAdminScopesDatabase();
  const idx = admins.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    admins[idx].is_active = isActive;
    localStorage.setItem(ADMIN_SCOPES_STORAGE_KEY, JSON.stringify(admins));
  }

  await recordAdminAction(isActive ? 'admin_enable' : 'admin_disable', 'admin_user', email, {
    affected_admin: email,
    is_active: isActive
  });

  return { success: true };
}

/**
 * Super Admin Management: Update permissions
 */
export async function superAdminUpdatePermissions(email, permissions) {
  const current = getWebsiteAdminSession();
  if (!current?.is_super_admin) {
    return { error: 'Unauthorized. Super Admin privileges required.' };
  }

  try {
    await supabase
      .from('admin_scopes')
      .update({ permissions, updated_at: new Date().toISOString() })
      .eq('email', email);
  } catch (e) {
    // offline
  }

  const admins = getLocalAdminScopesDatabase();
  const idx = admins.findIndex(a => a.email.toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    admins[idx].permissions = permissions;
    localStorage.setItem(ADMIN_SCOPES_STORAGE_KEY, JSON.stringify(admins));
  }

  await recordAdminAction('admin_permissions_update', 'admin_user', email, {
    affected_admin: email,
    new_permissions: permissions
  });

  return { success: true };
}

/**
 * Request Password Reset for Administrators
 * Validates the administrator exists, issues a secure 6-digit OTP,
 * and delivers it to their inbox via Resend.
 */
export async function requestAdminPasswordReset(adminEmail) {
  if (!adminEmail || !adminEmail.trim()) {
    return { success: false, error: 'Please enter your administrator email address.' };
  }

  const cleanEmail = adminEmail.trim().toLowerCase();

  // 1. Look up administrator in Supabase admin_scopes
  let adminRecord = null;
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('admin_scopes')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        adminRecord = data;
      }
    }
  } catch (err) {
    console.warn('Supabase admin lookup error during reset request:', err);
  }

  // 2. Fallback to local admin database if offline/unreachable
  if (!adminRecord) {
    const localAdmins = getLocalAdminScopesDatabase();
    adminRecord = localAdmins.find(a => a.email && a.email.toLowerCase() === cleanEmail);
  }

  if (!adminRecord) {
    return {
      success: false,
      error: 'No administrator account was found with that email address. Please contact the Super Admin.'
    };
  }

  if (adminRecord.is_active === false) {
    return {
      success: false,
      error: 'This administrative account is currently disabled. Please contact the department or Super Admin.'
    };
  }

  const adminName = adminRecord.full_name || adminRecord.name || 'Administrator';
  const roleTitle = adminRecord.role || adminRecord.scope || 'Admin Officer';
  const maskedEmail = maskEmail(cleanEmail);

  // 3. Generate secure OTP
  const otpResult = await createOTPVerification(cleanEmail, 'email', maskedEmail, cleanEmail);
  if (!otpResult.success) {
    return {
      success: false,
      error: otpResult.error?.message || 'Could not generate reset code. Please try again.',
      retryAfterSeconds: otpResult.retryAfterSeconds
    };
  }

  // 4. Send transactional password reset email via Resend
  const emailResult = await sendPasswordResetEmail(cleanEmail, otpResult.code, adminName, roleTitle);
  if (!emailResult.success && emailResult.provider !== 'simulated') {
    return {
      success: false,
      error: emailResult.error || 'Failed to dispatch password reset email. Please try again later.',
      retryAfterSeconds: emailResult.retryAfterSeconds
    };
  }

  return {
    success: true,
    email: cleanEmail,
    maskedEmail,
    expiresAt: otpResult.expiresAt
  };
}

/**
 * Confirm and Complete Admin Password Reset
 * Validates the 6-digit OTP code, computes the secure SHA-256 password hash,
 * and updates the administrator's credentials in Supabase.
 */
export async function confirmAdminPasswordReset(adminEmail, otpCode, newPassword) {
  if (!adminEmail || !otpCode || !newPassword) {
    return { success: false, error: 'All fields are required.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const cleanEmail = adminEmail.trim().toLowerCase();
  const cleanCode = otpCode.trim();

  // 1. Verify OTP code
  const verifyResult = await verifyOTP(cleanEmail, 'email', cleanCode);
  if (!verifyResult.success) {
    return {
      success: false,
      error: verifyResult.error?.message || 'Invalid or expired verification code. Please request a new one.'
    };
  }

  // 2. Hash new password
  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();

  // 3. Update Supabase admin_scopes table
  let updatedInSupabase = false;
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('admin_scopes')
        .update({
          password_hash: newHash,
          updated_at: now
        })
        .eq('email', cleanEmail)
        .select();

      if (!error && data && data.length > 0) {
        updatedInSupabase = true;
      }
    }
  } catch (err) {
    console.warn('Supabase admin password update notice:', err);
  }

  // 4. Update local admin storage cache
  const localAdmins = getLocalAdminScopesDatabase();
  const idx = localAdmins.findIndex(a => a.email && a.email.toLowerCase() === cleanEmail);
  if (idx !== -1) {
    localAdmins[idx].password_hash = newHash;
    localAdmins[idx].updated_at = now;
    localStorage.setItem(ADMIN_SCOPES_STORAGE_KEY, JSON.stringify(localAdmins));
  }

  return {
    success: true,
    message: 'Your administrator password has been updated successfully. You can now log in.'
  };
}

