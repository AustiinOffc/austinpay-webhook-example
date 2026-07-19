# Python (Flask)

```bash
cd python
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard   # Windows: set WEBHOOK_SECRET=...
python app.py
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- Raw body diambil dari `request.get_data()` — **jangan** pakai `request.json` untuk hitung ulang signature (itu sudah jadi dict, urutan key bisa berubah saat di-serialize ulang).
- Signature dihitung dengan `hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()`.
- Perbandingan pakai `hmac.compare_digest()` (constant-time, built-in).

## Framework lain (Django, FastAPI)

Mekanismenya sama, cuma beda cara ambil raw body:
- **Django**: `request.body` (bytes mentah, sebelum `request.POST`/`json.loads`).
- **FastAPI**: `await request.body()` di dalam endpoint async.

Sisanya (hitung HMAC, `hmac.compare_digest`) persis sama seperti di `app.py`.
