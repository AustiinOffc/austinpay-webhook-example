# AustinPay Webhook Receiver — NestJS

Contoh server penerima webhook AustinPay memakai NestJS, dengan verifikasi signature HMAC-SHA256.

## Setup

```bash
cd nestjs
cp .env.example .env
npm install
npm run start
```

Server berjalan di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- `rawBody: true` di `NestFactory.create()` **wajib** diaktifkan supaya Nest menyimpan body mentah (`req.rawBody`) sebelum di-parse — tanpa ini signature tidak akan pernah cocok.
- Signature diverifikasi dengan `crypto.timingSafeEqual`, bukan perbandingan string biasa.
- Setelah lolos verifikasi, `envelope.event` dan `envelope.data` berisi event name (`deposit.paid`, dst) dan payload transaksi.
