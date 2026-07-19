/**
 * AustinPay Webhook Receiver - AdonisJS
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 * Tempel isi file ini ke start/routes.ts pada project AdonisJS kamu.
 */

import router from '@adonisjs/core/services/router';

router.post('/webhook', async ({ request, response }) => {
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  const signature = request.header('X-AustinPay-Signature') || '';
  const eventHeader = request.header('X-AustinPay-Event') || '';
  const rawBody = request.raw() || '';

  console.log('================ WEBHOOK RECEIVED ================');
  console.log('Event header:', eventHeader);

  let envelope: any = {};
  try { envelope = JSON.parse(rawBody); } catch { /* ignore */ }

  if (!webhookSecret) {
    return response.status(500).send({ error: 'WEBHOOK_SECRET is missing.' });
  }

  if (!signature) {
    console.warn('Missing X-AustinPay-Signature header');
    return response.status(401).send({ error: 'Unauthorized: Missing signature.' });
  }

  const { createHmac, timingSafeEqual } = await import('node:crypto');

  const computedSignature = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const compBuf = Buffer.from(computedSignature, 'hex');

  let isValid = false;
  if (sigBuf.length === compBuf.length) {
    isValid = timingSafeEqual(sigBuf, compBuf);
  }

  if (!isValid) {
    console.warn('Invalid signature - rejecting request');
    return response.status(401).send({ error: 'Unauthorized: Invalid signature.' });
  }

  console.log('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status } = envelope.data || {};
  console.log('Event:', envelope.event || eventHeader, { transactionId, amount, status });

  // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event

  return response.send({ success: true, message: 'Webhook received and processed' });
});
