import assert from 'node:assert';
import { 
  calculateAcademicProgression,
  calculateCurrentLevel,
  parseAdmissionYear,
  getAcademicSession,
  setActiveAcademicSession,
  getActiveAcademicSession,
  getActiveAcademicYearStart,
  previewProgression,
  DEFAULT_ACADEMIC_YEAR_START
} from '../packages/config/academic.js';

console.log('🧪 Starting Academic Progression Engine Verification Suite...\n');

// 1. Current Session: 2026/2027 Validation
console.log('--- Test Suite 1: Current Session 2026/2027 Progression ---');
setActiveAcademicSession(2026);
assert.strictEqual(getActiveAcademicSession(), '2026/2027');
assert.strictEqual(getActiveAcademicYearStart(), 2026);

const testCohorts2026 = [
  { reg: '20221345678', expectedLevel: '500 Level', isGraduated: false, classOf: 2027 },
  { reg: '20231456789', expectedLevel: '400 Level', isGraduated: false, classOf: 2028 },
  { reg: '20241567890', expectedLevel: '300 Level', isGraduated: false, classOf: 2029 },
  { reg: '20251678901', expectedLevel: '200 Level', isGraduated: false, classOf: 2030 },
  { reg: '20261789012', expectedLevel: '100 Level', isGraduated: false, classOf: 2031 },
  // 2021 cohort (5 years completed by 2026: 2021 + 5 = 2026)
  { reg: '20211234567', expectedLevel: 'Graduated', isGraduated: true, classOf: 2026 }
];

testCohorts2026.forEach(({ reg, expectedLevel, isGraduated, classOf }) => {
  const res = calculateAcademicProgression(reg);
  assert.strictEqual(res.levelString, expectedLevel, `Expected ${expectedLevel} for reg ${reg}, got ${res.levelString}`);
  assert.strictEqual(res.isGraduated, isGraduated, `Expected isGraduated=${isGraduated} for reg ${reg}`);
  assert.strictEqual(res.classOf, classOf, `Expected classOf=${classOf} for reg ${reg}`);
  console.log(`  ✓ Cohort ${reg.slice(0, 4)}: ${res.levelString} | Graduated: ${res.isGraduated} | ${res.classOfDisplay}`);
});

// 2. Future Session: 2027/2028 Progression
console.log('\n--- Test Suite 2: Future Session 2027/2028 Progression ---');
setActiveAcademicSession(2027);
assert.strictEqual(getActiveAcademicSession(), '2027/2028');

const testCohorts2027 = [
  { cohort: 2022, expectedLevel: 'Graduated', isGraduated: true, classOf: 2027 },
  { cohort: 2023, expectedLevel: '500 Level', isGraduated: false, classOf: 2028 },
  { cohort: 2024, expectedLevel: '400 Level', isGraduated: false, classOf: 2029 },
  { cohort: 2025, expectedLevel: '300 Level', isGraduated: false, classOf: 2030 },
  { cohort: 2026, expectedLevel: '200 Level', isGraduated: false, classOf: 2031 },
  { cohort: 2027, expectedLevel: '100 Level', isGraduated: false, classOf: 2032 }
];

testCohorts2027.forEach(({ cohort, expectedLevel, isGraduated, classOf }) => {
  const res = calculateAcademicProgression(cohort);
  assert.strictEqual(res.levelString, expectedLevel, `Expected ${expectedLevel} for cohort ${cohort} in 2027/2028, got ${res.levelString}`);
  assert.strictEqual(res.isGraduated, isGraduated);
  assert.strictEqual(res.classOf, classOf);
  console.log(`  ✓ Cohort ${cohort}: ${res.levelString} | Graduated: ${res.isGraduated} | ${res.classOfDisplay}`);
});

// 3. Future Session: 2028/2029 Progression
console.log('\n--- Test Suite 3: Future Session 2028/2029 Progression ---');
setActiveAcademicSession(2028);
assert.strictEqual(getActiveAcademicSession(), '2028/2029');

const testCohorts2028 = [
  { cohort: 2022, expectedLevel: 'Graduated', isGraduated: true, classOf: 2027 },
  { cohort: 2023, expectedLevel: 'Graduated', isGraduated: true, classOf: 2028 },
  { cohort: 2024, expectedLevel: '500 Level', isGraduated: false, classOf: 2029 },
  { cohort: 2025, expectedLevel: '400 Level', isGraduated: false, classOf: 2030 },
  { cohort: 2026, expectedLevel: '300 Level', isGraduated: false, classOf: 2031 },
  { cohort: 2027, expectedLevel: '200 Level', isGraduated: false, classOf: 2032 },
  { cohort: 2028, expectedLevel: '100 Level', isGraduated: false, classOf: 2033 }
];

testCohorts2028.forEach(({ cohort, expectedLevel, isGraduated, classOf }) => {
  const res = calculateAcademicProgression(cohort);
  assert.strictEqual(res.levelString, expectedLevel);
  assert.strictEqual(res.isGraduated, isGraduated);
  assert.strictEqual(res.classOf, classOf);
  console.log(`  ✓ Cohort ${cohort}: ${res.levelString} | Graduated: ${res.isGraduated} | ${res.classOfDisplay}`);
});

// Reset back to baseline 2026/2027
setActiveAcademicSession(2026);

// 4. Edge Cases: Non-standard durations, invalid registration numbers, missing data
console.log('\n--- Test Suite 4: Edge Cases & Robustness ---');

// Non-standard programme duration: 4-year degree (e.g., Cyber Security 4-yr direct entry or diploma transfer)
const prog4yr = calculateAcademicProgression({ admission_year: 2023, programme_duration: 4 }, { currentYearStart: 2026 });
assert.strictEqual(prog4yr.levelString, '400 Level');
assert.strictEqual(prog4yr.classOf, 2027);
console.log(`  ✓ 4-Year Programme Duration 2023 cohort in 2026: ${prog4yr.levelString} | ${prog4yr.classOfDisplay}`);

const prog4yrGrad = calculateAcademicProgression({ admission_year: 2022, programme_duration: 4 }, { currentYearStart: 2026 });
assert.strictEqual(prog4yrGrad.levelString, 'Graduated');
assert.strictEqual(prog4yrGrad.isGraduated, true);
assert.strictEqual(prog4yrGrad.classOf, 2026);
console.log(`  ✓ 4-Year Programme Duration 2022 cohort in 2026: ${prog4yrGrad.levelString} (Correctly graduated)`);

// Missing registration number and missing admission year
const missingData = calculateAcademicProgression({});
assert.strictEqual(missingData.valid, false);
assert.strictEqual(missingData.levelString, 'Level unavailable');
console.log(`  ✓ Missing Data handled safely: "${missingData.levelString}"`);

// Invalid registration number format
const invalidReg = calculateAcademicProgression('ABC-1234');
assert.strictEqual(invalidReg.valid, false);
assert.strictEqual(invalidReg.levelString, 'Level unavailable');
console.log(`  ✓ Invalid Reg Number handled safely: "${invalidReg.levelString}"`);

// Future cohort relative to session (e.g. 2027 admitted student viewed in 2026)
const futureCohort = calculateAcademicProgression(2027, { currentYearStart: 2026 });
assert.strictEqual(futureCohort.valid, true);
assert.strictEqual(futureCohort.status, 'Admitted');
assert.strictEqual(futureCohort.levelString, '100 Level (Upcoming Cohort)');
console.log(`  ✓ Future Cohort handled gracefully: "${futureCohort.levelString}"`);

// Preview Progression Function
console.log('\n--- Test Suite 5: Progression Preview Generator ---');
const preview = previewProgression(2027, [2022, 2023, 2024, 2025, 2026, 2027]);
assert.strictEqual(preview.length, 6);
assert.strictEqual(preview[0].levelString, 'Graduated');
assert.strictEqual(preview[1].levelString, '500 Level');
assert.strictEqual(preview[5].levelString, '100 Level');
console.log(`  ✓ Successfully generated 6-cohort progression matrix preview for 2027/2028`);

console.log('\n🎉 ALL ACADEMIC PROGRESSION ENGINE TESTS PASSED PERFECTLY!\n');
