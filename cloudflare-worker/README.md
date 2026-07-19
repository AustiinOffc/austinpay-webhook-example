# AustinPay Webhook Receiver — Cloudflare Worker (D1 + KV)

Contoh paling lengkap: bukan cuma menerima & verifikasi webhook, tapi juga menyimpan hasilnya ke D1 database dan deduplikasi via KV — supaya retry otomatis AustinPay (hingga 3x jika tidak ada respons dalam 10 detik) tidak memicu proses ganda (misal kredit saldo dobel).

## Setup

```bash
cd cloudflare-worker
npm install

# Buat D1 database & KV namespace, lalu isi ID-nya ke wrangler.toml
wrangler d1 create austinpay-webhooks
wrangler kv namespace create WEBHOOK_KV

npm run db:init          # apply schema ke D1 lokal
npm run db:init:remote   # apply schema ke D1 production

wrangler secret put WEBHOOK_SECRET
npm run dev               # lokal
npm run deploy             # production
```

Endpoint: `POST /webhook`.

## Poin penting

- Signature diverifikasi dengan Web Crypto API — native di Cloudflare Workers.
- **Deduplikasi**: kunci KV `webhook:{event}:{transactionId}` dicek sebelum insert ke D1, TTL 1 jam. Ini menutup celah AustinPay mengirim event yang sama 2-3 kali karena retry.
- **`UNIQUE(transaction_id, event)`** di schema D1 jadi lapisan pengaman kedua kalau KV entah kenapa miss.
- Simpan `WEBHOOK_SECRET` lewat `wrangler secret put`, jangan taruh di `[vars]` `wrangler.toml` untuk production.
