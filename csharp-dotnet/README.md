# C# (.NET 8, Minimal API)

```bash
cd csharp-dotnet
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
dotnet run
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- Raw body dibaca langsung dari `request.Body` stream ke `byte[]` — **jangan** bind langsung ke class/DTO (`[FromBody] MyDto`) karena itu akan mem-parsing dulu sebelum kamu sempat hash raw bytes-nya.
- Signature dihitung dengan `HMACSHA256`, hasilnya di-hex-kan pakai `Convert.ToHexString(...).ToLowerInvariant()` (defaultnya uppercase, AustinPay kirim lowercase).
- Perbandingan pakai `CryptographicOperations.FixedTimeEquals()` (constant-time, tersedia sejak .NET Core 3.0) — bukan `==` pada string/array biasa.
- Pakai Minimal API (`Program.cs` top-level statements, .NET 8) supaya ringkas — bisa dipindah ke Controller-based project kalau perlu.
