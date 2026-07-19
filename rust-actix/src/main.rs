// AustinPay Webhook Receiver — Rust (Actix-web)
// ============================================================
// Jalankan: WEBHOOK_SECRET=whsec_xxx cargo run

use actix_web::{web, App, HttpResponse, HttpServer, HttpRequest};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde_json::{json, Value};

type HmacSha256 = Hmac<Sha256>;

async fn webhook(req: HttpRequest, body: web::Bytes) -> HttpResponse {
    let webhook_secret = std::env::var("WEBHOOK_SECRET")
        .unwrap_or_else(|_| "whsec_ganti_dengan_secret_anda_dari_dashboard".to_string());

    if webhook_secret.is_empty() {
        eprintln!("WEBHOOK_SECRET is not configured on the server.");
        return HttpResponse::InternalServerError()
            .json(json!({ "error": "Server misconfiguration: WEBHOOK_SECRET is missing." }));
    }

    let signature = req
        .headers()
        .get("X-AustinPay-Signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let event_header = req
        .headers()
        .get("X-AustinPay-Event")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    // `body` (web::Bytes) adalah raw bytes mentah — belum di-parse JSON sama sekali.
    println!("================ WEBHOOK RECEIVED ================");
    println!("Raw Payload: {}", String::from_utf8_lossy(&body));
    println!("Signature Header: {}", signature);
    println!("Event Header: {}", event_header);

    if signature.is_empty() {
        println!("Rejected request: X-AustinPay-Signature header is missing.");
        return HttpResponse::Unauthorized()
            .json(json!({ "error": "Unauthorized: Missing signature." }));
    }

    let mut mac = match HmacSha256::new_from_slice(webhook_secret.as_bytes()) {
        Ok(m) => m,
        Err(_) => {
            return HttpResponse::InternalServerError()
                .json(json!({ "error": "Failed to initialize HMAC." }));
        }
    };
    mac.update(&body);

    let signature_bytes = match hex::decode(signature) {
        Ok(b) => b,
        Err(_) => {
            println!("Rejected request: Invalid signature (bukan hex string valid).");
            return HttpResponse::Unauthorized()
                .json(json!({ "error": "Unauthorized: Invalid signature." }));
        }
    };

    // verify_slice() melakukan constant-time compare secara internal
    // (setara crypto.timingSafeEqual di Node.js) — jadi tidak perlu
    // implementasi manual.
    let is_valid = mac.verify_slice(&signature_bytes).is_ok();

    if !is_valid {
        println!("Rejected request: Invalid signature.");
        return HttpResponse::Unauthorized()
            .json(json!({ "error": "Unauthorized: Invalid signature." }));
    }

    let decoded: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => {
            return HttpResponse::BadRequest().json(json!({ "error": "Invalid JSON payload." }));
        }
    };

    let event_name = if !event_header.is_empty() {
        event_header.to_string()
    } else {
        decoded
            .get("event")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string()
    };

    let payload_data = decoded.get("data").cloned().unwrap_or(decoded.clone());

    println!("Webhook Signature Verified Successfully!");
    println!("Event: {}", event_name);
    println!("Payload: {}", payload_data);
    println!("==================================================");

    // ── Taruh logika bisnis kamu di sini ──────────────────────
    match event_name.as_str() {
        "deposit.paid" => {
            // credit_order_in_your_db(payload_data["transactionId"], payload_data["amount"]);
        }
        "withdraw.approved" => {
            // mark_withdraw_success(payload_data["transactionId"]);
        }
        "withdraw.rejected" => {
            // notify_user(payload_data["transactionId"], payload_data["reason"]);
        }
        _ => {
            println!("Event tidak dikenal: {}", event_name);
        }
    }

    HttpResponse::Ok().json(json!({
        "success": true,
        "message": "Webhook received and processed"
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);

    println!("AustinPay webhook receiver (Rust) listening on http://localhost:{port}");
    println!("Send POST requests to: http://localhost:{port}/webhook");

    HttpServer::new(|| App::new().route("/webhook", web::post().to(webhook)))
        .bind(("0.0.0.0", port))?
        .run()
        .await
}
