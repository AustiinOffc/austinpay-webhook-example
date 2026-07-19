# AustinPay Webhook Receiver — Next.js (App Router)

Route handler App Router yang bisa langsung dipakai di project Next.js kamu.

## Setup

```bash
cd nextjs
cp .env.example .env.local
npm install
npm run dev
```

Endpoint: `POST http://localhost:3000/api/webhook`.

## Poin penting

- `request.text()` dipakai untuk ambil raw body — jangan pakai `request.json()` dulu baru re-stringify, urutan key bisa berubah dan signature jadi tidak cocok.
- Verifikasi pakai Web Crypto API (`crypto.subtle`) — jalan native di Node.js runtime maupun Edge Runtime Next.js, tanpa perlu import `crypto` dari Node.
- Deploy ke Vercel: set `WEBHOOK_SECRET` di Project Settings -> Environment Variables.
