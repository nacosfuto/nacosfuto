/**
 * Comprehensive Verification Suite:
 * Student Level Progression & Dynamic Academic Session Synchronization
 */

import assert from 'assert';
import {
  DEFAULT_ACADEMIC_YEAR_START,
  getAcademicSession,
  parseSessionYears,
  getActiveAcademicSession,
  getActiveAcademicYearStart,
  setActiveAcademicSession,
  calculateAcademicProgression,
  getStudentApplicableLevelSessions,
  onAcademicSessionChange
} from '../packages/config/academic.js';

import {
  enrichStudentProfile
} from '../packages/supabase/src/auth.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log('\n--- 1. Testing Academic Session Switching & Subscription ---');

test('Session switching broadcasts correctly and updates in-memory state', () => {
  let broadcastDetail = null;
  const unsub = onAcademicSessionChange((detail) => {
    broadcastDetail = detail;
  });

  setActiveAcademicSession(2026);
  assert.strictEqual(getActiveAcademicYearStart(), 2026);
  assert.strictEqual(getActiveAcademicSession(), '2026/2027');

  setActiveAcademicSession('2027/2028');
  assert.strictEqual(getActiveAcademicYearStart(), 2027);
  assert.strictEqual(getActiveAcademicSession(), '2027/2028');
  assert.strictEqual(broadcastDetail?.sessionName, '2027/2028');
  assert.strictEqual(broadcastDetail?.startYear, 2027);

  unsub();
});

console.log('\n--- 2. Testing Dynamic Student Level Calculation across Sessions ---');

test('Student entering in 2026 is 100L in 2026/2027 session', () => {
  setActiveAcademicSession(2026);
  const student = {
    registration_number: '20261111111',
    full_name: 'Test Freshman',
    admission_year: 2026
  };
  const prog = calculateAcademicProgression(student);
  assert.strictEqual(prog.valid, true);
  assert.strictEqual(prog.numericLevel, 1);
  assert.strictEqual(prog.levelString, '100 Level');
  assert.strictEqual(prog.isGraduated, false);
});

test('Same student entering in 2026 progresses to 200L when session is changed to 2027/2028', () => {
  setActiveAcademicSession(2027);
  const student = {
    registration_number: '20261111111',
    full_name: 'Test Freshman',
    admission_year: 2026
  };
  const prog = calculateAcademicProgression(student);
  assert.strictEqual(prog.valid, true);
  assert.strictEqual(prog.numericLevel, 2);
  assert.strictEqual(prog.levelString, '200 Level');
  assert.strictEqual(prog.isGraduated, false);
});

test('Same student entering in 2026 progresses to 300L when session is changed to 2028/2029', () => {
  setActiveAcademicSession(2028);
  const student = {
    registration_number: '20261111111',
    full_name: 'Test Freshman',
    admission_year: 2026
  };
  const prog = calculateAcademicProgression(student);
  assert.strictEqual(prog.valid, true);
  assert.strictEqual(prog.numericLevel, 3);
  assert.strictEqual(prog.levelString, '300 Level');
  assert.strictEqual(prog.isGraduated, false);
});

test('Student entering in 2024 is 200L in 2025/2026 (never hardcoded to 300L)', () => {
  setActiveAcademicSession(2025);
  const student = {
    registration_number: '20241429481',
    full_name: 'Student 2024'
  };
  const prog = calculateAcademicProgression(student);
  assert.strictEqual(prog.valid, true);
  assert.strictEqual(prog.numericLevel, 2);
  assert.strictEqual(prog.levelString, '200 Level', 'Must reflect 200 Level, not hardcoded 300L');
});

console.log('\n--- 3. Testing Applicable Level Sessions & Historical Retention ---');

test('getStudentApplicableLevelSessions preserves historical levels and identifies current', () => {
  // Student admitted in 2024, active session is 2026/2027 (300L)
  setActiveAcademicSession(2026);
  const student = {
    registration_number: '20241429481',
    admission_year: 2024
  };
  const obligations = getStudentApplicableLevelSessions(student);
  assert.strictEqual(obligations.length, 3);

  // 100 Level obligation
  assert.strictEqual(obligations[0].level, '100');
  assert.strictEqual(obligations[0].levelString, '100 Level');
  assert.strictEqual(obligations[0].session, '2024/2025');
  assert.strictEqual(obligations[0].isCurrent, false);

  // 200 Level obligation
  assert.strictEqual(obligations[1].level, '200');
  assert.strictEqual(obligations[1].levelString, '200 Level');
  assert.strictEqual(obligations[1].session, '2025/2026');
  assert.strictEqual(obligations[1].isCurrent, false);

  // 300 Level obligation
  assert.strictEqual(obligations[2].level, '300');
  assert.strictEqual(obligations[2].levelString, '300 Level');
  assert.strictEqual(obligations[2].session, '2026/2027');
  assert.strictEqual(obligations[2].isCurrent, true);
});

console.log('\n--- 4. Testing Student Profile Enrichment ---');

test('enrichStudentProfile synchronizes level and session with authoritative calculations', () => {
  setActiveAcademicSession(2026);
  const rawProfile = {
    id: 'student-uuid-1',
    registration_number: '20251122334',
    full_name: 'Sophomore Student',
    level: '100 Level', // stale stored level
    admission_year: 2025
  };

  const enriched = enrichStudentProfile(rawProfile);
  // In 2026 session, 2025 admit is 200 Level
  assert.strictEqual(enriched.level, '200 Level', 'Stale 100 Level must be updated to 200 Level');
  assert.strictEqual(enriched.current_level, '200 Level');
  assert.strictEqual(enriched.numeric_level, 2);
  assert.strictEqual(enriched.academic_session, '2026/2027');
});

console.log('\n--- 5. Testing Admission Year Derivation Fallback ---');

test('Derives entry year from registration number when admission_year is not explicit', () => {
  setActiveAcademicSession(2026);
  const student = {
    registration_number: '20231998877',
    name: 'Senior Student'
  };
  const prog = calculateAcademicProgression(student);
  assert.strictEqual(prog.valid, true);
  assert.strictEqual(prog.admissionYear, 2023);
  assert.strictEqual(prog.numericLevel, 4);
  assert.strictEqual(prog.levelString, '400 Level');
});

test('Derives entry year from historical level if reg number does not start with 4 digits', () => {
  setActiveAcademicSession(2026);
  const student = {
    registration_number: 'CSC/DIRECT/001',
    level: '200 Level'
  };
  const prog = calculateAcademicProgression(student);
  assert.strictEqual(prog.valid, true);
  // In 2026, 200L means entry year was 2025 (2026 - 2 + 1 = 2025)
  assert.strictEqual(prog.admissionYear, 2025);
  assert.strictEqual(prog.levelString, '200 Level');
});

// Reset back to baseline session for sanity
setActiveAcademicSession(DEFAULT_ACADEMIC_YEAR_START);

console.log(`\n===========================================`);
console.log(`Total tests run: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`===========================================\n`);

if (failed > 0) {
  process.exit(1);
}
