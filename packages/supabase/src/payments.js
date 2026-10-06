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
      // 1. Check payment_fees table
      const { data: feeRow } = await supabase
        .from('payment_fees')
        .select('*')
        .eq('fee_key', 'dues')
        .eq('is_active', true)
        .maybeSingle();

      if (feeRow?.amount && !isNaN(Number(feeRow.amount)) && Number(feeRow.amount) > 0) {
        const result = {
          ...defaultSettings,
          dues_amount: Number(feeRow.amount),
          updated_at: feeRow.updated_at
        };
        localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(result));
        return result;
      }

      // 2. Check dues_settings table
      const { data: duesRow } = await supabase
        .from('dues_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      const val = duesRow?.dues_amount || duesRow?.amount;
      if (val && !isNaN(Number(val)) && Number(val) > 0) {
        const result = {
          ...defaultSettings,
          dues_amount: Number(val),
          academic_session: duesRow.academic_session || defaultSettings.academic_session,
          updated_at: duesRow.updated_at
        };
        localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(result));
        return result;
      }

      // 3. Check media_assets sync pipeline
      const { data: mediaRow } = await supabase
        .from('media_assets')
        .select('metadata')
        .eq('asset_type', 'dues_settings')
        .eq('title', 'default')
        .maybeSingle();

      if (mediaRow?.metadata?.dues_amount) {
        const result = {
          ...defaultSettings,
          dues_amount: Number(mediaRow.metadata.dues_amount),
          updated_at: mediaRow.metadata.updated_at
        };
        localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(result));
        return result;
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
      // 1. payment_fees universal table
      await supabase
        .from('payment_fees')
        .upsert({
          fee_key: 'dues',
          label: 'Departmental Dues',
          amount: num,
          currency: 'NGN',
          is_active: true,
          updated_at: now
        }, { onConflict: 'fee_key' });

      // 2. dues_settings table
      await supabase
        .from('dues_settings')
        .upsert({
          id: 'default',
          dues_amount: num,
          amount: num,
          academic_session: academicSession,
          updated_at: now
        });

      // 3. media_assets cross-device resilience pipeline
      await supabase
        .from('media_assets')
        .upsert({
          asset_type: 'dues_settings',
          title: 'default',
          caption: `Configured Departmental Dues: ₦${num.toLocaleString()}`,
          metadata: { dues_amount: num, academic_session: academicSession, updated_at: now }
        }, { onConflict: 'asset_type,title' });
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

  try {
    if (supabase) {
      const { data } = await supabase
        .from('payment_fees')
        .select('*')
        .eq('fee_key', key)
        .eq('is_active', true)
        .maybeSingle();

      if (data?.amount) {
        return Number(data.amount);
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

  const now = new Date().toISOString();
  try {
    if (supabase) {
      await supabase
        .from('payment_fees')
        .upsert({
          fee_key: key,
          label: label || key.toUpperCase(),
          amount: num,
          currency: 'NGN',
          is_active: true,
          updated_at: now
        }, { onConflict: 'fee_key' });
    }
    return { success: true, feeKey: key, amount: num };
  } catch (err) {
    return { error: err.message };
  }
}

