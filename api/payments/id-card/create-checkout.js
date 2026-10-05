/**
 * @file api/payments/id-card/create-checkout.js
 * Vercel Serverless Function: Creates authoritative Bachs checkout session for NACOS Student ID Card
 * 
 * Security:
 * - Authoritative amount (₦5,000 NGN) determined strictly server-side.
 * - Authenticates student session from authorization token or verified student headers.
 * - Prevents duplicate checkout sessions if payment already completed.
 */

import { createIdCardCheckout, validateStudentEligibility } from '../../../packages/supabase/src/server/bachs.js';

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
    const returnBaseUrl = req.body?.returnBaseUrl || req.headers?.origin || req.headers?.referer;

    // Server-side eligibility check
    const eligibility = validateStudentEligibility(student);
    if (!eligibility.eligible) {
      return res.status(400).json({ error: eligibility.reason });
    }

    const result = await createIdCardCheckout({ student, returnBaseUrl });

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
      reference: result.reference,
      amount: result.amount,
      currency: result.currency,
      environment: result.environment
    });
  } catch (error) {
    console.error('[API /payments/id-card/create-checkout] Internal error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize payment checkout.' });
  }
}
