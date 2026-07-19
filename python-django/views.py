"""
AustinPay Webhook Receiver — Django (views.py)
============================================================
Simpan/tempel isi file ini ke app Django kamu, contoh: payments/views.py
"""

import hmac
import hashlib
import json
import logging
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

logger = logging.getLogger(__name__)

WEBHOOK_SECRET = os.environ.get(
    "WEBHOOK_SECRET", "whsec_ganti_dengan_secret_anda_dari_dashboard"
)


# csrf_exempt WAJIB di sini: ini endpoint server-to-server (AustinPay -> kamu),
# bukan form submission dari browser user, jadi tidak akan pernah bawa CSRF
# token Django. Keamanan endpoint ini digantikan oleh verifikasi signature
# HMAC di bawah, bukan oleh CSRF token.
@csrf_exempt
@require_POST
def austinpay_webhook(request):
    if not WEBHOOK_SECRET:
        logger.error("WEBHOOK_SECRET is not configured on the server.")
        return JsonResponse(
            {"error": "Server misconfiguration: WEBHOOK_SECRET is missing."}, status=500
        )

    signature = request.headers.get("X-AustinPay-Signature")
    event_header = request.headers.get("X-AustinPay-Event")

    # request.body = raw bytes mentah, diambil SEBELUM Django mem-parsing
    # apapun. Jangan pakai request.POST (itu untuk form-encoded data, bukan
    # JSON, dan tidak akan berisi apa-apa untuk request application/json).
    raw_body = request.body

    logger.info("================ WEBHOOK RECEIVED ================")
    logger.info("Raw Payload: %s", raw_body.decode("utf-8", errors="replace"))
    logger.info("Signature Header: %s", signature)
    logger.info("Event Header: %s", event_header)

    if not signature:
        logger.warning("Rejected request: X-AustinPay-Signature header is missing.")
        return JsonResponse({"error": "Unauthorized: Missing signature."}, status=401)

    computed_signature = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()

    logger.info("Signature dari Header : %s", signature)
    logger.info("Signature Hasil Compute: %s", computed_signature)

    # hmac.compare_digest = constant-time compare (setara timingSafeEqual)
    is_valid = hmac.compare_digest(computed_signature, signature)

    if not is_valid:
        logger.warning("Rejected request: Invalid signature.")
        return JsonResponse({"error": "Unauthorized: Invalid signature."}, status=401)

    try:
        decoded = json.loads(raw_body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON payload."}, status=400)

    event_name = event_header or decoded.get("event", "unknown")
    payload_data = decoded.get("data", decoded)  # support envelope & flat payload

    logger.info("Webhook Signature Verified Successfully!")
    logger.info("Event: %s", event_name)
    logger.info("==================================================")

    # ── Taruh logika bisnis kamu di sini ──────────────────────
    if event_name == "deposit.paid":
        pass  # credit_order_in_your_db(payload_data["transactionId"], payload_data["amount"])
    elif event_name == "withdraw.approved":
        pass  # mark_withdraw_success(payload_data["transactionId"])
    elif event_name == "withdraw.rejected":
        pass  # notify_user(payload_data["transactionId"], payload_data["reason"])
    else:
        logger.warning("Event tidak dikenal: %s", event_name)

    return JsonResponse({"success": True, "message": "Webhook received and processed"})
