# AustinPay Webhook Receiver — Multi-Language Examples

Contoh implementasi server penerima **Webhook AustinPay** dengan verifikasi signature **HMAC-SHA256**, tersedia untuk beberapa bahasa/framework:

### Node.js / TypeScript

| Framework | Folder | Runtime |
|---|---|---|
| **Express.js** | [`nodejs/`](./nodejs) | Node.js |
| **Fastify** | [`fastify/`](./fastify) | Node.js |
| **NestJS** | [`nestjs/`](./nestjs) | Node.js |
| **AdonisJS** | [`adonisjs/`](./adonisjs) | Node.js |
| **Hono** (multi-runtime) | [`hono-multi/`](./hono-multi) | Node / Bun / Deno / CF Workers |
| **Next.js** (App Router) | [`nextjs/`](./nextjs) | Node.js / Vercel |
| **SvelteKit** | [`sveltekit/`](./sveltekit) | Node.js |

### Bun / Deno

| Framework | Folder |
|---|---|
| **Bun + Hono** | [`bun-hono/`](./bun-hono) |
| **Deno + Oak** | [`deno-oak/`](./deno-oak) |

### Python

| Framework | Folder |
|---|---|
| **Flask** | [`python-flask/`](./python-flask) |
| **FastAPI** | [`python-fastapi/`](./python-fastapi) |
| **Django** | [`python-django/`](./python-django) |

### PHP

| Framework | Folder |
|---|---|
| **PHP Native** | [`php-native/`](./php-native) |
| **Laravel** | [`laravel/`](./laravel) |

### Go / Java / C# / Ruby / Rust

| Platform | Folder |
|---|---|
| **Go (stdlib only)** | [`go/`](./go) |
| **Java Spring Boot** | [`java-spring-boot/`](./java-spring-boot) |
| **C# (.NET 8 Minimal API)** | [`csharp-dotnet/`](./csharp-dotnet) |
| **Ruby (Sinatra)** | [`ruby-sinatra/`](./ruby-sinatra) |
| **Rust (Actix-web)** | [`rust-actix/`](./rust-actix) |

### Serverless / Edge

| Platform | Folder | Catatan |
|---|---|---|
| **Cloudflare Workers** (D1 + KV) | [`cloudflare-worker/`](./cloudflare-worker) | Dengan D1 database & KV dedup |
| **AWS Lambda** | [`aws-lambda/`](./aws-lambda) | API Gateway / Function URL |

### Bahasa lain

Kotlin, Elixir, Swift, F#/VB.NET, dll — belum ada folder contoh, tapi ikuti **Spesifikasi Universal** di bawah karena mekanismenya sama untuk bahasa apapun (cuma beda syntax HMAC & cara baca raw body). Untuk stack JVM lain (Kotlin) langsung acu ke `java-spring-boot/`, untuk CLR lain (F#/VB.NET) acu ke `csharp-dotnet/` — API kriptografinya identik.

Semua implementasi setara secara fungsional dan tetap 100% sinkron dengan format webhook AustinPay yang sebenarnya (lihat `src/services/webhook.service.js` di source AustinPay) — pilih sesuai stack kamu.

---

## Spesifikasi Universal (berlaku untuk semua bahasa)

### 1. Header yang dikirim AustinPay

| Header | Isi |
|---|---|
| `X-AustinPay-Signature` | HMAC-SHA256 (hex) dari raw body, pakai webhook secret kamu |
| `X-AustinPay-Event` | Nama event, contoh: `deposit.paid` |
| `Content-Type` | `application/json` |

### 2. Format body (envelope)

Semua event dibungkus envelope yang sama: `event`, `data`, `sentAt`. Isi `data` berbeda tergantung event-nya.

**`deposit.paid`** — dikirim saat deposit user terverifikasi lunas:

```json
{
  "event": "deposit.paid",
  "data": {
    "transactionId": "TX987654321",
    "amount": 55000,
    "status": "paid",
    "paidAt": "2026-07-19T03:38:35.512Z"
  },
  "sentAt": "2026-07-19T03:38:35.512Z"
}
```

**`withdraw.approved`** — dikirim saat admin menyetujui withdraw:

```json
{
  "event": "withdraw.approved",
  "data": {
    "transactionId": "WD123456",
    "amount": 100000,
    "method": "OVO",
    "status": "success",
    "processedAt": "2026-07-19T03:38:35.512Z"
  },
  "sentAt": "2026-07-19T03:38:35.512Z"
}
```

**`withdraw.rejected`** — dikirim saat withdraw ditolak (saldo user otomatis di-refund di sisi AustinPay):

```json
{
  "event": "withdraw.rejected",
  "data": {
    "transactionId": "WD123456",
    "amount": 100000,
    "method": "OVO",
    "status": "rejected",
    "reason": "Nomor tujuan tidak valid",
    "processedAt": "2026-07-19T03:38:35.512Z"
  },
  "sentAt": "2026-07-19T03:38:35.512Z"
}
```

| Field | Type | Ada di event |
|---|---|---|
| `transactionId` | String | semua |
| `amount` | Number | semua |
| `status` | String | semua (`paid` / `success` / `rejected`) |
| `method` | String | `withdraw.*` — metode pencairan (OVO, DANA, dsb) |
| `reason` | String | `withdraw.rejected` — alasan penolakan |
| `paidAt` | String (ISO 8601) | `deposit.paid` |
| `processedAt` | String (ISO 8601) | `withdraw.*` |

### 3. Langkah verifikasi (wajib, urutannya penting)

1. **Baca raw body** — bytes mentah sebelum di-parse jadi JSON/object. Ini yang paling sering salah: kalau kamu decode dulu ke object lalu re-encode ke JSON untuk dihitung signature-nya, hasilnya TIDAK akan cocok (urutan key / whitespace bisa beda).
2. **Hitung HMAC-SHA256** dari raw body pakai `WEBHOOK_SECRET` kamu → hasilnya hex string.
3. **Bandingkan** hasil hitungan dengan header `X-AustinPay-Signature` pakai **constant-time compare**, jangan pakai `==` / `.equals()` biasa (rentan timing attack).
   - Node.js: `crypto.timingSafeEqual`
   - PHP: `hash_equals`
   - Python: `hmac.compare_digest`
   - Go: `hmac.Equal`
   - Java: `MessageDigest.isEqual`
   - .NET: `CryptographicOperations.FixedTimeEquals`
4. Kalau tidak cocok → tolak dengan `401`. Kalau cocok → baru proses body-nya dan balas `200`.

### 4. Kesalahan umum

- ❌ Pakai body yang sudah di-parse framework (`$_POST`, `request.json`, dsb) untuk dihitung ulang jadi JSON — hasilnya beda dengan raw body asli.
- ❌ Pakai `==` untuk bandingkan signature — buka celah timing attack.
- ❌ Lupa exclude route webhook dari CSRF protection (khusus framework yang punya CSRF middleware seperti Laravel `web.php`, Django).
- ❌ Proses body dulu baru cek signature — selalu verifikasi signature **sebelum** menyentuh isi payload.

---

### 5. Perilaku pengiriman

- **Retry**: sampai 3x percobaan kalau endpoint kamu gagal merespons atau tidak membalas `2xx` (delay 1 detik sebelum percobaan ke-2, 3 detik sebelum percobaan ke-3).
- **Timeout**: 10 detik per percobaan.
- **Header `User-Agent`**: `AustinPay-Webhook/1.0`.
- **Format secret**: selalu diawali `whsec_` (contoh: `whsec_3f9a...`), diambil dari Dashboard AustinPay -> menu Webhook, jangan dari tempat lain.
- Karena ada retry otomatis, pastikan proses di endpoint kamu **idempotent** — cek apakah `transactionId` sudah pernah diproses sebelum kredit saldo/ubah status, supaya event yang dikirim ulang tidak diproses dua kali. Contoh implementasi dedup ada di [`cloudflare-worker/`](./cloudflare-worker) (pakai KV).

## Setup Webhook di Dashboard AustinPay

1. Login ke Dashboard AustinPay.
2. Buka menu **Webhook** di sidebar.
3. Isi **URL Endpoint** server kamu, contoh: `https://api.domain-anda.com/webhook`.
4. Pilih event yang mau diterima (`deposit.paid`, `withdraw.approved`, `withdraw.rejected`).
5. Aktifkan toggle, klik **Simpan Konfigurasi**.
6. Klik **Kirim Test Webhook** untuk memastikan endpoint kamu sudah benar.

## Testing Lokal (Ngrok)

```bash
ngrok http 8080
```

Salin URL HTTPS dari Ngrok, masukkan ke Dashboard AustinPay dengan path `/webhook`, lalu klik **Kirim Test Webhook**.

---

Lihat README di masing-masing folder untuk instalasi & detail spesifik per bahasa.
