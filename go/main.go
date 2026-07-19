// AustinPay Webhook Receiver — Go (stdlib only, tanpa dependency eksternal)
// ============================================================
// Jalankan: WEBHOOK_SECRET=whsec_xxx go run main.go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
)

var webhookSecret = getEnv("WEBHOOK_SECRET", "whsec_ganti_dengan_secret_anda_dari_dashboard")

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// computeSignature menghitung HMAC-SHA256 (hex) dari raw body.
func computeSignature(rawBody []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(rawBody)
	return hex.EncodeToString(mac.Sum(nil))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	if webhookSecret == "" {
		log.Println("WEBHOOK_SECRET is not configured on the server.")
		respondJSON(w, http.StatusInternalServerError, map[string]string{
			"error": "Server misconfiguration: WEBHOOK_SECRET is missing.",
		})
		return
	}

	signature := r.Header.Get("X-AustinPay-Signature")
	eventHeader := r.Header.Get("X-AustinPay-Event")

	// WAJIB raw bytes — jangan decode ke struct dulu baru re-encode.
	rawBody, err := io.ReadAll(r.Body)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to read body."})
		return
	}
	defer r.Body.Close()

	log.Println("================ WEBHOOK RECEIVED ================")
	log.Printf("Raw Payload: %s\n", string(rawBody))
	log.Printf("Signature Header: %s\n", signature)
	log.Printf("Event Header: %s\n", eventHeader)

	if signature == "" {
		log.Println("Rejected request: X-AustinPay-Signature header is missing.")
		respondJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized: Missing signature.",
		})
		return
	}

	computedSignature := computeSignature(rawBody, webhookSecret)

	log.Printf("Signature dari Header : %s\n", signature)
	log.Printf("Signature Hasil Compute: %s\n", computedSignature)

	// Decode kedua signature ke bytes lalu bandingkan dengan hmac.Equal
	// (constant-time, setara crypto.timingSafeEqual di Node.js).
	sigBytes, errSig := hex.DecodeString(signature)
	computedBytes, _ := hex.DecodeString(computedSignature)

	isValid := errSig == nil && hmac.Equal(sigBytes, computedBytes)

	if !isValid {
		log.Println("Rejected request: Invalid signature.")
		respondJSON(w, http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized: Invalid signature.",
		})
		return
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(rawBody, &decoded); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON payload."})
		return
	}

	eventName, _ := decoded["event"].(string)
	if eventHeader != "" {
		eventName = eventHeader
	}
	if eventName == "" {
		eventName = "unknown"
	}

	payloadData, ok := decoded["data"].(map[string]interface{})
	if !ok {
		payloadData = decoded // support flat payload
	}

	log.Println("Webhook Signature Verified Successfully!")
	log.Printf("Event: %s\n", eventName)
	log.Printf("Payload: %+v\n", payloadData)
	log.Println("==================================================")

	// ── Taruh logika bisnis kamu di sini ──────────────────────
	switch eventName {
	case "deposit.paid":
		// creditOrderInYourDb(payloadData["transactionId"], payloadData["amount"])
	case "withdraw.approved":
		// markWithdrawSuccess(payloadData["transactionId"])
	case "withdraw.rejected":
		// notifyUser(payloadData["transactionId"], payloadData["reason"])
	default:
		log.Printf("Event tidak dikenal: %s\n", eventName)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Webhook received and processed",
	})
}

func respondJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func main() {
	port := getEnv("PORT", "8080")
	http.HandleFunc("/webhook", webhookHandler)
	log.Printf("AustinPay webhook receiver (Go) listening on http://localhost:%s\n", port)
	log.Printf("Send POST requests to: http://localhost:%s/webhook\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
