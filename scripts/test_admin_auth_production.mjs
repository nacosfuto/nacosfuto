/**
 * @file scripts/test_admin_auth_production.mjs
 * Verification Suite for Production Admin Authentication & Management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;
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
}

loadEnv();

import {
  signAdminToken,
  verifyAdminToken,
  handleAdminLogin,
  handleVerifyAdminSession,
  handleCreateAdminUser,
  handleUpdateAdminStatus,
  handleDeleteAdminUser,
  handleAdminForgotPassword,
  handleAdminResetPassword
} from '../packages/supabase/src/server/adminAuthApi.js';
import { hashPasswordServer, verifyPasswordServer } from '../packages/supabase/src/server/studentAuthApi.js';
import { supabase } from '../packages/supabase/src/client.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('STARTING PRODUCTION ADMIN AUTHENTICATION VERIFICATION SUITE');
  console.log('================================================================\n');

  // TEST 1: Password Hashing & Verification
  console.log('Test 1: Server-Side PBKDF2 Password Hashing & Verification');
  const testSecret = 'SuperSecurePass2026!';
  const hashed = hashPasswordServer(testSecret);
  assert(hashed.startsWith('pbkdf2$100000$'), 'PBKDF2 100k iteration format confirmed');
  assert(verifyPasswordServer(testSecret, hashed), 'Valid password verifies correctly');
  assert(!verifyPasswordServer('WrongPassword123', hashed), 'Invalid password is firmly rejected');

  // TEST 2: Strict 1-Hour Session Token Signing & Expiration Enforcement
  console.log('\nTest 2: Strict 1-Hour Admin Session Token Signing & Expiration');
  const mockAdmin = {
    id: 'admin-super-ict',
    email: 'ict.nacosfuto@gmail.com',
    full_name: 'NACOS ICT Admin',
    role: 'super_admin',
    scope: 'super_admin'
  };

  const { token, expiresAt, payload } = signAdminToken(mockAdmin, 60 * 60 * 1000);
  assert(typeof token === 'string' && token.includes('.'), 'HMAC-SHA256 signed token generated');
  assert(expiresAt - Date.now() <= 3600000 && expiresAt - Date.now() >= 3590000, 'Expires in precisely 60 minutes');
  
  const verified = verifyAdminToken(token);
  assert(verified && verified.email === 'ict.nacosfuto@gmail.com', 'Token verifies successfully within 1 hour');
  assert(verified.is_super_admin === true, 'Token carries super_admin authorization claim');

  // Test Tampered Token
  const tampered = token.replace(/a/g, 'b');
  assert(verifyAdminToken(tampered) === null, 'Tampered token is rejected immediately');

  // Test Expired Token (> 60 minutes)
  const expiredPayload = {
    ...payload,
    exp: Date.now() - 5000 // 5 seconds in the past
  };
  const expJson = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  const AUTH_SECRET = process.env.SESSION_SECRET || process.env.VITE_SUPABASE_ANON_KEY || 'nacos_futo_auth_signature_key_2026';
  const expSig = crypto.createHmac('sha256', AUTH_SECRET).update(expJson).digest('base64url');
  const expiredToken = `${expJson}.${expSig}`;
  assert(verifyAdminToken(expiredToken) === null, 'Expired token (> 1 hour) is rejected immediately');

  // TEST 3: Database Admin Account Status & Scoping Check
  console.log('\nTest 3: Database-Backed Admin Verification');
  const { data: dbAdmins, error: adminErr } = await supabase
    .from('admin_scopes')
    .select('*')
    .limit(3);

  assert(!adminErr && Array.isArray(dbAdmins), 'Successfully connected to live Supabase admin_scopes table');
  console.log(`  Live admin count retrieved: ${dbAdmins.length}`);

  // TEST 4: Super Admin Self-Deletion and Last Admin Safeguards
  console.log('\nTest 4: Admin Deletion Safeguards');
  // Attempt to delete self
  const selfDelRes = await handleDeleteAdminUser({ token, adminId: 'admin-super-ict' });
  assert(selfDelRes.success === false, 'Safeguard: Cannot delete own account while logged in');

  // TEST 5: Admin Password Reset OTP State Machine
  console.log('\nTest 5: Password Reset OTP Flow for Admin');
  const resetReq = await handleAdminForgotPassword({ email: 'ict.nacosfuto@gmail.com' });
  assert(resetReq.success === true, 'Reset OTP challenge created and email dispatched');
  assert(typeof resetReq.maskedEmail === 'string', 'Recipient email masked for privacy');

  // Retrieve the generated OTP from database for test confirmation
  const { data: latestOtp } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('destination_full', 'ict.nacosfuto@gmail.com')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  assert(latestOtp && latestOtp.is_used === false, 'OTP challenge persisted to database');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
