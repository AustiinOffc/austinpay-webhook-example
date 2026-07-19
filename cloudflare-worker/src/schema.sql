-- Schema D1 untuk menyimpan riwayat webhook AustinPay yang sudah terverifikasi
CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  event TEXT NOT NULL,
  amount REAL,
  status TEXT,
  method TEXT,
  reason TEXT,
  sent_at TEXT,
  raw_payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(transaction_id, event)
);

CREATE INDEX IF NOT EXISTS idx_webhooks_transaction_id ON webhooks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event);
