// AustinPay Webhook Receiver — C# (.NET 8, Minimal API)
// ============================================================
// Jalankan: WEBHOOK_SECRET=whsec_xxx dotnet run

using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

string webhookSecret = Environment.GetEnvironmentVariable("WEBHOOK_SECRET")
    ?? "whsec_ganti_dengan_secret_anda_dari_dashboard";

app.MapPost("/webhook", async (HttpRequest request) =>
{
    if (string.IsNullOrEmpty(webhookSecret))
    {
        Console.WriteLine("WEBHOOK_SECRET is not configured on the server.");
        return Results.Json(new { error = "Server misconfiguration: WEBHOOK_SECRET is missing." }, statusCode: 500);
    }

    var signature = request.Headers["X-AustinPay-Signature"].ToString();
    var eventHeader = request.Headers["X-AustinPay-Event"].ToString();

    // WAJIB raw bytes — jangan bind ke DTO class dulu baru re-serialize.
    using var ms = new MemoryStream();
    await request.Body.CopyToAsync(ms);
    byte[] rawBody = ms.ToArray();

    Console.WriteLine("================ WEBHOOK RECEIVED ================");
    Console.WriteLine($"Raw Payload: {Encoding.UTF8.GetString(rawBody)}");
    Console.WriteLine($"Signature Header: {signature}");
    Console.WriteLine($"Event Header: {eventHeader}");

    if (string.IsNullOrEmpty(signature))
    {
        Console.WriteLine("Rejected request: X-AustinPay-Signature header is missing.");
        return Results.Json(new { error = "Unauthorized: Missing signature." }, statusCode: 401);
    }

    byte[] computedBytes;
    using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(webhookSecret)))
    {
        computedBytes = hmac.ComputeHash(rawBody);
    }
    string computedSignature = Convert.ToHexString(computedBytes).ToLowerInvariant();

    Console.WriteLine($"Signature dari Header : {signature}");
    Console.WriteLine($"Signature Hasil Compute: {computedSignature}");

    bool isValid;
    try
    {
        byte[] sigBytes = Convert.FromHexString(signature);
        // CryptographicOperations.FixedTimeEquals = constant-time compare
        // (setara crypto.timingSafeEqual di Node.js), tersedia sejak .NET Core 3.0.
        isValid = sigBytes.Length == computedBytes.Length
            && CryptographicOperations.FixedTimeEquals(sigBytes, computedBytes);
    }
    catch (FormatException)
    {
        isValid = false; // signature header bukan hex string yang valid
    }

    if (!isValid)
    {
        Console.WriteLine("Rejected request: Invalid signature.");
        return Results.Json(new { error = "Unauthorized: Invalid signature." }, statusCode: 401);
    }

    JsonDocument decoded;
    try
    {
        decoded = JsonDocument.Parse(rawBody);
    }
    catch (JsonException)
    {
        return Results.Json(new { error = "Invalid JSON payload." }, statusCode: 400);
    }

    var root = decoded.RootElement;
    string eventName = !string.IsNullOrEmpty(eventHeader)
        ? eventHeader
        : (root.TryGetProperty("event", out var evProp) ? evProp.GetString() ?? "unknown" : "unknown");

    var payloadData = root.TryGetProperty("data", out var dataProp) ? dataProp : root;

    Console.WriteLine("Webhook Signature Verified Successfully!");
    Console.WriteLine($"Event: {eventName}");
    Console.WriteLine($"Payload: {payloadData}");
    Console.WriteLine("==================================================");

    // ── Taruh logika bisnis kamu di sini ──────────────────────
    switch (eventName)
    {
        case "deposit.paid":
            // CreditOrderInYourDb(payloadData.GetProperty("transactionId").GetString(), ...);
            break;
        case "withdraw.approved":
            // MarkWithdrawSuccess(payloadData.GetProperty("transactionId").GetString());
            break;
        case "withdraw.rejected":
            // NotifyUser(payloadData.GetProperty("transactionId").GetString(), ...);
            break;
        default:
            Console.WriteLine($"Event tidak dikenal: {eventName}");
            break;
    }

    return Results.Json(new { success = true, message = "Webhook received and processed" });
});

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://0.0.0.0:{port}");
