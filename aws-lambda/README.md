# AustinPay Webhook Receiver — AWS Lambda

## Deploy

```bash
cd aws-lambda
zip -r function.zip index.mjs

aws lambda create-function \
  --function-name austinpay-webhook \
  --runtime nodejs22.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role <ARN_IAM_ROLE_LAMBDA_KAMU>

aws lambda update-function-configuration \
  --function-name austinpay-webhook \
  --environment "Variables={WEBHOOK_SECRET=whsec_ganti_dengan_secret_anda_dari_dashboard}"
```

Lalu hubungkan ke **API Gateway HTTP API** atau **Lambda Function URL**, dan daftarkan URL publiknya sebagai webhook endpoint di Dashboard AustinPay.

## Poin penting

- Body dari API Gateway kadang datang ter-base64 (`event.isBase64Encoded`) — kode ini menangani kedua kasus sebelum menghitung HMAC.
- Header dibaca case-insensitive (`x-austinpay-signature` / `X-AustinPay-Signature`) karena format `event.headers` bisa beda tergantung integrasi (REST API vs HTTP API vs Function URL).
