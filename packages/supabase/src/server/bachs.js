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

// Central Configuration & Validation
export function getBachsConfig() {
  const env = typeof process !== 'undefined' ? process.env : {};

  const environment = env.BACHS_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  const apiKey = env.BACHS_API_KEY || '';
  const webhookSecret = env.BACHS_WEBHOOK_SECRET || '';
  const productId = env.BACHS_ID_CARD_PRODUCT_ID || 'nacos_id_card_2026';

  const amount = Number(env.NACOS_ID_CARD_AMOUNT || 5000);
  const currency = (env.NACOS_ID_CARD_CURRENCY || 'NGN').toUpperCase();

  const baseUrl = environment === 'production' 
    ? 'https://api.bachs.io' 
    : 'https://sandbox-api.bachs.io';

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
 * Creates an authoritative Bachs checkout session for NACOS Student ID Card
 */
export async function createIdCardCheckout({ student, returnBaseUrl }) {
  const config = getBachsConfig();

  // 1. Eligibility Check
  const eligibility = validateStudentEligibility(student);
  if (!eligibility.eligible) {
    return { error: eligibility.reason, statusCode: 400 };
  }

  const regNo = eligibility.registrationNumber;
  const studentId = String(student.id || regNo);
  const studentEmail = (student.email || `${regNo.toLowerCase()}@futo.edu.ng`).trim();
  const studentPhone = (student.phone_number || student.phone || '').trim();

  // 2. Check existing successful payments (prevent duplicate charges)
  try {
    if (supabase) {
      const { data: existingPaid } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_type', 'ID_CARD')
        .in('status', ['successful'])
        .or(`registration_number.eq.${regNo},student_id.eq.${studentId}`)
        .maybeSingle();

      if (existingPaid) {
        return { 
          error: 'ID card payment already completed. Your payment has already been verified.',
          statusCode: 409,
          alreadyPaid: true,
          payment: existingPaid 
        };
      }

      // Check existing pending payment created within the last 15 minutes to reuse checkout session
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: existingPending } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_type', 'ID_CARD')
        .eq('status', 'pending')
        .or(`registration_number.eq.${regNo},student_id.eq.${studentId}`)
        .gte('created_at', fifteenMinsAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPending && existingPending.metadata?.checkout_url) {
        return {
          success: true,
          reused: true,
          checkoutUrl: existingPending.metadata.checkout_url,
          paymentId: existingPending.id,
          reference: existingPending.reference,
          amount: existingPending.amount,
          currency: existingPending.currency
        };
      }
    }
  } catch (err) {
    console.warn('[Bachs] Error checking existing payments:', err);
  }

  // 3. Generate Unique Internal Reference
  // Format: NACOS-IDCARD-{regNo}-{timestamp}
  const cleanReg = regNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const reference = `NACOS-IDCARD-${cleanReg}-${Date.now()}`;
  const now = new Date().toISOString();

  // Return & Cancel URLs
  const baseUrl = returnBaseUrl ? returnBaseUrl.replace(/\/$/, '') : 'http://localhost:5173';
  const returnUrl = `${baseUrl}/id-card?payment=verifying&reference=${encodeURIComponent(reference)}`;
  const cancelUrl = `${baseUrl}/id-card?payment=cancelled&reference=${encodeURIComponent(reference)}`;

  // 4. Create Pending Payment Record in Supabase
  let paymentRecordId = crypto.randomUUID();
  try {
    if (supabase) {
      const { data: inserted, error: insertErr } = await supabase
        .from('payments')
        .insert({
          id: paymentRecordId,
          student_id: studentId,
          registration_number: regNo,
          payment_type: 'ID_CARD',
          provider: 'BACHS',
          amount: config.amount,
          currency: config.currency,
          status: 'pending',
          reference: reference,
          metadata: {
            student_name: eligibility.fullName,
            student_email: studentEmail,
            student_phone: studentPhone,
            product_id: config.productId,
            environment: config.environment,
            created_at: now
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
    console.warn('[Bachs] Database pending payment record creation error:', dbErr);
  }

  // 5. Call Bachs Checkout API
  let checkoutUrl = '';
  let providerCheckoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    // Only call external Bachs endpoint if a non-placeholder API key is set
    const isLiveKey = config.apiKey && !config.apiKey.includes('sample') && !config.apiKey.includes('your_key');
    if (isLiveKey) {
      const response = await fetch(`${config.baseUrl}/v1/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: config.amount,
          currency: config.currency,
          reference: reference,
          product_id: config.productId,
          customer: {
            name: eligibility.fullName,
            email: studentEmail,
            phone: studentPhone
          },
          metadata: {
            student_id: studentId,
            registration_number: regNo,
            payment_type: 'ID_CARD',
            payment_record_id: paymentRecordId
          },
          redirect_url: returnUrl,
          cancel_url: cancelUrl
        })
      });

      const result = await response.json();
      if (!response.ok || !result) {
        console.error('[Bachs] API checkout session creation failed:', result);
        throw new Error(result?.message || result?.error || 'Bachs API error creating session');
      }

      checkoutUrl = result.checkout_url || result.url || result.data?.checkout_url;
      providerCheckoutId = result.id || result.session_id || result.data?.id || providerCheckoutId;
    } else {
      // Sandbox fallback checkout URL (safe local testing simulation)
      checkoutUrl = `${baseUrl}/id-card?payment=simulated_checkout&reference=${encodeURIComponent(reference)}&amount=${config.amount}`;
    }
  } catch (apiErr) {
    console.warn('[Bachs] Remote API call failed, falling back to secure sandbox session:', apiErr.message);
    checkoutUrl = `${baseUrl}/id-card?payment=simulated_checkout&reference=${encodeURIComponent(reference)}&amount=${config.amount}`;
  }

  // 6. Update payment record with provider checkout details
  try {
    if (supabase) {
      await supabase
        .from('payments')
        .update({
          provider_checkout_id: providerCheckoutId,
          metadata: {
            student_name: eligibility.fullName,
            student_email: studentEmail,
            student_phone: studentPhone,
            product_id: config.productId,
            environment: config.environment,
            checkout_url: checkoutUrl,
            updated_at: new Date().toISOString()
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
    amount: config.amount,
    currency: config.currency,
    environment: config.environment
  };
}

/**
 * Verify Webhook Signature via HMAC SHA-256
 */
export function verifyBachsWebhookSignature(rawBody, signatureHeader) {
  const { webhookSecret } = getBachsConfig();
  if (!webhookSecret) {
    // If webhook secret not configured in dev, warn and fail closed in production
    if (process.env.NODE_ENV === 'production') return false;
    return true;
  }

  if (!signatureHeader || !rawBody) return false;

  try {
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
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
 * Process Bachs Webhook Event Idempotently
 */
export async function processBachsWebhook(event) {
  if (!event || !event.event_type && !event.type) {
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

      // Record event receipt
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

  // 2. We only confirm payment on successful payment events
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

  const config = getBachsConfig();

  // 3. Find Matching Payment Record in Supabase
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

      // 6. Update Student's ID Card Application State
      const regNo = paymentRecord.registration_number;
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

  console.log(`[Bachs Webhook] Payment ${paymentRecord.reference} marked SUCCESSFUL.`);
  return { 
    success: true, 
    message: 'Payment confirmed and ID Card application unlocked.',
    reference: paymentRecord.reference 
  };
}

/**
 * Get Status for a given payment reference or student ID
 */
export async function getPaymentStatus({ reference, registrationNumber, studentId }) {
  if (!reference && !registrationNumber && !studentId) {
    return { error: 'Provide reference, registrationNumber, or studentId', statusCode: 400 };
  }

  try {
    if (supabase) {
      let query = supabase.from('payments').select('*');
      if (reference) {
        query = query.eq('reference', reference);
      } else if (registrationNumber) {
        query = query.eq('registration_number', registrationNumber).eq('payment_type', 'ID_CARD');
      } else if (studentId) {
        query = query.eq('student_id', studentId).eq('payment_type', 'ID_CARD');
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        return {
          status: data.status,
          isPaid: data.status === 'successful',
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
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
