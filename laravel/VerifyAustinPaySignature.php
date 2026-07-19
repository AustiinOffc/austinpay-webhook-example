<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * AustinPay Webhook Receiver — Laravel Middleware
 * ============================================================
 * Simpan file ini di: app/Http/Middleware/VerifyAustinPaySignature.php
 * Daftarkan di bootstrap/app.php (Laravel 11+) atau app/Http/Kernel.php
 * (Laravel <=10) — lihat README.md di folder ini.
 */
class VerifyAustinPaySignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.austinpay.webhook_secret');

        if (empty($secret)) {
            return response()->json([
                'error' => 'Server misconfiguration: WEBHOOK_SECRET is missing.',
            ], 500);
        }

        $signature = $request->header('X-AustinPay-Signature');

        if (!$signature) {
            return response()->json([
                'error' => 'Unauthorized: Missing signature.',
            ], 401);
        }

        // WAJIB pakai raw body, bukan $request->all() / ->json()
        // Laravel/Symfony menyimpan raw content, jadi getContent() aman
        // dipanggil walau body sudah "dibaca" untuk parsing JSON.
        $rawBody = $request->getContent();

        $computedSignature = hash_hmac('sha256', $rawBody, $secret);

        // hash_equals() = constant-time compare (setara timingSafeEqual)
        if (!hash_equals($computedSignature, $signature)) {
            logger()->warning('AustinPay webhook: invalid signature', [
                'received' => $signature,
                'computed' => $computedSignature,
            ]);

            return response()->json([
                'error' => 'Unauthorized: Invalid signature.',
            ], 401);
        }

        return $next($request);
    }
}
