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

import { getActiveAcademicSession } from '@nacos/config/academic';

const DUES_SETTINGS_KEY = 'nacos_dues_settings_db';

/**
 * Dynamically retrieves the departmental dues fee configured by admin
 */
export async function getDuesSettings() {
  const defaultSettings = {
    id: 'dues',
    dues_amount: 2500,
    academic_session: getActiveAcademicSession(),
    is_open: true,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data: duesRow, error } = await supabase
        .from('id_card_settings')
        .select('*')
        .eq('id', 'dues')
        .maybeSingle();

      if (!error && duesRow && duesRow.id_card_fee && !isNaN(Number(duesRow.id_card_fee))) {
        return {
          id: 'dues',
          dues_amount: Number(duesRow.id_card_fee),
          academic_session: duesRow.academic_session || getActiveAcademicSession(),
          is_open: duesRow.is_application_open ?? true,
          updated_at: duesRow.updated_at
        };
      }
    } catch (err) {
      console.warn('[Dues Settings Fetch Warning]:', err.message);
    }
  }

  return defaultSettings;
}

/**
 * Authoritatively updates the departmental dues fee configured by admin
 */
export async function updateDuesFee(amount, academicSession = null) {
  const num = Number(amount);
  if (isNaN(num) || num <= 0) {
    return { error: 'Please enter a valid positive fee amount.' };
  }

  const targetSession = String(academicSession || getActiveAcademicSession()).trim();
  const now = new Date().toISOString();
  const settings = {
    id: 'default',
    dues_amount: num,
    academic_session: targetSession,
    is_open: true,
    updated_at: now
  };

  try {
    if (supabase) {
      // 1. Live Supabase id_card_settings table (id: 'dues')
      const { error: duesErr } = await supabase
        .from('id_card_settings')
        .upsert({
          id: 'dues',
          id_card_fee: num,
          academic_session: targetSession,
          is_application_open: true,
          updated_at: now
        });

      if (duesErr) {
        console.error('[Dues Settings Database Error]:', duesErr);
        return { error: `Database error: ${duesErr.message}` };
      }

      // 2. Also keep academic session synchronized on default settings row
      try {
        await supabase
          .from('id_card_settings')
          .update({ academic_session: targetSession, updated_at: now })
          .eq('id', 'default');
      } catch (_) {}

      // 3. Keep payment_fees table in sync
      try {
        await supabase
          .from('payment_fees')
          .upsert({
            fee_key: 'departmental_dues',
            fee_name: 'NACOS Departmental Dues',
            academic_session: targetSession,
            amount: num,
            currency: 'NGN',
            is_active: true,
            updated_at: now
          }, { onConflict: 'fee_key,academic_session' });
      } catch (_) {}
    }
  } catch (err) {
    console.error('[Dues Settings Sync Error]:', err);
    return { error: err.message || 'Failed to update dues in database' };
  }

  try {
    localStorage.setItem(DUES_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}

  try {
    window.dispatchEvent(new CustomEvent('nacos_dues_settings_updated', { detail: settings }));
  } catch (e) {}

  return { success: true, settings };
}

/**
 * Universal dynamic fee getter for ANY future payment type
 */
export async function getPaymentFee(feeKey, session = null) {
  const key = String(feeKey || 'id_card').trim().toLowerCase();
  const targetSession = String(session || getActiveAcademicSession()).trim();

  try {
    if (supabase) {
      // 1. Check payment_fees table
      const { data: feeRow } = await supabase
        .from('payment_fees')
        .select('amount')
        .eq('fee_key', key)
        .eq('academic_session', targetSession)
        .eq('is_active', true)
        .maybeSingle();

      if (feeRow?.amount && !isNaN(Number(feeRow.amount))) {
        return Number(feeRow.amount);
      }

      // 2. Fallback to id_card_settings
      const rowId = (key === 'id_card' || key === 'idcard') ? 'default' : key;
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
export async function updatePaymentFee(feeKey, amount, label = '', session = null) {
  const key = String(feeKey || '').trim().toLowerCase();
  const num = Number(amount);
  if (!key || isNaN(num) || num <= 0) {
    return { error: 'Invalid fee key or amount.' };
  }

  const targetSession = String(session || getActiveAcademicSession()).trim();
  const rowId = (key === 'id_card' || key === 'idcard') ? 'default' : key;
  const now = new Date().toISOString();
  try {
    if (supabase) {
      await supabase
        .from('id_card_settings')
        .upsert({
          id: rowId,
          id_card_fee: num,
          academic_session: targetSession,
          is_application_open: true,
          updated_at: now
        });

      await supabase
        .from('payment_fees')
        .upsert({
          fee_key: key,
          fee_name: label || key.toUpperCase(),
          academic_session: targetSession,
          amount: num,
          currency: 'NGN',
          is_active: true,
          updated_at: now
        }, { onConflict: 'fee_key,academic_session' });
    }
    return { success: true, feeKey: key, amount: num, academicSession: targetSession };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Authoritatively fetch all dues payments from Supabase payments ledger
 */
export async function adminGetAllDuesPayments() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_type', 'DEPARTMENTAL_DUES')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Dues Payments Ledger Fetch Warning]:', error.message);
      return [];
    }

    // Normalize top-level academic_session and level if only present in metadata
    return (data || []).map(p => ({
      ...p,
      academic_session: p.academic_session || p.metadata?.academic_session || p.metadata?.academicSession || '2026/2027',
      level: p.level || p.metadata?.level || '100 Level'
    }));
  } catch (err) {
    console.error('[Dues Payments Ledger Error]:', err);
    return [];
  }
}

/**
 * Authoritatively clear a student's departmental dues manually (e.g. Bursary Teller, POS, Exemption)
 */
export async function adminManuallyClearDues({
  studentId,
  registrationNumber,
  studentName = 'Student',
  studentEmail = '',
  amount = 2500,
  academicSession = null,
  level = 'All',
  paymentMethod = 'MANUAL_BURSARY',
  reference = null,
  note = 'Manually cleared by portal administrator'
}) {
  const regNo = String(registrationNumber || '').trim().toUpperCase();
  const stId = String(studentId || regNo || `cust_${Date.now()}`);
  const targetSession = String(academicSession || getActiveAcademicSession()).trim();
  const now = new Date().toISOString();
  const numAmount = Number(amount) || 2500;
  const payRef = reference || `NACOS-DUES-MANUAL-${regNo || Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  try {
    if (supabase) {
      // 1. Insert or update in public.payments table with top-level session and level
      const { data: paymentRecord, error: payErr } = await supabase
        .from('payments')
        .upsert({
          student_id: stId,
          registration_number: regNo,
          payment_type: 'DEPARTMENTAL_DUES',
          provider: paymentMethod,
          amount: numAmount,
          currency: 'NGN',
          status: 'successful',
          reference: payRef,
          academic_session: targetSession,
          level: level,
          paid_at: now,
          created_at: now,
          updated_at: now,
          metadata: {
            customer_name: studentName,
            customer_email: studentEmail,
            academic_session: targetSession,
            academicSession: targetSession,
            level,
            payment_method: paymentMethod,
            note,
            cleared_manually: true,
            cleared_at: now
          }
        }, { onConflict: 'reference' })
        .select()
        .single();

      if (payErr) {
        console.error('[Manual Dues Clearance Payment Error]:', payErr);
        return { error: `Failed to record payment: ${payErr.message}` };
      }

      // 2. Also record in dues_payments table if available
      try {
        await supabase
          .from('dues_payments')
          .upsert({
            student_id: stId,
            registration_number: regNo,
            payment_type: 'departmental_dues',
            session: targetSession,
            level: level,
            status: 'successful'
          });
      } catch (_) {}

      return { success: true, payment: paymentRecord, reference: payRef };
    }
  } catch (err) {
    console.error('[Manual Dues Clearance Error]:', err);
    return { error: err.message || 'Failed to clear dues' };
  }

  return { success: true, reference: payRef };
}


/**
 * Revoke or cancel a student's departmental dues clearance
 */
export async function adminRevokeDuesClearance({ reference, registrationNumber, studentId }) {
  const now = new Date().toISOString();
  try {
    if (supabase) {
      if (reference) {
        await supabase
          .from('payments')
          .update({
            status: 'cancelled',
            updated_at: now
          })
          .eq('reference', reference);
      } else if (registrationNumber) {
        await supabase
          .from('payments')
          .update({
            status: 'cancelled',
            updated_at: now
          })
          .eq('registration_number', registrationNumber)
          .eq('payment_type', 'DEPARTMENTAL_DUES');
      }

      return { success: true };
    }
  } catch (err) {
    console.error('[Revoke Dues Clearance Error]:', err);
    return { error: err.message || 'Failed to revoke dues clearance' };
  }
  return { success: true };
}



