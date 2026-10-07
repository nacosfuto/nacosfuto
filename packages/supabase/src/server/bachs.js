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

import crypto from 'crypto';
import { supabase } from '../client.js';
import { sendPaymentConfirmationEmail } from './emailDispatcher.js';

// Central Configuration & Validation
export function getBachsConfig() {
  const env = typeof process !== 'undefined' ? process.env : {};

  const rawEnv = (env.BACHS_ENVIRONMENT || 'production').trim().toLowerCase();
  const environment = (rawEnv === 'sandbox' || rawEnv === 'development' || rawEnv === 'test') ? 'sandbox' : 'production';
  const apiKey = (env.BACHS_API_KEY || '').trim();
  const webhookSecret = (env.BACHS_WEBHOOK_SECRET || '').trim();
  const productId = (env.BACHS_ID_CARD_PRODUCT_ID || 'nacos_id_card_2026').trim();

  const amount = Number(env.NACOS_ID_CARD_AMOUNT || 5000);
  const currency = (env.NACOS_ID_CARD_CURRENCY || 'NGN').toUpperCase();

  const baseUrl = (env.BACHS_BASE_URL || (environment === 'production' 
    ? 'https://api.bachs.io' 
    : 'https://sandbox-api.bachs.io')).replace(/\/+$/, '');

  return {
    environment,
    apiKey,
    webhookSecret,
    productId,
    amount: isNaN(amount) || amount <= 0 ? 5000 : amount,
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

  const name = (student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`).trim();
  if (!name || name.length < 3) {
    return { eligible: false, reason: 'Profile incomplete: Full student name required.' };
  }

  return { eligible: true, registrationNumber: regNo, fullName: name };
}

/**
 * Dynamically resolves the authoritative fee configured by an admin on the dashboard
 * Works for ID Cards, Departmental Dues, Events, Store, or any Custom Payment.
 */
export async function resolveDynamicFee({ paymentType = 'ID_CARD', metadata = {}, defaultAmount = 5000 }) {
  const pType = (paymentType || 'ID_CARD').toUpperCase();
  const feeKey = pType.toLowerCase();

  try {
    if (supabase) {
      // 1. Check public.payment_fees table (Universal fee registry)
      const { data: feeRow } = await supabase
        .from('payment_fees')
        .select('amount')
        .eq('fee_key', feeKey)
        .eq('is_active', true)
        .maybeSingle();

      if (feeRow?.amount && !isNaN(Number(feeRow.amount)) && Number(feeRow.amount) > 0) {
        return Number(feeRow.amount);
      }

      // 1. Authoritative check on Supabase id_card_settings table
      if (pType === 'ID_CARD') {
        const { data: idCardRow } = await supabase
          .from('id_card_settings')
          .select('id_card_fee')
          .eq('id', 'default')
          .maybeSingle();

        if (idCardRow?.id_card_fee && !isNaN(Number(idCardRow.id_card_fee)) && Number(idCardRow.id_card_fee) > 0) {
          return Number(idCardRow.id_card_fee);
        }
      } else if (pType === 'DEPARTMENTAL_DUES' || pType === 'DUES') {
        const { data: duesRow } = await supabase
          .from('id_card_settings')
          .select('id_card_fee')
          .eq('id', 'dues')
          .maybeSingle();

        if (duesRow?.id_card_fee && !isNaN(Number(duesRow.id_card_fee)) && Number(duesRow.id_card_fee) > 0) {
          return Number(duesRow.id_card_fee);
        }
      } else if (pType === 'EVENT' || pType === 'EVENT_TICKET') {
        if (metadata?.eventId) {
          const { data: eventRow } = await supabase
            .from('website_events')
            .select('ticket_price, fee')
            .eq('id', metadata.eventId)
            .maybeSingle();

          const eventPrice = eventRow?.ticket_price || eventRow?.fee;
          if (eventPrice && !isNaN(Number(eventPrice)) && Number(eventPrice) > 0) {
            return Number(eventPrice);
          }
        }
      }

      // 3. Check media_assets sync pipeline for cross-device resilience
      const { data: mediaRow } = await supabase
        .from('media_assets')
        .select('metadata')
        .eq('asset_type', `${feeKey}_settings`)
        .eq('title', 'default')
        .maybeSingle();

      const mediaFee = mediaRow?.metadata?.fee || mediaRow?.metadata?.amount || mediaRow?.metadata?.id_card_fee || mediaRow?.metadata?.dues_amount;
      if (mediaFee && !isNaN(Number(mediaFee)) && Number(mediaFee) > 0) {
        return Number(mediaFee);
      }
    }
  } catch (err) {
    console.warn(`[Bachs] Dynamic fee resolution warning for ${pType}:`, err.message);
  }

  // 4. Server environment fallbacks
  const env = typeof process !== 'undefined' ? process.env : {};
  if (pType === 'ID_CARD') {
    return Number(env.NACOS_ID_CARD_AMOUNT || defaultAmount || 5000);
  } else if (pType === 'DEPARTMENTAL_DUES' || pType === 'DUES') {
    return Number(env.NACOS_DUES_AMOUNT || 2500);
  }

  return Number(defaultAmount || 5000);
}

/**
 * Universal Post-Payment Fulfillment Router for ANY Payment Type
 */
async function fulfillSuccessfulPayment(paymentRecord, now) {
  if (!supabase || !paymentRecord) return;
  const pType = (paymentRecord.payment_type || 'ID_CARD').toUpperCase();
  const regNo = paymentRecord.registration_number;
  const studentId = paymentRecord.student_id;

  try {
    if (pType === 'ID_CARD') {
      await supabase
        .from('id_card_applications')
        .update({
          payment_status: 'paid',
          payment_reference: paymentRecord.reference,
          amount: paymentRecord.amount,
          paid_at: now,
          updated_at: now
        })
        .or(`registration_number.eq.${regNo},matric_number.eq.${regNo}`);
    } else if (pType === 'DEPARTMENTAL_DUES' || pType === 'DUES') {
      await supabase
        .from('dues_payments')
        .upsert({
          registration_number: regNo,
          student_id: studentId,
          amount: paymentRecord.amount,
          payment_reference: paymentRecord.reference,
          payment_method: 'BACHS',
          status: 'cleared',
          session: paymentRecord.metadata?.academic_session || '2026/2027',
          level: paymentRecord.metadata?.level || 'All',
          created_at: now,
          updated_at: now
        }, { onConflict: 'payment_reference' });

      await supabase
        .from('profiles')
        .update({
          dues_cleared: true,
          has_paid_dues: true,
          dues_paid_at: now,
          updated_at: now
        })
        .or(`registration_number.eq.${regNo},matric.eq.${regNo},id.eq.${studentId}`);
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
    
    // Optionally trigger payment confirmation email via Resend if email is present (excluding ID card per requirements)
    const recipientEmail = paymentRecord.metadata?.customer_email || paymentRecord.customer_email;
    if (recipientEmail && pType !== 'ID_CARD') {
      sendPaymentConfirmationEmail({
        to: recipientEmail,
        customerName: paymentRecord.metadata?.customer_name || 'Student',
        reference: paymentRecord.reference,
        paymentType: pType,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency || 'NGN',
        paidAt: now
      }).catch(e => console.warn('[Bachs Email Receipt Warning]:', e.message));
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
  const customerEmail = (student?.email || customer?.email || (regNo ? `${regNo.toLowerCase()}@futo.edu.ng` : 'payment@nacosfuto.org.ng')).trim();
  const customerPhone = (student?.phone_number || student?.phone || customer?.phone || '').trim();

  // 2. Prevent duplicate charges for non-repeatable payments
  try {
    if (supabase && (regNo || studentId)) {
      let dupQuery = supabase
        .from('payments')
        .select('*')
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
    chargeAmount = await resolveDynamicFee({ paymentType: normalizedType, metadata, defaultAmount: config.amount });
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

  // 6. Create Pending Payment Record in Supabase
  let paymentRecordId = crypto.randomUUID();
  const productId = metadata?.productId || `${config.productId}_${normalizedType.toLowerCase()}`;
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

  // 7. Call Bachs Hosted Checkout API
  let checkoutUrl = '';
  let providerCheckoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    const isLiveKey = config.apiKey && !config.apiKey.includes('sample') && !config.apiKey.includes('your_key');
    if (!isLiveKey) {
      throw new Error('Valid server-side BACHS_API_KEY is not configured');
    }

    // Bachs strictly validates that success_url and cancel_url must be publicly accessible URLs (no localhost or private IP).
    const publicOrigin = (
      process.env.PUBLIC_PORTAL_URL || 
      process.env.NEXT_PUBLIC_PORTAL_URL || 
      process.env.VITE_PORTAL_URL || 
      'https://portal.nacosfuto.com.ng'
    ).replace(/\/+$/, '');

    const isLocalReturn = returnUrl.includes('localhost') || returnUrl.includes('127.0.0.1');
    const isLocalCancel = cancelUrl.includes('localhost') || cancelUrl.includes('127.0.0.1');

    const bachsSuccessUrl = isLocalReturn
      ? `${publicOrigin}${defRedirect.startsWith('/') ? '' : '/'}${defRedirect}`
      : returnUrl;

    const bachsCancelUrl = isLocalCancel
      ? `${publicOrigin}${defCancel.startsWith('/') ? '' : '/'}${defCancel}`
      : cancelUrl;

    const response = await fetch(`${config.baseUrl}/v1/checkout-sessions`, {
      method: 'POST',
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

    const result = await response.json();
    if (!response.ok || !result) {
      console.error('[Bachs Live] API checkout session creation failed:', response.status, result);
      throw new Error(result?.detail || result?.message || result?.error || `Bachs API error (status ${response.status})`);
    }

    checkoutUrl = result.checkout_url || result.url;
    providerCheckoutId = result.checkout_id || result.id || providerCheckoutId;

    if (!checkoutUrl) {
      console.error('[Bachs Live] Missing checkout_url in Bachs response:', result);
      throw new Error('Bachs API responded without a valid hosted checkout_url.');
    }
  } catch (apiErr) {
    console.error('[Bachs Checkout Error]:', apiErr.message);
    return {
      error: `Payment checkout gateway error: ${apiErr.message}`,
      statusCode: 502
    };
  }

  // 8. Update payment record with provider checkout details
  try {
    if (supabase) {
      await supabase
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
        .eq('id', paymentRecordId);
    }
  } catch (updateErr) {
    console.warn('[Bachs] Error updating provider_checkout_id:', updateErr);
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
export async function createIdCardCheckout({ student, returnBaseUrl }) {
  const eligibility = validateStudentEligibility(student);
  if (!eligibility.eligible) {
    return { error: eligibility.reason, statusCode: 400 };
  }

  return createPaymentCheckout({
    paymentType: 'ID_CARD',
    title: 'NACOS Student ID Card Issuance',
    student,
    returnBaseUrl,
    redirectPath: '/id-card?payment=verifying',
    cancelPath: '/id-card?payment=cancelled'
  });
}

/**
 * Creates an authoritative Bachs checkout session for Departmental Dues Clearance
 */
export async function createDuesCheckout({ student, returnBaseUrl, academicSession = '2026/2027', level = 'All' }) {
  const eligibility = validateStudentEligibility(student);
  if (!eligibility.eligible) {
    return { error: eligibility.reason, statusCode: 400 };
  }

  return createPaymentCheckout({
    paymentType: 'DEPARTMENTAL_DUES',
    title: `NACOS Departmental Dues (${academicSession})`,
    student,
    metadata: { academicSession, level },
    returnBaseUrl,
    redirectPath: '/dues?payment=verifying',
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
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }

  if (!signatureHeader || !rawBody) return false;

  try {
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'utf8'),
      Buffer.from(signatureHeader.replace(/^sha256=/, ''), 'utf8')
    );
  } catch (err) {
    console.error('[Bachs] Webhook signature verification error:', err);
    return false;
  }
}

/**
 * Process Bachs Webhook Event Idempotently for ANY Payment Type
 */
export async function processBachsWebhook(event) {
  if (!event || (!event.event_type && !event.type)) {
    return { error: 'Invalid event structure', statusCode: 400 };
  }

  const eventType = event.event_type || event.type;
  const eventId = String(event.id || event.event_id || event.data?.id || `evt_${Date.now()}`);
  const payload = event.data || event;
  const now = new Date().toISOString();

  // 1. Idempotency Check via `webhook_events` Table
  try {
    if (supabase) {
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('*')
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

  // 2. Only confirm on successful payment events
  const isPaymentSuccess = 
    eventType === 'payment.successful' || 
    eventType === 'checkout.completed' ||
    eventType === 'charge.success' ||
    payload.status === 'successful' ||
    payload.status === 'paid';

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
      let query = supabase.from('payments').select('*');
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
    return { error: `Payment record with reference ${reference} not found`, statusCode: 404 };
  }

  // 4. Validate Amount and Currency
  if (!isNaN(paidAmount) && paidAmount < Number(paymentRecord.amount)) {
    console.error(`[Bachs Webhook] Underpaid amount: Expected ${paymentRecord.amount}, received ${paidAmount}`);
    return { error: 'Payment amount mismatch', statusCode: 400 };
  }

  if (paidCurrency && paidCurrency !== paymentRecord.currency) {
    console.error(`[Bachs Webhook] Currency mismatch: Expected ${paymentRecord.currency}, received ${paidCurrency}`);
    return { error: 'Currency mismatch', statusCode: 400 };
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
    return { error: 'Failed to update database', statusCode: 500 };
  }

  console.log(`[Bachs Webhook] Payment ${paymentRecord.reference} (${paymentRecord.payment_type}) marked SUCCESSFUL.`);
  return { 
    success: true, 
    message: `Payment confirmed for ${paymentRecord.payment_type}.`,
    reference: paymentRecord.reference,
    paymentType: paymentRecord.payment_type
  };
}

/**
 * Universal Status Lookup for ANY Payment Reference or Student
 */
export async function getPaymentStatus({ reference, paymentType, registrationNumber, studentId }) {
  if (!reference && !registrationNumber && !studentId) {
    return { error: 'Provide reference, registrationNumber, or studentId', statusCode: 400 };
  }

  try {
    if (supabase) {
      let query = supabase.from('payments').select('*');
      if (reference) {
        query = query.eq('reference', reference);
      } else if (registrationNumber) {
        query = query.eq('registration_number', registrationNumber);
        if (paymentType) query = query.eq('payment_type', paymentType.toUpperCase());
      } else if (studentId) {
        query = query.eq('student_id', studentId);
        if (paymentType) query = query.eq('payment_type', paymentType.toUpperCase());
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        const config = getBachsConfig();
        // If pending in live environment, query Bachs checkout-sessions endpoint as fallback if webhook had network lag
        if (data.status === 'pending' && config.apiKey && !config.apiKey.includes('sample')) {
          try {
            const checkoutId = data.provider_checkout_id;
            let verifyRes = null;
            if (checkoutId && checkoutId.startsWith('chk_')) {
              verifyRes = await fetch(`${config.baseUrl}/v1/checkout-sessions/${checkoutId}`, {
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
              });
            }
            if (!verifyRes || !verifyRes.ok) {
              verifyRes = await fetch(`${config.baseUrl}/v1/payments/verify/${data.reference}`, {
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
                chargeStatus === 'paid' || 
                chargeStatus === 'successful' || 
                sessionStatus === 'completed' ||
                sessionStatus === 'paid';

              if (isSuccess) {
                const now = new Date().toISOString();
                const providerPaymentId = verifyData.charge?.payment_id || verifyData.charge?.id || verifyData.payment_id || '';
                await supabase.from('payments').update({
                  status: 'successful',
                  provider_payment_id: providerPaymentId || data.provider_payment_id,
                  paid_at: now,
                  updated_at: now
                }).eq('id', data.id);

                data.status = 'successful';
                data.paid_at = now;
                if (providerPaymentId) data.provider_payment_id = providerPaymentId;

                // Fulfill dynamically across student profile & modules
                await fulfillSuccessfulPayment(data, now);
              }
            }
          } catch (pollErr) {
            console.warn('[Bachs Live] Fallback status check warning:', pollErr.message);
          }
        }

        return {
          status: data.status,
          isPaid: data.status === 'successful',
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
          paymentType: data.payment_type,
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
