/**
 * @file api/payments/fees.js
 * Universal Vercel Serverless Function: Get and update dynamic payment fees
 */

import { supabase } from '../../packages/supabase/src/client.js';
import { resolveDynamicFee } from '../../packages/supabase/src/server/bachs.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch all active fees
  if (req.method === 'GET') {
    try {
      const { paymentType, feeKey } = req.query || {};
      if (paymentType || feeKey) {
        const key = (feeKey || paymentType).toLowerCase();
        const amount = await resolveDynamicFee({ paymentType: key });
        return res.status(200).json({ feeKey: key, amount, currency: 'NGN' });
      }

      let fees = [];
      if (supabase) {
        const { data } = await supabase
          .from('payment_fees')
          .select('*')
          .eq('is_active', true);
        if (data) fees = data;
      }

      return res.status(200).json({ fees });
    } catch (err) {
      console.error('[API /payments/fees] Fetch Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Admin updates any fee dynamically
  if (req.method === 'POST') {
    try {
      const { feeKey, amount, label = '', currency = 'NGN' } = req.body || {};
      const key = String(feeKey || '').trim().toLowerCase();
      const num = Number(amount);

      if (!key || isNaN(num) || num <= 0) {
        return res.status(400).json({ error: 'Valid feeKey and positive amount required.' });
      }

      const now = new Date().toISOString();
      if (supabase) {
        await supabase
          .from('payment_fees')
          .upsert({
            fee_key: key,
            label: label || key.toUpperCase(),
            amount: num,
            currency,
            is_active: true,
            updated_at: now
          }, { onConflict: 'fee_key' });

        if (key === 'id_card') {
          await supabase
            .from('id_card_settings')
            .upsert({ id: 'default', id_card_fee: num, updated_at: now });
        } else if (key === 'dues') {
          await supabase
            .from('dues_settings')
            .upsert({ id: 'default', dues_amount: num, amount: num, updated_at: now });
        }
      }

      return res.status(200).json({ success: true, feeKey: key, amount: num });
    } catch (err) {
      console.error('[API /payments/fees] Update Error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed.' });
}
