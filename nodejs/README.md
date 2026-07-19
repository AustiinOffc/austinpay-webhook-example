# Node.js (Express)

```bash
cd nodejs
npm install
cp .env.example .env   # isi WEBHOOK_SECRET
npm start
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

Poin penting di `index.js`:
- Raw body ditangkap lewat opsi `verify` di `express.json()` (`req.rawBody`).
- Signature dihitung dengan `crypto.createHmac('sha256', secret)`.
- Perbandingan pakai `crypto.timingSafeEqual` (constant-time).
