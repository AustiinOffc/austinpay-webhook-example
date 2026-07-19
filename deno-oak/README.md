# AustinPay Webhook Receiver — Deno + Oak

## Setup

```bash
cd deno-oak
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
deno run --allow-net --allow-env app.ts
```

Endpoint: `POST http://localhost:8080/webhook`.
