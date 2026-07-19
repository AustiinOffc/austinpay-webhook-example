# AustinPay Webhook Receiver — SvelteKit

## Setup

```bash
cd sveltekit
cp .env.example .env
npm install   # butuh @sveltejs/kit di project kamu
npm run dev
```

Endpoint: `POST /api/webhook`.

## Poin penting

- `request.text()` dipakai untuk ambil raw body sebelum diparse.
- Signature diverifikasi dengan `crypto.timingSafeEqual` dari modul `crypto` Node.js.
