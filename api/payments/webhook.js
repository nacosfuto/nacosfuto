/**
 * @file api/payments/webhook.js
 * Universal Vercel Serverless Function: Bachs Payment Webhook Handler alias
 */

import handler, { config as webhookConfig } from '../webhooks/bachs.js';

export const config = webhookConfig;
export default handler;
