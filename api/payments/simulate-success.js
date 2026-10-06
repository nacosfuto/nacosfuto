/**
 * @file api/payments/simulate-success.js
 * Universal Vercel Serverless Function: Simulates successful payment webhook for ANY transaction
 */

import { processBachsWebhook } from '../../packages/supabase/src/server/bachs.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const { reference, amount = 5000, paymentType = 'ID_CARD' } = req.body || {};
  if (!reference) {
    return res.status(400).json({ error: 'Missing payment reference.' });
  }

  try {
    const simEvent = {
      event_type: 'payment.successful',
      id: `sim_evt_${Date.now()}`,
      data: {
        reference,
        amount: Number(amount) || 5000,
        currency: 'NGN',
        status: 'successful',
        payment_id: `bachs_tx_${Date.now()}`
      }
    };

    const result = await processBachsWebhook(simEvent);
    return res.status(result.statusCode || (result.error ? 400 : 200)).json(result);
  } catch (error) {
    console.error('[API /payments/simulate-success] Error:', error);
    return res.status(500).json({ error: error.message || 'Simulation failed.' });
  }
}
