# AustinPay Webhook Receiver — Ruby (Sinatra)
# ============================================================
# Jalankan: bundle install && WEBHOOK_SECRET=whsec_xxx ruby app.rb

require 'sinatra'
require 'openssl'
require 'json'

set :port, (ENV['PORT'] || 8080).to_i
set :bind, '0.0.0.0'

WEBHOOK_SECRET = ENV['WEBHOOK_SECRET'] || 'whsec_ganti_dengan_secret_anda_dari_dashboard'

post '/webhook' do
  content_type :json

  if WEBHOOK_SECRET.nil? || WEBHOOK_SECRET.empty?
    status 500
    return { error: 'Server misconfiguration: WEBHOOK_SECRET is missing.' }.to_json
  end

  signature    = request.env['HTTP_X_AUSTINPAY_SIGNATURE']
  event_header = request.env['HTTP_X_AUSTINPAY_EVENT']

  # WAJIB raw bytes — request.body.read sebelum di-JSON.parse
  request.body.rewind
  raw_body = request.body.read

  puts '================ WEBHOOK RECEIVED ================'
  puts "Raw Payload: #{raw_body}"
  puts "Signature Header: #{signature}"
  puts "Event Header: #{event_header}"

  if signature.nil? || signature.empty?
    puts 'Rejected request: X-AustinPay-Signature header is missing.'
    status 401
    return { error: 'Unauthorized: Missing signature.' }.to_json
  end

  computed_signature = OpenSSL::HMAC.hexdigest('SHA256', WEBHOOK_SECRET, raw_body)

  puts "Signature dari Header : #{signature}"
  puts "Signature Hasil Compute: #{computed_signature}"

  # OpenSSL.fixed_length_secure_compare = constant-time compare
  # (setara crypto.timingSafeEqual di Node.js). Wajib cek panjang dulu
  # karena method ini raise ArgumentError kalau panjangnya beda.
  is_valid = false
  begin
    if signature.bytesize == computed_signature.bytesize
      is_valid = OpenSSL.fixed_length_secure_compare(signature, computed_signature)
    end
  rescue StandardError => e
    puts "Error during signature verification: #{e.message}"
  end

  unless is_valid
    puts 'Rejected request: Invalid signature.'
    status 401
    return { error: 'Unauthorized: Invalid signature.' }.to_json
  end

  begin
    decoded = JSON.parse(raw_body)
  rescue JSON::ParserError
    status 400
    return { error: 'Invalid JSON payload.' }.to_json
  end

  event_name   = (event_header && !event_header.empty?) ? event_header : (decoded['event'] || 'unknown')
  payload_data = decoded['data'] || decoded # support envelope & flat payload

  puts 'Webhook Signature Verified Successfully!'
  puts "Event: #{event_name}"
  puts "Payload: #{payload_data}"
  puts '=================================================='

  # ── Taruh logika bisnis kamu di sini ──────────────────────
  case event_name
  when 'deposit.paid'
    # credit_order_in_your_db(payload_data['transactionId'], payload_data['amount'])
  when 'withdraw.approved'
    # mark_withdraw_success(payload_data['transactionId'])
  when 'withdraw.rejected'
    # notify_user(payload_data['transactionId'], payload_data['reason'])
  else
    puts "Event tidak dikenal: #{event_name}"
  end

  status 200
  { success: true, message: 'Webhook received and processed' }.to_json
end
