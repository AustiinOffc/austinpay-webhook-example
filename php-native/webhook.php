<?php
/**
 * AustinPay Webhook Receiver — PHP Native (tanpa framework)
 * ============================================================
 * Verifikasi signature HMAC-SHA256 dari webhook AustinPay.
 * Jalankan di belakang web server apapun (Apache/Nginx + PHP-FPM)
 * atau langsung: php -S localhost:8080 webhook.php
 */

declare(strict_types=1);

// ── Konfigurasi ──────────────────────────────────────────────
// Ambil dari environment variable, atau ganti langsung di sini.
$WEBHOOK_SECRET = getenv('WEBHOOK_SECRET') ?: 'whsec_ganti_dengan_secret_anda_dari_dashboard';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── 1. Ambil RAW body — WAJIB, jangan pakai $_POST ───────────
// Signature dihitung dari raw bytes persis seperti yang dikirim.
// json_decode ulang lalu re-encode TIDAK akan menghasilkan hash yang sama.
$rawBody = file_get_contents('php://input');

// ── 2. Ambil header signature & event ────────────────────────
// PHP mengubah header jadi HTTP_X_AUSTINPAY_SIGNATURE (uppercase, underscore)
$signature = $_SERVER['HTTP_X_AUSTINPAY_SIGNATURE'] ?? null;
$event     = $_SERVER['HTTP_X_AUSTINPAY_EVENT'] ?? null;

error_log('================ WEBHOOK RECEIVED ================');
error_log('Raw Payload: ' . $rawBody);
error_log('Signature Header: ' . ($signature ?? '(kosong)'));
error_log('Event Header: ' . ($event ?? '(kosong)'));

if (empty($WEBHOOK_SECRET)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfiguration: WEBHOOK_SECRET is missing.']);
    exit;
}

if (!$signature) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Missing signature.']);
    exit;
}

// ── 3. Hitung ulang signature & bandingkan secara constant-time ──
$computedSignature = hash_hmac('sha256', $rawBody, $WEBHOOK_SECRET);

error_log('Signature dari Header : ' . $signature);
error_log('Signature Hasil Compute: ' . $computedSignature);

// hash_equals() sudah timing-safe (setara crypto.timingSafeEqual di Node.js)
$isSignatureValid = hash_equals($computedSignature, $signature);

if (!$isSignatureValid) {
    error_log('Rejected request: Invalid signature.');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Invalid signature.']);
    exit;
}

// ── 4. Parse payload (setelah signature terverifikasi) ───────
$decoded = json_decode($rawBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload.']);
    exit;
}

$eventName   = $event ?: ($decoded['event'] ?? 'unknown');
$payloadData = $decoded['data'] ?? $decoded; // support envelope {event,data,sentAt} & payload flat

$transactionId = $payloadData['transactionId'] ?? null;
$amount        = $payloadData['amount'] ?? null;
$status        = $payloadData['status'] ?? null;
$paidAt        = $payloadData['paidAt'] ?? null;
$method        = $payloadData['method'] ?? null;
$reason        = $payloadData['reason'] ?? null;
$processedAt   = $payloadData['processedAt'] ?? null;

error_log('Webhook Signature Verified Successfully!');
error_log('Event: ' . $eventName);
error_log('==================================================');

// ── 5. Taruh logika bisnis kamu di sini ───────────────────────
switch ($eventName) {
    case 'deposit.paid':
        // creditOrderInYourDb($transactionId, $amount);
        break;
    case 'withdraw.approved':
        // markWithdrawSuccess($transactionId);
        break;
    case 'withdraw.rejected':
        // notifyUser($transactionId, $reason);
        break;
    default:
        error_log('Event tidak dikenal: ' . $eventName);
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Webhook received and processed',
]);
