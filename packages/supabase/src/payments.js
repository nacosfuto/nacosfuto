/**
 * NACOS FUTO: Client-Side Universal Payments Service
 * Interfaces with the authoritative Bachs serverless endpoints and Supabase
 */

import { supabase } from './client.js';

export const PAYMENT_TYPES = {
  ID_CARD: 'ID_CARD',
  DEPARTMENTAL_DUES: 'DEPARTMENTAL_DUES',
  EVENT_TICKET: 'EVENT_TICKET',
  RESOURCE: 'RESOURCE',
  MERCHANDISE: 'MERCHANDISE',
  DONATION: 'DONATION',
  CUSTOM: 'CUSTOM'
};

/**
 * Initiates an authoritative Bachs payment checkout session
 */
export async function initiatePaymentCheckout({
  paymentType = PAYMENT_TYPES.ID_CARD,
  title,
  student,
  customer,
  metadata = {},
  returnBaseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  redirectPath,
  cancelPath,
  amountOverride
}) {
  try {
    const endpoint = paymentType === PAYMENT_TYPES.ID_CARD
      ? '/api/payments/id-card/create-checkout'
      : paymentType === PAYMENT_TYPES.DEPARTMENTAL_DUES
      ? '/api/payments/dues/create-checkout'
      : '/api/payments/create-checkout';

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentType,
        title,
        student,
        customer,
        metadata,
        returnBaseUrl,
        redirectPath,
        cancelPath,
        amountOverride
      })
    });

    const data = await resp.json();
    if (!resp.ok || data.error) {
      return {
        error: data.error || 'Failed to initialize payment checkout session.',
        alreadyPaid: data.alreadyPaid || false,
        payment: data.payment || null
      };
    }

    return {
      success: true,
      checkoutUrl: data.checkoutUrl,
      reference: data.reference,
      paymentId: data.paymentId,
      amount: data.amount,
      currency: data.currency,
      paymentType: data.paymentType
    };
  } catch (err) {
    console.error('[Payment Service Error]:', err);
    return { error: 'Network error contacting payment service. Please try again.' };
  }
}

/**
 * Verifies transaction status with the server and Bachs gateway
 */
export async function verifyPaymentStatus({ reference, paymentType, registrationNumber, studentId }) {
  if (!reference && !registrationNumber && !studentId) {
    return { isPaid: false, status: 'unknown' };
  }

  try {
    const params = new URLSearchParams();
    if (reference) params.set('reference', reference);
    if (paymentType) params.set('paymentType', paymentType);
    if (registrationNumber) params.set('registrationNumber', registrationNumber);
    if (studentId) params.set('studentId', studentId);

    const resp = await fetch(`/api/payments/status?${params.toString()}`);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (err) {
    console.warn('[Payment Status Check Warning]:', err.message);
  }

  // Fallback direct check against Supabase
  try {
    if (supabase) {
      let query = supabase.from('payments').select('*');
      if (reference) query = query.eq('reference', reference);
      else if (registrationNumber) {
        query = query.eq('registration_number', registrationNumber);
        if (paymentType) query = query.eq('payment_type', paymentType);
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) {
        return {
          status: data.status,
          isPaid: data.status === 'successful',
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
          payment: data
        };
      }
    }
  } catch (dbErr) {}

  return { isPaid: false, status: 'unknown' };
}

const DUES_SETTINGS_KEY = 'nacos_dues_settings_db';

/**
 * Dynamically retrieves the departmental dues fee configured by admin
 */
export async function getDuesSettings() {
  const defaultSettings = {
    id: 'default',
    dues_amount: 2500,
    academic_session: '2026/2027',
    is_open: true,
    updated_at: new Date().toISOString()
  };

  try {
    const cached = localStorage.getItem(DUES_SETTINGS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.dues_amount) defaultSettings.dues_amount = Number(parsed.dues_amount);
      if (parsed?.academic_session) defaultSettings.academic_session = parsed.academic_session;
    }
  } catch (e) {}

  try {
    if (supabase) {
      // 1. Authoritative check on live Supabase id_card_settings table (id: 'dues')
      const { data: duesRow, error } = await supabase
        .from('id_card_settings')
        .select('*')
        .eq('id', 'dues')
        .maybeSingle();

      if (!error && duesRow && duesRow.id_card_fee && !isNaN(Number(duesRow.id_card_fee))) {
        const result = {
          ...defaultSettings,
          dues_amount: Number(duesRow.id_card_fee),
          academic_session: duesRow.academic_session || defaultSettings.academic_session,
          is_open: duesRow.is_application_open ?? true,
          updated_at: duesRow.updated_at
        };
        try { localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(result)); } catch (_) {}
        return result;
      }

      // 2. Check media_assets fallback
      const { data: mediaRow } = await supabase
        .from('media_assets')
        .select('image_alt')
        .eq('category', 'general')
        .eq('entity_type', 'dues_settings')
        .maybeSingle();

      if (mediaRow?.image_alt) {
        try {
          const parsed = JSON.parse(mediaRow.image_alt);
          if (parsed?.dues_amount && !isNaN(Number(parsed.dues_amount))) {
            const result = {
              ...defaultSettings,
              dues_amount: Number(parsed.dues_amount),
              academic_session: parsed.academic_session || defaultSettings.academic_session,
              updated_at: parsed.updated_at || mediaRow.updated_at
            };
            try { localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(result)); } catch (_) {}
            return result;
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[Dues Settings Fetch Warning]:', err.message);
  }

  return defaultSettings;
}

/**
 * Authoritatively updates the departmental dues fee configured by admin
 */
export async function updateDuesFee(amount, academicSession = '2026/2027') {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return { error: 'Please enter a valid positive fee amount.' };
  }

  const now = new Date().toISOString();
  const settings = {
    id: 'default',
    dues_amount: num,
    academic_session: academicSession,
    is_open: true,
    updated_at: now
  };

  try {
    localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}

  try {
    if (supabase) {
      // 1. Live Supabase id_card_settings table (id: 'dues')
      await supabase
        .from('id_card_settings')
        .upsert({
          id: 'dues',
          id_card_fee: num,
          academic_session: academicSession,
          is_application_open: true,
          updated_at: now
        });

      // 2. Also keep academic session synchronized on default settings row
      await supabase
        .from('id_card_settings')
        .update({ academic_session: academicSession, updated_at: now })
        .eq('id', 'default');
    }
  } catch (err) {
    console.warn('[Dues Settings Sync Error]:', err);
  }

  try {
    window.dispatchEvent(new CustomEvent('nacos_dues_settings_updated', { detail: settings }));
  } catch (e) {}

  return { success: true, settings };
}

/**
 * Universal dynamic fee getter for ANY future payment type
 */
export async function getPaymentFee(feeKey) {
  const key = String(feeKey || 'id_card').trim().toLowerCase();

  const rowId = (key === 'id_card' || key === 'idcard') ? 'default' : key;

  try {
    if (supabase) {
      const { data } = await supabase
        .from('id_card_settings')
        .select('*')
        .eq('id', rowId)
        .maybeSingle();

      if (data?.id_card_fee && !isNaN(Number(data.id_card_fee))) {
        return Number(data.id_card_fee);
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Universal dynamic fee setter for ANY future payment type
 */
export async function updatePaymentFee(feeKey, amount, label = '') {
  const key = String(feeKey || '').trim().toLowerCase();
  const num = Number(amount);
  if (!key || isNaN(num) || num <= 0) {
    return { error: 'Invalid fee key or amount.' };
  }

  const rowId = (key === 'id_card' || key === 'idcard') ? 'default' : key;
  const now = new Date().toISOString();
  try {
    if (supabase) {
      await supabase
        .from('id_card_settings')
        .upsert({
          id: rowId,
          id_card_fee: num,
          is_application_open: true,
          updated_at: now
        });
    }
    return { success: true, feeKey: key, amount: num };
  } catch (err) {
    return { error: err.message };
  }
}


