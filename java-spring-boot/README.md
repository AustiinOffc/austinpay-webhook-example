# Java (Spring Boot)

Butuh Java 17+ dan Maven.

```bash
cd java-spring-boot
export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
./mvnw spring-boot:run   # atau: mvn spring-boot:run
```

Server aktif di `http://localhost:8080`, endpoint: `POST /webhook`.

## Poin penting

- Raw body diambil lewat parameter `@RequestBody byte[] rawBody` — **bukan** `String` atau DTO class. Pakai `byte[]` supaya Spring tidak melakukan konversi charset (default `StringHttpMessageConverter` historically pakai ISO-8859-1) atau re-serialize object yang bisa mengubah urutan/format bytes sebelum dihitung signature-nya.
- Signature dihitung dengan `Mac.getInstance("HmacSHA256")` lalu di-encode hex pakai `HexFormat` (built-in sejak Java 17).
- Perbandingan pakai `MessageDigest.isEqual()` (constant-time sejak JDK 6u17) — bukan `.equals()` biasa pada String.
- Struktur project Maven standar (`src/main/java/...`), bisa langsung di-import ke IntelliJ/Eclipse atau dijadikan module di project Spring Boot yang sudah ada.
