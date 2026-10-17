/**
 * ============================================================================
 * NACOS FUTO: Dedicated Server-Side Bachs Payment Gateway Service
 * Target: NACOS Student ID Card Payment
 * Gateway: Bachs (https://bachs.io)
 * ============================================================================
 * 
 * Rules:
 * 1. Server-side authoritative: Amount & currency are strictly determined server-side.
 * 2. Idempotent: Webhook event deduplication via `webhook_events` table.
 * 3. Never expose BACHS_API_KEY or BACHS_WEBHOOK_SECRET to client bundles.
 * 4. Webhook is authoritative for payment confirmation; browser redirects are not proof.
 */
import './loadEnv.js';
import crypto from 'crypto';
import { supabase } from '../client.js';
import { sendPaymentConfirmationEmail } from './emailDispatcher.js';
import {
  dispatchPaymentNotification,
  retryPaymentNotification,
  getPaymentNotificationLogs
} from './paymentNotificationEngine.js';
import { 
  calculateAcademicProgression, 
  getActiveAcademicSession, 
  parseSessionYears 
} from '@nacos/config/academic';

const PAYMENT_RECORD_FIELDS = 'id, reference, provider_checkout_id, student_id, registration_number, payment_type, amount, currency, status, level, academic_session, metadata, provider, paid_at, created_at, updated_at';

// In-memory 30s cache for authoritative admin settings to eliminate repetitive database latency
let cachedIdCardSettings = null;
let cachedIdCardSettingsExpiry = 0;

export async function getCachedAuthoritativeSettings() {
  if (cachedIdCardSettings && Date.now() < cachedIdCardSettingsExpiry) {
    return cachedIdCardSettings;
  }
  try {
    if (supabase) {
      const { data } = await supabase
        .from('id_card_settings')
        .select('id, academic_session, id_card_fee, is_application_open, allow_reapplication_on_revoke, card_template_version, updated_at')
        .in('id', ['default', 'dues']);
      if (Array.isArray(data) && data.length > 0) {
        cachedIdCardSettings = data;
        cachedIdCardSettingsExpiry = Date.now() + 60000;
        return data;
      }
    }
  } catch (_) {}
  return cachedIdCardSettings || [];
}

/**
 * Authoritatively retrieves the global active academic session from database or central config
 */
export async function getAuthoritativeActiveSession() {
  try {
    const settings = await getCachedAuthoritativeSettings();
    const idRow = settings.find(r => r.id === 'default');
    if (idRow?.academic_session && typeof idRow.academic_session === 'string' && idRow.academic_session.includes('/')) {
      return idRow.academic_session.trim();
    }

    if (supabase) {
      const { data: settingRow } = await supabase
        .from('academic_settings')
        .select('current_session')
        .eq('id', 'default')
        .maybeSingle();

      if (settingRow?.current_session) {
        return settingRow.current_session;
      }
    }
  } catch (err) {
    console.warn('[Bachs] Error fetching authoritative academic session:', err.message);
  }
  return getActiveAcademicSession();
}

// Central Configuration & Validation
export function getBachsConfig() {
  const env = typeof process !== 'undefined' ? process.env : {};

  const rawEnv = (env.BACHS_ENVIRONMENT || 'production').trim().toLowerCase();
  const environment = (rawEnv === 'sandbox' || rawEnv === 'development' || rawEnv === 'test') ? 'sandbox' : 'production';
  const apiKey = (env.BACHS_API_KEY || '').trim();
  const webhookSecret = (env.BACHS_WEBHOOK_SECRET || '').trim();
  const productId = (env.BACHS_ID_CARD_PRODUCT_ID || 'nacos_id_card_2026').trim();

  const amount = env.NACOS_ID_CARD_AMOUNT ? Number(env.NACOS_ID_CARD_AMOUNT) : null;
  const currency = (env.NACOS_ID_CARD_CURRENCY || 'NGN').toUpperCase();

  const baseUrl = (env.BACHS_BASE_URL || (environment === 'production' 
    ? 'https://api.bachs.io' 
    : 'https://sandbox-api.bachs.io')).replace(/\/+$/, '');

  return {
    environment,
    apiKey,
    webhookSecret,
    productId,
    amount: isNaN(amount) || amount <= 0 ? null : amount,
    currency,
    baseUrl
  };
}

/**
 * Validate that student meets all ID Card eligibility requirements before payment
 */
export function validateStudentEligibility(student) {
  if (!student) {
    return { eligible: false, reason: 'Student session not found. Please log in.' };
  }

  const regNo = (student.registration_number || student.matric_number || student.matric || student.regNo || '').trim();
  if (!regNo) {
    return { eligible: false, reason: 'Missing verified institutional registration number.' };
  }

  const resolvedName = (
    student.full_name ||
    student.name ||
    [student.first_name, student.middle_name, student.surname || student.last_name].filter(Boolean).join(' ') ||
    regNo
  ).trim();

  return { eligible: true, registrationNumber: regNo, fullName: resolvedName || 'Student Member' };
}

/**
 * Dynamically resolves the authoritative fee configured by an admin on the dashboard
 * Works for ID Cards, Departmental Dues, Events, Store, or any Custom Payment.
 * The Admin Dashboard configuration (public.id_card_settings) is the authoritative Single Source of Truth.
 * If configuration is missing or unavailable, returns null (never hardcodes 5000 or arbitrary defaults).
 */
export async function resolveDynamicFee({ paymentType = 'ID_CARD', academicSession = null, metadata = {} }) {
  const pType = (paymentType || 'ID_CARD').toUpperCase();
  const feeKey = pType.toLowerCase();
  const targetSession = String(academicSession || metadata?.academicSession || metadata?.academic_session || await getAuthoritativeActiveSession()).trim();

  try {
    const settings = await getCachedAuthoritativeSettings();
    // 1. Primary Source of Truth: Supabase id_card_settings table configured by Admin Dashboard
    if (pType === 'ID_CARD') {
      const idCardRow = settings.find(r => r.id === 'default');
      if (idCardRow && idCardRow.id_card_fee != null) {
        const fee = Number(idCardRow.id_card_fee);
        if (!isNaN(fee) && fee > 0) {
          return fee;
        }
      }
    } else if (pType === 'DEPARTMENTAL_DUES' || pType === 'DUES') {
      const duesRow = settings.find(r => r.id === 'dues');
      if (duesRow && duesRow.id_card_fee != null) {
        const fee = Number(duesRow.id_card_fee);
        if (!isNaN(fee) && fee > 0) {
          return fee;
        }
      }
    } else if (pType === 'EVENT' || pType === 'EVENT_TICKET') {
      if (metadata?.eventId && supabase) {
        const { data: eventRow } = await supabase
          .from('website_events')
          .select('ticket_price, fee')
          .eq('id', metadata.eventId)
          .maybeSingle();

        const eventPrice = eventRow?.ticket_price || eventRow?.fee;
        if (eventPrice != null && !isNaN(Number(eventPrice)) && Number(eventPrice) > 0) {
          return Number(eventPrice);
        }
      }
    }

    if (supabase) {
      // 2. Secondary check: public.payment_fees table (Session-aware institutional fee registry)
      const { data: feeRow } = await supabase
        .from('payment_fees')
        .select('amount')
        .eq('fee_key', feeKey)
        .eq('academic_session', targetSession)
        .eq('is_active', true)
        .maybeSingle();

      if (feeRow?.amount != null && !isNaN(Number(feeRow.amount)) && Number(feeRow.amount) > 0) {
        return Number(feeRow.amount);
      }
    }
  } catch (err) {
    console.warn(`[Bachs] Dynamic fee resolution warning for ${pType}:`, err.message);
  }


  // 3. Fallback to process.env explicitly set for that specific fee key (if set)
  const env = typeof process !== 'undefined' ? process.env : {};
  if (pType === 'ID_CARD') {
    if (env.NACOS_ID_CARD_AMOUNT) {
      const envAmt = Number(env.NACOS_ID_CARD_AMOUNT);
      if (!isNaN(envAmt) && envAmt > 0) return envAmt;
    }
  } else if (pType === 'DEPARTMENTAL_DUES' || pType === 'DUES') {
    if (env.NACOS_DUES_AMOUNT) {
      const envAmt = Number(env.NACOS_DUES_AMOUNT);
      if (!isNaN(envAmt) && envAmt > 0) return envAmt;
    }
  }

  // Strictly return null if configuration is unavailable - NEVER substitute hardcoded amounts!
  return null;
}

/**
 * Returns the authoritative active global academic session
 */
export function getDynamicAcademicSession() {
  return getActiveAcademicSession();
}

/**
 * Universal Post-Payment Fulfillment Router for ANY Payment Type
 */
async function fulfillSuccessfulPayment(paymentRecord, now) {
  if (!supabase || !paymentRecord) return;
  const pType = (paymentRecord.payment_type || 'ID_CARD').toUpperCase();
  const regNo = (paymentRecord.registration_number || paymentRecord.matric_number || '').trim();
  const studentId = paymentRecord.student_id;

  // 1-Year Expiry calculation (365 days from paid date)
  const renewalDate = new Date(now);
  renewalDate.setDate(renewalDate.getDate() + 365);
  const renewalDateStr = renewalDate.toISOString().split('T')[0];

  try {
    if (pType === 'ID_CARD') {
      // 1. Fetch student's profile to see if profile photo already exists
      let existingPhoto = null;
      let studentName = paymentRecord.metadata?.customer_name || 'Student Member';

      let studentLevel = '100';

      try {
        let profQuery = supabase.from('profiles').select('id, full_name, level, current_level, profile_photo_url, avatar_url, photo_url, registration_number, matric_number');
        if (regNo && studentId && studentId.length === 36) {
          profQuery = profQuery.or(`registration_number.eq.${regNo},matric_number.eq.${regNo},id.eq.${studentId}`);
        } else if (regNo) {
          profQuery = profQuery.or(`registration_number.eq.${regNo},matric_number.eq.${regNo}`);
        } else if (studentId) {
          profQuery = profQuery.eq('id', studentId);
        }
        const { data: profData } = await profQuery.maybeSingle();
        if (profData) {
          existingPhoto = profData.profile_photo_url || profData.avatar_url || profData.photo_url || null;
          studentName = profData.full_name || studentName;
          studentLevel = String(profData.level || profData.current_level || '100').replace(/[^0-9]/g, '') || '100';
        }
      } catch (profErr) {
        console.warn('[Bachs Fulfillment] Profile lookup notice:', profErr.message);
      }

      if (paymentRecord.metadata?.level) {
        studentLevel = String(paymentRecord.metadata.level).replace(/[^0-9]/g, '') || studentLevel;
      }

      // 2. Check for existing ID Card Application
      let appQuery = supabase.from('id_card_applications').select('id, student_id, registration_number, matric_number, academic_session, payment_status, id_card_status, card_status, is_cleared, created_at, updated_at');
      if (regNo && studentId && studentId.length === 36) {
        appQuery = appQuery.or(`registration_number.eq.${regNo},matric_number.eq.${regNo},student_id.eq.${studentId}`);
      } else if (regNo) {
        appQuery = appQuery.or(`registration_number.eq.${regNo},matric_number.eq.${regNo}`);
      } else if (studentId) {
        appQuery = appQuery.eq('student_id', studentId);
      }
      const { data: existingApp } = await appQuery.maybeSingle();

      const resolvedPhoto = existingApp?.passport_url || existingPhoto || null;
      const cleanDigits = String(regNo).replace(/\D/g, '') || String(regNo).trim() || `ID${Date.now().toString().slice(-6)}`;
      const targetStatus = resolvedPhoto ? 'generated' : 'photo_required';
      const paymentSession = paymentRecord.metadata?.academic_session || paymentRecord.academic_session || getDynamicAcademicSession(now);

      const paidLevelNum = parseInt(studentLevel, 10) || 100;
      const existingLevelNum = existingApp?.level ? (parseInt(String(existingApp.level).replace(/[^0-9]/g, ''), 10) || 0) : 0;
      const shouldUpdateAppLevel = !existingApp || !existingApp.level || paidLevelNum >= existingLevelNum;

      if (existingApp) {
        const updatePayload = {
          payment_reference: paymentRecord.reference,
          amount: paymentRecord.amount,
          paid_at: now,
          card_expiry_date: renewalDateStr,
          passport_url: resolvedPhoto,
          passport_photo_url: resolvedPhoto,
          full_name: studentName,
          registration_number: regNo,
          matric_number: regNo,
          id_card_number: existingApp.id_card_number || cleanDigits,
          payment_status: 'paid',
          status: targetStatus,
          updated_at: now
        };

        // If paying for the active or higher level, update application level and session
        if (shouldUpdateAppLevel) {
          updatePayload.level = `${studentLevel} Level`;
          updatePayload.academic_session = paymentSession;
          updatePayload.generated_at = resolvedPhoto ? (existingApp.generated_at || now) : existingApp.generated_at;
        } else if (resolvedPhoto && !existingApp.generated_at) {
          updatePayload.generated_at = now;
        }

        await supabase
          .from('id_card_applications')
          .update(updatePayload)
          .eq('id', existingApp.id);
      } else {
        // Create application row immediately
        await supabase
          .from('id_card_applications')
          .insert({
            student_id: studentId && studentId.length === 36 ? studentId : null,
            matric_number: regNo,
            registration_number: regNo,
            full_name: studentName,
            level: `${studentLevel} Level`,
            academic_session: paymentSession,
            application_number: `APP-${Date.now().toString().slice(-6)}`,
            id_card_number: cleanDigits,
            status: targetStatus,
            payment_status: 'paid',
            payment_reference: paymentRecord.reference,
            amount: paymentRecord.amount,
            passport_url: resolvedPhoto,
            passport_photo_url: resolvedPhoto,
            paid_at: now,
            card_expiry_date: renewalDateStr,
            generated_at: resolvedPhoto ? now : null,
            created_at: now,
            updated_at: now
          });
      }
    } else if (pType === 'DEPARTMENTAL_DUES' || pType === 'DUES') {
      const activeSession = paymentRecord.metadata?.academic_session || paymentRecord.academic_session || getDynamicAcademicSession(now);
      const duesLevel = paymentRecord.metadata?.level || paymentRecord.level || 'All';
      
      await supabase
        .from('dues_payments')
        .upsert({
          registration_number: regNo,
          student_id: studentId,
          amount: paymentRecord.amount,
          payment_reference: paymentRecord.reference,
          payment_method: paymentRecord.provider || 'ONLINE_GATEWAY',
          status: 'cleared',
          session: activeSession,
          level: duesLevel,
          created_at: now,
          updated_at: now
        }, { onConflict: 'payment_reference' });

      try {
        await supabase
          .from('departmental_dues')
          .upsert({
            registration_number: regNo,
            session: activeSession,
            amount: paymentRecord.amount,
            status: 'paid',
            reference: paymentRecord.reference,
            paid_at: now,
            created_at: now
          }, { onConflict: 'reference' });
      } catch (dErr) {
        console.warn('[Dues Fulfillment] departmental_dues sync notice:', dErr.message);
      }

      const cleanDigits = String(regNo || '').replace(/\D/g, '');
      const filterVariants = [];
      if (regNo) {
        filterVariants.push(`registration_number.eq.${regNo}`);
        filterVariants.push(`matric_number.eq.${regNo}`);
      }
      if (cleanDigits && cleanDigits !== regNo) {
        filterVariants.push(`registration_number.eq.${cleanDigits}`);
        filterVariants.push(`matric_number.eq.${cleanDigits}`);
      }
      if (studentId && String(studentId).length === 36) {
        filterVariants.push(`id.eq.${studentId}`);
      }
      const orFilterStr = filterVariants.join(',');

      try {
        await supabase
          .from('profiles')
          .update({
            dues_cleared: true,
            has_paid_dues: true,
            dues_paid_at: now,
            updated_at: now
          })
          .or(orFilterStr);
      } catch (pErr) {
        console.warn('[Dues Fulfillment] profiles update notice:', pErr.message);
      }

      try {
        const vsFilterVariants = [];
        if (regNo) vsFilterVariants.push(`registration_number.eq.${regNo}`);
        if (cleanDigits && cleanDigits !== regNo) vsFilterVariants.push(`registration_number.eq.${cleanDigits}`);
        if (studentId && String(studentId).length === 36) vsFilterVariants.push(`id.eq.${studentId}`);
        if (vsFilterVariants.length > 0) {
          await supabase
            .from('verified_students')
            .update({
              dues_cleared: true,
              has_paid_dues: true,
              dues_paid_at: now,
              updated_at: now
            })
            .or(vsFilterVariants.join(','));
        }
      } catch (vsErr) {
        console.warn('[Dues Fulfillment] verified_students sync notice:', vsErr.message);
      }
    } else if (pType === 'EVENT' || pType === 'EVENT_TICKET') {
      if (paymentRecord.metadata?.event_id) {
        await supabase
          .from('event_registrations')
          .update({
            payment_status: 'paid',
            payment_reference: paymentRecord.reference,
            confirmed_at: now
          })
          .eq('event_id', paymentRecord.metadata.event_id)
          .or(`registration_number.eq.${regNo},email.eq.${paymentRecord.metadata?.customer_email}`);
      }
    }
    
    // Authoritative idempotent automated email notification via paymentNotificationEngine
    try {
      await dispatchPaymentNotification({
        paymentRecord,
        notificationType: 'PAYMENT_SUCCESS'
      });
    } catch (notifErr) {
      console.warn('[Bachs Payment Notification Notice]:', notifErr.message);
    }
  } catch (err) {
    console.error(`[Bachs Fulfillment Error] Failed for ${pType}:`, err.message);
  }
}

/**
 * Universal Authoritative Checkout Session Creator for ANY Payment Type
 */
export async function createPaymentCheckout({
  paymentType = 'ID_CARD',
  title = '',
  student = null,
  customer = null,
  metadata = {},
  returnBaseUrl = '',
  redirectPath = '',
  cancelPath = '',
  amountOverride = null
}) {
  const config = getBachsConfig();
  const normalizedType = (paymentType || 'ID_CARD').toUpperCase();

  // 1. Identify customer / student details
  const regNo = (student?.registration_number || student?.matric_number || student?.matric || student?.regNo || customer?.registration_number || customer?.regNo || '').trim();
  const studentId = String(student?.id || customer?.id || regNo || `cust_${Date.now()}`);
  const customerName = (student?.full_name || student?.name || customer?.name || customer?.full_name || `${customer?.first_name || ''} ${customer?.last_name || ''}`).trim() || 'Student / Customer';
  const customerEmail = (student?.email || customer?.email || (regNo ? `${regNo.toLowerCase()}@futo.edu.ng` : 'support@nacosfuto.com.ng')).trim();
  const customerPhone = (student?.phone_number || student?.phone || customer?.phone || '').trim();

  // 1b. Determine authoritative session and progressive level
  const globalActiveSession = await getAuthoritativeActiveSession();
  const sessionYears = parseSessionYears(globalActiveSession);

  // Authoritative student progression under currently active session configured by admin
  const progression = calculateAcademicProgression(student || customer || { registration_number: regNo }, {
    targetSessionStartYear: sessionYears.startYear
  });

  const maxAllowedLevel = (progression && progression.valid && progression.numericLevel)
    ? progression.numericLevel * 100
    : 100;

  const targetSession = String(
    metadata?.academicSession || 
    metadata?.academic_session || 
    globalActiveSession
  ).trim();

  const requestedLevelNum = metadata?.level ? String(metadata.level).replace(/[^0-9]/g, '') : '';
  const requestedLevelInt = requestedLevelNum ? parseInt(requestedLevelNum, 10) : maxAllowedLevel;

  // Enforce progressive academic level restriction: students cannot initiate payments for future academic levels
  if (
    (normalizedType === 'ID_CARD' || normalizedType === 'DEPARTMENTAL_DUES' || normalizedType === 'DUES' || requestedLevelNum) &&
    requestedLevelInt > maxAllowedLevel
  ) {
    return {
      error: `Payment not allowed: You cannot initiate payment for future academic level (${requestedLevelInt} Level). Your active academic level is ${progression.levelString || `${maxAllowedLevel} Level`} under active session ${globalActiveSession}.`,
      statusCode: 403,
      progression
    };
  }

  const studentLevelDisplay = requestedLevelNum
    ? `${requestedLevelNum} Level`
    : (progression.level || (student?.level ? `${student.level} Level` : '100 Level'));
  const studentNumericLevel = requestedLevelNum ? parseInt(requestedLevelNum, 10) : (progression.numericLevel || 1);

  // 2. Prevent duplicate charges for non-repeatable payments
  try {
    if (supabase && (regNo || studentId)) {
      let dupQuery = supabase
        .from('payments')
        .select('id, reference, amount, payment_type, status, level, academic_session, metadata, provider, paid_at, created_at')
        .eq('payment_type', normalizedType)
        .in('status', ['successful']);

      if (metadata?.eventId) {
        dupQuery = dupQuery.eq('metadata->>event_id', String(metadata.eventId));
      }
      if (regNo && studentId) {
        dupQuery = dupQuery.or(`registration_number.eq.${regNo},student_id.eq.${studentId}`);
      } else if (regNo) {
        dupQuery = dupQuery.eq('registration_number', regNo);
      }

      // Session & Level deduplication for session/level-based payments (DEPARTMENTAL_DUES and ID_CARD)
      if (normalizedType === 'DEPARTMENTAL_DUES' || normalizedType === 'DUES') {
        const checkLevel = requestedLevelNum || String(studentNumericLevel);
        const { data: allDuesPayments } = await dupQuery;
        if (Array.isArray(allDuesPayments) && allDuesPayments.length > 0) {
          const matchingPaid = allDuesPayments.find(p => {
            const pLvl = String(p.level || p.metadata?.level || '').replace(/[^0-9]/g, '');
            const pSess = String(p.academic_session || p.metadata?.academic_session || p.metadata?.academicSession || '').trim();
            const sessMatch = pSess === targetSession;
            const lvlMatch = Boolean(pLvl && checkLevel && pLvl === checkLevel);
            return sessMatch || lvlMatch;
          });
          if (matchingPaid) {
            return {
              error: `Departmental dues payment for ${matchingPaid.level || checkLevel + ' Level'} (${matchingPaid.academic_session || targetSession}) is already completed and confirmed.`,
              statusCode: 409,
              alreadyPaid: true,
              payment: matchingPaid
            };
          }
        }

        // Also check departmental_dues table directly
        try {
          const { data: deptDuesRecord } = await supabase
            .from('departmental_dues')
            .select('id, registration_number, session, level, amount, status, reference')
            .eq('registration_number', regNo)
            .eq('session', targetSession)
            .in('status', ['paid', 'verified', 'cleared'])
            .maybeSingle();

          if (deptDuesRecord) {
            return {
              error: `Departmental dues payment for session ${targetSession} is already completed.`,
              statusCode: 409,
              alreadyPaid: true,
              payment: deptDuesRecord
            };
          }
        } catch (_) {}
      } else if (normalizedType === 'ID_CARD') {
        const checkLevel = requestedLevelNum || String(studentNumericLevel);
        const { data: allIdPayments } = await dupQuery;
        if (Array.isArray(allIdPayments) && allIdPayments.length > 0) {
          const matchingIdPaid = allIdPayments.find(p => {
            const pLvl = String(p.level || p.metadata?.level || '').replace(/[^0-9]/g, '');
            const pSess = String(p.academic_session || p.metadata?.academic_session || p.metadata?.academicSession || '').trim();
            if (pLvl && checkLevel && pLvl !== checkLevel) {
              return false;
            }
            const levelMatch = Boolean(pLvl && checkLevel && pLvl === checkLevel);
            const sessionMatch = Boolean(pSess && targetSession && pSess === targetSession);
            return levelMatch || (sessionMatch && !pLvl);
          });
          if (matchingIdPaid) {
            return {
              error: `ID card payment for ${matchingIdPaid.level || checkLevel + ' Level'} (${matchingIdPaid.academic_session || targetSession}) is already completed and verified.`,
              statusCode: 409,
              alreadyPaid: true,
              payment: matchingIdPaid
            };
          }
        }

        // Also check id_card_applications - BUT ONLY if matching the exact level!
        try {
          const { data: existingApp } = await supabase
            .from('id_card_applications')
            .select('id, registration_number, level, payment_status')
            .eq('registration_number', regNo)
            .in('payment_status', ['paid', 'verified'])
            .maybeSingle();

          if (existingApp) {
            const appLvl = String(existingApp.level || '').replace(/[^0-9]/g, '');
            if (appLvl && checkLevel && appLvl === checkLevel) {
              return {
                error: `ID card application is already paid and verified for ${checkLevel} Level.`,
                statusCode: 409,
                alreadyPaid: true,
                payment: existingApp
              };
            }
          }
        } catch (_) {}
      } else {
        const { data: existingPaid } = await dupQuery.maybeSingle();
        if (existingPaid) {
          return {
            error: `${title || normalizedType} payment already completed and confirmed.`,
            statusCode: 409,
            alreadyPaid: true,
            payment: existingPaid
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Bachs] Error checking existing payments:', err);
  }

  // 3. Dynamically Resolve Authoritative Fee Set by Admin on Dashboard (Never Hardcoded)
  // Protected system fees (ID Card, Departmental Dues) can never be overridden by client requests
  let chargeAmount = null;
  const isProtectedFee = (
    normalizedType === 'ID_CARD' || 
    normalizedType === 'DEPARTMENTAL_DUES' || 
    normalizedType === 'DUES'
  );

  if (!isProtectedFee && amountOverride && !isNaN(Number(amountOverride)) && Number(amountOverride) > 0) {
    chargeAmount = Number(amountOverride);
  } else {
    chargeAmount = await resolveDynamicFee({ 
      paymentType: normalizedType, 
      academicSession: targetSession, 
      metadata
    });
  }

  // Strictly enforce that configured amount is valid and present - never proceed with missing amount
  if (chargeAmount === null || isNaN(chargeAmount) || chargeAmount <= 0) {
    console.error(`[Bachs Checkout] Payment fee configuration missing or invalid for ${normalizedType} (session: ${targetSession}). Aborting checkout initialization.`);
    return {
      error: 'The payment fee amount for this service is currently unavailable. Please try again later or contact the administrator.',
      statusCode: 503
    };
  }

  // 4. Generate Unique Internal Reference
  const cleanType = normalizedType.replace(/[^A-Z0-9]/g, '');
  const cleanIdent = (regNo || studentId).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
  const reference = `NACOS-${cleanType}-${cleanIdent}-${Date.now()}`;
  const now = new Date().toISOString();

  // 5. Build Authoritative Redirect URLs
  const baseUrl = returnBaseUrl ? returnBaseUrl.replace(/\/$/, '') : 'http://localhost:5173';
  const defRedirect = redirectPath || `/payment/verify?reference=${encodeURIComponent(reference)}`;
  const defCancel = cancelPath || `/payment/cancelled?reference=${encodeURIComponent(reference)}`;
  const returnUrl = defRedirect.startsWith('http') ? defRedirect : `${baseUrl}${defRedirect.startsWith('/') ? '' : '/'}${defRedirect}`;
  const cancelUrl = defCancel.startsWith('http') ? defCancel : `${baseUrl}${defCancel.startsWith('/') ? '' : '/'}${defCancel}`;

  // 6 & 7. Concurrently create payment record in Supabase AND call Bachs API
  let paymentRecordId = crypto.randomUUID();
  const productId = metadata?.productId || `${config.productId}_${normalizedType.toLowerCase()}`;
  const insertPromise = (async () => {
    try {
      if (supabase) {
        const { data: inserted, error: insertErr } = await supabase
          .from('payments')
          .insert({
            id: paymentRecordId,
            student_id: studentId,
            registration_number: regNo || null,
            payment_type: normalizedType,
            provider: 'BACHS',
            amount: chargeAmount,
            currency: config.currency,
            status: 'pending',
            reference: reference,
            metadata: {
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              payment_title: title || normalizedType,
              product_id: productId,
              environment: config.environment,
              academic_session: targetSession,
              academicSession: targetSession,
              level: studentLevelDisplay,
              numeric_level: studentNumericLevel,
              session_start_year: sessionYears.startYear,
              created_at: now,
              ...metadata
            },
            created_at: now,
            updated_at: now
          })
          .select('id')
          .single();

        if (!insertErr && inserted?.id) {
          paymentRecordId = inserted.id;
        }
      }
    } catch (dbErr) {
      console.warn('[Bachs] Pending payment record creation error:', dbErr);
    }
  })();

  let checkoutUrl = '';
  let providerCheckoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const bachsPromise = (async () => {
    const isLiveKey = config.apiKey && !config.apiKey.includes('sample') && !config.apiKey.includes('your_key');
    if (!isLiveKey) {
      throw new Error('Valid server-side BACHS_API_KEY is not configured');
    }

    const publicOrigin = (
      process.env.PUBLIC_PORTAL_URL || 
      process.env.NEXT_PUBLIC_PORTAL_URL || 
      process.env.VITE_PORTAL_URL || 
      'https://nacosfuto.com.ng/portal'
    ).replace(/\/+$/, '');

    const isLocalReturn = returnUrl.includes('localhost') || returnUrl.includes('127.0.0.1');
    const isLocalCancel = cancelUrl.includes('localhost') || cancelUrl.includes('127.0.0.1');

    let bachsSuccessUrl = isLocalReturn
      ? `${publicOrigin}${defRedirect.startsWith('/') ? '' : '/'}${defRedirect}`
      : returnUrl;

    let bachsCancelUrl = isLocalCancel
      ? `${publicOrigin}${defCancel.startsWith('/') ? '' : '/'}${defCancel}`
      : cancelUrl;

    if (!bachsSuccessUrl.includes('reference=')) {
      bachsSuccessUrl += (bachsSuccessUrl.includes('?') ? '&' : '?') + `reference=${encodeURIComponent(reference)}`;
    }
    if (!bachsCancelUrl.includes('reference=')) {
      bachsCancelUrl += (bachsCancelUrl.includes('?') ? '&' : '?') + `reference=${encodeURIComponent(reference)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch(`${config.baseUrl}/v1/checkout-sessions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: {
            name: customerName,
            email: customerEmail,
            ...(customerPhone ? { phone: customerPhone } : {})
          },
          pricing: {
            amount: Number(chargeAmount).toFixed(2),
            currency: config.currency || 'NGN'
          },
          success_url: bachsSuccessUrl,
          cancel_url: bachsCancelUrl,
          reference: reference,
          metadata: {
            student_id: studentId,
            registration_number: regNo,
            payment_type: normalizedType,
            payment_record_id: paymentRecordId,
            product_id: productId,
            ...metadata
          }
        })
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const result = await response.json();
    if (!response.ok || !result) {
      console.error('[Bachs Live] API checkout session creation failed:', response.status, result);
      throw new Error(result?.detail || result?.message || result?.error || `Bachs API error (status ${response.status})`);
    }

    const cUrl = result.checkout_url || result.url;
    const pId = result.checkout_id || result.id || providerCheckoutId;

    if (!cUrl) {
      console.error('[Bachs Live] Missing checkout_url in Bachs response:', result);
      throw new Error('Bachs API responded without a valid hosted checkout_url.');
    }

    return { checkoutUrl: cUrl, providerCheckoutId: pId };
  })();

  try {
    const [_, bachsResult] = await Promise.all([insertPromise, bachsPromise]);
    checkoutUrl = bachsResult.checkoutUrl;
    providerCheckoutId = bachsResult.providerCheckoutId;
  } catch (apiErr) {
    console.error('[Bachs Checkout Error]:', apiErr.message);
    return {
      error: `Payment checkout gateway error: ${apiErr.message}`,
      statusCode: 502
    };
  }

  // 8. Update payment record with provider checkout details asynchronously (non-blocking)
  if (supabase) {
    supabase
      .from('payments')
      .update({
        provider_checkout_id: providerCheckoutId,
        metadata: {
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          payment_title: title || normalizedType,
          product_id: productId,
          environment: config.environment,
          checkout_url: checkoutUrl,
          updated_at: new Date().toISOString(),
          ...metadata
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentRecordId)
      .then(() => {})
      .catch(updateErr => console.warn('[Bachs] Error updating provider_checkout_id:', updateErr));
  }

  return {
    success: true,
    checkoutUrl,
    paymentId: paymentRecordId,
    providerCheckoutId,
    reference,
    amount: chargeAmount,
    currency: config.currency,
    paymentType: normalizedType,
    environment: config.environment
  };
}

/**
 * Creates an authoritative Bachs checkout session for NACOS Student ID Card
 */
export async function createIdCardCheckout({ student, returnBaseUrl, academicSession = null, level = null }) {
  const eligibility = validateStudentEligibility(student);
  if (!eligibility.eligible) {
    return { error: eligibility.reason, statusCode: 400 };
  }

  const globalActiveSession = await getAuthoritativeActiveSession();
  const sessionYears = parseSessionYears(globalActiveSession);
  const progression = calculateAcademicProgression(student, { targetSessionStartYear: sessionYears.startYear });
  const maxAllowedLevel = (progression && progression.valid && progression.numericLevel)
    ? progression.numericLevel * 100
    : 100;

  const reqLvlNum = level ? parseInt(String(level).replace(/[^0-9]/g, ''), 10) : maxAllowedLevel;
  if (!isNaN(reqLvlNum) && reqLvlNum > maxAllowedLevel) {
    return {
      error: `Payment not allowed: You cannot initiate payment for future academic level (${reqLvlNum} Level). Your active academic level is ${progression.levelString || `${maxAllowedLevel} Level`} under active session ${globalActiveSession}.`,
      statusCode: 403,
      progression
    };
  }

  const targetSession = String(academicSession || globalActiveSession).trim();
  const targetLevel = level ? (String(level).includes('Level') ? String(level) : `${level} Level`) : (progression.level || '100 Level');

  return createPaymentCheckout({
    paymentType: 'ID_CARD',
    title: `NACOS Student ID Card — ${targetLevel} (${targetSession})`,
    student,
    metadata: {
      academicSession: targetSession,
      academic_session: targetSession,
      level: targetLevel
    },
    returnBaseUrl,
    redirectPath: '/payment/success?paymentType=id_card',
    cancelPath: '/id-card?payment=cancelled'
  });
}

/**
 * Creates an authoritative Bachs checkout session for Departmental Dues Clearance
 */
export async function createDuesCheckout({ student, returnBaseUrl, academicSession = null, level = null }) {
  const eligibility = validateStudentEligibility(student);
  if (!eligibility.eligible) {
    return { error: eligibility.reason, statusCode: 400 };
  }

  const globalActiveSession = await getAuthoritativeActiveSession();
  const sessionYears = parseSessionYears(globalActiveSession);
  const progression = calculateAcademicProgression(student, { targetSessionStartYear: sessionYears.startYear });
  const maxAllowedLevel = (progression && progression.valid && progression.numericLevel)
    ? progression.numericLevel * 100
    : 100;

  const reqLvlNum = level ? parseInt(String(level).replace(/[^0-9]/g, ''), 10) : maxAllowedLevel;
  if (!isNaN(reqLvlNum) && reqLvlNum > maxAllowedLevel) {
    return {
      error: `Payment not allowed: You cannot initiate payment for future academic level (${reqLvlNum} Level). Your active academic level is ${progression.levelString || `${maxAllowedLevel} Level`} under active session ${globalActiveSession}.`,
      statusCode: 403,
      progression
    };
  }

  const targetSession = String(academicSession || globalActiveSession).trim();
  const targetLevel = level ? (String(level).includes('Level') ? String(level) : `${level} Level`) : (progression.level || '100 Level');

  return createPaymentCheckout({
    paymentType: 'DEPARTMENTAL_DUES',
    title: `NACOS Departmental Dues (${targetSession})`,
    student,
    metadata: { 
      academicSession: targetSession, 
      academic_session: targetSession, 
      level: targetLevel 
    },
    returnBaseUrl,
    redirectPath: '/payment/success?paymentType=dues',
    cancelPath: '/dues?payment=cancelled'
  });
}

/**
 * Creates an authoritative Bachs checkout session for Paid Event Registrations & Tickets
 */
export async function createEventTicketCheckout({ eventId, eventTitle, attendee, returnBaseUrl, ticketAmount }) {
  return createPaymentCheckout({
    paymentType: 'EVENT_TICKET',
    title: eventTitle ? `Ticket: ${eventTitle}` : 'NACOS Event Ticket',
    customer: attendee,
    metadata: { eventId, eventTitle },
    amountOverride: ticketAmount,
    returnBaseUrl,
    redirectPath: `/events?payment=verifying&eventId=${encodeURIComponent(eventId)}`,
    cancelPath: `/events?payment=cancelled&eventId=${encodeURIComponent(eventId)}`
  });
}

/**
 * Verify Webhook Signature via HMAC SHA-256
 */
export function verifyBachsWebhookSignature(rawBody, signatureHeader) {
  const { webhookSecret } = getBachsConfig();
  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Bachs Webhook] No BACHS_WEBHOOK_SECRET defined in production.');
      return false;
    }
    return true;
  }

  if (!signatureHeader || !rawBody) {
    console.warn('[Bachs Webhook] Missing signature header or body for signature verification.');
    return false;
  }

  try {
    const cleanSig = String(signatureHeader).replace(/^sha256[=:]/i, '').trim().toLowerCase();
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

    const computed = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyStr)
      .digest('hex')
      .toLowerCase();

    if (computed === cleanSig) return true;

    // Fallback: If body was an object or had whitespace, try stringifying rawBody
    if (typeof rawBody === 'object') {
      const altComputed = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(rawBody))
        .digest('hex')
        .toLowerCase();
      if (altComputed === cleanSig) return true;
    }

    // Safe comparison if buffer lengths match
    const bComputed = Buffer.from(computed, 'utf8');
    const bHeader = Buffer.from(cleanSig, 'utf8');
    if (bComputed.length === bHeader.length) {
      return crypto.timingSafeEqual(bComputed, bHeader);
    }

    console.warn(`[Bachs Webhook] Signature mismatch. Received: ${cleanSig.slice(0, 8)}... vs Computed: ${computed.slice(0, 8)}...`);
    return false;
  } catch (err) {
    console.error('[Bachs] Webhook signature verification error:', err);
    return false;
  }
}

/**
 * Process Bachs Webhook Event Idempotently for ANY Payment Type
 */
export async function processBachsWebhook(event) {
  if (!event || typeof event !== 'object') {
    return { success: true, message: 'Empty or invalid ping payload acknowledged.', statusCode: 200 };
  }

  const rawEventType = String(
    event.event_type ||
    event.type ||
    event.event ||
    event.name ||
    (event.status ? 'status.update' : 'generic.event')
  ).toLowerCase().trim();

  // Normalize separators: e.g. "collection succeeded", "collection_succeeded", "collection.succeeded" -> "collection.succeeded"
  const eventType = rawEventType.replace(/[\s_-]+/g, '.');

  // Handshake / Ping / Verification check from Bachs Gateway
  if (
    eventType === 'ping' ||
    eventType === 'test' ||
    eventType.includes('webhook.test') ||
    eventType.includes('endpoint.verification') ||
    eventType.includes('ping')
  ) {
    return { success: true, message: 'Bachs webhook endpoint is operational.', statusCode: 200 };
  }

  const eventId = String(event.id || event.event_id || event.data?.id || `evt_${Date.now()}`);
  const payload = event.data || event;
  const now = new Date().toISOString();

  // 1. Idempotency Check via `webhook_events` Table
  try {
    if (supabase) {
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id, provider, event_id, processed')
        .eq('provider', 'BACHS')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvent && existingEvent.processed) {
        console.log(`[Bachs Webhook] Duplicate event ${eventId} already processed.`);
        return { success: true, message: 'Event already processed idempotently', alreadyProcessed: true };
      }

      await supabase
        .from('webhook_events')
        .upsert({
          provider: 'BACHS',
          event_id: eventId,
          event_type: eventType,
          payload: event,
          processed: false,
          created_at: now
        }, { onConflict: 'provider,event_id' });
    }
  } catch (idempErr) {
    console.warn('[Bachs Webhook] Idempotency record error:', idempErr);
  }

  // 2. Identify transaction outcome events from Bachs Dashboard
  const isPaymentSuccess = 
    eventType.includes('collection.succeeded') ||
    eventType.includes('checkout.completed') ||
    eventType.includes('payment.successful') ||
    eventType.includes('payment.success') ||
    eventType.includes('charge.success') ||
    eventType.includes('invoice.paid') ||
    payload.status === 'successful' ||
    payload.status === 'paid' ||
    payload.status === 'completed';

  const isPaymentFailed = 
    eventType.includes('collection.failed') ||
    eventType.includes('collection.underpaid') ||
    eventType.includes('checkout.failed') ||
    eventType.includes('checkout.expired') ||
    eventType.includes('checkout.cancelled') ||
    eventType.includes('payment.failed') ||
    eventType.includes('payment.cancelled') ||
    eventType.includes('charge.failed') ||
    eventType.includes('invoice.payment.failed') ||
    payload.status === 'failed' ||
    payload.status === 'cancelled' ||
    payload.status === 'expired';

  const isPaymentRefunded = 
    eventType.includes('refund.paid') ||
    eventType.includes('refund.created') ||
    eventType.includes('payment.reversed') ||
    eventType.includes('payment.refunded') ||
    eventType.includes('charge.refunded') ||
    eventType.includes('dispute.lost') ||
    payload.status === 'refunded' ||
    payload.status === 'reversed';

  // Handle Definitively Failed Payments
  if (isPaymentFailed) {
    const reference = payload.reference || payload.metadata?.reference;
    const providerCheckoutId = payload.checkout_id || payload.session_id || '';
    let paymentRecord = null;
    if (supabase) {
      try {
        let q = supabase.from('payments').select(PAYMENT_RECORD_FIELDS);
        if (reference) q = q.eq('reference', reference);
        else if (providerCheckoutId) q = q.eq('provider_checkout_id', providerCheckoutId);
        const { data } = await q.maybeSingle();
        paymentRecord = data;

        if (paymentRecord && paymentRecord.status !== 'successful') {
          await supabase.from('payments').update({
            status: 'failed',
            updated_at: now,
            metadata: {
              ...paymentRecord.metadata,
              failed_at: now,
              failure_reason: payload.failure_reason || payload.message || 'Payment failed or cancelled'
            }
          }).eq('id', paymentRecord.id);

          await dispatchPaymentNotification({
            paymentRecord: { ...paymentRecord, status: 'failed' },
            notificationType: 'PAYMENT_FAILED',
            failureReason: payload.failure_reason || payload.message || 'Payment failed or cancelled'
          });
        }
      } catch (err) {
        console.warn('[Bachs Webhook Failed Notice]:', err.message);
      }
    }
    return { success: true, message: `Payment failure acknowledged and processed for ${reference || 'record'}.` };
  }

  // Handle Reversed or Refunded Payments
  if (isPaymentRefunded) {
    const reference = payload.reference || payload.metadata?.reference;
    const providerCheckoutId = payload.checkout_id || payload.session_id || '';
    let paymentRecord = null;
    if (supabase) {
      try {
        let q = supabase.from('payments').select(PAYMENT_RECORD_FIELDS);
        if (reference) q = q.eq('reference', reference);
        else if (providerCheckoutId) q = q.eq('provider_checkout_id', providerCheckoutId);
        const { data } = await q.maybeSingle();
        paymentRecord = data;

        if (paymentRecord) {
          await supabase.from('payments').update({
            status: 'refunded',
            updated_at: now,
            metadata: {
              ...paymentRecord.metadata,
              refunded_at: now,
              reversal_reason: payload.refund_reason || payload.message || 'Payment reversed'
            }
          }).eq('id', paymentRecord.id);

          await dispatchPaymentNotification({
            paymentRecord: { ...paymentRecord, status: 'refunded' },
            notificationType: 'PAYMENT_REFUNDED',
            failureReason: payload.refund_reason || payload.message || 'Payment reversed'
          });
        }
      } catch (err) {
        console.warn('[Bachs Webhook Refund Notice]:', err.message);
      }
    }
    return { success: true, message: `Payment reversal acknowledged and processed for ${reference || 'record'}.` };
  }

  if (!isPaymentSuccess) {
    console.log(`[Bachs Webhook] Non-success event received (${eventType}).`);
    return { success: true, message: `Event ${eventType} received and cataloged.` };
  }

  const reference = payload.reference || payload.metadata?.reference;
  const providerPaymentId = payload.id || payload.payment_id || payload.transaction_id || '';
  const providerCheckoutId = payload.checkout_id || payload.session_id || '';
  const paidAmount = Number(payload.amount);
  const paidCurrency = (payload.currency || 'NGN').toUpperCase();

  // 3. Find Matching Payment Record
  let paymentRecord = null;
  try {
    if (supabase) {
      let query = supabase.from('payments').select(PAYMENT_RECORD_FIELDS);
      if (reference) {
        query = query.eq('reference', reference);
      } else if (providerCheckoutId) {
        query = query.eq('provider_checkout_id', providerCheckoutId);
      }
      const { data } = await query.maybeSingle();
      paymentRecord = data;
    }
  } catch (findErr) {
    console.warn('[Bachs Webhook] Error finding payment:', findErr);
  }

  if (!paymentRecord) {
    console.warn(`[Bachs Webhook] Payment record with reference ${reference} not found in DB. Auto-creating from authoritative webhook payload...`);
    try {
      if (supabase && reference) {
        const metadata = payload.metadata || {};
        const autoType = metadata.payment_type || metadata.paymentType || 'DEPARTMENTAL_SERVICE';
        const autoMatric = metadata.registration_number || metadata.matric_number || metadata.student_matric || payload.customer?.email || 'UNASSIGNED';
        const { data: newRec } = await supabase.from('payments').insert([{
          reference,
          amount: paidAmount || 0,
          currency: paidCurrency || 'NGN',
          status: 'successful',
          payment_type: autoType,
          registration_number: autoMatric,
          matric_number: autoMatric,
          provider_payment_id: providerPaymentId || reference,
          provider_checkout_id: providerCheckoutId,
          academic_session: metadata.academic_session || metadata.academicSession || getDynamicAcademicSession(),
          level: metadata.level || '100 Level',
          paid_at: now,
          created_at: now,
          updated_at: now,
          metadata: {
            ...metadata,
            auto_created_from_webhook: true,
            webhook_event_id: eventId
          }
        }]).select().maybeSingle();

        if (newRec) {
          paymentRecord = newRec;
          await fulfillSuccessfulPayment(paymentRecord, now);
        }
      }
    } catch (insertErr) {
      console.warn('[Bachs Webhook] Error auto-creating payment record:', insertErr.message);
    }

    if (!paymentRecord) {
      return { 
        success: true, 
        message: `Webhook event acknowledged for reference ${reference || 'unindexed'}.`,
        statusCode: 200 
      };
    }
  }

  // 4. Validate Amount and Currency (log warning, do not fail webhook with 400)
  if (!isNaN(paidAmount) && paidAmount < Number(paymentRecord.amount)) {
    console.warn(`[Bachs Webhook] Underpaid amount: Expected ${paymentRecord.amount}, received ${paidAmount}`);
  }

  if (paidCurrency && paidCurrency !== paymentRecord.currency) {
    console.warn(`[Bachs Webhook] Currency mismatch: Expected ${paymentRecord.currency}, received ${paidCurrency}`);
  }

  // 5. Update Payment Record to 'successful'
  try {
    if (supabase) {
      await supabase
        .from('payments')
        .update({
          status: 'successful',
          provider_payment_id: providerPaymentId || paymentRecord.provider_payment_id,
          paid_at: now,
          updated_at: now,
          metadata: {
            ...paymentRecord.metadata,
            webhook_confirmed_at: now,
            webhook_event_id: eventId,
            paid_amount: paidAmount,
            paid_currency: paidCurrency
          }
        })
        .eq('id', paymentRecord.id);

      // 6. Execute dynamic post-payment fulfillment router
      await fulfillSuccessfulPayment(paymentRecord, now);

      // 7. Mark Webhook Event as Processed
      await supabase
        .from('webhook_events')
        .update({
          processed: true,
          processed_at: now
        })
        .eq('provider', 'BACHS')
        .eq('event_id', eventId);
    }
  } catch (updateErr) {
    console.error('[Bachs Webhook] Database update error:', updateErr);
  }

  console.log(`[Bachs Webhook] Payment ${paymentRecord.reference} (${paymentRecord.payment_type}) marked SUCCESSFUL.`);
  return { 
    success: true, 
    statusCode: 200,
    message: `Payment confirmed for ${paymentRecord.payment_type}.`,
    reference: paymentRecord.reference,
    paymentType: paymentRecord.payment_type
  };
}

/**
 * Universal Status Lookup for ANY Payment Reference or Student
 */
export async function getPaymentStatus({ reference, checkoutId, paymentType, registrationNumber, studentId, level }) {
  const cleanCheckoutId = (checkoutId || '').trim();
  const cleanRef = (reference || '').trim();
  const cleanRegNo = (registrationNumber || '').trim().toUpperCase();
  const cleanStudentId = (studentId || '').trim();
  const cleanLevel = level ? String(level).replace(/[^0-9]/g, '') : null;

  if (!cleanRef && !cleanCheckoutId && !cleanRegNo && !cleanStudentId) {
    return { error: 'Provide reference, checkoutId, registrationNumber, or studentId', statusCode: 400 };
  }

  try {
    if (supabase) {
      let query = supabase.from('payments').select(PAYMENT_RECORD_FIELDS);
      if (cleanRef) {
        query = query.eq('reference', cleanRef);
      } else if (cleanCheckoutId) {
        query = query.eq('provider_checkout_id', cleanCheckoutId);
      } else if (cleanRegNo) {
        query = query.eq('registration_number', cleanRegNo);
        if (paymentType) query = query.eq('payment_type', paymentType.toUpperCase());
        if (cleanLevel) query = query.filter('metadata->>level', 'ilike', `%${cleanLevel}%`);
      } else if (cleanStudentId) {
        query = query.eq('student_id', cleanStudentId);
        if (paymentType) query = query.eq('payment_type', paymentType.toUpperCase());
        if (cleanLevel) query = query.filter('metadata->>level', 'ilike', `%${cleanLevel}%`);
      }

      let { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      const config = getBachsConfig();
      const isLiveKey = config.apiKey && !config.apiKey.includes('sample');

      // Proactive lookup on Bachs API if not found or pending
      const targetCheckoutId = cleanCheckoutId || data?.provider_checkout_id;
      const targetRef = cleanRef || data?.reference;

      if ((!data || data.status === 'pending') && isLiveKey && (targetCheckoutId || targetRef)) {
        try {
          let verifyRes = null;
          if (targetCheckoutId && targetCheckoutId.startsWith('chk_')) {
            verifyRes = await fetch(`${config.baseUrl}/v1/checkout-sessions/${targetCheckoutId}`, {
              headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
          }

          if ((!verifyRes || !verifyRes.ok) && targetRef) {
            verifyRes = await fetch(`${config.baseUrl}/v1/payments/verify/${targetRef}`, {
              headers: { 'Authorization': `Bearer ${config.apiKey}` }
            });
          }

          if (verifyRes && verifyRes.ok) {
            const verifyData = await verifyRes.json();
            const sessionStatus = (verifyData.status || '').toLowerCase();
            const paymentStatus = (verifyData.payment_status || '').toLowerCase();
            const chargeStatus = (verifyData.charge?.status || verifyData.data?.status || '').toLowerCase();

            const isSuccess = 
              paymentStatus === 'paid' || 
              paymentStatus === 'succeeded' || 
              chargeStatus === 'paid' || 
              chargeStatus === 'successful' || 
              sessionStatus === 'completed' ||
              sessionStatus === 'paid';

            if (isSuccess) {
              const now = new Date().toISOString();
              const providerPaymentId = verifyData.charge?.payment_id || verifyData.charge?.id || verifyData.payment_id || '';
              const verifiedRef = verifyData.reference || targetRef || `NACOS-${Date.now()}`;
              const verifiedReg = verifyData.metadata?.registration_number || verifyData.metadata?.regNo || cleanRegNo || '';
              const verifiedStudentId = verifyData.metadata?.student_id || cleanStudentId || verifiedReg;
              const verifiedType = verifyData.metadata?.payment_type || paymentType || 'ID_CARD';
              const verifiedAmt = Number(verifyData.pricing?.amount || verifyData.amount || data?.amount || 0);

              if (data) {
                await supabase.from('payments').update({
                  status: 'successful',
                  provider_payment_id: providerPaymentId || data.provider_payment_id,
                  provider_checkout_id: targetCheckoutId || data.provider_checkout_id,
                  paid_at: now,
                  updated_at: now
                }).eq('id', data.id);

                data.status = 'successful';
                data.paid_at = now;
                if (providerPaymentId) data.provider_payment_id = providerPaymentId;
              } else {
                // Insert newly discovered payment record
                const newRow = {
                  id: crypto.randomUUID(),
                  student_id: verifiedStudentId,
                  registration_number: verifiedReg,
                  payment_type: verifiedType,
                  provider: 'BACHS',
                  provider_payment_id: providerPaymentId,
                  provider_checkout_id: targetCheckoutId,
                  amount: verifiedAmt,
                  currency: verifyData.pricing?.currency || config.currency || 'NGN',
                  status: 'successful',
                  reference: verifiedRef,
                  paid_at: now,
                  created_at: now,
                  updated_at: now,
                  metadata: {
                    customer_name: verifyData.customer?.name || verifyData.metadata?.customer_name,
                    customer_email: verifyData.customer?.email || verifyData.metadata?.customer_email,
                    verified_via: 'bachs_checkout_session'
                  }
                };

                const { data: inserted } = await supabase.from('payments').insert(newRow).select().maybeSingle();
                data = inserted || newRow;
              }

              // Post-payment fulfillment router (immediate ID card generation if photo exists, 1-year validity)
              await fulfillSuccessfulPayment(data, now);
            }
          }
        } catch (pollErr) {
          console.warn('[Bachs Live] Status verification error:', pollErr.message);
        }
      }

      if (data) {
        if (data.status === 'successful') {
          // Guarantee post-payment fulfillment router (ensures ID card application is generated on the spot if photo exists)
          const paidAtTime = data.paid_at || new Date().toISOString();
          await fulfillSuccessfulPayment(data, paidAtTime);
        }

        return {
          status: data.status,
          isPaid: data.status === 'successful',
          reference: data.reference,
          checkoutId: data.provider_checkout_id,
          amount: data.amount,
          currency: data.currency,
          paymentType: data.payment_type,
          academicSession: data.academic_session || data.metadata?.academic_session || data.metadata?.academicSession,
          level: data.level || data.metadata?.level,
          paidAt: data.paid_at,
          payment: data
        };
      }
    }
  } catch (err) {
    console.warn('[Bachs] Error fetching payment status:', err);
  }

  return { status: 'unknown', isPaid: false };
}

/**
 * Authoritatively verifies a student's eligibility to view/download their ID card.
 * Enforces:
 * 1. Authenticated student identification.
 * 2. Active academic level verification (strictly matches the student's active level for current session).
 * 3. Existence of a confirmed, cleared payment for that active level and academic session.
 * 4. Denies access if attempting to view a past level or if active level is unpaid.
 */
export async function verifyIdCardAccess({ registrationNumber, studentId, requestedLevel, requestedSession }) {
  const cleanReg = String(registrationNumber || '').trim().toUpperCase();
  const cleanStudentId = String(studentId || '').trim();

  if (!cleanReg && !cleanStudentId) {
    return {
      allowed: false,
      isPaid: false,
      statusCode: 400,
      error: 'Student identification (registration number or student ID) is required.'
    };
  }

  try {
    // 1. Authoritatively resolve the active academic session
    const activeSession = await getAuthoritativeActiveSession();

    // 2. Fetch student profile from database
    let profile = null;
    if (supabase) {
      let profQuery = supabase.from('profiles').select('id, registration_number, matric_number, admission_year, level, current_level, programme_duration, full_name, email');
      if (cleanReg && cleanStudentId && cleanStudentId.length === 36) {
        profQuery = profQuery.or(`registration_number.eq.${cleanReg},matric_number.eq.${cleanReg},id.eq.${cleanStudentId}`);
      } else if (cleanReg) {
        profQuery = profQuery.or(`registration_number.eq.${cleanReg},matric_number.eq.${cleanReg}`);
      } else if (cleanStudentId) {
        profQuery = profQuery.eq('id', cleanStudentId);
      }
      const { data } = await profQuery.maybeSingle();
      profile = data;
    }

    // 3. Authoritatively compute student active academic level
    const studentRecord = profile || {
      registration_number: cleanReg,
      id: cleanStudentId
    };

    const progression = calculateAcademicProgression(studentRecord, activeSession);
    const activeLevel = progression?.levelString || '100 Level';
    const activeLevelNum = String(progression?.numericLevel ? progression.numericLevel * 100 : activeLevel).replace(/[^0-9]/g, '') || '100';

    // 4. Validate requested level against student's current authoritative active level
    // Students can ONLY view an ID card for their current academic level.
    if (requestedLevel) {
      const reqNum = String(requestedLevel).replace(/[^0-9]/g, '');
      if (reqNum && reqNum !== activeLevelNum) {
        return {
          allowed: false,
          isPaid: false,
          statusCode: 403,
          activeLevel,
          requestedLevel,
          activeSession,
          error: `ID Card access is restricted to your current academic level (${activeLevel}). ID cards from previous levels are no longer accessible.`
        };
      }
    }

    // Target academic level to verify is strictly the student's current active level
    const targetLevel = activeLevel;
    const targetLevelNum = activeLevelNum;

    // 5. Check if student has a confirmed payment or verified application for their CURRENT active level
    let isPaidForLevel = false;
    let confirmedPayment = null;
    let matchedApplication = null;

    if (supabase) {
      // Build comprehensive student matching identifiers
      const regDigits = cleanReg.replace(/\D/g, '');
      const idMatchTerms = Array.from(new Set([cleanReg, regDigits, cleanStudentId].filter(Boolean)));

      // 5a. Check id_card_applications table strictly for current active level
      let appQuery = supabase
        .from('id_card_applications')
        .select('id, student_id, registration_number, matric_number, level, academic_session, status, payment_status, payment_reference, created_at, updated_at');

      if (idMatchTerms.length > 0) {
        const orClauses = idMatchTerms.flatMap(term => [
          `registration_number.eq.${term}`,
          `matric_number.eq.${term}`,
          `student_id.eq.${term}`
        ]).join(',');
        appQuery = appQuery.or(orClauses);
      }

      const { data: appList } = await appQuery.order('created_at', { ascending: false });

      if (Array.isArray(appList) && appList.length > 0) {
        // Look for application strictly matching the student's current active level
        const validApp = appList.find(a => {
          const rawStatus = String(a.status || '').toLowerCase();
          const rawPayStatus = String(a.payment_status || '').toLowerCase();
          const isAppCleared = rawStatus === 'generated' || ['paid', 'verified', 'cleared', 'successful'].includes(rawPayStatus) || Boolean(a.payment_reference);
          if (!isAppCleared) return false;

          const aLvl = String(a.level || '').replace(/[^0-9]/g, '');
          const aSess = String(a.academic_session || '').trim();

          // Must strictly match current active level
          return aLvl === targetLevelNum || (!aLvl && aSess === activeSession);
        });

        if (validApp) {
          matchedApplication = validApp;
          isPaidForLevel = true;
        }
      }

      // 5b. Check payments table for confirmed ID Card payment strictly for current active level
      let payQuery = supabase
        .from('payments')
        .select(PAYMENT_RECORD_FIELDS);

      if (idMatchTerms.length > 0) {
        const orClauses = idMatchTerms.flatMap(term => [
          `registration_number.eq.${term}`,
          `matric_number.eq.${term}`,
          `student_id.eq.${term}`
        ]).join(',');
        payQuery = payQuery.or(orClauses);
      }

      const { data: paymentsList } = await payQuery.order('created_at', { ascending: false });

      if (Array.isArray(paymentsList) && paymentsList.length > 0) {
        const idPayments = paymentsList.filter(p => {
          const pType = String(p.payment_type || '').toUpperCase();
          const title = String(p.metadata?.payment_title || p.title || p.purpose || '').toUpperCase();
          const isIdType = !p.payment_type || pType === 'ID_CARD' || pType.includes('ID') || title.includes('ID CARD') || title.includes('STUDENT ID');
          const rawStatus = String(p.status || '').toLowerCase();
          const isSuccess = ['successful', 'paid', 'cleared', 'verified', 'completed'].includes(rawStatus) || Boolean(p.paid_at);
          return isIdType && isSuccess;
        });

        if (idPayments.length > 0) {
          // STRICT RULE: Must match the student's CURRENT active level!
          // Previous level payments must NEVER grant access to the current level or be treated as proof of current level payment.
          const matchPay = idPayments.find(p => {
            const pLvl = String(p.level || p.metadata?.level || p.metadata?.academic_level || '').replace(/[^0-9]/g, '');
            const pSess = String(p.academic_session || p.metadata?.academic_session || p.metadata?.academicSession || p.session || '').trim();
            const levelMatches = Boolean(pLvl && pLvl === targetLevelNum);
            const sessionMatches = Boolean(pSess && pSess === activeSession);
            return (levelMatches && sessionMatches) || levelMatches;
          }) || idPayments.find(p => {
            // Payment with no explicit level only matches if academic_session matches current active session
            const pLvl = String(p.level || p.metadata?.level || p.metadata?.academic_level || '').replace(/[^0-9]/g, '');
            const pSess = String(p.academic_session || p.metadata?.academic_session || p.metadata?.academicSession || p.session || '').trim();
            return !pLvl && pSess && pSess === activeSession;
          });

          if (matchPay) {
            confirmedPayment = matchPay;
            isPaidForLevel = true;
          }
        }
      }
    }

    // 6. Deny access if NOT paid for the student's current active level
    if (!isPaidForLevel) {
      return {
        allowed: false,
        isPaid: false,
        statusCode: 403,
        activeLevel,
        targetLevel,
        activeSession,
        error: `Your ID card payment for ${activeLevel} is required. Please complete your payment to view your current ID card.`
      };
    }

    // 6. Access granted
    return {
      allowed: true,
      isPaid: true,
      statusCode: 200,
      activeLevel,
      targetLevel,
      activeSession,
      payment: confirmedPayment,
      application: matchedApplication
    };
  } catch (err) {
    console.error('[verifyIdCardAccess Error]:', err);
    return {
      allowed: false,
      statusCode: 500,
      error: 'Internal server error while verifying ID card access.'
    };
  }
}

export {
  dispatchPaymentNotification,
  retryPaymentNotification,
  getPaymentNotificationLogs
};

