import assert from 'node:assert';
import {
  calculateAcademicProgression,
  extractEntryYearFromRegNumber,
  setActiveAcademicSession,
  getActiveAcademicSession,
  getActiveAcademicYearStart,
  SUPPORTED_ACADEMIC_SESSIONS
} from '../packages/config/academic.js';

console.log('💳 Starting Global Academic Session & Payment Integrity Verification Suite...\n');

// Mock in-memory database representing Supabase `payments` table
const mockPaymentsDb = [];

function mockCreatePaymentCheckout({ student, paymentType, academicSession, amount }) {
  const regNumber = student?.registration_number || student?.matric;
  const entryYear = extractEntryYearFromRegNumber(regNumber);
  const activeGlobalSession = getActiveAcademicSession();

  // Authoritative target session resolution
  const targetSession = academicSession || activeGlobalSession;
  const startYear = parseInt(targetSession.split('/')[0], 10);

  // Authoritative student progression level calculation
  let derivedLevel = '100 Level';
  if (entryYear) {
    const progression = calculateAcademicProgression(entryYear, targetSession);
    derivedLevel = progression.levelString;
  }

  // Authoritative Duplicate check per session for non-repeatable fees
  if (paymentType === 'DEPARTMENTAL_DUES') {
    const existingPayment = mockPaymentsDb.find(p => 
      p.registration_number === regNumber &&
      p.payment_type === 'DEPARTMENTAL_DUES' &&
      p.academic_session === targetSession &&
      ['successful', 'completed'].includes(p.status)
    );
    if (existingPayment) {
      return {
        error: `Departmental dues for academic session ${targetSession} have already been cleared.`,
        code: 'DUPLICATE_SESSION_PAYMENT'
      };
    }
  }

  // Authoritative fee validation (server cannot be manipulated by client)
  const authoritativeAmount = paymentType === 'DEPARTMENTAL_DUES' ? 2500 : (amount || 2500);

  const paymentRecord = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    student_id: student?.id || 'std_test',
    registration_number: regNumber,
    payment_type: paymentType,
    amount: authoritativeAmount,
    currency: 'NGN',
    academic_session: targetSession, // Top-level snapshot
    level: derivedLevel,             // Top-level snapshot
    session_start_year: startYear,
    status: 'successful',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    reference: `BCH-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  };

  mockPaymentsDb.push(paymentRecord);
  return { success: true, payment: paymentRecord };
}

// -------------------------------------------------------------------------
// TEST 1: Payment creation under 2025/2026 Session (Student 2024 cohort = 200L)
// -------------------------------------------------------------------------
console.log('--- Test 1: Payment Initialization & Snapshotting in 2025/2026 ---');
setActiveAcademicSession(2025);
assert.strictEqual(getActiveAcademicSession(), '2025/2026');

const student2024 = {
  id: 'std_2024_001',
  registration_number: '20241234567',
  full_name: 'Chidubem Okonkwo',
  department: 'Computer Science'
};

const pay1Result = mockCreatePaymentCheckout({
  student: student2024,
  paymentType: 'DEPARTMENTAL_DUES',
  academicSession: '2025/2026'
});

assert.strictEqual(pay1Result.success, true);
assert.strictEqual(pay1Result.payment.academic_session, '2025/2026');
assert.strictEqual(pay1Result.payment.level, '200 Level');
assert.strictEqual(pay1Result.payment.status, 'successful');
console.log(`  ✓ Payment 1 recorded for ${pay1Result.payment.academic_session} | Level: ${pay1Result.payment.level} | Status: ${pay1Result.payment.status}`);

// -------------------------------------------------------------------------
// TEST 2: Advancing Global Session to 2026/2027 (Progression: 200L -> 300L)
// -------------------------------------------------------------------------
console.log('\n--- Test 2: Advancing Global Session to 2026/2027 & Financial Immutability ---');
setActiveAcademicSession(2026);
assert.strictEqual(getActiveAcademicSession(), '2026/2027');

// Verify current derived level changes
const progression2026 = calculateAcademicProgression(student2024.registration_number);
assert.strictEqual(progression2026.levelString, '300 Level');
console.log(`  ✓ Student current standing dynamically advanced to: ${progression2026.levelString}`);

// Verify Historical Payment 1 was NOT mutated
const savedPay1 = mockPaymentsDb.find(p => p.id === pay1Result.payment.id);
assert.strictEqual(savedPay1.academic_session, '2025/2026', 'Financial record session was mutated!');
assert.strictEqual(savedPay1.level, '200 Level', 'Financial record level was mutated!');
console.log(`  ✓ Historical Payment 1 preserved: Session=${savedPay1.academic_session}, Level=${savedPay1.level}`);

// -------------------------------------------------------------------------
// TEST 3: Student Pays Dues for new session 2026/2027 (300 Level)
// -------------------------------------------------------------------------
console.log('\n--- Test 3: New Session 2026/2027 Payment Creation ---');
const pay2Result = mockCreatePaymentCheckout({
  student: student2024,
  paymentType: 'DEPARTMENTAL_DUES',
  academicSession: '2026/2027'
});

assert.strictEqual(pay2Result.success, true);
assert.strictEqual(pay2Result.payment.academic_session, '2026/2027');
assert.strictEqual(pay2Result.payment.level, '300 Level');
console.log(`  ✓ Payment 2 recorded for ${pay2Result.payment.academic_session} | Level: ${pay2Result.payment.level}`);

// Check student payment history has both distinct sessions
const studentHistory = mockPaymentsDb.filter(p => p.registration_number === student2024.registration_number);
assert.strictEqual(studentHistory.length, 2);
assert.strictEqual(studentHistory[0].academic_session, '2025/2026');
assert.strictEqual(studentHistory[0].level, '200 Level');
assert.strictEqual(studentHistory[1].academic_session, '2026/2027');
assert.strictEqual(studentHistory[1].level, '300 Level');
console.log(`  ✓ Student history contains 2 independent records across distinct sessions.`);

// -------------------------------------------------------------------------
// TEST 4: Duplicate Payment Prevention for the same session
// -------------------------------------------------------------------------
console.log('\n--- Test 4: Duplicate Payment Prevention in 2026/2027 ---');
const dupPayResult = mockCreatePaymentCheckout({
  student: student2024,
  paymentType: 'DEPARTMENTAL_DUES',
  academicSession: '2026/2027'
});

assert.strictEqual(dupPayResult.success, undefined);
assert.strictEqual(dupPayResult.code, 'DUPLICATE_SESSION_PAYMENT');
console.log(`  ✓ Correctly rejected duplicate dues payment: "${dupPayResult.error}"`);

// -------------------------------------------------------------------------
// TEST 5: Rolling Global Session Backward to 2025/2026
// -------------------------------------------------------------------------
console.log('\n--- Test 5: Backward Global Session Rollback to 2025/2026 ---');
setActiveAcademicSession(2025);
assert.strictEqual(getActiveAcademicSession(), '2025/2026');

// Student current level returns to 200 Level
const rollbackProgression = calculateAcademicProgression(student2024.registration_number);
assert.strictEqual(rollbackProgression.levelString, '200 Level');
console.log(`  ✓ Current derived level returned to: ${rollbackProgression.levelString}`);

// Both historical payments remain intact
const pay1AfterRollback = mockPaymentsDb.find(p => p.id === pay1Result.payment.id);
const pay2AfterRollback = mockPaymentsDb.find(p => p.id === pay2Result.payment.id);
assert.strictEqual(pay1AfterRollback.academic_session, '2025/2026');
assert.strictEqual(pay1AfterRollback.level, '200 Level');
assert.strictEqual(pay2AfterRollback.academic_session, '2026/2027');
assert.strictEqual(pay2AfterRollback.level, '300 Level');
console.log(`  ✓ Financial integrity verified: Payment 1 (${pay1AfterRollback.academic_session}) & Payment 2 (${pay2AfterRollback.academic_session}) unmutated.`);

// -------------------------------------------------------------------------
// TEST 6: Receipt Historical Snapshot Integrity
// -------------------------------------------------------------------------
console.log('\n--- Test 6: Receipt Snapshot Rendering Verification ---');

function generateReceiptView(paymentRecord, currentUser) {
  return {
    receiptNo: paymentRecord.reference,
    studentName: currentUser.full_name,
    matricNo: currentUser.registration_number,
    // Strict snapshot priority:
    level: paymentRecord.level || currentUser.level,
    session: paymentRecord.academic_session || currentUser.academic_session,
    amount: paymentRecord.amount,
    status: paymentRecord.status === 'successful' ? 'APPROVED' : 'PENDING'
  };
}

// Current user is viewing in session 2025/2026 where they are 200L
const receiptForPay2 = generateReceiptView(pay2AfterRollback, student2024);
assert.strictEqual(receiptForPay2.session, '2026/2027', 'Receipt session corrupted by current portal state!');
assert.strictEqual(receiptForPay2.level, '300 Level', 'Receipt level corrupted by current portal state!');
console.log(`  ✓ Receipt for 2026/2027 transaction faithfully renders: Session=${receiptForPay2.session}, Level=${receiptForPay2.level}`);

// -------------------------------------------------------------------------
// TEST 7: Multi-Student Cohort Progression & Session Matrix
// -------------------------------------------------------------------------
console.log('\n--- Test 7: Multi-Student Cohort Progression Across Sessions ---');

const cohorts = [
  { entryYear: 2022, reg: '20221000001' },
  { entryYear: 2023, reg: '20231000002' },
  { entryYear: 2024, reg: '20241000003' },
  { entryYear: 2025, reg: '20251000004' },
  { entryYear: 2026, reg: '20261000005' }
];

// Session 2025/2026
setActiveAcademicSession(2025);
const expected2025 = {
  2022: '400 Level',
  2023: '300 Level',
  2024: '200 Level',
  2025: '100 Level'
};
Object.entries(expected2025).forEach(([year, expectedLvl]) => {
  const p = calculateAcademicProgression(Number(year));
  assert.strictEqual(p.levelString, expectedLvl);
});
console.log('  ✓ Verified 2025/2026 session levels: 2022->400L, 2023->300L, 2024->200L, 2025->100L');

// Session 2026/2027
setActiveAcademicSession(2026);
const expected2026 = {
  2022: '500 Level',
  2023: '400 Level',
  2024: '300 Level',
  2025: '200 Level',
  2026: '100 Level'
};
Object.entries(expected2026).forEach(([year, expectedLvl]) => {
  const p = calculateAcademicProgression(Number(year));
  assert.strictEqual(p.levelString, expectedLvl);
});
console.log('  ✓ Verified 2026/2027 session levels: 2022->500L, 2023->400L, 2024->300L, 2025->200L, 2026->100L');

// Session 2027/2028 (2022 cohort graduated)
setActiveAcademicSession(2027);
const p2022_2027 = calculateAcademicProgression(2022);
assert.strictEqual(p2022_2027.isGraduated, true);
assert.strictEqual(p2022_2027.levelString, 'Graduated');
assert.strictEqual(p2022_2027.classOf, 2027);
console.log(`  ✓ Verified 2027/2028 session: 2022 cohort graduated (${p2022_2027.classOfDisplay})`);

// Reset back to authoritative 2026/2027
setActiveAcademicSession(2026);

// -------------------------------------------------------------------------
// TEST 8: Payment Dashboard Session Scoping & Automatic Reset
// -------------------------------------------------------------------------
console.log('\n--- Test 8: Payment Dashboard Session Scoping & Reset ---');

function calculateDashboardDuesMetrics(payments, targetSession) {
  const isAll = targetSession === 'ALL';
  const filtered = payments.filter(p => {
    if (p.status !== 'successful') return false;
    if (!isAll && p.academic_session !== targetSession) return false;
    return true;
  });

  return {
    count: filtered.length,
    totalRevenue: filtered.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  };
}

// 1. Current Session 2026/2027 Dashboard View
const metrics2026 = calculateDashboardDuesMetrics(mockPaymentsDb, '2026/2027');
assert.strictEqual(metrics2026.count, 1);
assert.strictEqual(metrics2026.totalRevenue, 2500);
console.log(`  ✓ 2026/2027 Session Dashboard: Count = ${metrics2026.count}, Revenue = ₦${metrics2026.totalRevenue.toLocaleString()}`);

// 2. Admin Advances Global Session to New Session 2027/2028 (Zero payments yet)
setActiveAcademicSession(2027);
assert.strictEqual(getActiveAcademicSession(), '2027/2028');
const metrics2027 = calculateDashboardDuesMetrics(mockPaymentsDb, '2027/2028');
assert.strictEqual(metrics2027.count, 0, 'New session must show 0 payments');
assert.strictEqual(metrics2027.totalRevenue, 0, 'New session must show ₦0 revenue');
console.log(`  ✓ 2027/2028 New Session Dashboard starts clean: Count = ${metrics2027.count}, Revenue = ₦${metrics2027.totalRevenue}`);

// 3. Verify previous payments were NOT deleted from database
assert.strictEqual(mockPaymentsDb.length, 2, 'Previous payments were deleted or altered!');
console.log(`  ✓ Database retains all historical payments (${mockPaymentsDb.length} records present).`);

// 4. Create new payment in 2027/2028
const pay3Result = mockCreatePaymentCheckout({
  student: student2024,
  paymentType: 'DEPARTMENTAL_DUES',
  academicSession: '2027/2028'
});
assert.strictEqual(pay3Result.success, true);
const metrics2027Updated = calculateDashboardDuesMetrics(mockPaymentsDb, '2027/2028');
assert.strictEqual(metrics2027Updated.count, 1);
assert.strictEqual(metrics2027Updated.totalRevenue, 2500);
console.log(`  ✓ 2027/2028 Session Dashboard after 1 payment: Count = ${metrics2027Updated.count}, Revenue = ₦${metrics2027Updated.totalRevenue.toLocaleString()}`);

// 5. Admin inspects previous session 2025/2026 historical view
const metrics2025 = calculateDashboardDuesMetrics(mockPaymentsDb, '2025/2026');
assert.strictEqual(metrics2025.count, 1);
assert.strictEqual(metrics2025.totalRevenue, 2500);
console.log(`  ✓ Historical 2025/2026 view preserved: Count = ${metrics2025.count}, Revenue = ₦${metrics2025.totalRevenue.toLocaleString()}`);

// 6. Admin inspects "All Sessions" consolidated view
const metricsAll = calculateDashboardDuesMetrics(mockPaymentsDb, 'ALL');
assert.strictEqual(metricsAll.count, 3);
assert.strictEqual(metricsAll.totalRevenue, 7500);
console.log(`  ✓ Consolidated All Sessions view: Count = ${metricsAll.count}, Revenue = ₦${metricsAll.totalRevenue.toLocaleString()}`);

// Reset back to authoritative 2026/2027
setActiveAcademicSession(2026);
console.log('\n🎉 ALL 8 PAYMENT & ACADEMIC SESSION INTEGRITY TESTS PASSED SUCCESSFULLY!\n');
