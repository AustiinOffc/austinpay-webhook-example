# Rust (Actix-web)

```bash
cd rust-actix
WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard cargo run
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- Raw body diambil lewat extractor `web::Bytes` — Actix tidak akan mem-parsing JSON otomatis dengan tipe ini, jadi kamu dapat bytes mentah persis seperti yang dikirim.
- Signature dihitung dengan crate `hmac` + `sha2` (`Hmac<Sha256>`).
- Perbandingan pakai `mac.verify_slice()` — method bawaan crate `hmac` yang **sudah constant-time secara internal**, jadi tidak perlu implementasi manual seperti bahasa lain.
- Signature header di-decode dari hex ke bytes pakai crate `hex` sebelum diverifikasi.
