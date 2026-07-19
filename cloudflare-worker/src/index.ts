/**
 * AustinPay Webhook Receiver - Cloudflare Worker (D1 + KV)
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 *
 * - Verifikasi HMAC-SHA256 menggunakan Web Crypto API
 * - Menyimpan payload verified ke D1 database
 * - Deduplikasi via KV (transactionId), penting karena AustinPay retry
 *   hingga 3x kalau endpoint kamu tidak merespons dalam 10 detik
 *
 * Deploy:
 *   wrangler secret put WEBHOOK_SECRET
 *   wrangler deploy
 */

export interface Env {
  WEBHOOK_SECRET: string;
  DB: D1Database;
  WEBHOOK_KV: KVNamespace;
}

interface WebhookEnvelope {
  event: string; // deposit.paid | withdraw.approved | withdraw.rejected
  data: {
    transactionId: string;
    amount: number;
    status: string;
    method?: string;
    reason?: string;
    paidAt?: string;
    processedAt?: string;
  };
  sentAt: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/webhook') {
      return new Response('Not Found', { status: 404 });
    }

    const signature = request.headers.get('X-AustinPay-Signature') || '';
    const eventHeader = request.headers.get('X-AustinPay-Event') || '';
    const rawBody = await request.clone().text();

    console.log('================ WEBHOOK RECEIVED ================');
    console.log('Event header:', eventHeader);

    if (!env.WEBHOOK_SECRET) {
      console.error('WEBHOOK_SECRET not configured');
      return Response.json(
        { error: 'Server misconfiguration: WEBHOOK_SECRET is missing.' },
        { status: 500 },
      );
    }

    if (!signature) {
      console.warn('Missing X-AustinPay-Signature header');
      return Response.json({ error: 'Unauthorized: Missing signature.' }, { status: 401 });
    }

    const isValid = await verifySignature(rawBody, signature, env.WEBHOOK_SECRET);

    if (!isValid) {
      console.warn('Invalid signature - rejecting request');
      return Response.json({ error: 'Unauthorized: Invalid signature.' }, { status: 401 });
    }

    let envelope: WebhookEnvelope;
    try {
      envelope = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    console.log('Webhook Signature Verified Successfully!');
    console.log('Event:', envelope.event, 'Data:', JSON.stringify(envelope.data));

    // === Deduplikasi via KV (cegah proses duplikat saat AustinPay retry) ===
    const dedupKey = `webhook:${envelope.event}:${envelope.data?.transactionId}`;
    const alreadyProcessed = await env.WEBHOOK_KV.get(dedupKey);

    if (alreadyProcessed) {
      console.log(`Transaction ${envelope.data?.transactionId} already processed, skipping`);
      return Response.json({
        success: true,
        message: 'Webhook already processed (duplicate ignored)',
      });
    }

    // === Simpan ke D1 Database ===
    try {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO webhooks
         (transaction_id, event, amount, status, method, reason, sent_at, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          envelope.data?.transactionId,
          envelope.event,
          envelope.data?.amount,
          envelope.data?.status,
          envelope.data?.method || null,
          envelope.data?.reason || null,
          envelope.sentAt,
          rawBody,
        )
        .run();

      // Tandai sudah diproses (TTL 1 jam — cukup untuk menutupi window retry AustinPay)
      await env.WEBHOOK_KV.put(dedupKey, 'processed', { expirationTtl: 3600 });

      console.log(`Transaction ${envelope.data?.transactionId} saved to D1`);
    } catch (err) {
      console.error('Failed to save to D1:', err);
      // Tetap return 200 — webhook sudah valid, penyimpanan failure tidak perlu retry
    }

    // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event

    return Response.json({ success: true, message: 'Webhook received and processed' });
  },
};

/**
 * Verifikasi HMAC-SHA256 menggunakan Web Crypto API
 * (tersedia native di Cloudflare Workers, tanpa nodejs_compat)
 */
async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  return crypto.subtle.verify(
    { name: 'HMAC' },
    key,
    hexToBytes(signature),
    encoder.encode(rawBody),
  );
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
