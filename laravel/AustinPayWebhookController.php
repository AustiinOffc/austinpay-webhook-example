<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * AustinPay Webhook Receiver — Laravel Controller
 * ============================================================
 * Simpan file ini di: app/Http/Controllers/AustinPayWebhookController.php
 * Route ini HARUS sudah melewati VerifyAustinPaySignature middleware
 * (lihat routes-api-snippet.php di folder ini) sebelum sampai ke sini —
 * jadi di dalam method ini signature sudah pasti valid.
 */
class AustinPayWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $event       = $request->header('X-AustinPay-Event') ?? $request->input('event', 'unknown');
        $payloadData = $request->input('data', $request->all()); // support envelope & flat payload

        logger()->info('AustinPay webhook verified', [
            'event' => $event,
            'payload' => $payloadData,
        ]);

        // ── Taruh logika bisnis kamu di sini ──────────────────
        switch ($event) {
            case 'deposit.paid':
                // Order::where('transaction_id', $payloadData['transactionId'])
                //     ->update(['status' => 'paid']);
                break;

            case 'withdraw.approved':
                // Withdraw::where('transaction_id', $payloadData['transactionId'])
                //     ->update(['status' => 'success']);
                break;

            case 'withdraw.rejected':
                // notify user pakai $payloadData['reason']
                break;

            default:
                logger()->warning('AustinPay webhook: unknown event', ['event' => $event]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Webhook received and processed',
        ]);
    }
}
