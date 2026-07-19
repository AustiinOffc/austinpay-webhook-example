# PHP Native (tanpa framework)

Butuh PHP 7.4+ (ada `hash_equals`).

## Jalankan cepat (built-in server, untuk testing)

```bash
cd php-native
WEBHOOK_SECRET=whsec_xxx php -S localhost:8080 webhook.php
```

## Deploy di Apache/Nginx + PHP-FPM

1. Upload `webhook.php` ke document root, misal `public_html/webhook.php`.
2. Set environment variable `WEBHOOK_SECRET` di server (atau edit langsung
   variabel `$WEBHOOK_SECRET` di baris atas file — **tidak disarankan** untuk
   production, lebih aman lewat env var / `.htaccess SetEnv`).
3. Endpoint kamu jadi: `https://domain-kamu.com/webhook.php`.

## Poin penting

- Raw body diambil dari `file_get_contents('php://input')` — **jangan** pakai `$_POST`.
- Signature dihitung dengan `hash_hmac('sha256', $rawBody, $secret)`.
- Perbandingan pakai `hash_equals()` (constant-time, built-in sejak PHP 5.6).
- Header HTTP diakses via `$_SERVER['HTTP_X_AUSTINPAY_SIGNATURE']` (PHP mengubah nama header jadi uppercase + underscore).
