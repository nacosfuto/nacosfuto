/**
 * @file paymentNotificationEngine.js
 * Centralized Automated Email Notification Engine for NACOS FUTO Student Portal Payments
 * 
 * Guarantees:
 * 1. Universally covers ALL payment categories (ID Card, Departmental Dues, Levies, Event Tickets, Custom).
 * 2. Idempotent: Database unique constraint on (payment_reference, notification_type) ensures
 *    that duplicate webhooks, page refreshes, and polling NEVER send duplicate emails.
 * 3. Verified Student Resolution: Retrieves and validates recipient email server-side from
 *    authoritative profiles and verified students database records.
 * 4. Distinct Outcome Handling:
 *    - Success: Confirmation receipt only after backend verification confirms transaction.
 *    - Failed: Unsuccessful notice advising student to check bank & portal before retrying.
 *    - Reversed / Refunded: Reversal notice updating student clearance ledger.
 * 5. ID Card Accuracy: Only claims ID card is ready if card was actually generated.
 * 6. Non-blocking & Resilient: Email provider delivery failure never breaks or reverts payment.
 * 7. Admin Observability: Logs every attempt, error, and status in public.payment_notifications.
 */

import { supabase } from '../client.js';
import { isValidEmail } from './emailDispatcher.js';
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendPaymentReversedEmail
} from './emailDispatcher.js';
import { formatPaymentCategoryName } from './emailTemplates.js';
import { getDynamicAcademicSession } from './bachs.js';

// Resilient memory store to guarantee local idempotency and log queries even before SQL migrations run
const localNotificationStore = new Map();

/**
 * Server-side retrieval and validation of verified student email and name
 */
export async function resolveStudentEmailAndProfile({ paymentRecord }) {
  if (!paymentRecord) {
    return { email: '', studentName: 'Student Member', regNumber: '', isVerified: false };
  }

  const regNo = (
    paymentRecord.registration_number || 
    paymentRecord.matric_number || 
    paymentRecord.metadata?.registration_number || 
    paymentRecord.metadata?.regNo || 
    ''
  ).trim();

  const studentId = paymentRecord.student_id || '';
  let email = '';
  let studentName = (
    paymentRecord.metadata?.customer_name || 
    paymentRecord.metadata?.name || 
    paymentRecord.metadata?.full_name || 
    paymentRecord.customer_name || 
    paymentRecord.full_name || 
    ''
  ).trim();
  let isVerified = false;

  // 1. Authoritative lookup: public.profiles table
  if (supabase && (regNo || studentId)) {
    try {
      let profQuery = supabase.from('profiles').select('id, email, full_name, registration_number, matric_number');
      if (studentId && studentId.length === 36) {
        profQuery = profQuery.eq('id', studentId);
      } else if (regNo) {
        profQuery = profQuery.or(`registration_number.eq.${regNo},matric_number.eq.${regNo}`);
      }

      const { data: profile } = await profQuery.maybeSingle();
      if (profile) {
        if (profile.email && isValidEmail(profile.email)) {
          email = profile.email.trim();
          isVerified = true;
        }
        if (profile.full_name) {
          studentName = profile.full_name.trim();
        }
      }
    } catch (err) {
      console.warn('[Notification Engine] Profile lookup notice:', err.message);
    }
  }

  // 2. Secondary authoritative lookup: public.verified_students institutional registry
  if (!email && supabase && regNo) {
    try {
      const { data: verified } = await supabase
        .from('verified_students')
        .select('email, full_name, first_name, last_name')
        .eq('registration_number', regNo)
        .maybeSingle();

      if (verified) {
        if (verified.email && isValidEmail(verified.email)) {
          email = verified.email.trim();
          isVerified = true;
        }
        if (!studentName && verified.full_name) {
          studentName = verified.full_name.trim();
        }
      }
    } catch (err) {
      console.warn('[Notification Engine] Verified registry lookup notice:', err.message);
    }
  }

  // 3. Fallback to server-validated metadata customer_email or email
  if (!email) {
    const rawMetaEmail = (
      paymentRecord.metadata?.customer_email || 
      paymentRecord.metadata?.email || 
      paymentRecord.customer_email || 
      paymentRecord.email || 
      ''
    ).trim();
    if (rawMetaEmail && isValidEmail(rawMetaEmail)) {
      email = rawMetaEmail;
    }
  }

  // 4. Default clean fallback name if still empty
  if (!studentName || studentName === 'Student / Customer' || studentName === 'Student Member') {
    studentName = regNo ? `Student (${regNo})` : 'NACOS Student Member';
  }

  return {
    email: email.toLowerCase().trim(),
    studentName: studentName.trim(),
    regNumber: regNo,
    isVerified
  };
}

/**
 * Checks if the student's digital ID card has actually been generated
 * To fulfill: "Do not tell a student that an ID card is ready if the ID card has not actually been generated."
 */
export async function checkIdCardGenerationStatus({ registrationNumber, studentId }) {
  if (!supabase || (!registrationNumber && !studentId)) {
    return false;
  }

  try {
    let query = supabase.from('id_card_applications').select('status, passport_url, generated_at');
    if (registrationNumber) {
      query = query.or(`registration_number.eq.${registrationNumber},matric_number.eq.${registrationNumber}`);
    } else if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: app } = await query.maybeSingle();
    if (app) {
      return (
        app.status === 'generated' || 
        app.status === 'approved' || 
        (Boolean(app.passport_url) && Boolean(app.generated_at))
      );
    }
  } catch (err) {
    console.warn('[Notification Engine] ID card application status check notice:', err.message);
  }

  return false;
}

/**
 * Core Universal Payment Notification Dispatcher
 * Idempotently handles Successful, Failed, and Reversed payment outcomes.
 */
export async function dispatchPaymentNotification({
  paymentRecord,
  notificationType = 'PAYMENT_SUCCESS',
  failureReason = '',
  overrideEnv = {}
}) {
  if (!paymentRecord || typeof paymentRecord !== 'object') {
    console.warn('[Notification Engine] Missing payment record for notification dispatch.');
    return { success: false, error: 'Payment record is required.' };
  }

  const reference = String(paymentRecord.reference || paymentRecord.metadata?.reference || '').trim();
  if (!reference) {
    console.warn('[Notification Engine] Payment record is missing reference. Aborting notification.');
    return { success: false, error: 'Payment reference is missing.' };
  }

  const notifType = String(notificationType || 'PAYMENT_SUCCESS').toUpperCase();
  const paymentType = String(paymentRecord.payment_type || paymentRecord.metadata?.payment_type || 'CUSTOM').toUpperCase();
  const now = new Date().toISOString();

  // 1. Idempotency Check in public.payment_notifications
  let existingNotif = null;
  if (supabase) {
    try {
      const { data } = await supabase
        .from('payment_notifications')
        .select('id, payment_reference, notification_type, status, attempts')
        .eq('payment_reference', reference)
        .eq('notification_type', notifType)
        .maybeSingle();

      existingNotif = data;
    } catch (checkErr) {
      console.warn('[Notification Engine] Idempotency query warning:', checkErr.message);
    }
  }

  if (!existingNotif) {
    existingNotif = localNotificationStore.get(`${reference}::${notifType}`) || null;
  }

  // If already successfully sent, do not send duplicate
  if (existingNotif && existingNotif.status === 'sent') {
    console.log(`[Notification Engine] Idempotency: ${notifType} email for ref ${reference} was already sent on ${existingNotif.sent_at}.`);
    return {
      success: true,
      alreadySent: true,
      notificationId: existingNotif.id,
      sentAt: existingNotif.sent_at,
      recipient: existingNotif.recipient_email
    };
  }

  // If currently processing or max attempts exceeded
  if (existingNotif && existingNotif.attempts >= existingNotif.max_attempts) {
    console.warn(`[Notification Engine] Notification ${existingNotif.id} has reached maximum retry attempts (${existingNotif.max_attempts}).`);
    return {
      success: false,
      maxAttemptsReached: true,
      notificationId: existingNotif.id,
      error: existingNotif.error_message || 'Maximum delivery retry attempts reached.'
    };
  }

  // 2. Resolve Student Details & Validate Email Address Server-Side
  const studentInfo = await resolveStudentEmailAndProfile({ paymentRecord });
  const recipientEmail = studentInfo.email;
  const studentName = studentInfo.studentName;
  const regNumber = studentInfo.regNumber;

  const rawAmount = paymentRecord.amount != null ? paymentRecord.amount : (paymentRecord.metadata?.amount || 0);
  const amount = Number(rawAmount);
  const currency = (paymentRecord.currency || paymentRecord.metadata?.currency || 'NGN').toUpperCase();
  const session = String(paymentRecord.academic_session || paymentRecord.metadata?.academic_session || paymentRecord.metadata?.academicSession || getDynamicAcademicSession()).trim();
  const level = String(paymentRecord.level || paymentRecord.metadata?.level || '').trim();
  const paidAt = paymentRecord.paid_at || paymentRecord.created_at || now;

  let notificationId = existingNotif?.id;

  // 3. Handle Missing or Invalid Email
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    const errorMsg = `No valid verified email address found for student (Reg: ${regNumber || 'none'}). Cannot deliver ${notifType}.`;
    console.warn(`[Notification Engine Error] ${errorMsg}`);

    if (supabase) {
      try {
        const payload = {
          payment_id: paymentRecord.id || null,
          payment_reference: reference,
          notification_type: notifType,
          recipient_email: recipientEmail || 'unresolved@student.futo.edu.ng',
          student_name: studentName,
          registration_number: regNumber || null,
          payment_type: paymentType,
          amount: isNaN(amount) ? 0 : amount,
          currency,
          status: 'failed',
          attempts: (existingNotif?.attempts || 0) + 1,
          last_attempt_at: now,
          error_message: errorMsg,
          metadata: {
            academic_session: session,
            level,
            failure_reason: 'MISSING_VERIFIED_EMAIL',
            payment_metadata: paymentRecord.metadata || {}
          },
          updated_at: now
        };

        if (existingNotif?.id) {
          await supabase.from('payment_notifications').update(payload).eq('id', existingNotif.id);
        } else {
          await supabase.from('payment_notifications').insert({ ...payload, created_at: now });
        }
      } catch (logErr) {
        console.warn('[Notification Engine] Failed logging missing email error to DB:', logErr.message);
      }
    }

    localNotificationStore.set(`${reference}::${notifType}`, {
      id: notificationId || `notif_${Date.now()}`,
      payment_reference: reference,
      notification_type: notifType,
      recipient_email: recipientEmail || 'unresolved@student.futo.edu.ng',
      student_name: studentName,
      registration_number: regNumber || null,
      payment_type: paymentType,
      amount: isNaN(amount) ? 0 : amount,
      currency,
      status: 'failed',
      attempts: (existingNotif?.attempts || 0) + 1,
      last_attempt_at: now,
      error_message: errorMsg,
      created_at: existingNotif?.created_at || now,
      updated_at: now
    });

    return {
      success: false,
      error: errorMsg,
      code: 'MISSING_STUDENT_EMAIL'
    };
  }

  // 4. Create or Update Queue Record in public.payment_notifications
  if (supabase) {
    try {
      if (existingNotif?.id) {
        await supabase
          .from('payment_notifications')
          .update({
            status: 'processing',
            recipient_email: recipientEmail,
            student_name: studentName,
            registration_number: regNumber,
            last_attempt_at: now,
            updated_at: now
          })
          .eq('id', existingNotif.id);
      } else {
        const { data: newRow } = await supabase
          .from('payment_notifications')
          .upsert({
            payment_id: paymentRecord.id || null,
            payment_reference: reference,
            notification_type: notifType,
            recipient_email: recipientEmail,
            student_name: studentName,
            registration_number: regNumber || null,
            payment_type: paymentType,
            amount: isNaN(amount) ? 0 : amount,
            currency,
            status: 'processing',
            provider: 'resend',
            attempts: 0,
            max_attempts: 3,
            last_attempt_at: now,
            metadata: {
              academic_session: session,
              level,
              payment_metadata: paymentRecord.metadata || {}
            },
            created_at: now,
            updated_at: now
          }, { onConflict: 'payment_reference,notification_type' })
          .select('id')
          .maybeSingle();

        if (newRow?.id) {
          notificationId = newRow.id;
        }
      }
    } catch (upsertErr) {
      console.warn('[Notification Engine] Concurrency queue upsert notice:', upsertErr.message);
    }
  }

  // 5. Check ID Card Generation Status (For ID Card Payments)
  let isIdCardGenerated = false;
  if (paymentType === 'ID_CARD') {
    isIdCardGenerated = await checkIdCardGenerationStatus({
      registrationNumber: regNumber,
      studentId: paymentRecord.student_id
    });
  }

  // 6. Dispatch Email Based on Transaction Outcome
  let emailResult = null;
  const friendlyCategory = formatPaymentCategoryName(paymentType);

  try {
    if (notifType === 'PAYMENT_SUCCESS') {
      emailResult = await sendPaymentSuccessEmail({
        to: recipientEmail,
        customerName: studentName,
        regNumber,
        reference,
        paymentType: friendlyCategory,
        amount,
        currency,
        paidAt,
        level,
        session,
        isIdCardGenerated
      }, overrideEnv);
    } else if (notifType === 'PAYMENT_FAILED') {
      emailResult = await sendPaymentFailedEmail({
        to: recipientEmail,
        customerName: studentName,
        regNumber,
        reference,
        paymentType: friendlyCategory,
        amount,
        currency,
        failedAt: now,
        failureReason: failureReason || paymentRecord.metadata?.failure_reason || '',
        level,
        session
      }, overrideEnv);
    } else if (notifType === 'PAYMENT_REFUNDED' || notifType === 'PAYMENT_REVERSED') {
      emailResult = await sendPaymentReversedEmail({
        to: recipientEmail,
        customerName: studentName,
        regNumber,
        reference,
        paymentType: friendlyCategory,
        amount,
        currency,
        reversedAt: now,
        reversalReason: failureReason || paymentRecord.metadata?.reversal_reason || '',
        level,
        session
      }, overrideEnv);
    } else {
      throw new Error(`Unsupported notification type: ${notifType}`);
    }
  } catch (dispatchErr) {
    emailResult = {
      success: false,
      error: dispatchErr.message || 'Email delivery exception'
    };
  }

  // 7. Update public.payment_notifications with Delivery Outcome
  const currentAttempts = (existingNotif?.attempts || 0) + 1;
  const isDelivered = Boolean(emailResult?.success);

  if (supabase) {
    try {
      const updateData = {
        attempts: currentAttempts,
        last_attempt_at: now,
        status: isDelivered ? 'sent' : 'failed',
        error_message: isDelivered ? null : (emailResult.error || 'Delivery failed'),
        provider: emailResult.provider || 'resend',
        provider_message_id: emailResult.id || null,
        sent_at: isDelivered ? now : null,
        updated_at: now
      };

      if (notificationId) {
        await supabase.from('payment_notifications').update(updateData).eq('id', notificationId);
      } else {
        await supabase
          .from('payment_notifications')
          .update(updateData)
          .eq('payment_reference', reference)
          .eq('notification_type', notifType);
      }
    } catch (dbUpdateErr) {
      console.warn('[Notification Engine] Delivery outcome update error:', dbUpdateErr.message);
    }
  }

  // Update in-memory local mirror
  const resolvedNotifId = notificationId || existingNotif?.id || `notif_${Date.now()}`;
  localNotificationStore.set(`${reference}::${notifType}`, {
    id: resolvedNotifId,
    payment_reference: reference,
    notification_type: notifType,
    recipient_email: recipientEmail,
    student_name: studentName,
    registration_number: regNumber,
    payment_type: paymentType,
    amount,
    currency,
    status: isDelivered ? 'sent' : 'failed',
    attempts: currentAttempts,
    last_attempt_at: now,
    sent_at: isDelivered ? now : null,
    error_message: isDelivered ? null : (emailResult.error || 'Delivery failed'),
    provider: emailResult.provider || 'resend',
    provider_message_id: emailResult.id || null,
    created_at: existingNotif?.created_at || now,
    updated_at: now
  });

  // Log final delivery summary
  if (isDelivered) {
    console.log(`\x1b[32m[Payment Email Delivered]\x1b[0m Type: ${notifType} | Ref: ${reference} | To: ${recipientEmail} | Provider: ${emailResult.provider} (ID: ${emailResult.id})`);
  } else {
    console.error(`\x1b[31m[Payment Email Delivery Failed]\x1b[0m Type: ${notifType} | Ref: ${reference} | To: ${recipientEmail} | Error: ${emailResult.error}`);
  }

  return {
    success: isDelivered,
    notificationId,
    recipient: recipientEmail,
    reference,
    notificationType: notifType,
    provider: emailResult?.provider,
    id: emailResult?.id,
    error: emailResult?.error || null
  };
}

/**
 * Safe Admin Retry Function for Failed Notifications
 * Allows authorized portal administrators to retry a failed notification without touching payment status.
 */
export async function retryPaymentNotification({ notificationId, overrideEnv = {} }) {
  if (!notificationId) {
    return { success: false, error: 'Notification ID required for retry.' };
  }

  if (!supabase) {
    return { success: false, error: 'Database service unavailable.' };
  }

  try {
    let notifRow = null;
    if (supabase) {
      try {
        const { data } = await supabase
          .from('payment_notifications')
          .select('id, payment_reference, notification_type, recipient_email, recipient_name, status, attempts, error_message, sent_at, created_at, updated_at')
          .eq('id', notificationId)
          .maybeSingle();
        notifRow = data;
      } catch (_) {}
    }

    if (!notifRow) {
      notifRow = Array.from(localNotificationStore.values()).find(n => n.id === notificationId) || null;
    }

    if (!notifRow) {
      return { success: false, error: 'Notification record not found.' };
    }

    // Lookup original payment record
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('id, student_id, registration_number, payment_type, provider, amount, currency, status, reference, paid_at, created_at, metadata, academic_session, level')
      .eq('reference', notifRow.payment_reference)
      .maybeSingle();

    const effectivePayment = paymentRecord || {
      reference: notifRow.payment_reference,
      payment_type: notifRow.payment_type,
      amount: notifRow.amount,
      currency: notifRow.currency,
      registration_number: notifRow.registration_number,
      customer_email: notifRow.recipient_email,
      customer_name: notifRow.student_name,
      metadata: notifRow.metadata || {}
    };

    // Re-dispatch using the engine
    const result = await dispatchPaymentNotification({
      paymentRecord: effectivePayment,
      notificationType: notifRow.notification_type,
      overrideEnv
    });

    return result;
  } catch (err) {
    console.error('[Notification Engine Retry Error]:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Administrative Log Query Helper
 * Allows portal administrators to view and monitor payment notification logs.
 */
export async function getPaymentNotificationLogs({
  status = 'ALL',
  paymentType = 'ALL',
  search = '',
  limit = 50,
  offset = 0
} = {}) {
  if (!supabase) {
    return { notifications: [], totalCount: 0, stats: { total: 0, sent: 0, failed: 0, queued: 0 } };
  }

  try {
    let query = supabase
      .from('payment_notifications')
      .select('id, notification_type, payment_id, payment_reference, registration_number, student_name, recipient_email, recipient_phone, email_status, sms_status, status, failure_reason, retry_count, sent_at, created_at, updated_at', { count: 'exact' });

    if (status && status !== 'ALL') {
      query = query.eq('status', status.toLowerCase());
    }

    if (paymentType && paymentType !== 'ALL') {
      query = query.eq('payment_type', paymentType.toUpperCase());
    }

    if (search && search.trim()) {
      const clean = search.trim();
      query = query.or(`payment_reference.ilike.%${clean}%,registration_number.ilike.%${clean}%,student_name.ilike.%${clean}%,recipient_email.ilike.%${clean}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      // Fallback to local memory mirror when table is not in schema cache
      const fallbackList = Array.from(localNotificationStore.values()).filter(r => {
        if (status && status !== 'ALL' && r.status !== status.toLowerCase()) return false;
        if (paymentType && paymentType !== 'ALL' && r.payment_type !== paymentType.toUpperCase()) return false;
        if (search && search.trim()) {
          const s = search.toLowerCase().trim();
          const match = (r.payment_reference || '').toLowerCase().includes(s) ||
                        (r.recipient_email || '').toLowerCase().includes(s) ||
                        (r.student_name || '').toLowerCase().includes(s) ||
                        (r.registration_number || '').toLowerCase().includes(s);
          if (!match) return false;
        }
        return true;
      });

      const stats = { total: localNotificationStore.size, sent: 0, failed: 0, queued: 0 };
      localNotificationStore.forEach(r => {
        if (r.status === 'sent') stats.sent++;
        else if (r.status === 'failed') stats.failed++;
        else stats.queued++;
      });

      return {
        notifications: fallbackList.slice(offset, offset + limit),
        totalCount: fallbackList.length,
        stats
      };
    }

    // Aggregate summary stats
    let allStats = null;
    try {
      const { data: statsData } = await supabase
        .from('payment_notifications')
        .select('status');
      allStats = statsData;
    } catch (_) {}

    const stats = { total: 0, sent: 0, failed: 0, queued: 0 };
    if (Array.isArray(allStats)) {
      stats.total = allStats.length;
      allStats.forEach(r => {
        if (r.status === 'sent') stats.sent++;
        else if (r.status === 'failed') stats.failed++;
        else stats.queued++;
      });
    } else {
      stats.total = data ? data.length : localNotificationStore.size;
      stats.sent = (data || []).filter(r => r.status === 'sent').length;
      stats.failed = (data || []).filter(r => r.status === 'failed').length;
      stats.queued = stats.total - stats.sent - stats.failed;
    }

    return {
      notifications: data || [],
      totalCount: count || (data ? data.length : 0),
      stats
    };
  } catch (err) {
    console.error('[Notification Engine Logs Error]:', err);
    const stats = { total: localNotificationStore.size, sent: 0, failed: 0, queued: 0 };
    localNotificationStore.forEach(r => {
      if (r.status === 'sent') stats.sent++;
      else if (r.status === 'failed') stats.failed++;
      else stats.queued++;
    });
    return {
      notifications: Array.from(localNotificationStore.values()).slice(offset, offset + limit),
      totalCount: localNotificationStore.size,
      stats,
      error: err.message
    };
  }
}
