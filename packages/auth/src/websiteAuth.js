import { supabase } from '@nacos/database';
import { hashPassword, isLocalEnvironment } from './utils.js';
import { ADMIN_SCOPES, hasPermission } from './permissions.js';

const WEBSITE_ADMIN_SESSION_KEY = 'nacos_website_admin_session';
const ADMIN_SCOPES_STORAGE_KEY = 'nacos_admin_scopes_db';
const AUDIT_LOGS_STORAGE_KEY = 'nacos_admin_audit_logs_db';

export function getLocalWebsiteAdmins() {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ADMIN_SCOPES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  const defaultAdmins = [
    {
      id: 'admin-super-ict',
      user_id: 'usr-superadmin-ict',
      email: 'ict.nacosfuto@gmail.com',
      full_name: 'NACOS FUTO ICT / Super Administrator',
      scope: ADMIN_SCOPES.SUPER_ADMIN,
      role: 'super_admin',
      permissions: ['*'],
      is_active: true,
      password_hash: null,
      created_at: '2026-10-07T12:00:00Z'
    }
  ];

  localStorage.setItem(ADMIN_SCOPES_STORAGE_KEY, JSON.stringify(defaultAdmins));
  return defaultAdmins;
}

export async function loginWebsiteAdmin(email, password) {
  if (!email || !password) {
    return { error: 'Please provide both email address and administrative password.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  let adminRecord = null;

  // Supabase Auth verification
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });
    if (!error && data?.user) {
      const { data: scopeData } = await supabase
        .from('admin_scopes')
        .select('*')
        .or(`user_id.eq.${data.user.id},email.eq.${cleanEmail}`)
        .in('scope', [ADMIN_SCOPES.MAIN_WEBSITE, ADMIN_SCOPES.SUPER_ADMIN])
        .eq('is_active', true)
        .maybeSingle();

      if (scopeData) adminRecord = scopeData;
    }
  } catch (e) {
    // Supabase Auth offline or not configured for this user
  }

  // 2. Direct Supabase admin_scopes database lookup (for seeded or SQL-added live admins)
  if (!adminRecord && supabase) {
    try {
      const { data: dbAdmin } = await supabase
        .from('admin_scopes')
        .select('*')
        .eq('email', cleanEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (dbAdmin && dbAdmin.password_hash) {
        const isValidPassword = dbAdmin.password_hash === passwordHash;
        const isAllowedScope = dbAdmin.scope === ADMIN_SCOPES.MAIN_WEBSITE || dbAdmin.scope === ADMIN_SCOPES.SUPER_ADMIN;

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
    } catch (dbErr) {
      console.warn('Supabase admin_scopes query error:', dbErr);
    }
  }

  // 3. Local seeded storage fallback (ONLY on localhost / dev)
  if (!adminRecord) {
    if (!isLocalEnvironment()) {
      return { 
        error: 'Invalid administrative credentials. Access restricted to authorized NACOS website administrators.' 
      };
    }

    const admins = getLocalWebsiteAdmins();
    const candidate = admins.find(a => a.email.toLowerCase() === cleanEmail);

    if (!candidate) {
      return { 
        error: 'Invalid administrative credentials. Access restricted to authorized NACOS website administrators.' 
      };
    }

    const isDefaultPass = isLocalEnvironment() && password === 'password';
    if (candidate.password_hash !== passwordHash && !isDefaultPass) {
      return { error: 'Invalid password. Please check your credentials.' };
    }

    if (candidate.scope !== ADMIN_SCOPES.MAIN_WEBSITE && candidate.scope !== ADMIN_SCOPES.SUPER_ADMIN) {
      return { 
        error: `Access Denied: Your account holds the '${candidate.scope}' scope and is not authorized to access the Main Website Administration area.` 
      };
    }

    if (!candidate.is_active) {
      return { error: 'Account Disabled: Your administrative access has been revoked or deactivated. Contact the Super Admin.' };
    }

    adminRecord = candidate;
  }

  const adminSession = {
    user_id: adminRecord.user_id || adminRecord.id,
    id: adminRecord.id,
    email: adminRecord.email,
    full_name: adminRecord.full_name,
    scope: adminRecord.scope,
    role: adminRecord.role,
    permissions: adminRecord.permissions || ['main_website.view'],
    is_super_admin: adminRecord.scope === ADMIN_SCOPES.SUPER_ADMIN || adminRecord.role === 'super_admin',
    logged_in_at: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(WEBSITE_ADMIN_SESSION_KEY, JSON.stringify(adminSession));
  }

  return { success: true, admin: adminSession };
}

export function getWebsiteAdminSession() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(WEBSITE_ADMIN_SESSION_KEY);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored);
    if (session && (session.scope === ADMIN_SCOPES.MAIN_WEBSITE || session.scope === ADMIN_SCOPES.SUPER_ADMIN)) {
      return session;
    }
  } catch (e) {
    console.error('Failed to parse website admin session', e);
  }

  return null;
}

export async function logoutWebsiteAdmin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(WEBSITE_ADMIN_SESSION_KEY);
  }
  try {
    await supabase.auth.signOut();
  } catch (e) {}
  return { success: true };
}
