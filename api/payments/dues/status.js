/**
 * @file api/payments/dues/status.js
 * Vercel Serverless Function: Queries authoritative payment status for Departmental Dues
 */

import { getPaymentStatus } from '../../../packages/supabase/src/server/bachs.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
  }

  const urlObj = new URL(req.url, 'http://localhost');
  const reference = req.query?.reference || urlObj.searchParams.get('reference');
  const registrationNumber = req.query?.registrationNumber || req.query?.regNo || urlObj.searchParams.get('registrationNumber') || urlObj.searchParams.get('regNo');
  const studentId = req.query?.studentId || urlObj.searchParams.get('studentId');

  try {
    const result = await getPaymentStatus({
      reference,
      paymentType: 'DEPARTMENTAL_DUES',
      registrationNumber,
      studentId
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API /payments/dues/status] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve dues payment status.' });
  }
}
