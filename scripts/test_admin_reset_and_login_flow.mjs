/**
 * @file scripts/test_admin_reset_and_login_flow.mjs
 * End-to-End Verification: Admin Password Reset, Database Authentication, and Suspension Revocation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  handleAdminLogin,
  handleVerifyAdminSession,
  handleAdminForgotPassword,
  handleAdminResetPassword,
  handleUpdateAdminStatus
} from '../packages/supabase/src/server/adminAuthApi.js';
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

async function runFlow() {
  console.log('================================================================');
  console.log('END-TO-END FLOW: ADMIN RESET PASSWORD, LOGIN & SUSPENSION');
  console.log('================================================================\n');

  const testEmail = 'ict.nacosfuto@gmail.com';
  const newPassword = 'NacosProductionPassword2026!';

  // Step 1: Request Password Reset OTP
  console.log('Step 1: Request Admin Password Reset OTP');
  const forgotRes = await handleAdminForgotPassword({ email: testEmail });
  assert(forgotRes.success === true, 'Password reset OTP requested');

  // Fetch the latest OTP generated for test verification
  const { data: latestChallenge } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('destination_full', testEmail)
    .eq('is_used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  assert(latestChallenge !== null, 'Found unconsumed OTP challenge in database');

  // To simulate user entering the 6-digit OTP code received in email,
  // we compute a matching OTP code by matching against the hash or create a direct test challenge
  // For test precision, we update challenge with known OTP hash:
  const testOtp = '742918';
  const crypto = await import('crypto');
  const testOtpHash = crypto.createHash('sha256').update(testOtp + 'nacos_otp_salt_2026').digest('hex');
  await supabase
    .from('otp_verifications')
    .update({ otp_hash: testOtpHash })
    .eq('id', latestChallenge.id);

  // Step 2: Confirm and Complete Password Reset
  console.log('\nStep 2: Confirm OTP & Establish New Administrative Password');
  const resetRes = await handleAdminResetPassword({
    email: testEmail,
    otp: testOtp,
    newPassword: newPassword
  });
  assert(resetRes.success === true, 'Admin password reset confirmed and updated in database');

  // Step 3: Login Verification with Real Credentials
  console.log('\nStep 3: Database Authentication with Newly Set Password');
  // Attempt with wrong password
  const wrongLogin = await handleAdminLogin({ email: testEmail, password: 'WrongPassword' });
  assert(wrongLogin.success === false, 'Invalid credentials rejected by database check');

  // Attempt with correct password
  const correctLogin = await handleAdminLogin({ email: testEmail, password: newPassword });
  assert(correctLogin.success === true, 'Admin login succeeded with real database credentials');
  assert(correctLogin.session && correctLogin.session.token, '1-hour signed session token returned');
  assert(correctLogin.session.expires_at > Date.now(), 'Token has future expiration time');

  const adminToken = correctLogin.token;

  // Step 4: Live Session Verification
  console.log('\nStep 4: Live Session Verification');
  const verifyRes = await handleVerifyAdminSession({ token: adminToken });
  assert(verifyRes.valid === true, 'Session token verified against live database record');

  // Step 5: Suspension Enforcement
  console.log('\nStep 5: Admin Suspension & Immediate Revocation');
  // Temporarily suspend admin in database
  await supabase
    .from('admin_scopes')
    .update({ is_active: false })
    .eq('email', testEmail);

  // Re-verify session: Must fail immediately!
  const suspendedSessionCheck = await handleVerifyAdminSession({ token: adminToken });
  assert(suspendedSessionCheck.valid === false, 'Suspended admin session immediately rejected');

  // Attempt login while suspended: Must fail!
  const suspendedLogin = await handleAdminLogin({ email: testEmail, password: newPassword });
  assert(suspendedLogin.success === false && suspendedLogin.error.includes('Suspended'), 'Suspended admin login blocked');

  // Step 6: Reactivation
  console.log('\nStep 6: Admin Reactivation');
  await supabase
    .from('admin_scopes')
    .update({ is_active: true })
    .eq('email', testEmail);

  const restoredLogin = await handleAdminLogin({ email: testEmail, password: newPassword });
  assert(restoredLogin.success === true, 'Reactivated admin login restored');

  console.log('\n================================================================');
  console.log(`FLOW SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runFlow().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
