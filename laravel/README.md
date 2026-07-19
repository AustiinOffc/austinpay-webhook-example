# Laravel

File di folder ini adalah **potongan kode** untuk ditempel ke project Laravel kamu (bukan project Laravel yang berdiri sendiri).

## 1. Salin file

```bash
cp VerifyAustinPaySignature.php   app/Http/Middleware/VerifyAustinPaySignature.php
cp AustinPayWebhookController.php app/Http/Controllers/AustinPayWebhookController.php
```

## 2. Tambahkan secret ke config

`.env`:
```env
AUSTINPAY_WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
```

`config/services.php`:
```php
'austinpay' => [
    'webhook_secret' => env('AUSTINPAY_WEBHOOK_SECRET'),
],
```

## 3. Daftarkan route

Tambahkan isi `routes-api-snippet.php` ke `routes/api.php` (**bukan** `routes/web.php`, supaya tidak kena middleware CSRF).

## 4. Daftarkan middleware

**Laravel 11+** (`bootstrap/app.php`):
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'austinpay.signature' => \App\Http\Middleware\VerifyAustinPaySignature::class,
    ]);
})
```

**Laravel 10 ke bawah** (`app/Http/Kernel.php`):
```php
protected $routeMiddleware = [
    // ...
    'austinpay.signature' => \App\Http\Middleware\VerifyAustinPaySignature::class,
];
```

Kalau pakai alias (bukan langsung class di route), ubah `routes-api-snippet.php`:
```php
->middleware('austinpay.signature')
```

## Poin penting

- Raw body diambil dari `$request->getContent()` — Laravel/Symfony tetap menyimpan raw content walau body sudah otomatis di-parse jadi array untuk `$request->all()` / `$request->input()`, jadi aman dipanggil kapan saja.
- Signature dihitung dengan `hash_hmac('sha256', $rawBody, $secret)`.
- Perbandingan pakai `hash_equals()` (constant-time).
- Route wajib di `routes/api.php`, bukan `routes/web.php`, supaya tidak diblokir middleware `VerifyCsrfToken`.
