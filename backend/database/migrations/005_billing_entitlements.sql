-- 005_billing_entitlements.sql (idempotent - safe to re-run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS entitlements (
  user_id UUID PRIMARY KEY REFERENCES users(uuid) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'free',
  paddle_subscription_id VARCHAR(100) UNIQUE,
  paddle_customer_id VARCHAR(100),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_current_period_end ON entitlements(current_period_end);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'search_logs'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE search_logs ADD COLUMN user_id UUID REFERENCES users(uuid) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_search_logs_user_created ON search_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_ip_created ON search_logs(ip_address, created_at);
