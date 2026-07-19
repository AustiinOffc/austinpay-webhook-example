# AustinPay Webhook Receiver — Hono (Multi-Runtime)

Satu source code, jalan di Node.js, Bun, Deno, maupun Cloudflare Workers — pakai Web Crypto API jadi tidak butuh package `crypto` bawaan Node.

## Jalankan

```bash
cd hono-multi
npm install
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard

npm run dev:node   # via tsx di Node.js
npm run dev:bun    # via Bun
npm run dev:deno   # via Deno
```

Endpoint: `POST /webhook`.

## Poin penting

- `getSecret()` membaca env variable dengan cara yang berbeda tergantung runtime (`Deno.env.get` vs `process.env`) — deteksi otomatis lewat `typeof Deno !== 'undefined'`.
- Verifikasi HMAC pakai `crypto.subtle.verify` (Web Crypto API), native di semua runtime target tanpa perlu import tambahan.
