/**
 * AustinPay Webhook Receiver - SvelteKit
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 * Endpoint: POST /api/webhook
 */

import { json } from '@sveltejs/kit';
import crypto from 'crypto';

export async function POST({ request }) {
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  const signature = request.headers.get('X-AustinPay-Signature') || '';
  const eventHeader = request.headers.get('X-AustinPay-Event') || '';
  const rawBody = await request.text();

  console.log('================ WEBHOOK RECEIVED ================');
  console.log('Event header:', eventHeader);

  let envelope: any = {};
  try { envelope = JSON.parse(rawBody); } catch { /* ignore */ }

  if (!webhookSecret) {
    return json({ error: 'WEBHOOK_SECRET is missing.' }, { status: 500 });
  }

  if (!signature) {
    console.warn('Missing X-AustinPay-Signature header');
    return json({ error: 'Unauthorized: Missing signature.' }, { status: 401 });
  }

  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const compBuf = Buffer.from(computedSignature, 'hex');

  let isValid = false;
  if (sigBuf.length === compBuf.length) {
    isValid = crypto.timingSafeEqual(sigBuf, compBuf);
  }

  if (!isValid) {
    console.warn('Invalid signature - rejecting request');
    return json({ error: 'Unauthorized: Invalid signature.' }, { status: 401 });
  }

  console.log('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status } = envelope.data || {};
  console.log('Event:', envelope.event || eventHeader, { transactionId, amount, status });

  // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event

  return json({ success: true, message: 'Webhook received and processed' });
}
