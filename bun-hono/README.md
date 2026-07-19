# AustinPay Webhook Receiver — Bun + Hono

## Setup

```bash
cd bun-hono
bun install
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
bun run src/index.ts
```

Endpoint: `POST /webhook`, default port 3000 (Bun/Hono default).
