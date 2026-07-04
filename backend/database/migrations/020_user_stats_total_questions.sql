-- 020_user_stats_total_questions.sql (idempotent - safe to re-run)
-- Accuracy must be derived from the real number of questions answered, not the
-- Dashboard's old "total_quizzes * 10" assumption, which drifts whenever a quiz
-- had fewer than 10 questions. Track the answered-question count on user_stats as
-- the authoritative denominator; submitQuiz increments it per attempt.

ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_questions INTEGER NOT NULL DEFAULT 0;

-- Backfill from the real per-attempt history where it exists; fall back to the
-- legacy total_quizzes * 10 convention for guest-merged stats with no attempts.
-- Guarded on total_questions = 0 so a re-run never clobbers accumulated values.
UPDATE user_stats us
SET total_questions = COALESCE(
  (SELECT SUM(qa.total_questions) FROM quiz_attempts qa WHERE qa.user_id = us.user_id),
  us.total_quizzes * 10
)
WHERE us.total_questions = 0;
