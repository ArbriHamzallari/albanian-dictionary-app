-- Replace legacy quiz_sessions shape (attempt summary) with server-served session tracking.
DROP TABLE IF EXISTS quiz_sessions;

CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  question_ids INTEGER[] NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,
  submitted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
