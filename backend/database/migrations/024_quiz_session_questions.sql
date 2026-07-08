-- 024_quiz_session_questions.sql (GAME-0)
--
-- Question sourcing moves from the retired legacy quiz_questions table to the
-- content model (words + word_examples). Sessions now store the fully-served
-- question objects as JSONB so grading is done against the server's own truth.
-- Each element: { idx, type, word_id, prompt, options, answer } — `answer` is the
-- grading truth and is stripped before questions reach the client.
ALTER TABLE quiz_sessions ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Nothing reads question_ids after this PR — progressController was its only
-- consumer and the legacy quiz_questions path is gone — so drop it here (one way).
ALTER TABLE quiz_sessions DROP COLUMN IF EXISTS question_ids;
