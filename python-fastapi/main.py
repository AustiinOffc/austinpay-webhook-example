"""
AustinPay Webhook Receiver - Python FastAPI Example

Secure webhook endpoint with HMAC-SHA256 signature verification.
Webhook Secret didapatkan dari Dashboard AustinPay -> menu Webhook.

Usage:
    export WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard
    uvicorn main:app --host 0.0.0.0 --port 8080
"""

import os
import hmac
import hashlib
import json
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="AustinPay Webhook Receiver")

WEBHOOK_SECRET = os.environ.get(
    "WEBHOOK_SECRET",
    "whsec_ganti_dengan_secret_anda_dari_dashboard",
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("austinpay-webhook")


@app.post("/webhook")
async def webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("X-AustinPay-Signature", "")
    event_header = request.headers.get("X-AustinPay-Event", "")

    logger.info("================ WEBHOOK RECEIVED ================")
    logger.info("Event header: %s", event_header)

    if not WEBHOOK_SECRET:
        logger.error("WEBHOOK_SECRET is not configured")
        return JSONResponse(
            {"error": "Server misconfiguration: WEBHOOK_SECRET is missing."}, status_code=500
        )

    if not signature:
        logger.warning("Missing X-AustinPay-Signature header")
        return JSONResponse({"error": "Unauthorized: Missing signature."}, status_code=401)

    computed_signature = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, signature):
        logger.warning("Invalid signature - rejecting request")
        return JSONResponse({"error": "Unauthorized: Invalid signature."}, status_code=401)

    try:
        envelope = json.loads(raw_body)
    except Exception:
        envelope = {}

    logger.info("Webhook Signature Verified Successfully!")
    data = envelope.get("data", {})
    logger.info(
        "Event: %s | transactionId=%s amount=%s status=%s",
        envelope.get("event", event_header),
        data.get("transactionId"),
        data.get("amount"),
        data.get("status"),
    )

    # TODO: taruh logika bisnis kamu di sini berdasarkan envelope["event"]
    # (deposit.paid, withdraw.approved, withdraw.rejected)

    return {"success": True, "message": "Webhook received and processed"}


@app.get("/health")
async def health():
    return {"status": "ok"}
