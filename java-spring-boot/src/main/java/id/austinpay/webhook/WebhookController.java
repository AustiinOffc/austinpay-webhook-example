package id.austinpay.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;

/**
 * AustinPay Webhook Receiver — Spring Boot
 * ============================================================
 * Secret diambil dari application.properties (austinpay.webhook.secret)
 * atau environment variable WEBHOOK_SECRET.
 */
@RestController
public class WebhookController {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${austinpay.webhook.secret:whsec_ganti_dengan_secret_anda_dari_dashboard}")
    private String webhookSecret;

    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<Map<String, Object>> webhook(
            @RequestBody byte[] rawBody, // WAJIB byte[], bukan String / @RequestBody DTO — supaya
                                          // Spring tidak melakukan konversi charset atau re-serialize
                                          // yang bisa mengubah bytes sebelum kita hash.
            @RequestHeader(value = "X-AustinPay-Signature", required = false) String signature,
            @RequestHeader(value = "X-AustinPay-Event", required = false) String eventHeader
    ) {
        System.out.println("================ WEBHOOK RECEIVED ================");
        System.out.println("Raw Payload: " + new String(rawBody));
        System.out.println("Signature Header: " + signature);
        System.out.println("Event Header: " + eventHeader);

        if (webhookSecret == null || webhookSecret.isBlank()) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Server misconfiguration: WEBHOOK_SECRET is missing.");
        }

        if (signature == null || signature.isBlank()) {
            System.out.println("Rejected request: X-AustinPay-Signature header is missing.");
            return error(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing signature.");
        }

        String computedSignature;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(), "HmacSHA256"));
            byte[] computedBytes = mac.doFinal(rawBody);
            computedSignature = HexFormat.of().formatHex(computedBytes);
        } catch (Exception e) {
            System.out.println("Error during signature verification: " + e.getMessage());
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to compute signature.");
        }

        System.out.println("Signature dari Header : " + signature);
        System.out.println("Signature Hasil Compute: " + computedSignature);

        boolean isValid;
        try {
            byte[] sigBytes = HexFormat.of().parseHex(signature);
            byte[] computedBytes = HexFormat.of().parseHex(computedSignature);
            // MessageDigest.isEqual = constant-time compare sejak JDK 6u17
            isValid = MessageDigest.isEqual(sigBytes, computedBytes);
        } catch (IllegalArgumentException e) {
            isValid = false; // signature header bukan hex string yang valid
        }

        if (!isValid) {
            System.out.println("Rejected request: Invalid signature.");
            return error(HttpStatus.UNAUTHORIZED, "Unauthorized: Invalid signature.");
        }

        JsonNode decoded;
        try {
            decoded = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            return error(HttpStatus.BAD_REQUEST, "Invalid JSON payload.");
        }

        String eventName = eventHeader != null && !eventHeader.isBlank()
                ? eventHeader
                : decoded.path("event").asText("unknown");

        JsonNode payloadData = decoded.has("data") ? decoded.get("data") : decoded;

        System.out.println("Webhook Signature Verified Successfully!");
        System.out.println("Event: " + eventName);
        System.out.println("Payload: " + payloadData);
        System.out.println("==================================================");

        // ── Taruh logika bisnis kamu di sini ──────────────────
        switch (eventName) {
            case "deposit.paid":
                // creditOrderInYourDb(payloadData.get("transactionId").asText(), ...);
                break;
            case "withdraw.approved":
                // markWithdrawSuccess(payloadData.get("transactionId").asText());
                break;
            case "withdraw.rejected":
                // notifyUser(payloadData.get("transactionId").asText(), payloadData.get("reason").asText());
                break;
            default:
                System.out.println("Event tidak dikenal: " + eventName);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("success", true);
        body.put("message", "Webhook received and processed");
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
