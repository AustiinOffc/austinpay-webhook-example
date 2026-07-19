/**
 * AustinPay Webhook Receiver - Next.js App Router
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 * Endpoint: POST /api/webhook
 *
 * Setup:
 *   1. Dapatkan Webhook Secret dari Dashboard AustinPay
 *   2. Set env: WEBHOOK_SECRET=whsec_xxx
 *   3. Deploy ke Vercel atau self-host
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  const signature = request.headers.get('X-AustinPay-Signature') || '';
  const eventHeader = request.headers.get('X-AustinPay-Event') || '';
  const rawBody = await request.text();

  console.log('================ WEBHOOK RECEIVED ================');
  console.log('Event header:', eventHeader);

  if (!webhookSecret) {
    return NextResponse.json({ error: 'WEBHOOK_SECRET is missing.' }, { status: 500 });
  }

  if (!signature) {
    console.warn('Missing X-AustinPay-Signature header');
    return NextResponse.json({ error: 'Unauthorized: Missing signature.' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const isValid = await crypto.subtle.verify(
    { name: 'HMAC' },
    key,
    hexToBytes(signature),
    encoder.encode(rawBody),
  );

  if (!isValid) {
    console.warn('Invalid signature - rejecting request');
    return NextResponse.json({ error: 'Unauthorized: Invalid signature.' }, { status: 401 });
  }

  const envelope = JSON.parse(rawBody);
  console.log('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status } = envelope.data || {};
  console.log('Event:', envelope.event || eventHeader, { transactionId, amount, status });

  // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event
  // (deposit.paid, withdraw.approved, withdraw.rejected)

  return NextResponse.json({ success: true, message: 'Webhook received and processed' });
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
