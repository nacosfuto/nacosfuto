/**
 * @file api/webhooks/bachs.js
 * Vercel Serverless Function: Authoritative Bachs Payment Webhook Handler
 * 
 * Rules:
 * 1. Verifies HMAC-SHA256 signature using BACHS_WEBHOOK_SECRET.
 * 2. Rejects invalid or forged signatures with HTTP 401.
 * 3. Idempotently processes events via `webhook_events` table (duplicate deliveries are safe).
 * 4. Validates product, amount, currency, and payment reference before confirming.
 * 5. Updates `payments` status to 'successful' and sets student's `id_card_applications.payment_status = 'paid'`.
 */

import { verifyBachsWebhookSignature, processBachsWebhook } from '../../packages/supabase/src/server/bachs.js';

export const config = {
  api: {
    bodyParser: true // Can parse json or raw
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // 1. Extract signature from headers
  const signatureHeader = 
    req.headers['x-bachs-signature'] || 
    req.headers['bachs-signature'] || 
    req.headers['x-signature'] || '';

  const rawBody = req.body;

  // 2. Verify signature
  const isValid = verifyBachsWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    console.warn('[Bachs Webhook] Invalid webhook signature detected. Rejecting with 401.');
    return res.status(401).json({ error: 'Invalid or missing Bachs webhook signature.' });
  }

  try {
    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    // 3. Process event idempotently
    const result = await processBachsWebhook(event);

    if (result.error) {
      console.error('[Bachs Webhook] Error processing event:', result.error);
      return res.status(result.statusCode || 400).json({ error: result.error });
    }

    return res.status(200).json({
      received: true,
      message: result.message || 'Webhook successfully processed.',
      alreadyProcessed: result.alreadyProcessed || false
    });
  } catch (error) {
    console.error('[Bachs Webhook] Fatal handler error:', error);
    return res.status(500).json({ error: 'Internal webhook processing failure.' });
  }
}
