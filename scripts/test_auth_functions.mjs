import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, '../.env');
const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

// Polyfill localStorage and window for Node environment testing
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { hostname: 'localhost' },
    dispatchEvent: () => {}
  };
}

import { signInStudent, hashPassword } from '../packages/supabase/src/auth.js';
import { loginWebsiteAdmin } from '../packages/supabase/src/adminAuth.js';
import { loginPortalAdmin } from '../packages/auth/src/portalAuth.js';

async function testLogins() {
  console.log('==============================================');
  console.log(' TESTING LIVE AUTHENTICATION FUNCTIONS');
  console.log('==============================================');

  // Test 1: Website Admin Login with webadmin@nacos.org.ng
  console.log('\n[TEST 1] Testing loginWebsiteAdmin with webadmin@nacos.org.ng / "password"...');
  try {
    const res = await loginWebsiteAdmin('webadmin@nacos.org.ng', 'password');
    if (res?.error) {
      console.log('❌ Website Admin Login Failed:', res.error);
    } else {
      console.log('✅ Website Admin Login Successful! User:', res.email, 'Role:', res.role, 'Scope:', res.scope);
    }
  } catch (e) {
    console.log('❌ Exception in loginWebsiteAdmin:', e.message);
  }

  // Test 2: Website Admin Login with superadmin@nacos.org.ng
  console.log('\n[TEST 2] Testing loginWebsiteAdmin with superadmin@nacos.org.ng / "password"...');
  try {
    const res = await loginWebsiteAdmin('superadmin@nacos.org.ng', 'password');
    if (res?.error) {
      console.log('❌ Super Admin Website Login Failed:', res.error);
    } else {
      console.log('✅ Super Admin Website Login Successful! User:', res.email, 'Role:', res.role);
    }
  } catch (e) {
    console.log('❌ Exception in loginWebsiteAdmin:', e.message);
  }

  // Test 3: Portal Admin Login with portaladmin@nacos.org.ng
  console.log('\n[TEST 3] Testing loginPortalAdmin with portaladmin@nacos.org.ng / "password"...');
  try {
    const res = await loginPortalAdmin('portaladmin@nacos.org.ng', 'password');
    if (res?.error) {
      console.log('❌ Portal Admin Login Failed:', res.error);
    } else {
      console.log('✅ Portal Admin Login Successful! User:', res.email, 'Role:', res.role, 'Scope:', res.scope);
    }
  } catch (e) {
    console.log('❌ Exception in loginPortalAdmin:', e.message);
  }

  // Test 4: Portal Admin Login with superadmin@nacos.org.ng
  console.log('\n[TEST 4] Testing loginPortalAdmin with superadmin@nacos.org.ng / "password"...');
  try {
    const res = await loginPortalAdmin('superadmin@nacos.org.ng', 'password');
    if (res?.error) {
      console.log('❌ Super Admin Portal Login Failed:', res.error);
    } else {
      console.log('✅ Super Admin Portal Login Successful! User:', res.email, 'Role:', res.role);
    }
  } catch (e) {
    console.log('❌ Exception in loginPortalAdmin:', e.message);
  }

  // Test 5: Student Login with 20241450682
  console.log('\n[TEST 5] Testing signInStudent with 20241450682 / "password"...');
  try {
    const res = await signInStudent('20241450682', 'password');
    if (res?.error) {
      console.log('❌ Student Login (20241450682, "password") Failed:', res.error.message);
    } else {
      console.log('✅ Student Login Successful! Reg:', res.data.user.registration_number, 'Name:', res.data.user.full_name || res.data.user.first_name);
    }
  } catch (e) {
    console.log('❌ Exception in signInStudent:', e.message);
  }

  // Test 6: Student Login with neorxpro@gmail.com
  console.log('\n[TEST 6] Testing signInStudent with neorxpro@gmail.com / "password"...');
  try {
    const res = await signInStudent('neorxpro@gmail.com', 'password');
    if (res?.error) {
      console.log('❌ Student Login (neorxpro@gmail.com, "password") Failed:', res.error.message);
    } else {
      console.log('✅ Student Login Successful! Reg:', res.data.user.registration_number, 'Name:', res.data.user.full_name || res.data.user.first_name);
    }
  } catch (e) {
    console.log('❌ Exception in signInStudent:', e.message);
  }

  console.log('\n==============================================');
  console.log(' AUTHENTICATION TEST COMPLETE');
  console.log('==============================================');
}

testLogins();
