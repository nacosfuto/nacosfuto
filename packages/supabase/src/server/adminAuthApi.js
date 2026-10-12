/**
 * @file packages/supabase/src/server/adminAuthApi.js
 * Authoritative Server-Side Production Admin Authentication & Management Engine
 * 
 * Provides:
 * 1. Database-backed credentials verification against `admin_scopes`.
 * 2. Strict 1-hour session token issuance with HMAC-SHA256 signature and tamper-proofing.
 * 3. Server-side session verification that checks database status (immediate suspension/deletion revocation).
 * 4. Password reset via 6-digit OTP dispatched through transactional Resend email.
 * 5. Full Admin Management: Add, List, Suspend, Reactivate, Delete, and Resend Invite.
 * 6. Critical safeguards: Self-deletion prevention, last super-admin protection, election data isolation.
 */

import crypto from 'crypto';
import { supabase } from '../client.js';
import { dispatchEmail } from './emailDispatcher.js';
import {
  hashPasswordServer,
  verifyPasswordServer,
  hashOtpServer,
  maskEmail
} from './studentAuthApi.js';
import { renderAdminAssignmentEmail } from './emailTemplates.js';

const AUTH_SECRET = process.env.SESSION_SECRET || process.env.VITE_SUPABASE_ANON_KEY || 'nacos_futo_auth_signature_key_2026';
const ONE_HOUR_MS = 60 * 60 * 1000;
const OTP_EXPIRY_MINUTES = 15;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

// =============================================================================
// 1. CRYPTOGRAPHIC ADMIN SESSION TOKEN HELPERS
// =============================================================================

/**
 * Signs an admin session payload with an HMAC-SHA256 signature.
 * Enforces strict 1-hour expiration timestamp.
 */
export function signAdminToken(adminData, customLifetimeMs = ONE_HOUR_MS) {
  const now = Date.now();
  const lifetime = Math.min(customLifetimeMs, ONE_HOUR_MS); // Never exceed 60 minutes
  const payload = {
    sub: adminData.id,
    user_id: adminData.user_id || adminData.id,
    email: adminData.email.toLowerCase(),
    full_name: adminData.full_name,
    role: adminData.role,
    scope: adminData.scope,
    assigned_level: adminData.assigned_level || 'all',
    permissions: adminData.permissions || [],
    is_super_admin: adminData.scope === 'super_admin' || adminData.role === 'super_admin',
    iat: now,
    exp: now + lifetime
  };

  const jsonStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(jsonStr).digest('base64url');
  return {
    token: `${jsonStr}.${signature}`,
    expiresAt: payload.exp,
    payload
  };
}

/**
 * Verifies the HMAC-SHA256 signature and checks absolute expiration.
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [jsonStr, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(jsonStr).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(jsonStr, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return null; // Expired (strictly > 60 mins)
    }
    return payload;
  } catch (_) {
    return null;
  }
}

// =============================================================================
// 2. AUTHORITATIVE ADMIN LOGIN & VERIFICATION
// =============================================================================

/**
 * Authenticates an administrator against the database `admin_scopes` table.
 * Enforces:
 * - Real password hash verification (PBKDF2 or secure SHA-256).
 * - Active status (`is_active === true`).
 * - Platform scope validation (`main_website`, `student_portal`, `electoral_admin`).
 * - Strict 60-minute session issuance.
 */
export async function handleAdminLogin({ email, password, targetPlatform = 'website' }) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!supabase) {
    return { success: false, error: 'Database service unavailable. Please check server configuration.' };
  }

  // 1. Fetch live admin record directly from Supabase
  const { data: adminRecord, error: dbErr } = await supabase
    .from('admin_scopes')
    .select('*')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (dbErr) {
    console.error('[Admin Auth DB Error]:', dbErr);
    return { success: false, error: 'Database query failed during admin authentication.' };
  }

  if (!adminRecord) {
    return {
      success: false,
      error: 'Invalid administrative credentials. Access restricted to authorized NACOS administrators.'
    };
  }

  // 2. Strict Suspension Check
  if (adminRecord.is_active === false) {
    return {
      success: false,
      error: 'Account Suspended: Your administrative privileges have been revoked or deactivated. Contact the Super Administrator.'
    };
  }

  // 3. Platform Scoping Check
  const isSuperAdmin = adminRecord.scope === 'super_admin' || adminRecord.role === 'super_admin';
  const role = (adminRecord.role || '').toLowerCase();
  const scope = (adminRecord.scope || '').toLowerCase();

  let isAllowed = isSuperAdmin;
  if (!isAllowed) {
    if (targetPlatform === 'website' || targetPlatform === 'main_website') {
      isAllowed = scope === 'main_website' || role === 'website_admin';
    } else if (targetPlatform === 'portal' || targetPlatform === 'student_portal') {
      isAllowed = scope === 'student_portal' || role === 'portal_admin' || role === 'course_adviser';
    } else if (targetPlatform === 'electra' || targetPlatform === 'electoral_admin') {
      isAllowed = scope === 'electoral_admin' || scope === 'electra_admin' || role === 'electoral_admin' || role === 'isec_admin';
    } else {
      isAllowed = true;
    }
  }

  if (!isAllowed) {
    return {
      success: false,
      error: `Access Denied: Your account holds the '${adminRecord.scope || adminRecord.role}' scope and is not authorized to access the ${targetPlatform} administration console.`
    };
  }

  // 4. Verify password against stored hash in database
  let isPasswordValid = false;
  if (adminRecord.password_hash) {
    isPasswordValid = verifyPasswordServer(password, adminRecord.password_hash);
  }

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Invalid password. Please verify your administrative credentials.'
    };
  }

  // 5. Update last_login_at in database
  const nowIso = new Date().toISOString();
  await supabase
    .from('admin_scopes')
    .update({ last_login_at: nowIso, updated_at: nowIso })
    .eq('id', adminRecord.id);

  // 6. Sign 1-hour session token
  const { token, expiresAt, payload } = signAdminToken(adminRecord, ONE_HOUR_MS);

  const sessionData = {
    token,
    user_id: adminRecord.user_id || adminRecord.id,
    id: adminRecord.id,
    email: adminRecord.email,
    full_name: adminRecord.full_name,
    scope: adminRecord.scope,
    role: adminRecord.role,
    assigned_level: adminRecord.assigned_level || 'all',
    permissions: adminRecord.permissions || [],
    is_super_admin: isSuperAdmin,
    logged_in_at: nowIso,
    expires_at: expiresAt
  };

  return {
    success: true,
    session: sessionData,
    admin: sessionData,
    token
  };
}

/**
 * Validates an active admin token against the database ground truth.
 * Immediately rejects if the session has exceeded 1 hour or if the account
 * was suspended/deleted in the database.
 */
export async function handleVerifyAdminSession({ token }) {
  const verified = verifyAdminToken(token);
  if (!verified) {
    return {
      valid: false,
      error: 'Session expired or invalid. Please sign in again.'
    };
  }

  // Query live status from database
  if (supabase) {
    const { data: dbAdmin, error } = await supabase
      .from('admin_scopes')
      .select('id, email, full_name, scope, role, permissions, is_active, assigned_level')
      .eq('id', verified.sub)
      .maybeSingle();

    if (error || !dbAdmin) {
      return { valid: false, error: 'Administrator account no longer exists in database.' };
    }

    if (dbAdmin.is_active === false) {
      return { valid: false, error: 'Account has been suspended by the Super Administrator.' };
    }

    return {
      valid: true,
      admin: {
        ...verified,
        full_name: dbAdmin.full_name,
        role: dbAdmin.role,
        scope: dbAdmin.scope,
        assigned_level: dbAdmin.assigned_level || 'all',
        permissions: dbAdmin.permissions || []
      }
    };
  }

  return { valid: true, admin: verified };
}

// =============================================================================
// 3. ADMIN PASSWORD RESET VIA TRANSACTIONAL EMAIL
// =============================================================================

/**
 * Initiates an administrative password reset.
 * Sends a 6-digit verification code to the admin's official email via Resend.
 */
export async function handleAdminForgotPassword({ email, ipAddress = null }) {
  if (!email || !email.trim()) {
    return { success: false, error: 'Please enter your administrator email address.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!supabase) {
    return { success: false, error: 'Database service unavailable.' };
  }

  // 1. Verify admin exists in database
  const { data: adminRecord } = await supabase
    .from('admin_scopes')
    .select('id, email, full_name, role, is_active')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (!adminRecord) {
    // Return friendly error
    return {
      success: false,
      error: 'No administrator account found with that email address. Contact the Super Administrator.'
    };
  }

  if (adminRecord.is_active === false) {
    return {
      success: false,
      error: 'This administrator account is currently suspended. Please contact the Super Administrator.'
    };
  }

  // 2. Check rate limit in otp_verifications
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  try {
    const { count } = await supabase
      .from('otp_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('destination_full', cleanEmail)
      .gte('created_at', windowStart);

    if (count >= RATE_LIMIT_MAX_ATTEMPTS) {
      return {
        success: false,
        error: 'Too many reset requests. Please wait 15 minutes before retrying.',
        retryAfterSeconds: 900
      };
    }
  } catch (_) {}

  // 3. Generate secure 6-digit OTP
  const randomBytes = crypto.randomBytes(3);
  const otpCode = ((randomBytes.readUIntBE(0, 3) % 900000) + 100000).toString();
  const otpHash = hashOtpServer(otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // 4. Save to otp_verifications table
  await supabase.from('otp_verifications').insert([{
    registration_number: `ADMIN-${adminRecord.id}`,
    channel: 'email',
    destination: maskEmail(cleanEmail),
    destination_full: cleanEmail,
    otp_hash: otpHash,
    expires_at: expiresAt,
    attempts: 0,
    max_attempts: 5,
    is_used: false,
    ip_address: JSON.stringify({ purpose: 'ADMIN_PASSWORD_RESET', clientIp: ipAddress, adminId: adminRecord.id }),
    created_at: new Date().toISOString()
  }]);

  // 5. Dispatch transactional email via Resend
  const adminName = adminRecord.full_name || 'Administrator';
  const roleTitle = adminRecord.role || 'Admin Officer';

  await dispatchEmail({
    type: 'admin_password_reset',
    to: cleanEmail,
    code: otpCode,
    adminName,
    roleTitle,
    expiryMinutes: OTP_EXPIRY_MINUTES
  });

  return {
    success: true,
    maskedEmail: maskEmail(cleanEmail),
    expiresAt
  };
}

/**
 * Confirms OTP and sets a new password for the administrator in Supabase.
 */
export async function handleAdminResetPassword({ email, otp, newPassword }) {
  if (!email || !otp || !newPassword) {
    return { success: false, error: 'Email, verification code, and new password are required.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim();

  if (!supabase) {
    return { success: false, error: 'Database service unavailable.' };
  }

  // 1. Fetch active OTP record
  const otpHash = hashOtpServer(cleanOtp);
  const nowIso = new Date().toISOString();

  const { data: challenge } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('destination_full', cleanEmail)
    .eq('otp_hash', otpHash)
    .eq('is_used', false)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) {
    return { success: false, error: 'Invalid or expired verification code. Please request a new one.' };
  }

  // 2. Invalidate OTP
  await supabase
    .from('otp_verifications')
    .update({ is_used: true })
    .eq('id', challenge.id);

  // 3. Hash new password with PBKDF2
  const newHash = hashPasswordServer(newPassword);

  // 4. Update password in admin_scopes
  const { error: updateErr } = await supabase
    .from('admin_scopes')
    .update({
      password_hash: newHash,
      updated_at: new Date().toISOString()
    })
    .ilike('email', cleanEmail);

  if (updateErr) {
    console.error('[Admin Password Update Error]:', updateErr);
    return { success: false, error: 'Failed to update administrative password in database.' };
  }

  return {
    success: true,
    message: 'Your administrator password has been updated successfully. You can now sign in.'
  };
}

// =============================================================================
// 4. SUPER ADMIN USER MANAGEMENT (Add, List, Suspend, Reactivate, Delete)
// =============================================================================

/**
 * Ensures requesting user is an authorized Super Administrator.
 */
function requireSuperAdmin(token) {
  const verified = verifyAdminToken(token);
  if (!verified || !verified.is_super_admin) {
    return { authorized: false, error: 'Unauthorized: Super Administrator privileges required.' };
  }
  return { authorized: true, requester: verified };
}

/**
 * List all administrators from `admin_scopes`.
 */
export async function handleGetAdminUsers({ token }) {
  const authCheck = requireSuperAdmin(token);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  if (!supabase) {
    return { success: false, error: 'Database connection offline.' };
  }

  const { data, error } = await supabase
    .from('admin_scopes')
    .select('id, user_id, email, full_name, scope, role, permissions, is_active, assigned_level, last_login_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: `Failed to fetch administrators: ${error.message}` };
  }

  return { success: true, admins: data || [] };
}

/**
 * Creates a new administrator in `admin_scopes` and dispatches official welcome email via Resend.
 */
export async function handleCreateAdminUser({
  token,
  email,
  fullName,
  role = 'website_admin',
  scope = 'main_website',
  assignedLevel = 'all',
  permissions = [],
  originUrl = 'https://admin.nacosfuto.com.ng'
}) {
  const authCheck = requireSuperAdmin(token);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  if (!email || !fullName) {
    return { success: false, error: 'Full name and email address are required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanLevel = String(assignedLevel || 'all').toLowerCase().replace(' level', '');

  if (!supabase) {
    return { success: false, error: 'Database offline.' };
  }

  // 1. Check if email already exists
  const { data: existing } = await supabase
    .from('admin_scopes')
    .select('id, email')
    .ilike('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    return { success: false, error: `An administrator account with email ${cleanEmail} already exists.` };
  }

  // 2. Generate secure temporary password hash (or blank hash so they set password via email)
  const initialRandomSecret = crypto.randomBytes(16).toString('hex');
  const initialPasswordHash = hashPasswordServer(initialRandomSecret);
  const adminId = `admin-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const nowIso = new Date().toISOString();

  const newAdminRow = {
    id: adminId,
    user_id: null,
    email: cleanEmail,
    full_name: cleanName,
    password_hash: initialPasswordHash,
    scope: scope || (role === 'super_admin' ? 'super_admin' : 'main_website'),
    role: role || 'website_admin',
    assigned_level: cleanLevel,
    permissions: Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : ['main_website.view', 'student_portal.students'],
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso
  };

  // 3. Persist to Supabase admin_scopes
  const { error: insertErr } = await supabase
    .from('admin_scopes')
    .insert([newAdminRow]);

  if (insertErr) {
    console.error('[Admin Creation DB Error]:', insertErr);
    return { success: false, error: `Database insertion failed: ${insertErr.message}` };
  }

  // 4. Resolve official login destination URL based on scope
  let loginUrl = originUrl;
  if (scope === 'student_portal' || role === 'portal_admin' || role === 'course_adviser') {
    loginUrl = 'https://portal-admin.nacosfuto.com.ng';
  } else if (scope === 'electoral_admin' || role === 'electoral_admin') {
    loginUrl = 'https://electra-admin.nacosfuto.com.ng';
  } else if (scope === 'main_website' || role === 'website_admin') {
    loginUrl = 'https://admin.nacosfuto.com.ng';
  }

  // 5. Dispatch official invitation / assignment email via Resend
  let emailDispatched = false;
  try {
    const emailResult = await dispatchEmail({
      type: 'admin_assignment',
      to: cleanEmail,
      admin: {
        fullName: cleanName,
        email: cleanEmail,
        scope: newAdminRow.scope,
        role: newAdminRow.role,
        assignedLevel: cleanLevel,
        portalAdminUrl: loginUrl,
        assignedAt: nowIso
      }
    });
    emailDispatched = emailResult.success;
  } catch (emailErr) {
    console.warn('[Admin Welcome Email Warning]:', emailErr.message);
  }

  return {
    success: true,
    admin: newAdminRow,
    emailDispatched,
    message: `Administrator ${cleanName} (${cleanEmail}) added successfully.${emailDispatched ? ' Welcome email sent!' : ' (Email pending delivery)'}`
  };
}

/**
 * Suspends or Reactivates an administrator in the database.
 */
export async function handleUpdateAdminStatus({ token, adminId, isActive }) {
  const authCheck = requireSuperAdmin(token);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  if (!adminId) {
    return { success: false, error: 'Administrator ID is required.' };
  }

  if (!supabase) {
    return { success: false, error: 'Database service offline.' };
  }

  // Safeguard: Cannot suspend self
  if (authCheck.requester.sub === adminId || authCheck.requester.id === adminId) {
    return { success: false, error: 'Safeguard: You cannot suspend your own administrative account.' };
  }

  const { error } = await supabase
    .from('admin_scopes')
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString()
    })
    .eq('id', adminId);

  if (error) {
    return { success: false, error: `Failed to update admin status: ${error.message}` };
  }

  return {
    success: true,
    message: `Administrator status changed to ${isActive ? 'Active' : 'Suspended'}.`
  };
}

/**
 * Permanently deletes an administrator account from `admin_scopes`.
 * Strict Safeguards:
 * - Requester must be Super Administrator.
 * - Requester cannot delete their own account.
 * - Cannot delete the last active Super Administrator.
 * - Does NOT delete operational election records, ballots, or shared data.
 */
export async function handleDeleteAdminUser({ token, adminId }) {
  const authCheck = requireSuperAdmin(token);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  if (!adminId) {
    return { success: false, error: 'Target Administrator ID is required.' };
  }

  if (!supabase) {
    return { success: false, error: 'Database service offline.' };
  }

  // 1. Fetch target administrator
  const { data: targetAdmin, error: findErr } = await supabase
    .from('admin_scopes')
    .select('*')
    .eq('id', adminId)
    .maybeSingle();

  if (findErr || !targetAdmin) {
    return { success: false, error: 'Target administrator not found in database.' };
  }

  // 2. Safeguard: Cannot delete self
  if (authCheck.requester.sub === adminId || authCheck.requester.email === targetAdmin.email) {
    return {
      success: false,
      error: 'Security Safeguard: You cannot delete your own account while logged in.'
    };
  }

  // 3. Safeguard: Prevent deleting the last Super Administrator
  if (targetAdmin.scope === 'super_admin' || targetAdmin.role === 'super_admin') {
    const { count } = await supabase
      .from('admin_scopes')
      .select('*', { count: 'exact', head: true })
      .or('scope.eq.super_admin,role.eq.super_admin')
      .eq('is_active', true);

    if (count <= 1) {
      return {
        success: false,
        error: 'Critical Safeguard: Cannot delete the last active Super Administrator on the platform.'
      };
    }
  }

  // 4. Delete the administrator from admin_scopes
  const { error: deleteErr } = await supabase
    .from('admin_scopes')
    .delete()
    .eq('id', adminId);

  if (deleteErr) {
    return { success: false, error: `Failed to delete administrator: ${deleteErr.message}` };
  }

  return {
    success: true,
    message: `Administrator ${targetAdmin.full_name} (${targetAdmin.email}) has been permanently deleted.`
  };
}

/**
 * Resends the official assignment / invitation email to an administrator.
 */
export async function handleResendAdminInvite({ token, adminId, originUrl = 'https://admin.nacosfuto.com.ng' }) {
  const authCheck = requireSuperAdmin(token);
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  if (!adminId || !supabase) {
    return { success: false, error: 'Admin ID required.' };
  }

  const { data: admin } = await supabase
    .from('admin_scopes')
    .select('*')
    .eq('id', adminId)
    .maybeSingle();

  if (!admin) {
    return { success: false, error: 'Administrator not found.' };
  }

  let loginUrl = originUrl;
  if (admin.scope === 'student_portal' || admin.role === 'portal_admin' || admin.role === 'course_adviser') {
    loginUrl = 'https://portal-admin.nacosfuto.com.ng';
  } else if (admin.scope === 'electoral_admin' || admin.role === 'electoral_admin') {
    loginUrl = 'https://electra-admin.nacosfuto.com.ng';
  }

  const result = await dispatchEmail({
    type: 'admin_assignment',
    to: admin.email,
    admin: {
      fullName: admin.full_name,
      email: admin.email,
      scope: admin.scope,
      role: admin.role,
      assignedLevel: admin.assigned_level || 'all',
      portalAdminUrl: loginUrl,
      assignedAt: new Date().toISOString()
    }
  });

  if (!result.success) {
    return { success: false, error: result.error || 'Failed to dispatch email via Resend.' };
  }

  return { success: true, message: `Invitation email resent to ${admin.email}.` };
}
