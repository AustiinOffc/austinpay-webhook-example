# AustinPay Webhook Receiver — Python (FastAPI)

## Setup

```bash
cd python-fastapi
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
uvicorn main:app --host 0.0.0.0 --port 8080
```

Endpoint: `POST http://localhost:8080/webhook`.

## Poin penting

- `await request.body()` mengambil raw body sebelum di-parse ke JSON.
- `hmac.compare_digest` dipakai untuk perbandingan constant-time.
