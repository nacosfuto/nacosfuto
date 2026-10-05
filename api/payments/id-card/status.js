/**
 * @file api/payments/id-card/status.js
 * Vercel Serverless Function: Queries current authoritative payment status for Student ID Card
 */

import { getPaymentStatus } from '../../../packages/supabase/src/server/bachs.js';

export default async function handler(req, res) {
  // CORS Headers
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

  if (!reference && !registrationNumber && !studentId) {
    return res.status(400).json({ error: 'Missing reference, registrationNumber, or studentId query parameter.' });
  }

  try {
    const result = await getPaymentStatus({ reference, registrationNumber, studentId });
    return res.status(200).json(result);
  } catch (error) {
    console.error('[API /payments/id-card/status] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve payment status.' });
  }
}
