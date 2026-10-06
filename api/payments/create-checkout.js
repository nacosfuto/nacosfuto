/**
 * @file api/payments/create-checkout.js
 * Universal Vercel Serverless Function: Authoritative Bachs Checkout Session Creator
 * 
 * Supports:
 * - ID_CARD (Student ID Card)
 * - DEPARTMENTAL_DUES (Annual Dues Clearance)
 * - EVENT_TICKET (Paid Tech Events & Hackathons)
 * - RESOURCE / COMPENDIUM (Academic Study Materials)
 * - MERCHANDISE / STORE (NACOS Apparel & Swag)
 * - CUSTOM / GENERAL (Admin-configured custom payments)
 */

import { createPaymentCheckout } from '../../packages/supabase/src/server/bachs.js';

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
    const {
      paymentType = 'ID_CARD',
      title,
      student,
      customer,
      metadata = {},
      amountOverride,
      redirectPath,
      cancelPath
    } = req.body || {};

    const returnBaseUrl = req.body?.returnBaseUrl || req.headers?.origin || req.headers?.referer;

    const result = await createPaymentCheckout({
      paymentType,
      title,
      student,
      customer,
      metadata,
      returnBaseUrl,
      redirectPath,
      cancelPath,
      amountOverride
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
    console.error('[API /payments/create-checkout] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize universal payment checkout.' });
  }
}
