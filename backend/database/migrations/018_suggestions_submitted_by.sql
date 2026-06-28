-- 018_suggestions_submitted_by.sql (idempotent - safe to re-run)
-- UX-3: when a logged-in user proposes a word, attribute the suggestion to them
-- so their account can later track its review status. Nullable + SET NULL: guest
-- ("Dërgo si mysafir") submissions stay anonymous, and deleting a user must not
-- delete their past suggestions.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'word_suggestions' AND column_name = 'submitted_by'
  ) THEN
    ALTER TABLE word_suggestions
      ADD COLUMN submitted_by UUID REFERENCES users(uuid) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_word_suggestions_submitted_by ON word_suggestions(submitted_by);
