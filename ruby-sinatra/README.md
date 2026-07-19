# Ruby (Sinatra)

```bash
cd ruby-sinatra
bundle install
WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard ruby app.rb
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- Raw body diambil dari `request.body.read` (setelah `rewind`) — **jangan** pakai `params` (itu sudah di-parse Sinatra).
- Signature dihitung dengan `OpenSSL::HMAC.hexdigest('SHA256', secret, raw_body)`.
- Perbandingan pakai `OpenSSL.fixed_length_secure_compare()` (constant-time, built-in) — panjang string harus sama dulu sebelum dipanggil, kalau tidak method ini akan raise error.
- Untuk Rails, mekanismenya sama: ambil raw body via `request.body.read` di controller (pastikan action ini di-skip dari `protect_from_forgery` / CSRF karena ini endpoint API, bukan form submission).
