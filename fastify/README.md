# AustinPay Webhook Receiver — Fastify

Contoh server penerima webhook AustinPay memakai [Fastify](https://fastify.dev), dengan verifikasi signature HMAC-SHA256 dan raw-body preservation.

## Setup

```bash
cd fastify
cp .env.example .env
# isi WEBHOOK_SECRET dengan secret dari Dashboard AustinPay -> menu Webhook
npm install
npm start
```

Server berjalan di `http://localhost:8080`, endpoint: `POST /webhook`.

## Cara kerja

1. `addContentTypeParser` dikonfigurasi untuk membaca body sebagai `buffer` mentah, bukan langsung di-parse Fastify ke object — ini wajib supaya signature bisa dihitung dari byte yang persis sama dengan yang dikirim AustinPay.
2. Signature dari header `X-AustinPay-Signature` dibandingkan dengan HMAC-SHA256 hasil hitung sendiri, pakai `crypto.timingSafeEqual` (bukan `===`) supaya aman dari timing attack.
3. Setelah signature valid, body baru di-parse jadi JSON dan diproses (`envelope.event`, `envelope.data`).

## Testing lokal (Ngrok)

```bash
ngrok http 8080
# Daftarkan URL https://xxxx.ngrok-free.app/webhook di Dashboard AustinPay -> Webhook
```
