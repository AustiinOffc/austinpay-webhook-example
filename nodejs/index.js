import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const WEBHOOK_SECRET =
  process.env.WEBHOOK_SECRET ||
  'xxxxxxxxxxxxx';

if (!WEBHOOK_SECRET) {
  console.warn('WARNING: WEBHOOK_SECRET is not set in environment variables.');
}

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

function safeDecodePayload(body) {
  try {
    const decoded = {};

    for (const [key, value] of Object.entries(body || {})) {
      if (typeof value === 'string') {
        try {
          decoded[key] = decodeURIComponent(value);
        } catch {
          decoded[key] = value;
        }
      } else {
        decoded[key] = value;
      }
    }

    return decoded;
  } catch (error) {
    console.error('Failed to decode payload:', error.message);
    return body;
  }
}

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-austinpay-signature'];

  const rawBodyString = req.rawBody ? req.rawBody.toString('utf8') : '';

  console.log('\n================ WEBHOOK RECEIVED ================');
  console.log('Headers:', req.headers);
  console.log('Raw Payload Asli:');
  console.log(rawBodyString || '(empty raw body)');

  console.log('Payload Parsed dari Express req.body:');
  console.log(req.body);

  const decodedPayload = safeDecodePayload(req.body);

  console.log('Payload Setelah di Decode:');
  console.log(decodedPayload);
  console.log('==================================================\n');

  if (!WEBHOOK_SECRET) {
    console.error('Webhook secret is not configured on the server.');
    return res.status(500).json({
      error: 'Server misconfiguration: WEBHOOK_SECRET is missing.',
    });
  }

  if (!signature) {
    console.warn('Rejected request: x-austinpay-signature header is missing.');
    return res.status(401).json({
      error: 'Unauthorized: Missing signature.',
    });
  }

  let isSignatureValid = false;

  try {
    const computedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.rawBody || '')
      .digest('hex');

    console.log('Signature dari Header:', signature);
    console.log('Signature Hasil Compute:', computedSignature);

    const signatureBuffer = Buffer.from(signature, 'hex');
    const computedBuffer = Buffer.from(computedSignature, 'hex');

    if (signatureBuffer.length === computedBuffer.length) {
      isSignatureValid = crypto.timingSafeEqual(
        signatureBuffer,
        computedBuffer
      );
    }
  } catch (error) {
    console.error('Error during signature verification:', error.message);
  }

  if (!isSignatureValid) {
    console.warn('Rejected request: Invalid signature.');
    return res.status(401).json({
      error: 'Unauthorized: Invalid signature.',
    });
  }

  const event = req.headers['x-austinpay-event'] || decodedPayload.event || 'unknown';
  const payloadData = decodedPayload.data || decodedPayload; // support both enveloped & flat payloads

  const {
    transactionId,
    amount,
    status,
    paidAt,
    method,
    reason,
    processedAt,
  } = payloadData;

  console.log('Webhook Signature Verified Successfully!');
  console.log('Event:', event);
  console.log('Final Payload:', {
    transactionId,
    amount,
    status,
    paidAt,
    method,
    reason,
    processedAt,
  });

  // TODO: taruh logika bisnis kamu di sini, contoh:
  // if (event === 'deposit.paid') { creditOrderInYourDb(transactionId, amount); }
  // if (event === 'withdraw.rejected') { notifyUser(transactionId, reason); }

  return res.status(200).json({
    success: true,
    message: 'Webhook received and processed',
  });
});

app.listen(PORT, () => {
  console.log(`AustinPay webhook receiver example listening on http://localhost:${PORT}`);
  console.log(`Send POST requests to: http://localhost:${PORT}/webhook`);
});
