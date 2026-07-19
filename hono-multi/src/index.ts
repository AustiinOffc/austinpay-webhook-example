/**
 * AustinPay Webhook Receiver - Hono (Multi-Runtime)
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 *
 * Berjalan di: Node.js, Bun, Deno, Cloudflare Workers
 * Tidak ada dependency eksternal untuk HMAC — pakai Web Crypto API.
 */

import { Hono } from 'hono';

const app = new Hono();

function getSecret(): string {
  // @ts-ignore - Deno
  if (typeof Deno !== 'undefined') return Deno.env.get('WEBHOOK_SECRET') || '';
  // @ts-ignore - Bun, Node, Cloudflare
  return process.env.WEBHOOK_SECRET || 'whsec_ganti_dengan_secret_anda_dari_dashboard';
}

app.post('/webhook', async (c) => {
  const webhookSecret = getSecret();
  const signature = c.req.header('X-AustinPay-Signature') || '';
  const eventHeader = c.req.header('X-AustinPay-Event') || '';
  const rawBody = await c.req.text();

  console.log('================ WEBHOOK RECEIVED ================');
  console.log('Event header:', eventHeader);
  console.log(
    'Runtime:',
    // @ts-ignore
    typeof Deno !== 'undefined' ? 'Deno' : typeof Bun !== 'undefined' ? 'Bun' : 'Node/CF',
  );

  let envelope: Record<string, any> = {};
  try { envelope = JSON.parse(rawBody); } catch { /* ignore */ }

  if (!webhookSecret) {
    return c.json({ error: 'WEBHOOK_SECRET is missing.' }, 500);
  }

  if (!signature) {
    console.warn('Missing X-AustinPay-Signature header');
    return c.json({ error: 'Unauthorized: Missing signature.' }, 401);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
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
    return c.json({ error: 'Unauthorized: Invalid signature.' }, 401);
  }

  console.log('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status } = envelope.data || {};
  console.log('Event:', envelope.event || eventHeader, { transactionId, amount, status });

  // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event

  return c.json({ success: true, message: 'Webhook received and processed' });
});

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export default app;
