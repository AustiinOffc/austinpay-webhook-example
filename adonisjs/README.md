# AustinPay Webhook Receiver — AdonisJS

Route handler siap-pakai untuk project AdonisJS yang sudah ada.

## Setup

1. Tempel isi `start/routes.ts` ke file `start/routes.ts` project AdonisJS kamu (atau import sebagai route terpisah).
2. Set `WEBHOOK_SECRET` di `.env` project kamu (lihat `.env.example`).
3. Pastikan route `/webhook` **tidak** melewati middleware yang mem-parse ulang body sebelum `request.raw()` dipanggil (AdonisJS by default masih menyediakan raw body via `request.raw()`).
4. Jalankan `node ace serve --watch`.

## Poin penting

- `request.raw()` mengembalikan body mentah sebagai string — ini yang dipakai untuk hitung HMAC, bukan `request.body()` yang sudah ter-parse.
- Signature dibandingkan dengan `timingSafeEqual`, bukan `===`.
