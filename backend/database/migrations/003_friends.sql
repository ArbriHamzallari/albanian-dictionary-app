-- 003_friends.sql (idempotent – safe to re-run)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Friend requests (pending/accepted/declined)
-- ============================================================
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient ON friend_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_friend_requests_status'
  ) THEN
    ALTER TABLE friend_requests
      ADD CONSTRAINT chk_friend_requests_status
      CHECK (status IN ('pending', 'accepted', 'declined'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_friend_requests_not_self'
  ) THEN
    ALTER TABLE friend_requests
      ADD CONSTRAINT chk_friend_requests_not_self
      CHECK (requester_id <> recipient_id);
  END IF;
END
$$;

-- Prevent duplicate pairs in the same direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_requests_pair
  ON friend_requests(requester_id, recipient_id);
