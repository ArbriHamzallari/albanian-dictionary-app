-- 019_chat_safety.sql (idempotent - safe to re-run)
-- INF-3: encrypt chat at rest + record auto-moderation outcomes.
--
-- chat_messages.body held plaintext. Going forward, message text is stored
-- encrypted with AES-256-GCM in `ciphertext` (see src/services/encryption.js);
-- `body` is kept nullable only so pre-encryption rows still read. New rows write
-- ciphertext and leave body NULL.
--
-- moderation_events records every message the pipeline rejected (banned-word /
-- PII hit, or LLM-flagged) for the admin Trust & Safety review surface. Distinct
-- from user_reports (human-filed) — this is the automated trail.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'ciphertext'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN ciphertext TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'moderation_status'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'clean';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'moderation_reason'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN moderation_reason VARCHAR(40);
  END IF;
END $$;

-- Plaintext body is no longer required (new rows store ciphertext instead).
ALTER TABLE chat_messages ALTER COLUMN body DROP NOT NULL;

CREATE TABLE IF NOT EXISTS moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  recipient_id UUID REFERENCES users(uuid) ON DELETE SET NULL,
  surface VARCHAR(30) NOT NULL DEFAULT 'chat',
  reason VARCHAR(40) NOT NULL,
  excerpt TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_events_status ON moderation_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_events_sender ON moderation_events(sender_id, created_at DESC);
