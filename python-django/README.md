# Python (Django)

File di folder ini adalah **potongan kode** untuk ditempel ke project Django yang sudah ada (bukan project berdiri sendiri).

## 1. Salin ke app kamu

```bash
cp views.py your_app/views.py           # atau tempel fungsi austinpay_webhook ke views.py yang sudah ada
```

Tambahkan isi `urls-snippet.py` ke `your_app/urls.py`, lalu pastikan app-nya sudah ter-include di `urls.py` project utama.

## 2. Set environment variable

```env
WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
```

## Poin penting

- Raw body diambil dari `request.body` (bytes mentah) — **jangan** pakai `request.POST` (itu untuk form-encoded data) atau parsing manual lain sebelum verifikasi.
- View **wajib** pakai `@csrf_exempt` karena ini endpoint server-to-server, tidak pernah membawa CSRF token Django. Keamanannya digantikan oleh verifikasi HMAC signature, bukan CSRF token.
- Signature dihitung dengan `hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()`.
- Perbandingan pakai `hmac.compare_digest()` (constant-time, built-in).
- `@require_POST` menolak method selain POST secara otomatis (405).
