<?php

// Tambahkan baris ini ke routes/api.php (bukan routes/web.php — hindari
// middleware VerifyCsrfToken yang akan menolak request tanpa CSRF token).

use App\Http\Controllers\AustinPayWebhookController;
use App\Http\Middleware\VerifyAustinPaySignature;

Route::post('/webhook/austinpay', [AustinPayWebhookController::class, 'handle'])
    ->middleware(VerifyAustinPaySignature::class);
