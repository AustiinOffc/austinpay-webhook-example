/**
 * AustinPay Webhook Receiver - Deno + Oak
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 * Verifikasi HMAC-SHA256 menggunakan Web Crypto API.
 *
 * Jalankan:
 *   deno run --allow-net --allow-env app.ts
 */

import { Application, Router } from 'jsr:@oak/oak';

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ||
  'whsec_ganti_dengan_secret_anda_dari_dashboard';
const PORT = parseInt(Deno.env.get('PORT') || '8080');

const router = new Router();

router.post('/webhook', async (ctx) => {
  const signature = ctx.request.headers.get('X-AustinPay-Signature') || '';
  const eventHeader = ctx.request.headers.get('X-AustinPay-Event') || '';
  const rawBody = await ctx.request.body.text();

  console.log('================ WEBHOOK RECEIVED ================');
  console.log('Event header:', eventHeader);

  if (!WEBHOOK_SECRET) {
    ctx.response.status = 500;
    ctx.response.body = { error: 'WEBHOOK_SECRET is missing.' };
    return;
  }

  if (!signature) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Unauthorized: Missing signature.' };
    return;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const isValid = await crypto.subtle.verify(
    { name: 'HMAC' },
    key,
    hexToBytes(signature),
    new TextEncoder().encode(rawBody),
  );

  if (!isValid) {
    console.warn('Invalid signature - rejecting request');
    ctx.response.status = 401;
    ctx.response.body = { error: 'Unauthorized: Invalid signature.' };
    return;
  }

  const envelope = JSON.parse(rawBody);
  console.log('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status } = envelope.data || {};
  console.log('Event:', envelope.event || eventHeader, { transactionId, amount, status });

  // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event

  ctx.response.body = { success: true, message: 'Webhook received and processed' };
});

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log(`AustinPay webhook receiver on http://localhost:${PORT}`);
await app.listen({ port: PORT });
