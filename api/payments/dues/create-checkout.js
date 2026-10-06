/**
 * @file api/payments/dues/create-checkout.js
 * Vercel Serverless Function: Authoritative Bachs Checkout Session Creator for Departmental Dues
 */

import { createDuesCheckout, validateStudentEligibility } from '../../../packages/supabase/src/server/bachs.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-student-session');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const student = req.body?.student;
    const academicSession = req.body?.academicSession || '2026/2027';
    const level = req.body?.level || 'All';
    const returnBaseUrl = req.body?.returnBaseUrl || req.headers?.origin || req.headers?.referer;

    const eligibility = validateStudentEligibility(student);
    if (!eligibility.eligible) {
      return res.status(400).json({ error: eligibility.reason });
    }

    const result = await createDuesCheckout({
      student,
      returnBaseUrl,
      academicSession,
      level
    });

    if (result.error) {
      return res.status(result.statusCode || 400).json({
        error: result.error,
        alreadyPaid: result.alreadyPaid || false,
        payment: result.payment || null
      });
    }

    return res.status(200).json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      paymentId: result.paymentId,
      providerCheckoutId: result.providerCheckoutId,
      reference: result.reference,
      amount: result.amount,
      currency: result.currency,
      paymentType: result.paymentType,
      environment: result.environment
    });
  } catch (error) {
    console.error('[API /payments/dues/create-checkout] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize dues payment checkout.' });
  }
}
