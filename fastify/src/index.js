/**
 * AustinPay Webhook Receiver - Fastify
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 * Verifikasi HMAC-SHA256 dengan raw body preservation.
 *
 * AustinPay mengirim envelope:
 *   { "event": "deposit.paid", "data": { ... }, "sentAt": "..." }
 * dengan header X-AustinPay-Signature & X-AustinPay-Event.
 */

import Fastify from 'fastify';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });

const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET || 'whsec_ganti_dengan_secret_anda_dari_dashboard';
const PORT = parseInt(process.env.PORT || '8080');

// Preserve raw body untuk verifikasi signature (jangan parse dulu ke JSON)
app.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  function (_req, body, done) {
    done(null, body);
  },
);

app.post('/webhook', async (request, reply) => {
  const signature = request.headers['x-austinpay-signature'] || '';
  const event = request.headers['x-austinpay-event'] || '';
  const rawBody = request.body;

  let envelope = {};
  try {
    envelope = JSON.parse(rawBody.toString('utf-8'));
  } catch { /* ignore, ditangani di bawah */ }

  app.log.info('================ WEBHOOK RECEIVED ================');
  app.log.info('Event Header: %s', event);
  app.log.info('Raw Body: %s', rawBody.toString());

  if (!WEBHOOK_SECRET) {
    return reply.status(500).send({ error: 'WEBHOOK_SECRET is missing.' });
  }

  if (!signature) {
    app.log.warn('Missing X-AustinPay-Signature header');
    return reply.status(401).send({ error: 'Unauthorized: Missing signature.' });
  }

  const computedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const computedBuffer = Buffer.from(computedSignature, 'hex');

  let isSignatureValid = false;
  if (signatureBuffer.length === computedBuffer.length) {
    isSignatureValid = crypto.timingSafeEqual(signatureBuffer, computedBuffer);
  }

  if (!isSignatureValid) {
    app.log.warn('Invalid signature - rejecting request');
    return reply.status(401).send({ error: 'Unauthorized: Invalid signature.' });
  }

  app.log.info('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status, method, reason, paidAt, processedAt } =
    envelope.data || {};
  app.log.info(
    'Event: %s | transactionId=%s amount=%s status=%s',
    envelope.event || event,
    transactionId,
    amount,
    status,
  );

  // TODO: taruh logika bisnis kamu di sini, contoh:
  // if (envelope.event === 'deposit.paid') { creditOrderInYourDb(transactionId, amount); }
  // if (envelope.event === 'withdraw.rejected') { notifyUser(transactionId, reason); }
  void method; void paidAt; void processedAt;

  return { success: true, message: 'Webhook received and processed' };
});

app.listen({ port: PORT, host: '0.0.0.0' });
