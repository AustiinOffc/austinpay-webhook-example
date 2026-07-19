# Go (stdlib only)

Tidak ada dependency eksternal — cuma pakai `net/http`, `crypto/hmac`, `crypto/sha256`.

```bash
cd go
WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard go run main.go
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- Raw body diambil dari `io.ReadAll(r.Body)` — **sebelum** di-`json.Unmarshal`.
- Signature dihitung dengan `hmac.New(sha256.New, secret)`.
- Perbandingan pakai `hmac.Equal()` (constant-time) — bukan `==` pada string hex-nya. Kedua signature di-decode dulu ke `[]byte` pakai `hex.DecodeString` sebelum dibandingkan.
