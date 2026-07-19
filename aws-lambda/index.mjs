/**
 * AustinPay Webhook Receiver - AWS Lambda (API Gateway / Function URL)
 *
 * Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.
 *
 * Deploy:
 *   zip -r function.zip index.mjs
 *   aws lambda create-function --function-name austinpay-webhook --runtime nodejs22.x \
 *     --handler index.handler --zip-file fileb://function.zip
 *   # Set env WEBHOOK_SECRET dari Dashboard AustinPay di Lambda console
 *   # Integrasikan dengan API Gateway HTTP API atau Function URL
 */

import crypto from 'crypto';

export const handler = async (event) => {
  const webhookSecret = process.env.WEBHOOK_SECRET || '';
  const headers = event.headers || {};
  const signature = headers['x-austinpay-signature'] || headers['X-AustinPay-Signature'] || '';
  const eventHeader = headers['x-austinpay-event'] || headers['X-AustinPay-Event'] || '';
  const rawBody = event.body || '';

  console.log('================ WEBHOOK RECEIVED ================');
  console.log('Event header:', eventHeader);

  if (!webhookSecret) {
    return formatResponse(500, { error: 'WEBHOOK_SECRET is missing.' });
  }

  if (!signature) {
    console.warn('Missing X-AustinPay-Signature header');
    return formatResponse(401, { error: 'Unauthorized: Missing signature.' });
  }

  // Gunakan isBase64Encoded jika API Gateway mengirim base64
  const bodyBuffer = event.isBase64Encoded
    ? Buffer.from(rawBody, 'base64')
    : Buffer.from(rawBody, 'utf-8');

  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(bodyBuffer)
    .digest('hex');

  const sigBuffer = Buffer.from(signature, 'hex');
  const compBuffer = Buffer.from(computedSignature, 'hex');

  let isValid = false;
  if (sigBuffer.length === compBuffer.length) {
    isValid = crypto.timingSafeEqual(sigBuffer, compBuffer);
  }

  if (!isValid) {
    console.warn('Invalid signature - rejecting request');
    return formatResponse(401, { error: 'Unauthorized: Invalid signature.' });
  }

  let envelope = {};
  try { envelope = JSON.parse(bodyBuffer.toString('utf-8')); } catch { /* ignore */ }

  console.log('Webhook Signature Verified Successfully!');
  const { transactionId, amount, status } = envelope.data || {};
  console.log('Event:', envelope.event || eventHeader, { transactionId, amount, status });

  // TODO: taruh logika bisnis kamu di sini berdasarkan envelope.event
  // (deposit.paid, withdraw.approved, withdraw.rejected)

  return formatResponse(200, { success: true, message: 'Webhook received and processed' });
};

function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
