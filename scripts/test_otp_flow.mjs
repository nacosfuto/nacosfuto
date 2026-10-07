import '../packages/supabase/src/server/loadEnv.js';
import { 
  handleSignupStep1, 
  handleSignupStep2, 
  handleSendOtp, 
  handleVerifyOtp,
  hashOtpServer 
} from '../packages/supabase/src/server/studentAuthApi.js';
import { supabase } from '../packages/supabase/src/client.js';

function recoverCodeFromHash(targetHash) {
  for (let i = 100000; i <= 999999; i++) {
    const code = i.toString();
    if (hashOtpServer(code) === targetHash) {
      return code;
    }
  }
  return null;
}

async function runTests() {
  console.log('--- TEST 1: Standard Step 1 & Step 2 ---');
  const regNumber = '20241429481';
  const s1 = await handleSignupStep1({ registrationNumber: regNumber });
  console.log('Step 1:', s1.success ? 'PASS' : 'FAIL', s1.message || s1.error);

  const s2 = await handleSignupStep2({
    step1Token: s1.step1Token,
    firstName: 'Nestor',
    lastName: 'Osuagwu'
  });
  console.log('Step 2:', s2.success ? 'PASS' : 'FAIL', s2.channels?.map(c => c.label).join(', '));

  console.log('\n--- TEST 2: Send OTP Code 1 ---');
  const send1 = await handleSendOtp({
    stepToken: s2.step2Token,
    channel: 'email',
    purpose: 'SIGNUP'
  });
  console.log('Send 1 result:', send1.success ? 'PASS' : 'FAIL');

  const { data: rec1List } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('registration_number', regNumber)
    .eq('is_used', false)
    .order('created_at', { ascending: false });

  const code1 = recoverCodeFromHash(rec1List[0].otp_hash);
  console.log('Recovered Code 1:', code1, '(Record ID:', rec1List[0].id, ')');

  console.log('\n--- TEST 3: Resend OTP Code 2 (Simulate user clicking resend before typing code 1) ---');
  const send2 = await handleSendOtp({
    stepToken: s2.step2Token,
    channel: 'email',
    purpose: 'SIGNUP'
  });
  console.log('Send 2 result:', send2.success ? 'PASS' : 'FAIL');

  const { data: rec2List } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('registration_number', regNumber)
    .eq('is_used', false)
    .order('created_at', { ascending: false });

  console.log(`Active unexpired codes in DB: ${rec2List.length} (Both Code 1 and Code 2 should be active!)`);
  const code2 = recoverCodeFromHash(rec2List[0].otp_hash);
  console.log('Recovered Code 2:', code2, '(Record ID:', rec2List[0].id, ')');

  console.log('\n--- TEST 4: Verify with wrong code first (e.g. 000000) ---');
  const wrongVerify = await handleVerifyOtp({
    stepToken: s2.step2Token,
    otpCode: '000000',
    purpose: 'SIGNUP'
  });
  console.log('Wrong code verify result:', wrongVerify.success === false ? 'PASS' : 'FAIL', 'Error:', wrongVerify.error);

  console.log('\n--- TEST 5: Verify with Code 1 (with whitespace formatting " ' + code1 + ' ") ---');
  const verifyCode1 = await handleVerifyOtp({
    stepToken: s2.step2Token,
    otpCode: `  ${code1}  `,
    purpose: 'SIGNUP'
  });
  console.log('Verify Code 1 result:', verifyCode1.success ? 'PASS' : 'FAIL', 'Auth token issued:', !!verifyCode1.authorizationToken);

  console.log('\n--- TEST 6: Check DB to ensure Code 1 was consumed and Code 2 was deactivated ---');
  const { data: remainingActive } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('registration_number', regNumber)
    .eq('is_used', false);
  console.log('Remaining active codes for student:', remainingActive.length, '(Expected: 0)');

  console.log('\n--- TEST 7: Attempt to reuse Code 1 (should state already used) ---');
  const reuseAttempt = await handleVerifyOtp({
    stepToken: s2.step2Token,
    otpCode: code1,
    purpose: 'SIGNUP'
  });
  console.log('Reuse result:', reuseAttempt.success === false ? 'PASS' : 'FAIL', 'Error:', reuseAttempt.error);

  console.log('\nAll OTP resilience tests executed successfully!');
}

runTests().catch(console.error);
