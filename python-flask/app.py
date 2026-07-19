"""
AustinPay Webhook Receiver — Python (Flask)
============================================================
Jalankan: pip install -r requirements.txt && python app.py
"""

import hmac
import hashlib
import json
import logging
import os

from flask import Flask, request, jsonify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("austinpay-webhook")

app = Flask(__name__)

WEBHOOK_SECRET = os.environ.get(
    "WEBHOOK_SECRET", "whsec_ganti_dengan_secret_anda_dari_dashboard"
)


@app.route("/webhook", methods=["POST"])
def webhook():
    if not WEBHOOK_SECRET:
        logger.error("WEBHOOK_SECRET is not configured on the server.")
        return jsonify({"error": "Server misconfiguration: WEBHOOK_SECRET is missing."}), 500

    signature = request.headers.get("X-AustinPay-Signature")
    event_header = request.headers.get("X-AustinPay-Event")

    # WAJIB raw bytes — request.get_data() mengembalikan body mentah
    # SEBELUM di-parse, beda dengan request.json (yang sudah jadi dict).
    raw_body = request.get_data()

    logger.info("================ WEBHOOK RECEIVED ================")
    logger.info("Raw Payload: %s", raw_body.decode("utf-8", errors="replace"))
    logger.info("Signature Header: %s", signature)
    logger.info("Event Header: %s", event_header)

    if not signature:
        logger.warning("Rejected request: X-AustinPay-Signature header is missing.")
        return jsonify({"error": "Unauthorized: Missing signature."}), 401

    computed_signature = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()

    logger.info("Signature dari Header : %s", signature)
    logger.info("Signature Hasil Compute: %s", computed_signature)

    # hmac.compare_digest = constant-time compare (setara timingSafeEqual)
    is_valid = hmac.compare_digest(computed_signature, signature)

    if not is_valid:
        logger.warning("Rejected request: Invalid signature.")
        return jsonify({"error": "Unauthorized: Invalid signature."}), 401

    try:
        decoded = json.loads(raw_body)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON payload."}), 400

    event_name = event_header or decoded.get("event", "unknown")
    payload_data = decoded.get("data", decoded)  # support envelope & flat payload

    transaction_id = payload_data.get("transactionId")
    amount = payload_data.get("amount")
    status = payload_data.get("status")
    method = payload_data.get("method")
    reason = payload_data.get("reason")

    logger.info("Webhook Signature Verified Successfully!")
    logger.info("Event: %s", event_name)
    logger.info("==================================================")

    # ── Taruh logika bisnis kamu di sini ──────────────────────
    if event_name == "deposit.paid":
        pass  # credit_order_in_your_db(transaction_id, amount)
    elif event_name == "withdraw.approved":
        pass  # mark_withdraw_success(transaction_id)
    elif event_name == "withdraw.rejected":
        pass  # notify_user(transaction_id, reason)
    else:
        logger.warning("Event tidak dikenal: %s", event_name)

    return jsonify({"success": True, "message": "Webhook received and processed"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
