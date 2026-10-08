import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
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

import { validateRegistrationNumberFormat, parseAdmissionYear, CURRENT_ACADEMIC_YEAR_START } from '../packages/config/academic.js';
import { validateRegistrationNumber, sanitizeRegNumber } from '../packages/validation/src/studentValidation.js';
import { validateAndNormalizeStudentRow, normalizeLevel } from '../packages/supabase/src/studentCsvEngine.js';
import { handleSignupStep1, handleForgotPasswordStep1 } from '../packages/supabase/src/server/studentAuthApi.js';
import { lookupVerifiedStudentRecord } from '../packages/supabase/src/verifiedStudents.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('===================================================================');
  console.log(' REGISTRATION NUMBER PATTERN RESTRICTION REMOVAL VERIFICATION');
  console.log('===================================================================\n');

  // TEST SUITE 1: validateRegistrationNumberFormat (packages/config/academic.js)
  console.log('[SUITE 1] validateRegistrationNumberFormat in @nacos/config/academic:');
  
  // 1.1 Diverse legitimate formats must be accepted
  assert(validateRegistrationNumberFormat('20241429481').valid === true, 'Standard 11-digit reg accepted');
  assert(validateRegistrationNumberFormat('20171012345').valid === true, 'Older student 2017 reg accepted');
  assert(validateRegistrationNumberFormat('2020/12345').valid === true, 'Slash-separated format accepted');
  assert(validateRegistrationNumberFormat('CSC/2022/9876').valid === true, 'Alphanumeric format accepted');
  assert(validateRegistrationNumberFormat('202112345').valid === true, '9-digit registration number accepted');
  assert(validateRegistrationNumberFormat('2026169999912').valid === true, '13-digit registration number accepted');
  assert(validateRegistrationNumberFormat(' 20241429481 ').valid === true, 'Whitespace-padded number accepted');
  assert(validateRegistrationNumberFormat('20211012345').valid === true, '2021 year with legacy code 10 accepted (no FUTO_YEAR_CODES rejection)');
  
  // 1.2 Empty or missing must be rejected cleanly
  assert(validateRegistrationNumberFormat('').valid === false, 'Empty string rejected');
  assert(validateRegistrationNumberFormat('   ').valid === false, 'Whitespace-only string rejected');
  assert(validateRegistrationNumberFormat(null).valid === false, 'Null rejected');
  assert(validateRegistrationNumberFormat(undefined).valid === false, 'Undefined rejected');

  // TEST SUITE 2: studentValidation.js (packages/validation)
  console.log('\n[SUITE 2] studentValidation.js in @nacos/validation:');
  
  assert(sanitizeRegNumber('  2024/12345  ') === '2024/12345', 'sanitizeRegNumber normalizes whitespace and casing without stripping slashes');
  assert(validateRegistrationNumber('20241429481').isValid === true, 'validateRegistrationNumber accepts standard number');
  assert(validateRegistrationNumber('2018/1234').isValid === true, 'validateRegistrationNumber accepts older / short number');
  assert(validateRegistrationNumber('CSC-2023-456').isValid === true, 'validateRegistrationNumber accepts hyphenated number');
  assert(validateRegistrationNumber('').isValid === false, 'validateRegistrationNumber rejects empty');
  assert(validateRegistrationNumber('   ').isValid === false, 'validateRegistrationNumber rejects spaces');

  // TEST SUITE 3: CSV Engine (packages/supabase/src/studentCsvEngine.js)
  console.log('\n[SUITE 3] CSV Importer Validation:');
  
  const testMappings = {
    registration_number: 'reg_no',
    first_name: 'first_name',
    last_name: 'last_name',
    level: 'level'
  };

  const seenInBatch = {
    regNos: new Map(),
    emails: new Map()
  };

  // Row with non-standard reg number (e.g. older student, or with slashes)
  const rowNonStandard = {
    reg_no: 'CSC/2019/1234',
    first_name: 'Emeka',
    last_name: 'Okonkwo',
    level: '400 Level'
  };
  const existingRosterMap = {
    regNos: new Map(),
    emails: new Map()
  };
  const parsedRow = validateAndNormalizeStudentRow(rowNonStandard, testMappings, 1, existingRosterMap, seenInBatch);
  assert(parsedRow.isValid === true, 'CSV row with non-standard reg number CSC/2019/1234 is valid');
  assert(parsedRow.record.registration_number === 'CSC/2019/1234', 'Record preserves registration identifier');
  assert(parsedRow.record.level === '400 Level', 'Level preserved');
  assert(parsedRow.record.admission_year === (CURRENT_ACADEMIC_YEAR_START - 4 + 1), 'Admission year derived from academic level when explicit field absent');

  // Row with empty reg number must be flagged as error
  const rowEmpty = {
    reg_no: '',
    first_name: 'Jane',
    last_name: 'Doe',
    level: '100 Level'
  };
  const parsedEmpty = validateAndNormalizeStudentRow(rowEmpty, testMappings, 2, existingRosterMap, seenInBatch);
  assert(parsedEmpty.isValid === false, 'CSV row with empty reg number is rejected');

  // TEST SUITE 4: Database Authoritative Verification
  console.log('\n[SUITE 4] Authoritative Database Verification (Non-existent vs Existing):');

  // Looking up a non-existent student must reject based on database record, NOT format
  const nonExistentResult = await lookupVerifiedStudentRecord('NONEXISTENT_STUDENT_9999');
  assert(nonExistentResult.found === false, 'Non-existent student is not found');
  assert(
    nonExistentResult.error.message.includes('could not find') || nonExistentResult.error.message.includes('Unable to verify'),
    `Non-existent student produces clear database-not-found message (received: "${nonExistentResult.error.message}")`
  );

  const nonExistentSignup = await handleSignupStep1({ registrationNumber: '20241499999' }); // Valid format, but does not exist
  assert(nonExistentSignup.success === false, 'Valid format but non-existent student rejected at signup');
  assert(
    nonExistentSignup.error.includes('not found in departmental records'),
    `Signup error correctly points to missing record: "${nonExistentSignup.error}"`
  );

  const nonExistentForgot = await handleForgotPasswordStep1({ registrationNumber: '20241499999' });
  assert(nonExistentForgot.success === false, 'Non-existent student rejected at forgot password');
  assert(
    nonExistentForgot.error.includes('could not find a student record'),
    `Forgot password error states record not found: "${nonExistentForgot.error}"`
  );

  console.log('\n===================================================================');
  console.log(` RESULTS: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('===================================================================');
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL REGISTRATION NUMBER FORMAT RESTRICTIONS SUCCESSFULLY REMOVED!\n');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED!\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
